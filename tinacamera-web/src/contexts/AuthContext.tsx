import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../services/api';

interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (full_name: string, email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  updateUser: (data: { full_name?: string; phone?: string; email?: string }) => Promise<{ ok: boolean; message?: string }>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: () => { },
  updateUser: async () => ({ ok: false }),
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('tinacamera_token');
    if (stored) {
      setToken(stored);
      authApi.getProfile(stored).then(res => {
        if (res.ok && res.data?.user) {
          setUser(res.data.user);
        } else {
          localStorage.removeItem('tinacamera_token');
          setToken(null);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.ok && res.data?.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('tinacamera_token', res.data.token);
      return { ok: true };
    }
    return { ok: false, message: res.message };
  };

  const register = async (full_name: string, email: string, password: string) => {
    const res = await authApi.register(full_name, email, password);
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, message: res.message };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('tinacamera_token');
  };

  const updateUser = async (data: { full_name?: string; phone?: string; email?: string }) => {
    if (!token) return { ok: false, message: 'Chưa đăng nhập' };
    const res = await authApi.updateProfile(token, data);
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      return { ok: true };
    }
    return { ok: false, message: res.message };
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
