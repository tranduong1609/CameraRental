import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Link, useRouter } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    decorCircle1: { position: 'absolute', top: 0, right: 0, width: 320, height: 320, borderRadius: 160, backgroundColor: colors.primary, opacity: 0.05, transform: [{ translateY: -80 }, { translateX: 40 }] },
    decorCircle2: { position: 'absolute', bottom: 0, left: 0, width: 320, height: 320, borderRadius: 160, backgroundColor: colors.inversePrimary, opacity: 0.1, transform: [{ translateY: 80 }, { translateX: -40 }] },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
    headerSection: { marginBottom: 32, alignItems: 'center', marginTop: 16 },
    appName: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
    glassCard: { borderRadius: 24, overflow: 'hidden' },
    cardInner: { padding: 20, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 24, backgroundColor: isDark ? 'transparent' : colors.cardBackground },
    label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 1.5 },
    inputRow: { backgroundColor: colors.inputBackground, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, marginBottom: 16, borderWidth: 1, borderColor: colors.inputBorder },
    inputRowLast: { marginBottom: 24 },
    inputText: { flex: 1, color: colors.text, marginLeft: 12, fontSize: 16, height: '100%' },
    tosText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    tosLink: { color: colors.primary, fontWeight: '600' },
    registerBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    registerBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 18 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.separator },
    dividerText: { color: colors.textMuted, paddingHorizontal: 16, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 16 },
    socialBtn: { flex: 1, backgroundColor: colors.inputBackground, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    loginRow: { marginTop: 32, flexDirection: 'row', justifyContent: 'center', paddingBottom: 24 },
    loginHint: { color: colors.textSecondary },
    loginLink: { color: colors.primary, fontWeight: '700' },
  }), [colors, isDark]);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không đúng định dạng (VD: name@example.com).');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    const result = await authApi.register(name, email, password);
    setLoading(false);

    if (result.ok) {
      if (result.data?.token) {
        // Backend trả về token → lưu token và chuyển qua onboarding
        await login(result.data.token);
        router.replace({
          pathname: '/onboarding',
          params: { name, email },
        });
      } else {
        // Không có token → yêu cầu đăng nhập thủ công
        Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng đăng nhập.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      }
    } else {
      Alert.alert('Đăng ký thất bại', result.message || 'Đã xảy ra lỗi.');
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
          <Text style={s.subtitle}>Tạo tài khoản để khám phá thiết bị nhiếp ảnh hàng đầu.</Text>
        </View>

        {/* Glass Card */}
        <View style={s.glassCard}>
          {isDark && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
          <View style={s.cardInner}>
             {/* Name Input */}
             <Text style={s.label}>HỌ VÀ TÊN</Text>
             <View style={s.inputRow}>
               <Feather name="user" size={20} color={colors.textMuted} />
               <TextInput 
                 style={s.inputText}
                 placeholder="Nguyễn Văn A"
                 placeholderTextColor={colors.placeholder}
                 value={name}
                 onChangeText={setName}
               />
             </View>

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
                 secureTextEntry
               />
             </View>

             {/* Confirm Password Input */}
             <Text style={s.label}>XÁC NHẬN MẬT KHẨU</Text>
             <View style={[s.inputRow, s.inputRowLast]}>
               <Feather name="check-circle" size={20} color={colors.textMuted} />
               <TextInput 
                 style={s.inputText}
                 placeholder="••••••••"
                 placeholderTextColor={colors.placeholder}
                 value={confirmPassword}
                 onChangeText={setConfirmPassword}
                 secureTextEntry
               />
             </View>

             {/* Terms of Service */}
             <Text style={s.tosText}>
                Bằng việc đăng ký, bạn đồng ý với <Text style={s.tosLink}>Điều khoản dịch vụ</Text> và <Text style={s.tosLink}>Chính sách bảo mật</Text> của chúng tôi.
             </Text>

             {/* Signup Button */}
             <TouchableOpacity 
               style={s.registerBtn}
               onPress={handleRegister}
               disabled={loading}
             >
               {loading ? (
                 <ActivityIndicator color={colors.onPrimary} />
               ) : (
                 <Text style={s.registerBtnText}>Đăng Ký</Text>
               )}
             </TouchableOpacity>

             {/* Divider */}
             <View style={s.dividerRow}>
               <View style={s.dividerLine} />
               <Text style={s.dividerText}>Hoặc</Text>
               <View style={s.dividerLine} />
             </View>

             {/* Social Login */}
             <View style={s.socialRow}>
               <TouchableOpacity style={s.socialBtn}>
                 <FontAwesome5 name="google" size={16} color={colors.text} />
               </TouchableOpacity>
               <TouchableOpacity style={s.socialBtn}>
                 <FontAwesome5 name="facebook-f" size={16} color={colors.text} />
               </TouchableOpacity>
             </View>

          </View>
        </View>

        {/* Login Link */}
        <View style={s.loginRow}>
          <Text style={s.loginHint}>Đã có tài khoản? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={s.loginLink}>Quay lại Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
