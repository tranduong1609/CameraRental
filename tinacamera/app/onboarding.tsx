import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; email?: string }>();
  const { token, updateUser } = useAuth();

  const [fullName, setFullName] = useState(params.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(params.email || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại.');
      return;
    }
    if (!/^(0[3-9][0-9]{8})$/.test(phone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (VD: 0899259410).');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không đúng định dạng (VD: name@example.com).');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.updateProfile(token!, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });

      if (res.ok && res.data?.user) {
        await updateUser(res.data.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể cập nhật thông tin.');
      }
    } catch {
      Alert.alert('Lỗi', 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View className="mt-8 mb-8 items-center">
            <View className="bg-pink-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="person-add" size={36} color="#F9B3D1" />
            </View>
            <Text className="text-white text-2xl font-bold text-center">
              Hoàn tất thông tin
            </Text>
            <Text className="text-zinc-400 text-sm text-center mt-2 leading-5">
              Vui lòng nhập thông tin cá nhân để chúng tôi{'\n'}có thể liên hệ bạn khi cần
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Full Name */}
            <View>
              <Text className="text-zinc-400 text-xs font-bold mb-2 ml-1 tracking-wider uppercase">
                Họ và tên
              </Text>
              <View className="bg-zinc-900 border border-zinc-800 rounded-2xl flex-row items-center px-4 h-14">
                <Ionicons name="person-outline" size={20} color="#71717A" />
                <TextInput
                  className="flex-1 text-white text-base ml-3 h-full"
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor="#52525B"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Phone */}
            <View>
              <Text className="text-zinc-400 text-xs font-bold mb-2 ml-1 tracking-wider uppercase">
                Số điện thoại
              </Text>
              <View className="bg-zinc-900 border border-zinc-800 rounded-2xl flex-row items-center px-4 h-14">
                <Ionicons name="call-outline" size={20} color="#71717A" />
                <TextInput
                  className="flex-1 text-white text-base ml-3 h-full"
                  placeholder="0899259410"
                  placeholderTextColor="#52525B"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
            </View>

            {/* Email */}
            <View>
              <Text className="text-zinc-400 text-xs font-bold mb-2 ml-1 tracking-wider uppercase">
                Email
              </Text>
              <View className="bg-zinc-900 border border-zinc-800 rounded-2xl flex-row items-center px-4 h-14">
                <Ionicons name="mail-outline" size={20} color="#71717A" />
                <TextInput
                  className="flex-1 text-white text-base ml-3 h-full"
                  placeholder="email@example.com"
                  placeholderTextColor="#52525B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Info Note */}
          <View className="flex-row items-start mt-6 px-2">
            <Ionicons name="shield-checkmark" size={16} color="#10B981" style={{ marginTop: 2 }} />
            <Text className="text-zinc-500 text-xs ml-2 flex-1 leading-5">
              Thông tin của bạn được bảo mật và chỉ sử dụng cho mục đích liên hệ khi thuê thiết bị.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View className="px-5 py-4 bg-zinc-950 border-t border-zinc-900">
          <TouchableOpacity
            className={`py-4 rounded-full items-center flex-row justify-center ${loading ? 'bg-zinc-700' : 'bg-pink-500'}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#18181B" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#09090B" />
                <Text className="text-zinc-950 font-bold text-lg ml-2">Hoàn tất</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
