import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { adminApi } from '../../services/api';

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unreplied', label: 'Chưa trả lời' },
  { key: 'replied', label: 'Đã trả lời' },
];

export default function AdminReviews() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
    statBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 4 },
    statText: { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
    statSubText: { color: colors.textMuted, fontSize: 12 },
    ratingBars: { paddingHorizontal: 20, marginBottom: 12 },
    ratingBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: 6 },
    ratingBarLabel: { color: colors.textMuted, fontSize: 11, width: 12, textAlign: 'right' },
    ratingBarBg: { flex: 1, height: 6, backgroundColor: colors.cardBackground, borderRadius: 3, overflow: 'hidden' },
    ratingBarFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
    ratingBarCount: { color: colors.textMuted, fontSize: 11, width: 24 },
    tabsContainer: { maxHeight: 46, marginBottom: 8 },
    tab: { paddingHorizontal: 14, paddingVertical: 7, marginRight: 6, borderRadius: 18, backgroundColor: colors.cardBackground },
    tabActive: { backgroundColor: colors.primary },
    tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: colors.onPrimary },
    countText: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
    emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 40 },
    card: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.outlineVariant },
    cardHidden: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    customerName: { color: colors.text, fontSize: 14, fontWeight: '700' },
    cameraName: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    starsRow: { flexDirection: 'row', gap: 2 },
    dateText: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
    commentText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 10 },
    replyBox: { backgroundColor: colors.primary + '10', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.primary },
    replyLabel: { color: colors.primary, fontSize: 11, fontWeight: '600', marginBottom: 4 },
    replyText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    unrepliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    unrepliedText: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },
    hiddenBadge: { color: '#ef4444', fontSize: 11, fontWeight: '600', marginTop: 6 },
    modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    modalSection: { marginBottom: 14 },
    modalLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    modalValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
    replySection: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: 16 },
    replySectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 10 },
    replyInput: { backgroundColor: colors.inputBackground, borderRadius: 14, padding: 14, color: colors.text, fontSize: 14, minHeight: 100, borderWidth: 1, borderColor: colors.inputBorder, marginBottom: 12 },
    replyBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
    replyBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
    visibilityBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderWidth: 1, borderColor: colors.separator, borderRadius: 14 },
    visibilityBtnText: { fontWeight: '600', fontSize: 14 },
  }), [colors]);

  const fetchReviews = useCallback(async () => {
    if (!token) return;
    try {
      const filters: any = {};
      if (activeFilter === 'unreplied') filters.replied = 'no';
      if (activeFilter === 'replied') filters.replied = 'yes';
      const res = await adminApi.getReviews(token, filters);
      if (res.ok && res.data) {
        setReviews(res.data.reviews);
        setStats(res.data.stats);
      }
    } catch (error) {
      console.error('Fetch reviews error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeFilter]);

  useEffect(() => { setLoading(true); fetchReviews(); }, [fetchReviews]);
  const onRefresh = () => { setRefreshing(true); fetchReviews(); };

  const handleReply = async () => {
    if (!token || !selectedReview || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await adminApi.replyReview(token, selectedReview._id, replyText.trim());
      if (res.ok) {
        Alert.alert('Thành công', 'Đã gửi phản hồi!');
        setSelectedReview(null);
        setReplyText('');
        fetchReviews();
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể gửi phản hồi.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleVisibility = async (review: any) => {
    if (!token) return;
    try {
      const res = await adminApi.toggleReviewVisibility(token, review._id, !review.is_visible);
      if (res.ok) {
        Alert.alert('Thành công', review.is_visible ? 'Đã ẩn đánh giá.' : 'Đã hiện đánh giá.');
        fetchReviews();
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra.');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons key={i} name={i < rating ? 'star' : 'star-outline'} size={14} color={i < rating ? '#f59e0b' : colors.textMuted} />
    ));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 30) return `${days} ngày trước`;
    if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
    return `${Math.floor(days / 365)} năm trước`;
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Đánh giá</Text>
        {stats && (
          <View style={s.statsRow}>
            <View style={s.statBadge}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={s.statText}>{stats.avgRating}</Text>
            </View>
            <Text style={s.statSubText}>{stats.total} đánh giá · {stats.unreplied} chưa trả lời</Text>
          </View>
        )}
      </View>

      {/* Rating distribution */}
      {stats && (
        <View style={s.ratingBars}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats[`rating${star}`] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <View key={star} style={s.ratingBarRow}>
                <Text style={s.ratingBarLabel}>{star}</Text>
                <Ionicons name="star" size={10} color="#f59e0b" />
                <View style={s.ratingBarBg}>
                  <View style={[s.ratingBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={s.ratingBarCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsContainer} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeFilter === tab.key && s.tabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text style={[s.tabText, activeFilter === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reviews List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Text style={s.countText}>{reviews.length} đánh giá</Text>
          {reviews.length === 0 ? (
            <Text style={s.emptyText}>Không có đánh giá nào.</Text>
          ) : (
            reviews.map(review => (
              <TouchableOpacity
                key={review._id}
                style={[s.card, !review.is_visible && s.cardHidden]}
                onPress={() => { setSelectedReview(review); setReplyText(review.reply_comment || ''); }}
                activeOpacity={0.7}
              >
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.customerName}>{review.user_id?.full_name || 'Khách hàng'}</Text>
                    <Text style={s.cameraName}>{review.camera_id?.name || 'Thiết bị'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={s.starsRow}>{renderStars(review.rating)}</View>
                    <Text style={s.dateText}>{timeAgo(review.createdAt)}</Text>
                  </View>
                </View>
                {review.comment && (
                  <Text style={s.commentText} numberOfLines={3}>{review.comment}</Text>
                )}
                {review.reply_comment ? (
                  <View style={s.replyBox}>
                    <Text style={s.replyLabel}>↩️ Phản hồi của bạn</Text>
                    <Text style={s.replyText} numberOfLines={2}>{review.reply_comment}</Text>
                  </View>
                ) : (
                  <View style={s.unrepliedBadge}>
                    <Ionicons name="chatbubble-outline" size={12} color="#f59e0b" />
                    <Text style={s.unrepliedText}>Chưa phản hồi</Text>
                  </View>
                )}
                {!review.is_visible && (
                  <Text style={s.hiddenBadge}>🚫 Đã ẩn</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Review Detail + Reply Modal */}
      <Modal visible={!!selectedReview} transparent animationType="slide" onRequestClose={() => setSelectedReview(null)}>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Chi tiết đánh giá</Text>
              <TouchableOpacity onPress={() => setSelectedReview(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Customer info */}
            <View style={s.modalSection}>
              <Text style={s.modalLabel}>Khách hàng</Text>
              <Text style={s.modalValue}>{selectedReview?.user_id?.full_name || 'N/A'}</Text>
            </View>
            <View style={s.modalSection}>
              <Text style={s.modalLabel}>Thiết bị</Text>
              <Text style={s.modalValue}>{selectedReview?.camera_id?.name || 'N/A'}</Text>
            </View>
            <View style={s.modalSection}>
              <Text style={s.modalLabel}>Đánh giá</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.starsRow}>{selectedReview && renderStars(selectedReview.rating)}</View>
                <Text style={s.modalValue}>{selectedReview?.rating}/5</Text>
              </View>
            </View>
            <View style={s.modalSection}>
              <Text style={s.modalLabel}>Ngày đánh giá</Text>
              <Text style={s.modalValue}>{selectedReview ? formatDate(selectedReview.createdAt) : ''}</Text>
            </View>
            {selectedReview?.comment && (
              <View style={s.modalSection}>
                <Text style={s.modalLabel}>Nội dung</Text>
                <Text style={[s.modalValue, { fontWeight: '400', lineHeight: 22 }]}>{selectedReview.comment}</Text>
              </View>
            )}

            {/* Reply section */}
            <View style={s.replySection}>
              <Text style={s.replySectionTitle}>
                {selectedReview?.reply_comment ? '✏️ Sửa phản hồi' : '💬 Phản hồi đánh giá'}
              </Text>
              <TextInput
                style={s.replyInput}
                placeholder="Nhập phản hồi của bạn..."
                placeholderTextColor={colors.placeholder}
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[s.replyBtn, !replyText.trim() && { opacity: 0.5 }]}
                onPress={handleReply}
                disabled={submitting || !replyText.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={s.replyBtnText}>Gửi phản hồi</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Visibility toggle */}
            <TouchableOpacity
              style={s.visibilityBtn}
              onPress={() => { if (selectedReview) { handleToggleVisibility(selectedReview); setSelectedReview(null); } }}
            >
              <Ionicons name={selectedReview?.is_visible ? 'eye-off' : 'eye'} size={18} color={selectedReview?.is_visible ? '#ef4444' : '#10b981'} />
              <Text style={[s.visibilityBtnText, { color: selectedReview?.is_visible ? '#ef4444' : '#10b981' }]}>
                {selectedReview?.is_visible ? 'Ẩn đánh giá này' : 'Hiện đánh giá này'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
