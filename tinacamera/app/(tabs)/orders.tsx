import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { bookingApi } from '../../services/api';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.0.158:5000/api';

interface Booking {
  _id: string;
  booking_code: string;
  camera_id: {
    _id: string;
    name: string;
    brand: string;
    images?: string[];
    price_per_day: number;
  } | null;
  start_date: string;
  end_date: string;
  total_days: number;
  total_amount: number;
  deposit_amount: number;
  paid_amount: number;
  status: string;
  payment_type: string;
  customer_info?: {
    full_name?: string;
    phone?: string;
    email?: string;
  };
  createdAt: string;
  has_review?: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: 'Chờ thanh toán', color: '#FBBF24', bgColor: 'rgba(251,191,36,0.1)', icon: 'time' },
  paid: { label: 'Đã thanh toán', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.1)', icon: 'card' },
  verified: { label: 'Đã xác minh', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.1)', icon: 'shield-checkmark' },
  active: { label: 'Đang thuê', color: '#10B981', bgColor: 'rgba(16,185,129,0.1)', icon: 'camera' },
  overdue: { label: 'Quá hạn trả máy', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)', icon: 'alert-circle' },
  returned: { label: 'Đã trả máy', color: '#6366F1', bgColor: 'rgba(99,102,241,0.1)', icon: 'checkmark-done' },
  completed: { label: 'Hoàn tất', color: '#10B981', bgColor: 'rgba(16,185,129,0.1)', icon: 'checkmark-circle' },
  cancelled: { label: 'Đã hủy', color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)', icon: 'close-circle' },
  refunded: { label: 'Đã hoàn tiền', color: '#F97316', bgColor: 'rgba(249,115,22,0.1)', icon: 'return-down-back' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function calculateRefund(booking: Booking) {
  if (booking.status === 'pending') return { percent: 0, amount: 0 };

  const now = new Date();
  const createdAt = new Date(booking.createdAt);
  const startDate = new Date(booking.start_date);

  const diffFromCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // hours
  const diffToStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24); // days

  let percent = 0;
  if (diffFromCreation <= 2) {
    percent = 100;
  } else if (diffToStart >= 3) {
    percent = 50;
  } else if (diffToStart < 1) {
    percent = 0;
  } else {
    percent = 25; // 1-3 days
  }

  return {
    percent,
    amount: Math.round((booking.paid_amount || 0) * (percent / 100))
  };
}

