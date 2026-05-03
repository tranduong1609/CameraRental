import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Link, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSSO, useSignIn } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// Giúp đóng web browser sau khi OAuth xong (warm up)
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clerk SSO hooks
  const { startSSOFlow: startGoogleSSO } = useSSO();
  const { startSSOFlow: startFacebookSSO } = useSSO();

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    decorCircle1: { position: 'absolute', top: '-5%', right: '-10%', width: 320, height: 320, borderRadius: 160, backgroundColor: colors.primary, opacity: 0.05 },
    decorCircle2: { position: 'absolute', bottom: '-10%', left: '-10%', width: 384, height: 384, borderRadius: 192, backgroundColor: colors.primary, opacity: 0.05 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
    headerSection: { marginBottom: 40, alignItems: 'center' },
    appName: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { color: colors.textSecondary, fontSize: 16, marginTop: 8, textAlign: 'center' },
    glassCard: { borderRadius: 24, overflow: 'hidden' },
    cardInner: { padding: 24, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 24, backgroundColor: isDark ? 'transparent' : colors.cardBackground },
    label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 1.5 },
    inputRow: { backgroundColor: colors.inputBackground, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, marginBottom: 20, borderWidth: 1, borderColor: colors.inputBorder },
    inputText: { flex: 1, color: colors.text, marginLeft: 12, fontSize: 16, height: '100%' },
    forgotRow: { alignItems: 'flex-end', marginBottom: 32, marginTop: 8 },
    forgotText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    loginBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    loginBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 18 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.separator },
    dividerText: { color: colors.textMuted, paddingHorizontal: 16, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 16 },
    socialBtn: { flex: 1, backgroundColor: colors.inputBackground, height: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    socialText: { color: colors.text, marginLeft: 12, fontWeight: '600' },
    signupRow: { marginTop: 32, flexDirection: 'row', justifyContent: 'center' },
    signupHint: { color: colors.textSecondary },
    signupLink: { color: colors.primary, fontWeight: '700' },
  }), [colors, isDark]);

  // ─── Đăng nhập bằng Google (qua Clerk) ───
  const handleGoogleLogin = useCallback(async () => {
    try {
      setLoading(true);

      const { createdSessionId, setActive, signIn, signUp } = await startGoogleSSO({
        strategy: 'oauth_google',
      });

      if (createdSessionId) {
        // Đăng nhập Clerk thành công → set session active
        await setActive!({ session: createdSessionId });

        // Gửi Clerk token lên backend để lấy JWT của riêng mình
        const result = await authApi.clerkLogin(createdSessionId);
        if (result.ok && result.data?.token) {
          await login(result.data.token);
        } else {
          // Nếu backend chưa hỗ trợ Clerk, vẫn cho vào app (Clerk đã xác thực rồi)
          await login(createdSessionId);
        }
      }
    } catch (err: any) {
      console.error('Google SSO error:', err);
      Alert.alert('Lỗi', err?.errors?.[0]?.message || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  }, [startGoogleSSO, login]);

  // ─── Đăng nhập bằng Facebook (qua Clerk) ───
  const handleFacebookLogin = useCallback(async () => {
    try {
      setLoading(true);

      const { createdSessionId, setActive } = await startFacebookSSO({
        strategy: 'oauth_facebook',
      });

      if (createdSessionId) {
        await setActive!({ session: createdSessionId });

        const result = await authApi.clerkLogin(createdSessionId);
        if (result.ok && result.data?.token) {
          await login(result.data.token);
        } else {
          await login(createdSessionId);
        }
      }
    } catch (err: any) {
      console.error('Facebook SSO error:', err);
      Alert.alert('Lỗi', err?.errors?.[0]?.message || 'Đăng nhập Facebook thất bại.');
    } finally {
      setLoading(false);
    }
  }, [startFacebookSSO, login]);

  // ─── Đăng nhập email/password (giữ nguyên) ───
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);
    const result = await authApi.login(email, password);
    setLoading(false);

    if (result.ok && result.data?.token) {
      await login(result.data.token, result.data.user);
    } else {
      Alert.alert('Đăng nhập thất bại', result.message || 'Sai email hoặc mật khẩu.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Background Decor */}
      <View style={s.decorCircle1} />
      <View style={s.decorCircle2} />

      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.headerSection}>
          <Text style={s.appName}>TinaCamera</Text>
          <Text style={s.subtitle}>Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.</Text>
        </View>

        {/* Glass Card */}
        <View style={s.glassCard}>
          {isDark && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
          <View style={s.cardInner}>

            {/* Email Input */}
            <Text style={s.label}>EMAIL</Text>
            <View style={s.inputRow}>
              <Feather name="mail" size={20} color={colors.textMuted} />
              <TextInput
                style={s.inputText}
                placeholder="name@example.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <Text style={s.label}>MẬT KHẨU</Text>
            <View style={s.inputRow}>
              <Feather name="lock" size={20} color={colors.textMuted} />
              <TextInput
                style={s.inputText}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <View style={s.forgotRow}>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text style={s.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={s.loginBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={s.loginBtnText}>Đăng Nhập</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>Hoặc tiếp tục với</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={s.socialRow}>
              <TouchableOpacity
                style={s.socialBtn}
                disabled={loading}
                onPress={handleGoogleLogin}
              >
                <FontAwesome5 name="google" size={18} color={colors.text} />
                <Text style={s.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.socialBtn}
                disabled={loading}
                onPress={handleFacebookLogin}
              >
                <FontAwesome5 name="facebook-f" size={18} color={colors.text} />
                <Text style={s.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Signup Link */}
        <View style={s.signupRow}>
          <Text style={s.signupHint}>Chưa có tài khoản? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={s.signupLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
