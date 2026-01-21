
import { createContext, useContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../types';

export interface AuthContextType {
  session: { user: FirebaseUser } | null;
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
  logout: async () => { },
  refetchUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);
