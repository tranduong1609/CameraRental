import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Image, Platform, TextInput, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useRental } from '../contexts/RentalContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { authApi, bookingApi } from '../services/api';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.0.158:5000/api';

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export default function PaymentScreen() {
  const router = useRouter();
  const { token, user, updateUser } = useAuth();
  const { startDate, endDate, totalDays, clearDates } = useRental();
  const { items, getTotal, clearCart } = useCart();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const pollInterval = useRef<any>(null);

  // Customer info state
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  // Pricing
  const dailyTotal = getTotal();
  const rentalSubtotal = dailyTotal * totalDays;
  const depositAmount = 0;
  const totalAmount = rentalSubtotal + depositAmount;

  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
      setEditPhone(user.phone || '');
      setEditEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (token && !user) {
      authApi.getProfile(token).then(res => {
        if (res.ok && res.data?.user) updateUser(res.data.user);
      });
    }
  }, [token, user]);

  // Polling
  const startPolling = (transactionId: string) => {
    pollInterval.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/payment/sepay/check/${transactionId}`);
        if (res.data?.status === 'completed') {
          setPaymentStatus('completed');
          if (pollInterval.current) clearInterval(pollInterval.current);
        } else if (res.data?.status === 'failed') {
          setPaymentStatus('failed');
          clearInterval(pollInterval.current!);
        }
      } catch (e) { /* ignore */ }
    }, 3000);
  };

  useEffect(() => {
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, []);

  const handleSaveInfo = async () => {
    if (!editName.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập họ và tên.'); return; }
    if (!editPhone.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại.'); return; }

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
        Alert.alert('Thành công ✅', 'Thông tin đã được cập nhật.');
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể cập nhật thông tin.');
      }
    } catch { Alert.alert('Lỗi', 'Đã xảy ra lỗi.'); }
    finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!user?.full_name || !user?.phone) {
      Alert.alert('Thiếu thông tin', 'Vui lòng cập nhật thông tin người thuê.', [
        { text: 'Cập nhật', onPress: () => setShowEditModal(true) },
      ]);
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Lỗi', 'Chưa chọn ngày thuê.');
      return;
    }

    setLoading(true);
    try {
      const createdBookings = [];
      for (const item of items) {
        const res = await bookingApi.createBooking(token!, {
          camera_id: item._id,
          start_date: startDate!,
          end_date: endDate!,
          payment_type: 'full',
          customer_info: {
            full_name: user?.full_name || '',
            phone: user?.phone || '',
            email: user?.email || '',
          },
        });
        if (res.ok && res.data?.booking) {
          createdBookings.push(res.data.booking);
        }
      }

      if (createdBookings.length === 0) {
        Alert.alert('Lỗi', 'Không thể tạo đơn hàng. Vui lòng thử lại.');
        setLoading(false);
        return;
      }

      const bookingIds = createdBookings.map(b => b._id).join(',');

      const response = await axios.post(`${API_URL}/payment/sepay/create`, {
        booking_id: bookingIds,
        amount: totalAmount,
        orderInfo: `Thanh toan don hang ${createdBookings[0].booking_code}${createdBookings.length > 1 ? '...' : ''}`,
        customer_info: {
          full_name: user.full_name,
          phone: user.phone,
          email: user.email,
        },
      });

      if (response.data?.qrCodeUrl) {
        setQrUrl(response.data.qrCodeUrl);
        setTxnId(response.data.transactionId);
        setShowQRModal(true);
        startPolling(response.data.transactionId);
      } else {
        Alert.alert('Lỗi', 'Không nhận được mã QR');
      }
    } catch (error: any) {
      console.error('Payment Error:', error.response?.data || error.message);
      Alert.alert('Lỗi', 'Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowQRModal(false);
    if (pollInterval.current) clearInterval(pollInterval.current);
    if (paymentStatus === 'completed') {
      clearCart();
      clearDates();
      router.push('/(tabs)/orders');
    }
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.separator },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 16 },
    scrollView: { flex: 1, padding: 16, paddingBottom: 130 },
    sectionLabel: { color: colors.textSecondary, marginBottom: 8, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    card: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.outlineVariant },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    editBtn: { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    editBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    userInfoText: { color: colors.text, fontSize: 16, fontWeight: '600', marginLeft: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { color: colors.textSecondary, fontSize: 14, marginLeft: 12 },
    dateBox: { flex: 1, alignItems: 'center' },
    dateLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
    dateValue: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
    dateSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
    totalDaysBadge: { backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    totalDaysText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    emptyText: { color: colors.textMuted, textAlign: 'center' },
    itemCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.outlineVariant, flexDirection: 'row', alignItems: 'center' },
    itemImgContainer: { width: 56, height: 56, backgroundColor: colors.surfaceContainerHigh, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 12 },
    itemImg: { width: '100%', height: '100%' },
    itemInfo: { flex: 1 },
    itemName: { color: colors.text, fontWeight: '600', marginBottom: 2 },
    itemSub: { color: colors.textMuted, fontSize: 12 },
    itemTotal: { color: colors.primary, fontWeight: '700' },
    paymentMethod: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primary, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    paymentMethodText: { color: colors.text, fontSize: 16, fontWeight: '600', marginLeft: 12 },
    summaryCard: { backgroundColor: colors.cardBackground, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { color: colors.textMuted },
    summaryValue: { color: colors.text },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.separator },
    totalLabel: { color: colors.text, fontWeight: '700', fontSize: 18 },
    totalValue: { color: colors.primary, fontWeight: '700', fontSize: 20 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: colors.cardBackground, borderTopWidth: 1, borderTopColor: colors.separator },
    payBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 30, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    payBtnDisabled: { backgroundColor: colors.surfaceContainerHighest },
    payBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 18, marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    editModalContent: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    qrModalContent: { backgroundColor: colors.cardBackground, width: '100%', maxWidth: 384, borderRadius: 24, padding: 24, alignItems: 'center' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    inputLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
    inputContainer: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, marginBottom: 16 },
    input: { flex: 1, color: colors.text, fontSize: 16, marginLeft: 12, height: '100%' },
    saveBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
    saveBtnDisabled: { backgroundColor: colors.surfaceContainerHighest },
    saveBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 18 },
    qrTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    qrSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
    qrBox: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 2, borderColor: colors.primary },
    qrCode: { width: 200, height: 200 },
    txnIdText: { color: colors.textMuted, fontSize: 12, marginTop: 12 },
    pollingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 16 },
    pollingText: { color: colors.primary, marginLeft: 12, fontWeight: '600' },
    cancelBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, borderWidth: 1, borderColor: colors.separator },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
    successTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' },
    successSub: { color: colors.textMuted, textAlign: 'center', marginTop: 8 },
    successBtn: { backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30, marginTop: 24 },
    successBtnText: { color: '#FFF', fontWeight: '700' },
    failTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 16 },
    failBtn: { backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30, marginTop: 24 },
    failBtnText: { color: '#FFF', fontWeight: '700' },
  }), [colors]);

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Xác nhận Đặt Thuê</Text>
      </View>

      <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
        {/* ── Thông tin người thuê ── */}
        <Text style={s.sectionLabel}>Thông tin người thuê</Text>
        <View style={s.card}>
          <View style={[s.rowBetween, { marginBottom: 12 }]}>
            <View style={s.rowCenter}>
              <Ionicons name="person" size={18} color={colors.primary} />
              <Text style={s.userInfoText}>{user?.full_name || 'Chưa cập nhật'}</Text>
            </View>
            <TouchableOpacity style={s.editBtn} onPress={() => setShowEditModal(true)}>
              <Text style={s.editBtnText}>Sửa</Text>
            </TouchableOpacity>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="call" size={16} color={colors.textMuted} />
            <Text style={s.infoText}>{user?.phone || 'Chưa có SĐT'}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="mail" size={16} color={colors.textMuted} />
            <Text style={s.infoText}>{user?.email || 'Chưa có email'}</Text>
          </View>
        </View>

        {/* ── Thông tin ngày thuê ── */}
        <Text style={s.sectionLabel}>Thời gian thuê</Text>
        <View style={s.card}>
          {startDate && endDate ? (
            <View style={s.rowCenter}>
              <View style={s.dateBox}>
                <Text style={s.dateLabel}>Từ ngày</Text>
                <Text style={s.dateValue}>{formatDisplayDate(startDate)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              <View style={s.dateBox}>
                <Text style={s.dateLabel}>Đến ngày</Text>
                <Text style={s.dateValue}>{formatDisplayDate(endDate)}</Text>
              </View>
              <View style={s.totalDaysBadge}>
                <Text style={s.totalDaysText}>{totalDays} ngày</Text>
              </View>
            </View>
          ) : (
            <Text style={s.emptyText}>Chưa chọn ngày thuê</Text>
          )}
        </View>

        <Text style={s.sectionLabel}>Thời gian nhận và trả máy</Text>
        <View style={s.card}>
          {startDate && endDate ? (
            <View style={s.rowCenter}>
              <View style={s.dateBox}>
                <Text style={s.dateLabel}>Nhận máy từ</Text>
                <Text style={s.dateValue}>22:00</Text>
                <Text style={s.dateSub}>{formatDisplayDate(new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000).toISOString())}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              <View style={s.dateBox}>
                <Text style={s.dateLabel}>Trả máy trước</Text>
                <Text style={s.dateValue}>22:00</Text>
                <Text style={s.dateSub}>{formatDisplayDate(endDate)}</Text>
              </View>
            </View>
          ) : (
            <Text style={s.emptyText}>Chưa chọn ngày thuê</Text>
          )}
        </View>

        {/* ── Danh sách sản phẩm thuê ── */}
        <Text style={s.sectionLabel}>Sản phẩm thuê</Text>
        {items.map((item) => (
          <View key={item._id} style={s.itemCard}>
            <View style={s.itemImgContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={s.itemImg} resizeMode="cover" />
              ) : (
                <Ionicons name="camera" size={24} color={colors.textMuted} />
              )}
            </View>
            <View style={s.itemInfo}>
              <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.itemSub}>SL: {item.quantity} × {formatPrice(item.price_per_day)}/ngày</Text>
            </View>
            <Text style={s.itemTotal}>
              {formatPrice(item.price_per_day * item.quantity * totalDays)}
            </Text>
          </View>
        ))}

        {/* ── Hình thức thanh toán ── */}
        <Text style={[s.sectionLabel, { marginTop: 16 }]}>Hình thức thanh toán</Text>
        <View style={s.paymentMethod}>
          <View style={s.rowCenter}>
            <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
            <Text style={s.paymentMethodText}>VietQR</Text>
          </View>
          <Ionicons name="radio-button-on" size={24} color={colors.primary} />
        </View>

        {/* ── Tổng kết ── */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Tiền thuê ({totalDays} ngày)</Text>
            <Text style={s.summaryValue}>{formatPrice(rentalSubtotal)}</Text>
          </View>
          {depositAmount > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Đặt cọc (hoàn lại)</Text>
              <Text style={s.summaryValue}>{formatPrice(depositAmount)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Tổng thanh toán</Text>
            <Text style={s.totalValue}>{formatPrice(totalAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.payBtn, loading && s.payBtnDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="qr-code" size={20} color={colors.onPrimary} />
              <Text style={s.payBtnText}>Tạo mã QR — {formatPrice(totalAmount)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Edit Info Modal ── */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.editModalContent}>
              <View style={s.modalHeaderRow}>
                <Text style={s.modalTitle}>Sửa thông tin</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={s.inputLabel}>Họ và tên</Text>
                <View style={s.inputContainer}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={s.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="next"
                  />
                </View>

                <Text style={s.inputLabel}>Số điện thoại</Text>
                <View style={s.inputContainer}>
                  <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={s.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="0899259410"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={11}
                    returnKeyType="next"
                  />
                </View>

                <Text style={s.inputLabel}>Email</Text>
                <View style={s.inputContainer}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={s.input}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSaveInfo}
                  />
                </View>

                <TouchableOpacity
                  style={[s.saveBtn, saving && s.saveBtnDisabled, { marginTop: 16 }]}
                  onPress={handleSaveInfo}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={s.saveBtnText}>Lưu thay đổi</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── QR Modal ── */}
      <Modal visible={showQRModal} transparent animationType="fade">
        <View style={s.modalOverlayCenter}>
          <View style={s.qrModalContent}>
            {paymentStatus === 'completed' ? (
              <>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                <Text style={s.successTitle}>Đặt thuê thành công!</Text>
                <Text style={s.successSub}>Đơn hàng đã được tạo. Bạn có thể xem trong tab Đơn hàng.</Text>
                <TouchableOpacity style={s.successBtn} onPress={handleCloseModal}>
                  <Text style={s.successBtnText}>Xem đơn hàng</Text>
                </TouchableOpacity>
              </>
            ) : paymentStatus === 'failed' ? (
              <>
                <Ionicons name="close-circle" size={80} color="#EF4444" />
                <Text style={s.failTitle}>Thanh toán thất bại</Text>
                <TouchableOpacity style={s.failBtn} onPress={handleCloseModal}>
                  <Text style={s.failBtnText}>Thử lại</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.qrTitle}>Quét mã để thanh toán</Text>
                <Text style={s.qrSub}>Quét bằng app Ngân hàng bất kỳ</Text>
                <View style={s.qrBox}>
                  {qrUrl && <Image source={{ uri: qrUrl }} style={s.qrCode} resizeMode="contain" />}
                </View>
                {txnId && <Text style={s.txnIdText}>Mã: {txnId}</Text>}
                <View style={s.pollingRow}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={s.pollingText}>Đang chờ thanh toán...</Text>
                </View>
                <TouchableOpacity style={s.cancelBtn} onPress={handleCloseModal}>
                  <Text style={s.cancelBtnText}>Huỷ giao dịch</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
