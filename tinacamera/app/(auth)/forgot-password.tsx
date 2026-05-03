import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    decorCircle: { position: 'absolute', top: '10%', right: '-10%', width: 288, height: 288, borderRadius: 144, backgroundColor: colors.primary, opacity: 0.05 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    backBtn: { marginBottom: 32, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.outlineVariant },
    titleSection: { marginBottom: 40 },
    title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 12 },
    description: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
    glassCard: { borderRadius: 24, overflow: 'hidden' },
    cardInner: { padding: 24, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 24, backgroundColor: isDark ? 'transparent' : colors.cardBackground },
    label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 8, marginLeft: 4, letterSpacing: 1.5 },
    inputRow: { backgroundColor: colors.inputBackground, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, marginBottom: 32, borderWidth: 1, borderColor: colors.inputBorder },
    inputText: { flex: 1, color: colors.text, marginLeft: 12, fontSize: 16, height: '100%' },
    submitBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    submitBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 18 },
  }), [colors, isDark]);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email.');
      return;
    }

    setLoading(true);
    const result = await authApi.forgotPassword(email);
    setLoading(false);

    if (result.ok) {
      Alert.alert('Đã gửi', result.data?.message || 'Vui lòng kiểm tra email của bạn.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } else {
      Alert.alert('Lỗi', result.message || 'Đã xảy ra lỗi.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Background Decor */}
      <View style={s.decorCircle} />
      
      <View style={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={s.titleSection}>
          <Text style={s.title}>Quên mật khẩu?</Text>
          <Text style={s.description}>Đừng lo lắng! Vui lòng nhập địa chỉ email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi một liên kết để khôi phục mật khẩu.</Text>
        </View>

        {/* Glass Card */}
        <View style={s.glassCard}>
          {isDark && <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />}
          <View style={s.cardInner}>
             {/* Email Input */}
             <Text style={s.label}>ĐỊA CHỈ EMAIL</Text>
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

             {/* Submit Button */}
             <TouchableOpacity 
               style={s.submitBtn}
               onPress={handleForgotPassword}
               disabled={loading}
             >
               {loading ? (
                 <ActivityIndicator color={colors.onPrimary} />
               ) : (
                 <Text style={s.submitBtnText}>Gửi Link Khôi Phục</Text>
               )}
             </TouchableOpacity>

          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
