import { View, Text, TouchableOpacity, ScrollView, Image, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCart } from '../contexts/CartContext';
import { useRental } from '../contexts/RentalContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export default function CartScreen() {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const { startDate, endDate, totalDays } = useRental();
  const { colors } = useTheme();

  const rentalTotal = totalDays > 0 ? getTotal() * totalDays : getTotal();

  const handleCheckout = () => {
    if (!startDate || !endDate) {
      Alert.alert(
        'Chưa chọn ngày thuê',
        'Vui lòng quay lại trang chủ và chọn ngày thuê trước khi đặt hàng.',
        [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
      );
      return;
    }
    router.push('/payment');
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.separator },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 16 },
    clearText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    emptyTitle: { color: colors.textSecondary, fontSize: 18, marginTop: 16, fontWeight: '600' },
    emptySub: { color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: 'center' },
    exploreBtn: { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    exploreBtnText: { color: colors.onPrimary, fontWeight: '700' },
    scrollView: { flex: 1, padding: 16 },
    banner: { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    bannerWarning: { backgroundColor: '#FBBF2415', borderWidth: 1, borderColor: '#FBBF2430', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    bannerTextContainer: { marginLeft: 12, flex: 1 },
    bannerTitle: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    bannerTitleWarning: { color: '#FBBF24', fontWeight: '700', fontSize: 14 },
    bannerSub: { color: colors.text, fontSize: 14, marginTop: 2 },
    bannerSubWarning: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    itemCard: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.outlineVariant, marginBottom: 12 },
    itemImgContainer: { width: 80, height: 80, backgroundColor: colors.surfaceContainerHigh, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    itemImg: { width: '100%', height: '100%' },
    itemInfo: { flex: 1, marginLeft: 16, justifyContent: 'space-between', height: 80 },
    itemName: { color: colors.text, fontWeight: '700', fontSize: 16 },
    itemBrand: { color: colors.textMuted, fontSize: 12 },
    itemPrice: { color: colors.primary, fontWeight: '600', marginTop: 4 },
    itemTotal: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    delBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
    qtyContainer: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    qtyText: { color: colors.text, marginHorizontal: 12, fontWeight: '700' },
    bottomBar: { padding: 24, backgroundColor: colors.cardBackground, borderTopWidth: 1, borderTopColor: colors.separator },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { color: colors.textMuted, fontSize: 14 },
    summaryValue: { color: colors.textSecondary, fontSize: 14 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    totalLabel: { color: colors.textSecondary, fontWeight: '600', fontSize: 18 },
    totalValue: { color: colors.text, fontWeight: '700', fontSize: 20 },
    checkoutBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    checkoutBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 18 },
  }), [colors]);

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Giỏ hàng của bạn</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={clearCart}>
            <Text style={s.clearText}>Xoá tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={s.emptySub}>Hãy thêm sản phẩm vào giỏ hàng để bắt đầu thuê</Text>
          <TouchableOpacity style={s.exploreBtn} onPress={() => router.push('/(tabs)/category')}>
            <Text style={s.exploreBtnText}>Khám phá ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={s.scrollView}>
            {/* Rental Dates Banner */}
            {startDate && endDate ? (
              <View style={s.banner}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <View style={s.bannerTextContainer}>
                  <Text style={s.bannerTitle}>Ngày thuê đã chọn</Text>
                  <Text style={s.bannerSub}>
                    {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)} ({totalDays} ngày)
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={s.bannerWarning} onPress={() => router.push('/(tabs)')}>
                <Ionicons name="warning" size={20} color="#FBBF24" />
                <View style={s.bannerTextContainer}>
                  <Text style={s.bannerTitleWarning}>Chưa chọn ngày thuê</Text>
                  <Text style={s.bannerSubWarning}>Bấm để quay lại trang chủ chọn ngày</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cart Items */}
            {items.map((item) => (
              <View key={item._id} style={s.itemCard}>
                <View style={s.itemImgContainer}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={s.itemImg} resizeMode="cover" />
                  ) : (
                    <Ionicons name="camera" size={40} color={colors.textMuted} />
                  )}
                </View>
                <View style={s.itemInfo}>
                  <View>
                    <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.itemBrand}>{item.brand}</Text>
                  </View>
                  <View>
                    <Text style={s.itemPrice}>{formatPrice(item.price_per_day)}/ngày</Text>
                    {totalDays > 0 && (
                      <Text style={s.itemTotal}>
                        {totalDays} ngày × {item.quantity}: {formatPrice(item.price_per_day * totalDays * item.quantity)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={s.delBtn} onPress={() => removeFromCart(item._id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
                <View style={s.qtyContainer}>
                  <TouchableOpacity onPress={() => updateQuantity(item._id, item.quantity - 1)}>
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={s.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item._id, item.quantity + 1)}>
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View style={s.bottomBar}>
            {totalDays > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Giá/ngày</Text>
                <Text style={s.summaryValue}>{formatPrice(getTotal())}</Text>
              </View>
            )}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>
                {totalDays > 0 ? `Tổng (${totalDays} ngày)` : 'Tạm tính/ngày'}
              </Text>
              <Text style={s.totalValue}>{formatPrice(rentalTotal)}</Text>
            </View>
            <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout}>
              <Text style={s.checkoutBtnText}>Đặt ngay</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
