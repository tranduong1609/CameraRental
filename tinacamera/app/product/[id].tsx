import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, FlatList, Dimensions, Platform, Animated, StyleSheet, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { cameraApi } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRental } from '../../contexts/RentalContext';

const { width } = Dimensions.get('window');

const formatPrice = (price: number) => {
  return price.toLocaleString('vi-VN') + 'đ';
};

const CATEGORY_LABELS: Record<string, string> = {
  mirrorless: 'Mirrorless',
  dslr: 'DSLR',
  film: 'Film',
  lens: 'Ống kính',
  accessory: 'Phụ kiện',
};

const SPEC_LABELS: Record<string, string> = {
  sensor: 'Cảm biến',
  iso: 'ISO',
  fps: 'Tốc độ chụp (FPS)',
  video: 'Quay video',
  autofocus: 'Lấy nét tự động',
  battery: 'Pin',
  weight: 'Trọng lượng',
  mount: 'Ngàm ống kính',
  resolution: 'Độ phân giải',
  shutter_speed: 'Tốc độ màn trập',
  screen: 'Màn hình',
  storage: 'Lưu trữ',
  connectivity: 'Kết nối',
  stabilization: 'Chống rung',
  flash: 'Đèn flash',
  aperture: 'Khẩu độ',
  focal_length: 'Tiêu cự',
  filter_size: 'Kích thước filter',
};

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [camera, setCamera] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { addToCart } = useCart();
  const { startDate, endDate } = useRental();
  const [showToast, setShowToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Dành cho image slider
  const [activeIndex, setActiveIndex] = useState(0);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleAddToCart = () => {
    if (!camera) return;
    if (!startDate) {
      router.push({ pathname: '/(tabs)', params: { openCalendar: 'true' } });
      return;
    }
    const availQty = camera.dynamic_available_quantity ?? camera.available_quantity ?? 1;
    if (availQty <= 0) {
      Alert.alert('Hết hàng', 'Thiết bị này đã được đặt hết trong khoảng thời gian bạn chọn.');
      return;
    }
    addToCart(camera);
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  };

  const handleBuyNow = () => {
    if (!camera) return;
    if (!startDate) {
      router.push({ pathname: '/(tabs)', params: { openCalendar: 'true' } });
      return;
    }
    const availQty = camera.dynamic_available_quantity ?? camera.available_quantity ?? 1;
    if (availQty <= 0) {
      Alert.alert('Hết hàng', 'Thiết bị này đã được đặt hết trong khoảng thời gian bạn chọn.');
      return;
    }
    addToCart(camera);
    router.push('/payment');
  };

  useEffect(() => {
    if (id) loadCamera();
  }, [id, startDate, endDate]);

  const loadCamera = async () => {
    setLoading(true);
    const res = await cameraApi.getCameraDetail(id!, startDate || undefined, endDate || undefined);
    if (res.ok && res.data) {
      setCamera(res.data.camera);
      setReviews(res.data.reviews || []);
    }
    setLoading(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons key={i} name={i < rating ? 'star' : 'star-outline'} size={14} color={i < rating ? '#FBBF24' : colors.textMuted} />
    ));
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

  const s = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.separator, backgroundColor: colors.surfaceContainer },
    headerBtn: { backgroundColor: colors.primary + '15', padding: 10, borderRadius: 20 },
    headerBtnGroup: { flexDirection: 'row', gap: 12 },
    imageContainer: { width: '100%', height: 340, backgroundColor: colors.surfaceContainerHigh, marginBottom: 20, position: 'relative' },
    imageFallback: { height: 320, backgroundColor: colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center' },
    imageFallbackText: { color: colors.textMuted, marginTop: 8, fontSize: 14 },
    pagination: { position: 'absolute', bottom: 16, flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 8 },
    dotActive: { height: 8, width: 20, backgroundColor: colors.primary, borderRadius: 4 },
    dotInactive: { height: 8, width: 8, backgroundColor: 'rgba(150,150,150,0.5)', borderRadius: 4 },
    contentArea: { padding: 20, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    badgeCategory: { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    badgeCategoryText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    badgeStatus: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    brandText: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    nameText: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    ratingText: { color: colors.textSecondary, marginLeft: 4, fontWeight: '700' },
    ratingCount: { color: colors.textMuted, marginLeft: 4 },
    priceBox: { backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: colors.outlineVariant },
    priceRow: { flexDirection: 'row', alignItems: 'baseline' },
    priceText: { color: colors.primary, fontSize: 28, fontWeight: '800' },
    priceLabel: { color: colors.textMuted, fontSize: 16, marginLeft: 4 },
    storeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: colors.outlineVariant },
    storeIconBox: { width: 48, height: 48, backgroundColor: colors.primary + '15', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    storeInfo: { marginLeft: 16, flex: 1 },
    storeName: { color: colors.text, fontWeight: '700', fontSize: 16 },
    storeAddressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    storeAddress: { color: colors.textMuted, fontSize: 12, marginLeft: 4 },
    sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 12, marginTop: 20 },
    sectionDesc: { color: colors.textSecondary, lineHeight: 24, fontSize: 14 },
    specsBox: { backgroundColor: colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
    specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    specLabel: { color: colors.textMuted, fontSize: 14 },
    specValue: { color: colors.text, fontSize: 14, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 16 },
    itemWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    includedItem: { backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
    includedItemText: { color: colors.text, fontSize: 14, marginLeft: 6 },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    reviewDistBox: { backgroundColor: colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineVariant, padding: 16, marginBottom: 12 },
    distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    distBarBg: { flex: 1, height: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
    distBarFill: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 4 },
    reviewCard: { backgroundColor: colors.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineVariant, padding: 16, marginBottom: 8 },
    reviewCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    reviewUserInitialsBox: { width: 32, height: 32, backgroundColor: colors.primary + '20', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    reviewUserInitials: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    reviewUserName: { color: colors.text, fontSize: 14, fontWeight: '600' },
    reviewDate: { color: colors.textMuted, fontSize: 12 },
    reviewComment: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: 4 },
    reviewReply: { backgroundColor: colors.primary + '10', borderRadius: 12, padding: 12, marginTop: 8, borderLeftWidth: 3, borderLeftColor: colors.primary },
    reviewReplyTitle: { color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
    reviewReplyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    seeAllReviewsBtn: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 16, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    seeAllReviewsText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.cardBackground, borderTopWidth: 1, borderTopColor: colors.separator, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bottomPriceLabel: { color: colors.textMuted, fontSize: 12 },
    bottomPrice: { color: colors.text, fontWeight: '800', fontSize: 20 },
    addBtn: { backgroundColor: colors.surfaceContainerHighest, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.outlineVariant },
    addBtnText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    buyBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    buyBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
    toast: { position: 'absolute', backgroundColor: '#10B981', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', zIndex: 50 },
    toastText: { color: '#FFF', fontWeight: '700', fontSize: 14, marginLeft: 8, flex: 1 },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!camera) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Ionicons name="alert-circle-outline" size={60} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, marginTop: 16, fontSize: 16 }}>Không tìm thấy sản phẩm</Text>
        <TouchableOpacity style={{ marginTop: 16, backgroundColor: colors.surfaceContainerHighest, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }} onPress={() => router.back()}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const store = camera.store_id || {
    name: 'Tina Camera',
    address: 'Thanh Xuân, Hà Nội',
  };
  const specs = camera.specs || {};

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[s.header, { paddingTop: insets.top > 0 ? insets.top + 4 : Platform.OS === 'ios' ? 50 : 30 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.headerBtnGroup}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Image Placeholder */}
        {camera.images && camera.images.length > 0 ? (
          <View style={s.imageContainer}>
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={camera.images}
              keyExtractor={(img, index) => index.toString()}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              renderItem={({ item, index }) => (
                <View style={{ width: width, height: 340 }}>
                  <Image source={{ uri: item }} style={{ width: width, height: 340 }} resizeMode={index === 0 ? 'cover' : 'contain'} />
                </View>
              )}
            />
            {camera.images.length > 1 && (
              <View style={s.pagination}>
                {camera.images.map((_: any, idx: number) => (
                  <View key={idx} style={idx === activeIndex ? s.dotActive : s.dotInactive} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={s.imageFallback}>
            <Ionicons name="camera" size={80} color={colors.textMuted} />
            <Text style={s.imageFallbackText}>{CATEGORY_LABELS[camera.category] || camera.category}</Text>
          </View>
        )}

        {/* Content */}
        <View style={s.contentArea}>
          {/* Badge */}
          <View style={s.badgeContainer}>
            <View style={s.badgeCategory}>
              <Text style={s.badgeCategoryText}>{CATEGORY_LABELS[camera.category]}</Text>
            </View>
            {startDate && (
              <View style={[s.badgeStatus, { backgroundColor: (camera.dynamic_available_quantity ?? camera.available_quantity ?? 1) > 0 ? '#10B98115' : '#F59E0B15' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: (camera.dynamic_available_quantity ?? camera.available_quantity ?? 1) > 0 ? '#10B981' : '#F59E0B' }}>
                  {(camera.dynamic_available_quantity ?? camera.available_quantity ?? 1) > 0 ? `● Sẵn sàng (${camera.dynamic_available_quantity ?? camera.available_quantity ?? 1} còn)` : '● Hết hàng'}
                </Text>
              </View>
            )}
          </View>

          {/* Title & Brand */}
          <Text style={s.brandText}>{camera.brand}</Text>
          <Text style={s.nameText}>{camera.name}</Text>

          {/* Rating */}
          {camera.rating_avg > 0 && (
            <View style={s.ratingRow}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={s.ratingText}>{camera.rating_avg.toFixed(1)}</Text>
              <Text style={s.ratingCount}>({camera.total_reviews} đánh giá)</Text>
            </View>
          )}

          {/* Price Box */}
          <View style={s.priceBox}>
            <View style={s.priceRow}>
              <Text style={s.priceText}>{formatPrice(camera.price_per_day)}</Text>
              <Text style={s.priceLabel}>/ngày</Text>
            </View>
            {camera.price_per_week && (
              <View style={[s.ratingRow, { marginTop: 8 }]}>
                <Ionicons name="pricetag" size={14} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 14, marginLeft: 4, fontWeight: '600' }}>
                  Thuê tuần: {formatPrice(camera.price_per_week)}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 4 }}>(tiết kiệm hơn)</Text>
              </View>
            )}
            <View style={[s.ratingRow, { marginTop: 8 }]}>
              <Ionicons name="shield-checkmark" size={14} color="#60A5FA" />
              <Text style={{ color: '#60A5FA', fontSize: 14, marginLeft: 4 }}>
                Đặt cọc: {formatPrice(camera.deposit_amount)}
              </Text>
            </View>
          </View>

          {/* Store Info */}
          {store && (
            <View style={s.storeBox}>
              <View style={s.storeIconBox}>
                <Ionicons name="storefront" size={24} color={colors.primary} />
              </View>
              <View style={s.storeInfo}>
                <Text style={s.storeName}>{store.name || 'Cửa hàng'}</Text>
                <View style={s.storeAddressRow}>
                  <Ionicons name="location" size={12} color={colors.textMuted} />
                  <Text style={s.storeAddress}>{store.address || 'Hà Nội'}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          )}

          {/* Description */}
          {camera.description && (
            <View>
              <Text style={s.sectionTitle}>Mô tả</Text>
              <Text style={s.sectionDesc}>{camera.description}</Text>
            </View>
          )}

          {/* Specs */}
          {Object.keys(specs).length > 0 && (
            <View>
              <Text style={s.sectionTitle}>Thông số kỹ thuật</Text>
              <View style={s.specsBox}>
                {Object.entries(specs).map(([key, value], idx) => (
                  <View
                    key={key}
                    style={[s.specRow, idx < Object.entries(specs).length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant } : {}]}
                  >
                    <Text style={s.specLabel}>{SPEC_LABELS[key.toLowerCase()] || key.replace(/_/g, ' ')}</Text>
                    <Text style={s.specValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Included items */}
          {camera.included_items?.length > 0 && (
            <View>
              <Text style={s.sectionTitle}>Phụ kiện đi kèm</Text>
              <View style={s.itemWrap}>
                {camera.included_items.map((item: string, idx: number) => (
                  <View key={idx} style={s.includedItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={s.includedItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <View style={s.reviewHeader}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Đánh giá ({reviews.length})</Text>
                {camera.rating_avg > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontWeight: '700', marginLeft: 4 }}>{camera.rating_avg.toFixed(1)}</Text>
                  </View>
                )}
              </View>

              {/* Rating distribution */}
              <View style={s.reviewDistBox}>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviews.filter((r: any) => r.rating === star).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <View key={star} style={s.distRow}>
                      <Text style={{ color: colors.textMuted, fontSize: 12, width: 12, textAlign: 'right' }}>{star}</Text>
                      <Ionicons name="star" size={10} color="#FBBF24" style={{ marginLeft: 4 }} />
                      <View style={s.distBarBg}>
                        <View style={[s.distBarFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 12, width: 20 }}>{count}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Review cards */}
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review: any) => (
                <View key={review._id} style={s.reviewCard}>
                  <View style={s.reviewCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={s.reviewUserInitialsBox}>
                        <Text style={s.reviewUserInitials}>
                          {(review.user_id?.full_name || 'K').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={s.reviewUserName}>{review.user_id?.full_name || 'Khách hàng'}</Text>
                        <Text style={s.reviewDate}>{timeAgo(review.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2 }}>{renderStars(review.rating)}</View>
                  </View>
                  {review.comment && (
                    <Text style={s.reviewComment}>{review.comment}</Text>
                  )}
                  {review.reply_comment && (
                    <View style={s.reviewReply}>
                      <Text style={s.reviewReplyTitle}>↩️ Phản hồi từ cửa hàng</Text>
                      <Text style={s.reviewReplyText}>{review.reply_comment}</Text>
                    </View>
                  )}
                </View>
              ))}

              {reviews.length > 3 && !showAllReviews && (
                <TouchableOpacity style={s.seeAllReviewsBtn} onPress={() => setShowAllReviews(true)}>
                  <Text style={s.seeAllReviewsText}>Xem tất cả {reviews.length} đánh giá</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={s.bottomPriceLabel}>Giá thuê/ngày</Text>
          <Text style={s.bottomPrice}>{formatPrice(camera.price_per_day)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.addBtn} onPress={handleAddToCart}>
            <Text style={s.addBtnText}>Thêm giỏ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.buyBtn} onPress={handleBuyNow}>
            <Text style={s.buyBtnText}>Thuê ngay</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast notification */}
      {showToast && (
        <Animated.View
          style={[s.toast, {
            top: insets.top + 60,
            left: 20, right: 20,
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          }]}
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={s.toastText}>Đã thêm vào giỏ hàng thành công!</Text>
        </Animated.View>
      )}
    </View>
  );
}
