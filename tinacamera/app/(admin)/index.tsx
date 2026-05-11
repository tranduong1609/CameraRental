import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { adminApi } from '../../services/api';
import { NotificationBell, NotificationModal } from '../../components/NotificationModal';

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
  overdueBookings: number;
}

interface RecentBooking {
  _id: string;
  booking_code: string;
  status: string;
  createdAt: string;
  total_amount: number;
  camera_id?: { name: string; brand: string };
  user_id?: { full_name: string };
  customer_info?: { full_name?: string };
}

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const { colors, isDark } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [revenuePeriod, setRevenuePeriod] = useState<string>('month_current');
  const [periodRevenue, setPeriodRevenue] = useState<{amount: number, count: number} | null>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [equipmentStats, setEquipmentStats] = useState<any>(null);
  const [showAllEquipment, setShowAllEquipment] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    name: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 2 },
    badge: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4, backgroundColor: colors.primary + '10', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, overflow: 'hidden', alignSelf: 'flex-start' },
    avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant },
    revenueCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.outlineVariant },
    revenueInner: { padding: 24 },
    revenueLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
    revenueAmount: { color: colors.primary, fontSize: 32, fontWeight: '800', marginTop: 8 },
    revenueSub: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginTop: 16, gap: 8 },
    statCard: { width: '47%', backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, borderLeftWidth: 3, flexGrow: 1 },
    statNumber: { color: colors.text, fontSize: 28, fontWeight: '700' },
    statLabel: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    section: { marginTop: 28, paddingHorizontal: 20 },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
    emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
    activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 14, padding: 14, marginBottom: 10 },
    activityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    activityContent: { flex: 1 },
    activityTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
    activitySub: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 11, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
    modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.separator },
    modalOptionActive: { borderBottomColor: colors.primary + '40' },
    modalOptionText: { color: colors.textSecondary, fontSize: 16 },
    modalOptionTextActive: { color: colors.primary, fontWeight: '600' },
    calendarActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingHorizontal: 10 },
    calendarButtonSecondary: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.separator, width: '45%', alignItems: 'center' },
    calendarButtonTextSecondary: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    calendarButtonPrimary: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 12, width: '45%', alignItems: 'center' },
    calendarButtonTextPrimary: { color: colors.onPrimary, fontWeight: 'bold', fontSize: 14 },
  }), [colors]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        adminApi.getStats(token),
        adminApi.getBookings(token),
      ]);
      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      if (bookingsRes.ok && bookingsRes.data?.bookings) {
        setRecentBookings(bookingsRes.data.bookings.slice(0, 5));
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (revenuePeriod === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }
    const fetchPeriod = async () => {
      if (!token) return;
      try {
        const [res, eqRes] = await Promise.all([
          adminApi.getRevenue(token, revenuePeriod, customStartDate, customEndDate),
          adminApi.getEquipmentStats(token, revenuePeriod, customStartDate, customEndDate)
        ]);
        
        if (res.ok && res.data) {
          setPeriodRevenue({
            amount: res.data.totalInPeriod,
            count: res.data.totalOrders
          });
          setChartData(res.data.data || []);
        }
        if (eqRes.ok && eqRes.data) {
          setEquipmentStats(eqRes.data);
        }
      } catch (error) {
        console.error('Fetch period error:', error);
      }
    };
    fetchPeriod();
  }, [revenuePeriod, customStartDate, customEndDate, token]);

  const handleDayPress = (day: any) => {
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(day.dateString);
      setCustomEndDate('');
      setMarkedDates({
        [day.dateString]: { startingDay: true, color: colors.primary, textColor: colors.onPrimary }
      });
    } else {
      const end = day.dateString;
      const start = customStartDate;
      if (end < start) {
        setCustomStartDate(end);
        setCustomEndDate('');
        setMarkedDates({
          [end]: { startingDay: true, color: colors.primary, textColor: colors.onPrimary }
        });
        return;
      }
      setCustomEndDate(end);
      let current = new Date(start);
      const endObj = new Date(end);
      let marks: any = {
        [start]: { startingDay: true, color: colors.primary, textColor: colors.onPrimary }
      };
      while (current < endObj) {
        current.setDate(current.getDate() + 1);
        const currString = current.toISOString().split('T')[0];
        if (currString !== end) {
          marks[currString] = { color: colors.accentPinkDim, textColor: colors.text };
        }
      }
      marks[end] = { endingDay: true, color: colors.primary, textColor: colors.onPrimary };
      setMarkedDates(marks);
    }
  };

  const handleConfirmCustomDates = () => {
    if (customStartDate && customEndDate) {
      setRevenuePeriod('custom');
      setShowPeriodModal(false);
      setCalendarMode(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('vi-VN') + 'đ';

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: 'Chờ thanh toán', color: '#f59e0b' },
      paid: { label: 'Đã thanh toán', color: '#3b82f6' },
      verified: { label: 'Đã xác minh', color: '#8b5cf6' },
      active: { label: 'Đang thuê', color: '#10b981' },
      returned: { label: 'Đã trả máy', color: '#06b6d4' },
      completed: { label: 'Hoàn tất', color: '#22c55e' },
      cancelled: { label: 'Đã hủy', color: '#ef4444' },
    };
    return map[status] || { label: status, color: '#8E8E93' };
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
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
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s.name} numberOfLines={1}>{user?.full_name || 'Store Manager'}</Text>
            <Text style={s.badge}>Store Manager</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <NotificationBell onPress={() => setShowNotificationModal(true)} />
            <View style={s.avatarCircle}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Revenue Card */}
        <TouchableOpacity style={s.revenueCard} activeOpacity={0.8} onPress={() => setShowPeriodModal(true)}>
          <View style={s.revenueInner}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.revenueLabel}>
                {revenuePeriod === 'today' ? 'Doanh thu (Hôm nay)' : 
                 revenuePeriod === 'month_current' ? 'Doanh thu (Tháng này)' :
                 revenuePeriod === 'month3' ? 'Doanh thu (3 tháng qua)' :
                 revenuePeriod === 'custom' ? `Doanh thu (${customStartDate} đến ${customEndDate})` :
                 'Doanh thu'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </View>
            <Text style={s.revenueAmount}>{formatCurrency(periodRevenue ? periodRevenue.amount : 0)}</Text>
            <Text style={s.revenueSub}>Từ {periodRevenue ? periodRevenue.count : 0} đơn hàng</Text>
          </View>
        </TouchableOpacity>

        {/* Revenue Chart */}
        {chartData.length > 0 && (
          <View style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: colors.cardBackground, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.outlineVariant }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, paddingBottom: 20, paddingTop: 10, gap: 4 }}>
              {chartData.map((d, i) => {
                const maxRev = Math.max(...chartData.map(c => c.revenue), 1);
                const heightPct = (d.revenue / maxRev) * 100;
                // X label logic
                let label = '';
                if (revenuePeriod === 'today') label = d.label.split(':')[0] + 'h';
                else if (revenuePeriod === 'month_current' || revenuePeriod === 'custom' || revenuePeriod === 'day') {
                  const parts = d.label.split('-');
                  label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.label;
                } else if (revenuePeriod === 'week') label = d.label.replace(/\d{4}-W/, 'T');
                else label = d.label.split('-')[1] || d.label;

                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    {d.revenue > 0 && (
                      <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 2, fontWeight: '600' }} numberOfLines={1}>
                        {d.revenue >= 1000000 ? (d.revenue/1000000).toFixed(1)+'tr' : (d.revenue/1000).toFixed(0)+'k'}
                      </Text>
                    )}
                    <View style={{ width: '80%', height: `${Math.max(heightPct, 2)}%`, backgroundColor: d.revenue > 0 ? colors.primary : colors.surfaceContainerHigh, borderRadius: 4 }} />
                    <Text style={{ fontSize: 8, color: colors.textSecondary, position: 'absolute', bottom: -16 }} numberOfLines={1}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <View style={[s.statCard, { borderLeftColor: '#10b981' }]}>
            <Text style={s.statNumber}>{stats?.activeBookings || 0}</Text>
            <Text style={s.statLabel}>Đang thuê</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={s.statNumber}>{stats?.pendingBookings || 0}</Text>
            <Text style={s.statLabel}>Chờ xử lý</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={s.statNumber}>{stats?.overdueBookings || 0}</Text>
            <Text style={s.statLabel}>Quá hạn</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: '#22c55e' }]}>
            <Text style={s.statNumber}>{stats?.completedBookings || 0}</Text>
            <Text style={s.statLabel}>Hoàn tất</Text>
          </View>
        </View>

        {/* Equipment Stats */}
        {equipmentStats && (
          <View style={{ marginTop: 24, marginHorizontal: 20 }}>
            {/* Top Cameras */}
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>🏆 Thiết bị thuê nhiều nhất</Text>
              {(showAllEquipment ? equipmentStats.topCameras : equipmentStats.topCameras.slice(0, 3)).map((cam: any, i: number) => (
                <View key={cam.camera_id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: colors.textMuted, fontWeight: '700', width: 20 }}>{i + 1}.</Text>
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 16 }}>📷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{cam.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{cam.total_bookings} lần thuê • {(cam.total_revenue / 1000000).toFixed(1)}tr đ</Text>
                  </View>
                </View>
              ))}
              {equipmentStats.topCameras.length > 3 && (
                <TouchableOpacity onPress={() => setShowAllEquipment(!showAllEquipment)} style={{ backgroundColor: colors.surfaceContainerHigh, padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{showAllEquipment ? 'Thu gọn' : `Xem thêm ${equipmentStats.topCameras.length - 3} thiết bị`}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Category Stats */}
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.outlineVariant }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>📊 Phân bổ danh mục</Text>
              {equipmentStats.categoryStats.map((cat: any) => {
                const total = equipmentStats.categoryStats.reduce((s: number, c: any) => s + c.count, 0);
                const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                return (
                  <View key={cat.category} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>{cat.category}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{pct}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Hoạt động gần đây</Text>
          {recentBookings.length === 0 ? (
            <Text style={s.emptyText}>Chưa có đơn hàng nào.</Text>
          ) : (
            recentBookings.map((booking) => {
              const statusInfo = getStatusLabel(booking.status);
              const customerName = booking.user_id?.full_name || booking.customer_info?.full_name || 'Khách hàng';
              return (
                <View key={booking._id} style={s.activityItem}>
                  <View style={[s.activityDot, { backgroundColor: statusInfo.color }]} />
                  <View style={s.activityContent}>
                    <Text style={s.activityTitle}>
                      {booking.camera_id?.name || 'Thiết bị'} — {customerName}
                    </Text>
                    <Text style={s.activitySub}>
                      {getTimeAgo(booking.createdAt)} • {booking.booking_code}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                    <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Revenue Period Modal */}
      <Modal visible={showPeriodModal} transparent animationType="fade">
        <Pressable style={s.modalOverlay} onPress={() => { setShowPeriodModal(false); setCalendarMode(false); }}>
          <View style={[s.modalContent, calendarMode && { height: '80%' }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{calendarMode ? 'Chọn khoảng thời gian' : 'Chọn thời gian'}</Text>
            
            {calendarMode ? (
              <View style={{ flex: 1 }}>
                <Calendar
                  markingType={'period'}
                  markedDates={markedDates}
                  onDayPress={handleDayPress}
                  theme={{
                    backgroundColor: colors.calendarBg,
                    calendarBackground: colors.calendarBg,
                    textSectionTitleColor: colors.calendarSectionTitle,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: colors.onPrimary,
                    todayTextColor: colors.calendarToday,
                    dayTextColor: colors.calendarText,
                    textDisabledColor: colors.calendarDisabled,
                    monthTextColor: colors.calendarText,
                    arrowColor: colors.calendarArrow,
                  }}
                />
                <View style={s.calendarActions}>
                  <TouchableOpacity style={s.calendarButtonSecondary} onPress={() => setCalendarMode(false)}>
                    <Text style={s.calendarButtonTextSecondary}>Trở lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[s.calendarButtonPrimary, (!customStartDate || !customEndDate) && { opacity: 0.5 }]} 
                    disabled={!customStartDate || !customEndDate}
                    onPress={handleConfirmCustomDates}
                  >
                    <Text style={s.calendarButtonTextPrimary}>Xác nhận</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                {[
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'month_current', label: 'Tháng này' },
                  { id: 'month3', label: '3 tháng gần đây' },
                  { id: 'custom', label: 'Tùy chỉnh (Chọn khoảng thời gian)' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.modalOption, revenuePeriod === item.id && s.modalOptionActive]}
                    onPress={() => {
                      if (item.id === 'custom') {
                        setCalendarMode(true);
                      } else {
                        setRevenuePeriod(item.id);
                        setShowPeriodModal(false);
                      }
                    }}
                  >
                    <Text style={[s.modalOptionText, revenuePeriod === item.id && s.modalOptionTextActive]}>
                      {item.label}
                    </Text>
                    {revenuePeriod === item.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Notification Modal */}
      <NotificationModal 
        visible={showNotificationModal} 
        onClose={() => setShowNotificationModal(false)} 
      />
    </SafeAreaView>
  );
}
