import { createContext } from 'react';
import type { User } from '../../../shared/types/api';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);