import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminMore() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, marginHorizontal: 16, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.outlineVariant },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant, marginRight: 16 },
    profileInfo: { flex: 1 },
    profileName: { color: colors.text, fontSize: 18, fontWeight: '700' },
    profileEmail: { color: colors.textMuted, fontSize: 14, marginTop: 3 },
    profileRole: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 6, backgroundColor: colors.primary + '10', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-start' },
    section: { marginTop: 24, paddingHorizontal: 16 },
    sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 14, padding: 16, marginBottom: 8 },
    menuItemContent: { marginLeft: 14, flex: 1 },
    menuItemLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
    menuItemValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBackground, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ef444430' },
    logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700', marginLeft: 10 },
    version: { color: colors.textMuted + '40', fontSize: 12, textAlign: 'center', marginTop: 30 },
  }), [colors]);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Cài đặt</Text>
        </View>

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{user?.full_name || 'Chủ cửa hàng'}</Text>
            <Text style={s.profileEmail}>{user?.email || ''}</Text>
            <Text style={s.profileRole}>Store Manager</Text>
          </View>
        </View>

        {/* Store Info Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Thông tin cửa hàng</Text>
          <View style={s.menuItem}>
            <MaterialIcons name="store" size={22} color={colors.primary} />
            <View style={s.menuItemContent}>
              <Text style={s.menuItemLabel}>Tên cửa hàng</Text>
              <Text style={s.menuItemValue}>Tina Camera</Text>
            </View>
          </View>
          <View style={s.menuItem}>
            <Ionicons name="location-outline" size={22} color={colors.primary} />
            <View style={s.menuItemContent}>
              <Text style={s.menuItemLabel}>Địa chỉ</Text>
              <Text style={s.menuItemValue}>Thanh Xuân, Hà Nội</Text>
            </View>
          </View>
          <View style={s.menuItem}>
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <View style={s.menuItemContent}>
              <Text style={s.menuItemLabel}>Giờ hoạt động</Text>
              <Text style={s.menuItemValue}>08:00 - 21:00</Text>
            </View>
          </View>
          <View style={s.menuItem}>
            <Ionicons name="call-outline" size={22} color={colors.primary} />
            <View style={s.menuItemContent}>
              <Text style={s.menuItemLabel}>Điện thoại</Text>
              <Text style={s.menuItemValue}>0901 234 567</Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tài khoản</Text>
          <View style={s.menuItem}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            <View style={s.menuItemContent}>
              <Text style={s.menuItemLabel}>Vai trò</Text>
              <Text style={s.menuItemValue}>Chủ cửa hàng (store_owner)</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text style={s.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.version}>TinaCamera Admin v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
