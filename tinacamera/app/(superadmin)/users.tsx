import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert, StyleSheet, Modal, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { superAdminApi } from '../../services/api';

const ROLES = [
  { key: 'customer', label: 'Khách hàng', color: '#3b82f6' },
  { key: 'store_owner', label: 'Chủ cửa hàng', color: '#f59e0b' },
  { key: 'staff', label: 'Nhân viên', color: '#8b5cf6' },
  { key: 'admin', label: 'Quản trị viên', color: '#10b981' }
];

export default function SuperAdminUsers() {
  const { token, user: currentUser } = useAuth();
  const { colors } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState('');

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 12 },
    searchInput: { flex: 1, color: colors.text, padding: 12, fontSize: 15 },
    filterRow: { height: 45, marginBottom: 16 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.cardBackground, marginRight: 8, borderWidth: 1, borderColor: colors.outlineVariant },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    filterChipTextActive: { color: colors.onPrimary },
    countText: { color: colors.textMuted, fontSize: 13, marginBottom: 16 },
    userCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, flexDirection: 'row', marginBottom: 12, borderWidth: 1, borderColor: colors.outlineVariant },
    userInfo: { flex: 1 },
    userName: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
    userEmail: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
    userPhone: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
    badgesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
    roleBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    actionCol: { justifyContent: 'space-around', paddingLeft: 12 },
    actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
    actionBtnLock: { backgroundColor: '#ef444420' },
    actionBtnUnlock: { backgroundColor: '#10b98120' },
    modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    modalLabel: { color: colors.textMuted, fontSize: 14, marginBottom: 10 },
    rolesGrid: { gap: 10, marginBottom: 24 },
    roleOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.background },
    roleOptionText: { marginLeft: 12, fontSize: 16, fontWeight: '600' },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  }), [colors]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await superAdminApi.getUsers(token, search, roleFilter, statusFilter);
      if (res.ok && res.data?.users) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, search, roleFilter, statusFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchUsers]);

  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const openEditModal = (u: any) => {
    if (u._id === currentUser?._id) {
       Alert.alert('Hạn chế', 'Bạn không thể tự sửa quyền hoặc khoá chính mình.');
       return;
    }
    setEditingUser(u);
    setNewRole(u.role);
  };

  const saveRole = async () => {
    if (!token || !editingUser) return;
    setSaving(true);
    try {
      const res = await superAdminApi.updateUserRole(token, editingUser._id, newRole);
      if (res.ok) {
        Alert.alert('Thành công', 'Đã cập nhật phân quyền.');
        setEditingUser(null);
        fetchUsers();
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể lưu.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (targetUser: any) => {
    if (!token) return;
    if (targetUser._id === currentUser?._id) return;
    
    const nextStatus = !targetUser.is_active;
    const actionText = nextStatus ? 'mở khóa' : 'vô hiệu hoá';
    
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc muốn ${actionText} tài khoản của ${targetUser.full_name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý', onPress: async () => {
            const res = await superAdminApi.toggleUserStatus(token, targetUser._id, nextStatus);
            if (res.ok) {
               fetchUsers();
            } else {
               Alert.alert('Lỗi', res.message || 'Lỗi xử lý.');
            }
        }}
      ]
    );
  };

  const getRoleDisplay = (roleKey: string) => {
    return ROLES.find(r => r.key === roleKey) || { label: roleKey, color: '#9d8d92' };
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Quản lý Tài Khoản</Text>
      </View>
      
      <View style={s.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginLeft: 12 }} />
        <TextInput 
           style={s.searchInput}
           placeholder="Tìm tên, email, sđt..."
           placeholderTextColor={colors.placeholder}
           value={search}
           onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {['all', 'customer', 'store_owner', 'admin'].map(r => (
            <TouchableOpacity key={r} style={[s.filterChip, roleFilter === r && s.filterChipActive]} onPress={() => setRoleFilter(r)}>
                <Text style={[s.filterChipText, roleFilter === r && s.filterChipTextActive]}>
                   {r === 'all' ? 'Tất cả quyền' : ROLES.find(x => x.key === r)?.label}
                </Text>
            </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
         contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={s.countText}>Tìm thấy {users.length} tài khoản</Text>
        
        {users.map(u => {
          const roleDisplay = getRoleDisplay(u.role);
          const isDeactivated = !u.is_active;
          return (
            <View key={u._id} style={[s.userCard, isDeactivated && { opacity: 0.6 }]}>
               <View style={s.userInfo}>
                  <Text style={s.userName}>{u.full_name} {u._id === currentUser?._id ? '(Bạn)' : ''}</Text>
                  <Text style={s.userEmail}>{u.email}</Text>
                  {u.phone && <Text style={s.userPhone}>{u.phone}</Text>}
                  
                  <View style={s.badgesRow}>
                    <View style={[s.roleBadge, { backgroundColor: roleDisplay.color + '20', borderColor: roleDisplay.color }]}>
                       <Text style={[s.roleBadgeText, { color: roleDisplay.color }]}>{roleDisplay.label}</Text>
                    </View>
                    {isDeactivated && (
                        <View style={[s.roleBadge, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]}>
                           <Text style={[s.roleBadgeText, { color: '#ef4444' }]}>Bị khóa</Text>
                        </View>
                    )}
                  </View>
               </View>

               <View style={s.actionCol}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openEditModal(u)}>
                     <Ionicons name="settings-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, isDeactivated ? s.actionBtnUnlock : s.actionBtnLock]} onPress={() => toggleStatus(u)}>
                     <Ionicons name={isDeactivated ? "lock-open" : "lock-closed"} size={20} color={isDeactivated ? "#10b981" : "#ef4444"} />
                  </TouchableOpacity>
               </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Edit Role Modal */}
      <Modal visible={!!editingUser} transparent animationType="slide">
         <View style={s.modalOverlay}>
            <View style={s.modalContent}>
               <View style={s.modalHeader}>
                 <Text style={s.modalTitle}>Cập nhật phân quyền</Text>
                 <TouchableOpacity onPress={() => setEditingUser(null)}>
                   <Ionicons name="close" size={24} color={colors.text} />
                 </TouchableOpacity>
               </View>

               <Text style={s.modalLabel}>Tài khoản: <Text style={{ color: colors.text }}>{editingUser?.full_name}</Text></Text>
               <Text style={s.modalLabel}>Chọn vai trò mới:</Text>
               
               <View style={s.rolesGrid}>
                 {ROLES.map(r => (
                    <TouchableOpacity 
                       key={r.key} 
                       style={[s.roleOption, newRole === r.key && { borderColor: r.color, backgroundColor: r.color + '15' }]} 
                       onPress={() => setNewRole(r.key)}>
                       <Ionicons name={newRole === r.key ? "radio-button-on" : "radio-button-off"} size={20} color={r.color} />
                       <Text style={[s.roleOptionText, { color: r.color }]}>{r.label}</Text>
                    </TouchableOpacity>
                 ))}
               </View>

               <TouchableOpacity style={s.saveBtn} onPress={saveRole} disabled={saving}>
                 {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={s.saveBtnText}>Lưu thay đổi</Text>}
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}
