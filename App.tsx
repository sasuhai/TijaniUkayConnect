
import React, { useState, useEffect, useCallback, FC } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from './types';
import { supabase, withTimeout } from './services/supabaseService';
import { AuthContext } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { FullPageSpinner } from './components/ui/Spinner';
import { Button } from './components/ui/Button';
import { AuthPage } from './pages/auth/AuthPage';
import { Dashboard } from './pages/resident/Dashboard';
import { VerifyInvitationPage } from './pages/public/VerifyInvitationPage';


const App: FC = () => {
    const [session, setSession] = useState<Session | null>(null);

    // Helper to check if we have a valid Supabase auth token
    const hasValidAuthToken = () => {
        try {
            // Check for Supabase auth token in localStorage
            const authKey = Object.keys(localStorage).find(key =>
                key.startsWith('sb-') && key.includes('-auth-token')
            );
            if (authKey) {
                const authData = localStorage.getItem(authKey);
                if (authData) {
                    const parsed = JSON.parse(authData);
                    // Check if token exists and hasn't expired
                    return parsed && parsed.access_token && parsed.expires_at > Date.now() / 1000;
                }
            }
            return false;
        } catch {
            return false;
        }
    };

    // Initialize user from local storage ONLY if we have a valid auth token
    const [user, setUser] = useState<UserProfile | null>(() => {
        try {
            // Only use cache if we have a valid auth token
            if (!hasValidAuthToken()) {
                console.log('No valid auth token - clearing cached user');
                localStorage.removeItem('tijani_user_profile');
                return null;
            }

            const cached = localStorage.getItem('tijani_user_profile');
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            console.warn("Failed to parse cached user", e);
            return null;
        }
    });

    // Initialize loading based on whether we have a cached user with valid token
    const [loading, setLoading] = useState<boolean>(() => {
        if (!hasValidAuthToken()) {
            return false; // No valid token, show login immediately
        }
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
            const result = await withTimeout(
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentSession.user.id)
                    .single(),
                8000, // 8 second timeout
                'Profile fetch timed out'
            );

            const { data, error } = result as { data: any; error: any };

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
                console.log('App: calling getSession...');
                const { data: { session } } = await supabase.auth.getSession();
                console.log('App: getSession result', session);

                if (!isMounted) return;

                if (session) {
                    setSession(session);
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
                    // CRITICAL FIX: No session means we MUST clear everything
                    // This prevents showing cached data without a valid session
                    console.log('No session found - clearing all cached data');
                    setSession(null);
                    setUser(null);
                    localStorage.removeItem('tijani_user_profile');
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error during session initialization:", error);
                // On error, also clear to be safe
                setSession(null);
                setUser(null);
                localStorage.removeItem('tijani_user_profile');
                setLoading(false);
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
        <ToastProvider>
            <AuthContext.Provider value={{ session, user, isAdmin, loading, logout, refetchUser: () => session ? fetchUserProfile(session) : Promise.resolve() }}>
                <ToastContainer />
                <Routes>
                    {/* Public route for QR code verification */}
                    <Route path="/verify-visitor/:id" element={<VerifyInvitationPage />} />

                    {/* All other routes use the authenticated flow */}
                    <Route path="/*" element={renderContent()} />
                </Routes>
            </AuthContext.Provider>
        </ToastProvider>
    );
};

export default App;
