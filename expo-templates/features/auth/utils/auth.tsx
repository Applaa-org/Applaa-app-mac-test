import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User { id: string; email: string; name?: string }
export interface AuthState { user: User | null; isLoading: boolean; isAuthenticated: boolean }
export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
}

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true, isAuthenticated: false });

  useEffect(() => { init(); }, []);
  const init = async () => {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const userRaw = await AsyncStorage.getItem(USER_DATA_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    setState({ user, isLoading: false, isAuthenticated: !!(token && user) });
  };

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const user: User = { id: '1', email, name: email.split('@')[0] };
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, 'token');
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    setState({ user, isLoading: false, isAuthenticated: true });
  };

  const signUp = async (email: string, password: string, name?: string) => {
    return signIn(email, password);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    setState({ user: null, isLoading: false, isAuthenticated: false });
  };

  const authenticateWithBiometrics = async () => {
    if (!(await LocalAuthentication.hasHardwareAsync())) return false;
    if (!(await LocalAuthentication.isEnrolledAsync())) return false;
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Authenticate' });
    return !!res.success;
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, authenticateWithBiometrics }}>
      {children}
    </AuthContext.Provider>
  );
};


