import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert, StyleSheet, Modal, Platform, Dimensions, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { adminApi } from '../../services/api';

// Hàm parse dữ liệu QR từ CCCD (dạng phân tách bởi dấu |)
const parseCccdQr = (rawData: string) => {
  const parts = rawData.split('|');
  return {
    cccd_number: parts[0] || '',
    cmnd_number: parts[1] || '',
    full_name: parts[2] || '',
    date_of_birth: parts[3] || '',
    gender: parts[4] || '',
    address: parts[5] || '',
    issue_date: parts[6] || '',
    raw_data: rawData,
  };
};

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ TT' },
  { key: 'paid', label: 'Đã TT' },
  { key: 'verified', label: 'Đã xác minh' },
  { key: 'active', label: 'Đang thuê' },
  { key: 'returned', label: 'Đã trả' },
  { key: 'completed', label: 'Hoàn tất' },
  { key: 'cancelled', label: 'Đã hủy' },
];

export default function AdminOrders() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [cccdInfo, setCccdInfo] = useState<any>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [torch, setTorch] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [pendingBookingForScan, setPendingBookingForScan] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const isScannedRef = useRef(false);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, height: 44, marginBottom: 12, borderWidth: 1, borderColor: colors.outlineVariant },
    searchInput: { flex: 1, color: colors.text, fontSize: 14, marginLeft: 8 },
    tabsContainer: { height: 44, flexGrow: 0, marginBottom: 8 },
    tab: { height: 36, paddingHorizontal: 16, marginRight: 8, borderRadius: 18, backgroundColor: colors.cardBackground, justifyContent: 'center', alignItems: 'center' },
    tabActive: { backgroundColor: colors.primary },
    tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: colors.onPrimary },
    countText: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
    emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 40 },
    card: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.outlineVariant },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    bookingCode: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '600' },
    cardBody: { marginBottom: 10 },
    customerName: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
    cameraName: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    dateText: { color: colors.textMuted, fontSize: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: 10 },
    totalLabel: { color: colors.textMuted, fontSize: 12 },
    totalAmount: { color: colors.primary, fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    modalInfo: { marginBottom: 16 },
    modalInfoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 },
    modalInfoValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
    modalActions: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: 16 },
    modalActionsTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12 },
    cccdScanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerHigh, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 10, gap: 8 },
    cccdScanText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    cccdInfoBox: { backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
    cccdInfoTitle: { color: '#10b981', fontSize: 14, fontWeight: '700', marginBottom: 8 },
    cccdInfoRow: { color: colors.textSecondary, fontSize: 13, marginBottom: 4, lineHeight: 18 },
    cccdInfoValue: { color: colors.text, fontWeight: '700' },
    actionBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
    actionBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
    actionBtnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
    actionBtnTextDanger: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  }), [colors]);

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await adminApi.getBookings(token, activeTab, searchText.trim() || undefined);
      if (res.ok && res.data?.bookings) setBookings(res.data.bookings);
    } catch (error) {
      console.error('Fetch bookings error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab, searchText]);

  useEffect(() => { setLoading(true); fetchBookings(); }, [fetchBookings]);

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  // ── Quét QR CCCD ──
  const handleOpenQrScanner = async () => {
    try {
      if (!permission) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền camera để quét QR.');
          return;
        }
      } else if (!permission.granted) {
        if (permission.canAskAgain) {
          const result = await requestPermission();
          if (!result.granted) {
            Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền camera để quét QR.');
            return;
          }
        } else {
          Alert.alert('Quyền truy cập', 'Camera bị từ chối. Vui lòng bật quyền camera trong Cài đặt.');
          return;
        }
      }
      // Đóng modal detail trước để tránh xung đột Modal trên Android
      setPendingBookingForScan(selectedBooking);
      setSelectedBooking(null);
      isScannedRef.current = false;
      setTimeout(() => {
        setQrScanned(false);
        setShowQrScanner(true);
      }, 300);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể mở camera: ' + (error?.message || 'Lỗi không xác định'));
      console.error('Open QR scanner error:', error);
    }
  };

  const handleCloseQrScanner = () => {
    setShowQrScanner(false);
    // Mở lại modal detail
    if (pendingBookingForScan) {
      setTimeout(() => setSelectedBooking(pendingBookingForScan), 300);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isScannedRef.current) return;
    isScannedRef.current = true;
    setQrScanned(true);
    setShowQrScanner(false);
    const parsed = parseCccdQr(data);
    if (parsed.cccd_number) {
      setCccdInfo(parsed);
      // Mở lại modal detail
      if (pendingBookingForScan) {
        setTimeout(() => setSelectedBooking(pendingBookingForScan), 300);
      }
      Alert.alert('Quét thành công', `CCCD: ${parsed.cccd_number}\nHọ tên: ${parsed.full_name}`);
    } else {
      if (pendingBookingForScan) {
        setTimeout(() => setSelectedBooking(pendingBookingForScan), 300);
      }
      Alert.alert('Lỗi', 'Mã QR không đúng định dạng CCCD.');
    }
  };

  // ── Xử lý API giao máy ──
  const proceedPickup = async (bookingId: string) => {
    if (!token) return;
    setUpdating(true);
    try {
      const res = await adminApi.confirmPickup(token, bookingId, cccdInfo || undefined);
      if (res.ok) {
        Alert.alert('Thành công', 'Khách đã nhận máy!');
        setSelectedBooking(null);
        setCccdInfo(null);
        fetchBookings();
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể cập nhật.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra.');
    } finally {
      setUpdating(false);
    }
  };

  // ── Xác nhận nhận máy (kèm CCCD) ──
  const handlePickup = async (bookingId: string) => {
    if (!token) return;

    if (selectedBooking && cccdInfo) {
      const bookingName = selectedBooking.user_id?.full_name || selectedBooking.customer_info?.full_name || '';
      const cccdName = cccdInfo.full_name || '';

      const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      if (bookingName && cccdName && normalizeStr(bookingName) !== normalizeStr(cccdName)) {
        Alert.alert(
          '⚠️ Cảnh báo: Tên không khớp',
          `Tên trên đơn hàng: ${bookingName}\nTên trên CCCD: ${cccdName}\n\nBạn có chắc chắn muốn giao máy cho người này không?`,
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Tiếp tục giao', onPress: () => proceedPickup(bookingId), style: 'destructive' }
          ]
        );
        return;
      }
    }

    proceedPickup(bookingId);
  };

  // ── Xác nhận trả máy ──
  const handleReturn = async (bookingId: string) => {
    if (!token) return;
    Alert.alert('Xác nhận', 'Xác nhận khách đã trả máy?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận', onPress: async () => {
          setUpdating(true);
          try {
            const res = await adminApi.confirmReturn(token, bookingId);
            if (res.ok) {
              Alert.alert('Thành công', 'Đã xác nhận trả máy.');
              setSelectedBooking(null);
              fetchBookings();
            } else {
              Alert.alert('Lỗi', res.message || 'Không thể cập nhật.');
            }
          } catch (error) {
            Alert.alert('Lỗi', 'Có lỗi xảy ra.');
          } finally {
            setUpdating(false);
          }
        }
      },
    ]);
  };

  // ── Cập nhật trạng thái bình thường ──
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    if (!token) return;
    setUpdating(true);
    try {
      const res = await adminApi.updateBookingStatus(token, bookingId, newStatus);
      if (res.ok) {
        Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng.');
        setSelectedBooking(null);
        fetchBookings();
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể cập nhật.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra.');
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => amount?.toLocaleString('vi-VN') + 'đ';
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');
  const formatDateTime = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleString('vi-VN') : 'N/A';

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: string }> = {
      pending: { label: 'Chờ thanh toán', color: '#f59e0b', icon: 'time' },
      paid: { label: 'Đã thanh toán', color: '#3b82f6', icon: 'card' },
      verified: { label: 'Đã xác minh', color: '#8b5cf6', icon: 'shield-checkmark' },
      active: { label: 'Đang thuê', color: '#10b981', icon: 'camera' },
      overdue: { label: 'Quá hạn trả máy', color: '#ef4444', icon: 'alert-circle' },
      returned: { label: 'Đã trả máy', color: '#06b6d4', icon: 'checkmark-done' },
      completed: { label: 'Hoàn tất', color: '#22c55e', icon: 'checkmark-circle' },
      cancelled: { label: 'Đã hủy', color: '#ef4444', icon: 'close-circle' },
      refunded: { label: 'Đã hoàn tiền', color: '#a855f7', icon: 'arrow-undo' },
    };
    return map[status] || { label: status, color: '#8E8E93', icon: 'help' };
  };

  // ── Render modal content dựa theo trạng thái ──
  const renderModalActions = () => {
    if (!selectedBooking) return null;
    const { status, _id } = selectedBooking;

    // Đơn paid/verified → Quét QR CCCD + Nút "Đã nhận máy"
    if (status === 'paid' || status === 'verified') {
      return (
        <View style={s.modalActions}>
          <Text style={s.modalActionsTitle}>Giao máy cho khách</Text>

          {/* CCCD QR Section */}
          <TouchableOpacity style={s.cccdScanBtn} onPress={handleOpenQrScanner}>
            <MaterialIcons name="qr-code-scanner" size={22} color={colors.primary} />
            <Text style={s.cccdScanText}>Quét QR trên CCCD</Text>
          </TouchableOpacity>

          {cccdInfo ? (
            <View style={s.cccdInfoBox}>
              <Text style={s.cccdInfoTitle}>✅ Thông tin CCCD</Text>
              <Text style={s.cccdInfoRow}>Số CCCD: <Text style={s.cccdInfoValue}>{cccdInfo.cccd_number}</Text></Text>
              <Text style={s.cccdInfoRow}>Họ tên: <Text style={s.cccdInfoValue}>{cccdInfo.full_name}</Text></Text>
              <Text style={s.cccdInfoRow}>Ngày sinh: <Text style={s.cccdInfoValue}>{cccdInfo.date_of_birth}</Text></Text>
              <Text style={s.cccdInfoRow}>Giới tính: <Text style={s.cccdInfoValue}>{cccdInfo.gender}</Text></Text>
              <Text style={s.cccdInfoRow}>Địa chỉ: <Text style={s.cccdInfoValue}>{cccdInfo.address}</Text></Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handlePickup(_id)}
            disabled={updating}
          >
            {updating ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
              <Text style={s.actionBtnText}>📱 Đã nhận máy</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionBtnDanger}
            onPress={() => handleUpdateStatus(_id, 'cancelled')}
            disabled={updating}
          >
            <Text style={s.actionBtnTextDanger}>Hủy đơn</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Đơn active → Nút "Đã trả máy"
    if (status === 'active') {
      return (
        <View style={s.modalActions}>
          <Text style={s.modalActionsTitle}>Khách trả máy</Text>
          {selectedBooking.cccd_info?.cccd_number && (
            <View style={s.cccdInfoBox}>
              <Text style={s.cccdInfoTitle}>📋 CCCD lúc nhận máy</Text>
              <Text style={s.cccdInfoRow}>Số CCCD: <Text style={s.cccdInfoValue}>{selectedBooking.cccd_info.cccd_number}</Text></Text>
              <Text style={s.cccdInfoRow}>Họ tên: <Text style={s.cccdInfoValue}>{selectedBooking.cccd_info.full_name}</Text></Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#06b6d4' }]}
            onPress={() => handleReturn(_id)}
            disabled={updating}
          >
            {updating ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={[s.actionBtnText, { color: '#fff' }]}>📦 Đã trả máy</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Đơn returned → Nút "Hoàn tất"
    if (status === 'returned') {
      return (
        <View style={s.modalActions}>
          <Text style={s.modalActionsTitle}>Hoàn tất đơn hàng</Text>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#22c55e' }]}
            onPress={() => handleUpdateStatus(_id, 'completed')}
            disabled={updating}
          >
            {updating ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={[s.actionBtnText, { color: '#fff' }]}>✅ Hoàn tất đơn</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Đơn pending → chờ thanh toán
    if (status === 'pending') {
      return (
        <View style={s.modalActions}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleUpdateStatus(_id, 'paid')}
            disabled={updating}
          >
            {updating ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
              <Text style={s.actionBtnText}>Xác nhận thanh toán</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtnDanger}
            onPress={() => handleUpdateStatus(_id, 'cancelled')}
            disabled={updating}
          >
            <Text style={s.actionBtnTextDanger}>Hủy đơn</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Quản lý Đơn hàng</Text>
      </View>

      {/* Search Bar */}
      <View style={s.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm theo tên, mã đơn, SĐT..."
          placeholderTextColor={colors.placeholder}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsContainer} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bookings List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Text style={s.countText}>{bookings.length} đơn hàng</Text>
          {bookings.length === 0 ? (
            <Text style={s.emptyText}>Không có đơn hàng nào.</Text>
          ) : (
            bookings.map((booking) => {
              const isOverdue = booking.status === 'active' && new Date(booking.end_date) < new Date(new Date().toDateString());
              const displayStatus = isOverdue ? 'overdue' : booking.status;
              const statusInfo = getStatusInfo(displayStatus);
              const customerName = booking.user_id?.full_name || booking.customer_info?.full_name || 'Khách hàng';
              const cameraImage = booking.camera_id?.images?.[0] || booking.camera_snapshot?.images?.[0] || null;
              return (
                <TouchableOpacity
                  key={booking._id}
                  style={s.card}
                  onPress={() => { setSelectedBooking(booking); setCccdInfo(booking.cccd_info || null); }}
                  activeOpacity={0.7}
                >
                  <View style={s.cardHeader}>
                    <Text style={s.bookingCode}>#{booking.booking_code}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                      <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
                      <Text style={[s.statusText, { color: statusInfo.color }]}> {statusInfo.label}</Text>
                    </View>
                  </View>
                  <View style={s.cardBody}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      {cameraImage ? (
                        <Image
                          source={{ uri: cameraImage }}
                          style={{ width: 48, height: 48, borderRadius: 10, marginRight: 10, backgroundColor: colors.surfaceContainerHigh }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: 48, height: 48, borderRadius: 10, marginRight: 10, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="camera" size={22} color={colors.textMuted} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.customerName}>{customerName}</Text>
                        <Text style={s.cameraName}>{booking.camera_id?.name || booking.camera_snapshot?.name || 'Thiết bị không xác định'}</Text>
                      </View>
                      {isOverdue && (
                        <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ color: '#EF4444', fontSize: 9, fontWeight: '800' }}>QUÁ HẠN</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.cardRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text style={s.dateText}> {formatDate(booking.start_date)} - {formatDate(booking.end_date)}</Text>
                    </View>
                    {booking.cccd_info?.cccd_number && (
                      <View style={[s.cardRow, { marginTop: 4 }]}>
                        <MaterialIcons name="credit-card" size={14} color={colors.primary} />
                        <Text style={[s.dateText, { color: colors.primary }]}> CCCD: {booking.cccd_info.cccd_number}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.cardFooter}>
                    <Text style={s.totalLabel}>Tiền thuê</Text>
                    <Text style={s.totalAmount}>{formatCurrency(booking.total_amount || 0)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Detail + Action Modal */}
      <Modal visible={!!selectedBooking} transparent animationType="slide" onRequestClose={() => setSelectedBooking(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>#{selectedBooking?.booking_code}</Text>
              <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={s.modalInfo}>
              <Text style={s.modalInfoLabel}>Khách hàng</Text>
              <Text style={s.modalInfoValue}>{selectedBooking?.user_id?.full_name || selectedBooking?.customer_info?.full_name || 'N/A'}</Text>

              <Text style={s.modalInfoLabel}>SĐT</Text>
              <Text style={s.modalInfoValue}>{selectedBooking?.user_id?.phone || selectedBooking?.customer_info?.phone || 'N/A'}</Text>

              <Text style={s.modalInfoLabel}>Thiết bị</Text>
              <Text style={s.modalInfoValue}>{selectedBooking?.camera_id?.name || selectedBooking?.camera_snapshot?.name || 'N/A'}</Text>


              <Text style={s.modalInfoLabel}>Thời gian thuê</Text>
              <Text style={s.modalInfoValue}>{formatDate(selectedBooking?.start_date)} → {formatDate(selectedBooking?.end_date)}</Text>

              <Text style={s.modalInfoLabel}>Tiền thuê</Text>
              <Text style={[s.modalInfoValue, { color: colors.primary }]}>{formatCurrency(selectedBooking?.total_amount || 0)}</Text>

              {selectedBooking?.deposit_amount > 0 && (
                <>
                  <Text style={s.modalInfoLabel}>Tiền cọc (Thu tại shop)</Text>
                  <Text style={[s.modalInfoValue, { color: '#10b981' }]}>{formatCurrency(selectedBooking.deposit_amount)}</Text>
                </>
              )}

              <Text style={s.modalInfoLabel}>Trạng thái</Text>
              <Text style={[s.modalInfoValue, { color: getStatusInfo(selectedBooking?.status || '').color }]}>
                {getStatusInfo(selectedBooking?.status || '').label}
              </Text>

              {selectedBooking?.cccd_info?.cccd_number && (
                <>
                  <Text style={s.modalInfoLabel}>CCCD</Text>
                  <Text style={s.modalInfoValue}>{selectedBooking.cccd_info.cccd_number} - {selectedBooking.cccd_info.full_name}</Text>
                </>
              )}
              {selectedBooking?.picked_up_at && (
                <>
                  <Text style={s.modalInfoLabel}>Nhận máy lúc</Text>
                  <Text style={s.modalInfoValue}>{formatDateTime(selectedBooking.picked_up_at)}</Text>
                </>
              )}
              {selectedBooking?.returned_at && (
                <>
                  <Text style={s.modalInfoLabel}>Trả máy lúc</Text>
                  <Text style={s.modalInfoValue}>{formatDateTime(selectedBooking.returned_at)}</Text>
                </>
              )}
            </View>

            {renderModalActions()}
          </ScrollView>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal visible={showQrScanner} animationType="slide" onRequestClose={handleCloseQrScanner}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flex: 1, paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>📷 Quét QR trên CCCD</Text>
              <TouchableOpacity onPress={handleCloseQrScanner}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, margin: 16, borderRadius: 20, overflow: 'hidden' }}>
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={qrScanned ? undefined : handleBarCodeScanned}
                autofocus="on"
                zoom={zoom}
                enableTorch={torch}
              />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 220, height: 220, borderWidth: 2, borderColor: colors.primary, borderRadius: 16 }} />
                <Text style={{ color: '#fff', marginTop: 16, fontSize: 14 }}>Đưa mã QR trên CCCD vào khung</Text>
              </View>
              {/* Zoom controls */}
              <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
                <TouchableOpacity 
                  onPress={() => setZoom(Math.max(0, zoom - 0.05))}
                  style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Ionicons name="remove" size={28} color="#fff" />
                </TouchableOpacity>
                
                <View style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{Math.round(zoom * 20) / 2 + 1}x</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => setZoom(Math.min(1, zoom + 0.05))}
                  style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTorch(!torch)}
                  style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: torch ? colors.primary : 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', marginLeft: 10 }}
                >
                  <Ionicons name={torch ? "flash" : "flash-off"} size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
