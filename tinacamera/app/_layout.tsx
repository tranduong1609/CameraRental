import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { RentalProvider } from '../contexts/RentalContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// Token cache cho Clerk sử dụng expo-secure-store
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      // Bỏ qua lỗi
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { isDark, colors } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    const inSuperadminGroup = segments[0] === '(superadmin)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && !inAuthGroup) {
      // Chưa đăng nhập và không ở trang auth → chuyển sang login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Đã đăng nhập mà vẫn ở trang auth → chuyển theo role
      if (user?.role === 'admin') {
        router.replace('/(superadmin)' as any);
      } else if (user?.role === 'store_owner') {
        router.replace('/(admin)' as any);
      } else {
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated) {
      // Các route độc lập (không thuộc group nào) — cho phép truy cập tự do
      const standaloneRoutes = ['product', 'cart', 'chatbot', 'payment', 'onboarding', 'modal'];
      const inStandaloneRoute = standaloneRoutes.includes(segments[0] as string);

      if (!inStandaloneRoute) {
        // Xử lý đi nhầm nhánh
        if (user?.role === 'admin' && !inSuperadminGroup) {
          router.replace('/(superadmin)' as any);
        } else if (user?.role === 'store_owner' && !inAdminGroup) {
          router.replace('/(admin)' as any);
        } else if (user?.role !== 'admin' && user?.role !== 'store_owner' && !inTabsGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(superadmin)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="chatbot" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <AuthProvider>
            <CartProvider>
              <RentalProvider>
                <RootLayoutNav />
              </RentalProvider>
            </CartProvider>
          </AuthProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </ThemeProvider>
  );
}