export default function OrdersScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Payment state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const pollInterval = useRef<any>(null);

  const startPolling = (transactionId: string) => {
    pollInterval.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/payment/sepay/check/${transactionId}`);
        if (res.data?.status === 'completed') {
          setPaymentStatus('completed');
          if (pollInterval.current) clearInterval(pollInterval.current);
          fetchBookings();
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

  const handleResumePayment = async (booking: Booking) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/payment/sepay/create`, {
        booking_id: booking._id,
        amount: booking.total_amount,
        orderInfo: `Thanh toan don hang ${booking.booking_code}`,
        customer_info: booking.customer_info || { full_name: 'Khach', phone: '0', email: '' },
      });
      setLoading(false);
      if (response.data?.qrCodeUrl) {
        setQrUrl(response.data.qrCodeUrl);
        setTxnId(response.data.transactionId);
        setPaymentStatus('pending');
        setShowQRModal(true);
        startPolling(response.data.transactionId);
      } else {
        Alert.alert('Lỗi', 'Không nhận được mã QR');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Lỗi', 'Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    const refund = calculateRefund(booking);

    let message = `Bạn có chắc chắn muốn huỷ đơn hàng ${booking.booking_code} không?`;
    if (booking.status !== 'pending' && booking.paid_amount > 0) {
      message += `\n\n💰 Tiền hoàn lại dự kiến: ${formatCurrency(refund.amount)} (${refund.percent}%).`;
      if (refund.percent < 100) {
        message += `\n(Khấu trừ phí hủy theo quy định)`;
      }
    }

    Alert.alert(
      'Xác nhận huỷ đơn',
      message,
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xác nhận Huỷ',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await bookingApi.cancelBooking(token!, booking._id, 'Khách hàng tự huỷ');
              if (res.ok) {
                let successMsg = 'Đã huỷ đơn hàng thành công.';
                if (booking.paid_amount > 0) {
                  successMsg += '\n\n📞 Vui lòng liên hệ Hotline 0899259410 để được hỗ trợ nhận lại tiền hoàn.';
                }
                Alert.alert('Thành công', successMsg);
                fetchBookings();
              } else {
                Alert.alert('Lỗi', res.message || 'Không thể huỷ đơn hàng.');
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Đã xảy ra lỗi khi huỷ đơn.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const fetchBookings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await bookingApi.getMyBookings(token);
      if (res.ok && res.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch (error) {
      console.error('Fetch bookings error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const openReviewModal = (booking: Booking) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = async () => {
    if (!token || !reviewBooking) return;
    setSubmittingReview(true);
    try {
      const res = await bookingApi.submitReview(token, reviewBooking._id, reviewRating, reviewComment.trim() || undefined);
      if (res.ok) {
        Alert.alert('Cảm ơn bạn! 🎉', 'Đánh giá của bạn đã được gửi thành công.');
        setReviewBooking(null);
        fetchBookings();
      } else {
        Alert.alert('Thông báo', res.message || 'Không thể gửi đánh giá.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accentPink} />
      </SafeAreaView>
    );
  }

  if (bookings.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <View style={{ backgroundColor: colors.cardBackground, width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ionicons name="receipt-outline" size={40} color={colors.iconDefault} />
        </View>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 20, marginTop: 8 }}>Chưa có đơn hàng nào</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          Hãy khám phá và thuê thiết bị yêu thích của bạn!
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: colors.buttonPrimary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 999 }}
          onPress={() => router.push('/(tabs)/category')}
        >
          <Text style={{ color: colors.buttonPrimaryText, fontWeight: '700', fontSize: 16 }}>Khám phá ngay</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>Đơn hàng của tôi</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>{bookings.length} đơn hàng</Text>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentPink} />
        }
      >
        {bookings.map((booking) => {
          const cameraName = booking.camera_id?.name || 'Sản phẩm không còn tồn tại';
          const cameraBrand = booking.camera_id?.brand || '';
          const cameraImage = booking.camera_id?.images?.[0] || null;
          const isCompleted = booking.status === 'completed';
          const hasReview = booking.has_review;

          // Detect overdue: active booking past end_date
          const isOverdue = booking.status === 'active' && new Date(booking.end_date) < new Date(new Date().toDateString());
          const displayStatusKey = isOverdue ? 'overdue' : booking.status;
          const status = STATUS_MAP[displayStatusKey] || STATUS_MAP.pending;

          return (
            <View
              key={booking._id}
              style={{ backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.separator, borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}
            >
              {/* Status Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: status.bgColor }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={status.icon as any} size={16} color={status.color} />
                  <Text style={{ color: status.color, fontSize: 14, fontWeight: '700', marginLeft: 8 }}>
                    {status.label}
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{booking.booking_code}</Text>
              </View>

              {/* Content */}
              <View style={{ padding: 16 }}>
                {/* Camera Info */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  {cameraImage ? (
                    <Image
                      source={{ uri: cameraImage }}
                      style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12, backgroundColor: colors.surfaceContainerHigh }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ backgroundColor: colors.surfaceContainerHigh, width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Ionicons name="camera" size={24} color={colors.accentPink} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }} numberOfLines={1}>
                      {cameraName}
                    </Text>
                    {cameraBrand ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{cameraBrand}</Text>
                    ) : null}
                  </View>
                  {isOverdue && (
                    <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>QUÁ HẠN</Text>
                    </View>
                  )}
                </View>

                {/* Dates */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: colors.surfaceContainerHigh + '80', borderRadius: 12, padding: 12 }}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Từ ngày</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4 }}>{formatDate(booking.start_date)}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.iconDefault} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Đến ngày</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4 }}>{formatDate(booking.end_date)}</Text>
                  </View>
                  <View style={{ backgroundColor: colors.accentPinkDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: colors.accentPink, fontSize: 12, fontWeight: '700' }}>{booking.total_days} ngày</Text>
                  </View>
                </View>

                {/* Pricing */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Tiền thuê</Text>
                    <Text style={{ color: colors.accentPink, fontWeight: '700', fontSize: 18 }}>{formatCurrency(booking.total_amount)}</Text>
                  </View>
                  {booking.paid_amount > 0 && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Đã thanh toán</Text>
                      <Text style={{ color: '#10B981', fontWeight: '600' }}>{formatCurrency(booking.paid_amount)}</Text>
                    </View>
                  )}
                </View>

                {/* Deposit */}
                {['verified', 'active', 'returned', 'completed'].includes(booking.status) && booking.deposit_amount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.separator }}>
                    <View>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Tiền cọc (Thanh toán tại cửa hàng)</Text>
                      <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>{formatCurrency(booking.deposit_amount)}</Text>
                    </View>
                  </View>
                )}

                {/* Customer Info */}
                {booking.customer_info?.full_name && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.separator }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="person" size={14} color={colors.iconDefault} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 8 }}>{booking.customer_info.full_name}</Text>
                      {booking.customer_info.phone && (
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 12 }}>• {booking.customer_info.phone}</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.separator }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Đặt lúc {formatDate(booking.createdAt)}
                </Text>

                {/* Actions for Pending/Paid/Verified Booking */}
                {['pending', 'paid', 'verified'].includes(booking.status) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.separator }}
                      onPress={() => handleCancelBooking(booking)}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Huỷ đơn</Text>
                    </TouchableOpacity>
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        style={{ backgroundColor: colors.buttonPrimary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}
                        onPress={() => handleResumePayment(booking)}
                      >
                        <Text style={{ color: colors.buttonPrimaryText, fontSize: 12, fontWeight: '700' }}>Thanh toán</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Review Actions */}
                {isCompleted && !hasReview && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}
                    onPress={() => openReviewModal(booking)}
                  >
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={{ color: '#FBBF24', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Đánh giá</Text>
                  </TouchableOpacity>
                )}
                {isCompleted && hasReview && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Đã đánh giá</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Cancellation Policy Note */}
        <View style={{ marginTop: 20, padding: 16, backgroundColor: colors.surfaceContainerHigh + '60', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.separator }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="information-circle" size={18} color={colors.accentPink} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginLeft: 8 }}>Chính sách hủy đơn & Hoàn tiền</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            • Hoàn <Text style={{ fontWeight: '700' }}>100%</Text> nếu hủy trong vòng 2 giờ sau khi đặt.{"\n"}
            • Hoàn <Text style={{ fontWeight: '700' }}>50%</Text> nếu hủy trước ngày nhận máy ≥ 3 ngày.{"\n"}
            • <Text style={{ fontWeight: '700' }}>Không hoàn tiền</Text> nếu hủy trong vòng 24h trước giờ nhận máy.{"\n"}
            • Vui lòng liên hệ Hotline <Text style={{ color: colors.accentPink, fontWeight: '700' }}>0888888888</Text> để được hỗ trợ.
          </Text>
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={!!reviewBooking} transparent animationType="slide" onRequestClose={() => setReviewBooking(null)}>
        <View style={{ flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Đánh giá đơn hàng</Text>
              <TouchableOpacity onPress={() => setReviewBooking(null)}>
                <Ionicons name="close" size={24} color={colors.iconDefault} />
              </TouchableOpacity>
            </View>

            {/* Camera info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerHigh, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <View style={{ backgroundColor: colors.accentPinkDim, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="camera" size={20} color={colors.accentPink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }} numberOfLines={1}>
                  {reviewBooking?.camera_id?.name || 'Thiết bị'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{reviewBooking?.booking_code}</Text>
              </View>
            </View>

            {/* Star rating */}
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center' }}>Bạn hài lòng như thế nào?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= reviewRating ? '#FBBF24' : colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: '#FBBF24', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>
              {reviewRating === 5 ? 'Tuyệt vời! ⭐' : reviewRating === 4 ? 'Rất tốt! 😊' : reviewRating === 3 ? 'Bình thường 😐' : reviewRating === 2 ? 'Chưa hài lòng 😕' : 'Rất tệ 😞'}
            </Text>

            {/* Comment input */}
            <TextInput
              style={{ backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, color: colors.text, fontSize: 14, marginBottom: 20, minHeight: 100, textAlignVertical: 'top' }}
              placeholder="Chia sẻ trải nghiệm của bạn... (không bắt buộc)"
              placeholderTextColor={colors.placeholder}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={4}
            />

            {/* Submit button */}
            <TouchableOpacity
              style={{ backgroundColor: colors.buttonPrimary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
              onPress={handleSubmitReview}
              disabled={submittingReview}
              activeOpacity={0.8}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
              ) : (
                <Text style={{ color: colors.buttonPrimaryText, fontWeight: '700', fontSize: 16 }}>Gửi đánh giá</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* QR Modal for Resuming Payment */}
      <Modal visible={showQRModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: colors.cardBackground, width: '100%', maxWidth: 384, borderRadius: 24, padding: 24, alignItems: 'center' }}>
            {paymentStatus === 'completed' ? (
              <>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>Thanh toán thành công!</Text>
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>Đơn hàng đã được cập nhật.</Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30, marginTop: 24 }}
                  onPress={() => setShowQRModal(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Đóng</Text>
                </TouchableOpacity>
              </>
            ) : paymentStatus === 'failed' ? (
              <>
                <Ionicons name="close-circle" size={80} color="#EF4444" />
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 16 }}>Thanh toán thất bại</Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30, marginTop: 24 }}
                  onPress={() => setShowQRModal(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Đóng</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Quét mã để thanh toán</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Quét bằng app Ngân hàng bất kỳ</Text>
                <View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 2, borderColor: colors.primary }}>
                  {qrUrl && <Image source={{ uri: qrUrl }} style={{ width: 200, height: 200 }} resizeMode="contain" />}
                </View>
                {txnId && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12 }}>Mã: {txnId}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={{ color: colors.primary, marginLeft: 12, fontWeight: '600' }}>Đang chờ thanh toán...</Text>
                </View>
                <TouchableOpacity
                  style={{ marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, borderWidth: 1, borderColor: colors.separator }}
                  onPress={() => {
                    setShowQRModal(false);
                    if (pollInterval.current) clearInterval(pollInterval.current);
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Đóng lại</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
