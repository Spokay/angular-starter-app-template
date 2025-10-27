export interface UserContext {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface AuthState {
  user: UserContext | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}
