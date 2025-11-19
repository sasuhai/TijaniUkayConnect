
import React, { useState, useEffect, useCallback, FC } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from './types';
import { supabase } from './services/supabaseService';
import { AuthContext } from './contexts/AuthContext';
import { FullPageSpinner } from './components/ui/Spinner';
import { Button } from './components/ui/Button';
import { AuthPage } from './pages/auth/AuthPage';
import { Dashboard } from './pages/resident/Dashboard';


const App: FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  
  // Initialize user from local storage to prevent loading spinner on page reload/return
  const [user, setUser] = useState<UserProfile | null>(() => {
      try {
          const cached = localStorage.getItem('tijani_user_profile');
          return cached ? JSON.parse(cached) : null;
      } catch (e) {
          console.warn("Failed to parse cached user", e);
          return null;
      }
  });

  // Initialize loading based on whether we have a cached user. 
  const [loading, setLoading] = useState<boolean>(() => {
      const cached = localStorage.getItem('tijani_user_profile');
      return !cached;
  });

  const fetchUserProfile = useCallback(async (currentSession: Session) => {
    if (!currentSession.user) {
        setUser(null);
        localStorage.removeItem('tijani_user_profile');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
        
        if (error) {
            // If it's a connection error, we KEEP the cached user (stale-while-revalidate).
            // We only clear if we are sure the user doesn't exist (e.g., deleted).
            // PGRST116 is "Row not found", which suggests the auth user exists but profile doesn't.
            if (error.code !== 'PGRST116') {
                 console.warn("Background profile update failed, keeping cached data.", error.message);
                 return; 
            }
        }

        if (data && typeof data === 'object') {
            const newUserProfile: UserProfile = { ...data };
            const adminEmails = ['sasuhai0@gmail.com'];
            
            if (newUserProfile.email && adminEmails.includes(newUserProfile.email.toLowerCase())) {
                newUserProfile.role = 'admin';
                newUserProfile.status = 'Active';
            }

            // PERFORMANCE CRITICAL: Deep compare to prevent unnecessary re-renders.
            // If the data hasn't changed, DO NOT calling setUser().
            // This prevents the entire app (and Dashboard) from re-initializing loading states 
            // when Supabase refreshes the session on tab focus.
            setUser(currentUser => {
                if (JSON.stringify(currentUser) === JSON.stringify(newUserProfile)) {
                    return currentUser;
                }
                // Update cache and state only if different
                localStorage.setItem('tijani_user_profile', JSON.stringify(newUserProfile));
                return newUserProfile;
            });
        } else if (!data && !error) {
             // Strange case, but if explicitly no data, we might clear. 
             // But to be safe against blips, we do nothing unless we are sure.
        }
    } catch (e) {
        console.warn("Unexpected error fetching profile, keeping cached state:", e);
    }
  }, []);


  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
        // Force stop loading after 2s as a safety net
        const safetyTimeout = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 2000);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!isMounted) return;
            setSession(session);
            
            if (session) {
                // We have a session. 
                // If we have a user in state (from cache), we show the app IMMEDIATELY (loading = false).
                if (user) {
                    setLoading(false);
                } else {
                     // Check cache one last time
                     const cached = localStorage.getItem('tijani_user_profile');
                     if (cached) {
                         // We found cache late? Use it.
                         try {
                            setUser(JSON.parse(cached));
                            setLoading(false);
                         } catch {
                            setLoading(true);
                         }
                     } else {
                        // Genuine first load, no cache.
                        setLoading(true);
                     }
                }

                // Fetch fresh data in background.
                await fetchUserProfile(session);
            } else {
                // No session, clear everything
                setUser(null);
                localStorage.removeItem('tijani_user_profile');
                setLoading(false);
            }
        } catch (error) {
            console.error("Error during session initialization:", error);
        } finally {
            clearTimeout(safetyTimeout);
            if (isMounted && user) setLoading(false); 
        }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
            if (!isMounted) return;
            
            if (session) {
                setSession(session);
                // Only fetch profile on sign-in or initial session.
                // Token refreshes (which happen on tab focus) should be handled gently.
                // We call fetchUserProfile, but rely on its internal deep-compare 
                // to avoid triggering re-renders.
                await fetchUserProfile(session);
            } else if (event === 'SIGNED_OUT') {
                 setSession(null);
                 setUser(null);
                 localStorage.removeItem('tijani_user_profile');
                 setLoading(false);
            }
        }
    );

    return () => {
        isMounted = false;
        subscription?.unsubscribe();
    };
  }, [fetchUserProfile]); // Removed 'user' dependency to prevent loops

  const logout = async () => {
    localStorage.removeItem('tijani_user_profile');
    setUser(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error signing out:", error.message);
    }
  };

  const isAdmin = user?.role === 'admin';

  const renderContent = () => {
    // STRATEGY: If we have a user object, RENDER IT. 
    // Do not block for loading. Stale data is better than a spinner.
    if (user) {
       if (user.status !== 'Active') {
          return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-brand-light-gray text-center p-4">
                  <h2 className="text-2xl font-bold text-brand-dark mb-4">Account Not Active</h2>
                  <p className="text-gray-600 mb-6">Your account is currently "{user.status}". Please contact the administrator for assistance.</p>
                  <Button onClick={logout}>Logout</Button>
              </div>
          );
       }
       return <Dashboard />;
    }

    // Only show full page spinner if we have NO user data AND we are in the initial loading phase
    if (loading) {
      return <FullPageSpinner />;
    }
    
    return <AuthPage />;
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, loading, logout, refetchUser: () => session ? fetchUserProfile(session) : Promise.resolve() }}>
        {renderContent()}
    </AuthContext.Provider>
  );
};

export default App;
