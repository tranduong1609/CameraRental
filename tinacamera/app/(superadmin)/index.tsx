import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { superAdminApi } from '../../services/api';
import { useRouter } from 'expo-router';

export default function SuperAdminDashboard() {
  const { token, user, logout } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center' },
    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 10, justifyContent: 'center' },
    statCard: { width: '45%', backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statNum: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
    statLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  }), [colors]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await superAdminApi.getUsers(token);
      if (res.ok && res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };
  
  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Xin chào, {user?.full_name}</Text>
            <Text style={s.title}>Quản trị hệ thống</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
             <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={s.statsContainer}>
          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <Text style={s.statNum}>{stats?.total || 0}</Text>
            <Text style={s.statLabel}>Tổng Tài Khoản</Text>
          </View>

          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            </View>
            <Text style={s.statNum}>{stats?.admins || 0}</Text>
            <Text style={s.statLabel}>Quản trị viên</Text>
          </View>

          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="storefront" size={24} color="#f59e0b" />
            </View>
            <Text style={s.statNum}>{stats?.storeOwners || 0}</Text>
            <Text style={s.statLabel}>Chủ cửa hàng</Text>
          </View>

          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="person" size={24} color="#3b82f6" />
            </View>
            <Text style={s.statNum}>{stats?.customers || 0}</Text>
            <Text style={s.statLabel}>Khách hàng</Text>
          </View>
          
          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: '#ef444420' }]}>
              <Ionicons name="lock-closed" size={24} color="#ef4444" />
            </View>
            <Text style={s.statNum}>{stats?.inactive || 0}</Text>
            <Text style={s.statLabel}>Bị vô hiệu hoá</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
