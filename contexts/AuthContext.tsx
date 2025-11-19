
import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

export interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
  refetchUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);
