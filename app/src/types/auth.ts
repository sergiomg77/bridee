export type AuthMode = 'signin' | 'signup';

export interface AuthFormData {
  email: string;
  password: string;
}

export interface AuthResult<T = null> {
  data: T | null;
  error: Error | null;
}
