import { View, Text, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { authApi } from '../../services/api';

export default function ProfileScreen() {
  const { logout, user, token, updateUser } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Auto-fetch profile nếu chưa có user data
  useEffect(() => {
    if (token && !user) {
      setLoadingProfile(true);
      authApi.getProfile(token).then(res => {
        if (res.ok && res.data?.user) {
          updateUser(res.data.user);
        }
      }).finally(() => setLoadingProfile(false));
    }
  }, [token, user]);

  const openEditModal = () => {
    setEditName(user?.full_name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên.');
      return;
    }
    if (editPhone.trim() && !/^(0[3-9][0-9]{8})$/.test(editPhone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (VD: 0899259410).');
      return;
    }
    if (editEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      Alert.alert('Lỗi', 'Email không đúng định dạng (VD: name@example.com).');
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.updateProfile(token!, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
      });

      if (res.ok && res.data?.user) {
        await updateUser(res.data.user);
        setShowEditModal(false);
        Alert.alert('Thành công ✅', 'Thông tin cá nhân đã được cập nhật.');
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể cập nhật thông tin.');
      }
    } catch {
      Alert.alert('Lỗi', 'Đã xảy ra lỗi.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accentPink} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 32 }}>
      {/* User Info */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.separator, marginBottom: 24 }}
        onPress={openEditModal}
        activeOpacity={0.7}
      >
        <Ionicons name="person-circle" size={64} color={colors.accentPink} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 20 }}>{user?.full_name || 'Chưa cập nhật'}</Text>
          {user?.email ? (
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>{user.email}</Text>
          ) : null}
          {user?.phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="call" size={12} color={colors.iconDefault} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>{user.phone}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.accentPink, fontSize: 12, marginTop: 4 }}>Bấm để thêm số điện thoại</Text>
          )}
        </View>
        <Ionicons name="create-outline" size={20} color={colors.iconDefault} />
      </TouchableOpacity>

      {/* ── Giao diện (Appearance) ── */}
      <View style={{ marginBottom: 8 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 }}>Giao diện</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: colors.separator }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={colors.accentPink} />
            <Text style={{ color: colors.text, fontSize: 16, marginLeft: 12 }}>
              {isDark ? 'Chế độ tối' : 'Chế độ sáng'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sunny" size={16} color={isDark ? colors.textMuted : colors.accentPink} />
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.outlineVariant, true: colors.accentPink }}
              thumbColor={isDark ? colors.primary : '#ffffff'}
              ios_backgroundColor={colors.outlineVariant}
            />
            <Ionicons name="moon" size={16} color={isDark ? colors.accentPink : colors.textMuted} />
          </View>
        </View>
      </View>

      {/* Menu Options */}
      {[
        { icon: 'time-outline', title: 'Lịch sử thuê máy', route: '/(tabs)/orders' as any },
        { icon: 'notifications-outline', title: 'Cài đặt thông báo' },
      ].map((item, index) => (
        <TouchableOpacity
          key={index}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.separator }}
          onPress={() => item.route && router.push(item.route)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={item.icon as any} size={24} color={colors.iconDefault} />
            <Text style={{ color: colors.text, fontSize: 16, marginLeft: 16 }}>{item.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconDefault} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity onPress={logout} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 16 }}>
        <Ionicons name="log-out-outline" size={24} color={colors.dangerText} />
        <Text style={{ color: colors.dangerText, fontSize: 16, marginLeft: 16, fontWeight: '600' }}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Thông tin cá nhân</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={colors.iconDefault} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Name */}
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Họ và tên</Text>
                <View style={{ backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, marginBottom: 16 }}>
                  <Ionicons name="person-outline" size={18} color={colors.iconDefault} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 16, marginLeft: 12, height: '100%' }}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor={colors.placeholder}
                    returnKeyType="next"
                  />
                </View>

                {/* Phone */}
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Số điện thoại</Text>
                <View style={{ backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, marginBottom: 16 }}>
                  <Ionicons name="call-outline" size={18} color={colors.iconDefault} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 16, marginLeft: 12, height: '100%' }}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="0899259410"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="phone-pad"
                    maxLength={11}
                    returnKeyType="next"
                  />
                </View>

                {/* Email */}
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Email</Text>
                <View style={{ backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, marginBottom: 24 }}>
                  <Ionicons name="mail-outline" size={18} color={colors.iconDefault} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 16, marginLeft: 12, height: '100%' }}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                </View>

                <TouchableOpacity
                  style={{ paddingVertical: 16, borderRadius: 999, alignItems: 'center', backgroundColor: saving ? colors.surfaceContainerHigh : colors.buttonPrimary }}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.buttonPrimaryText} />
                  ) : (
                    <Text style={{ color: colors.buttonPrimaryText, fontWeight: '700', fontSize: 18 }}>Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
