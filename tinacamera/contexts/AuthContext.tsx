import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserInfo {
  _id: string;
  full_name: string;
  phone: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  auth_provider: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isStoreOwner: boolean;
  token: string | null;
  user: UserInfo | null;
  login: (token: string, user?: UserInfo) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserInfo) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  isStoreOwner: false,
  token: null,
  user: null,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: isClerkLoaded, signOut } = useClerkAuth();
  const [backendToken, setBackendToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        // Nếu Clerk chưa load xong thì đợi
        if (!isClerkLoaded) return;

        if (isSignedIn) {
          // Đã đăng nhập Clerk → kiểm tra xem có backend token không
          const savedToken = await AsyncStorage.getItem('auth_token');
          const savedUser = await AsyncStorage.getItem('auth_user');
          if (savedToken) {
            setBackendToken(savedToken);
          }
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        } else {
          // Chưa đăng nhập Clerk → xóa backend token
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('auth_user');
          setBackendToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Lỗi khi đọc token:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, [isClerkLoaded, isSignedIn]);

  const login = async (newToken: string, newUser?: UserInfo) => {
    try {
      await AsyncStorage.setItem('auth_token', newToken);
      setBackendToken(newToken);
      if (newUser) {
        await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
        setUser(newUser);
      }
      


    } catch (error) {
      console.error('Lỗi khi lưu token:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      setBackendToken(null);
      setUser(null);
      await signOut();
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    }
  };

  const updateUser = async (newUser: UserInfo) => {
    try {
      await AsyncStorage.setItem('auth_user', JSON.stringify(newUser));
      setUser(newUser);
    } catch (error) {
      console.error('Lỗi khi cập nhật user:', error);
    }
  };

  // isAuthenticated = có backend token
  const isAuthenticated = !!backendToken;
  const isStoreOwner = user?.role === 'store_owner';

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: !isClerkLoaded || isLoading,
        isStoreOwner,
        token: backendToken,
        user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
