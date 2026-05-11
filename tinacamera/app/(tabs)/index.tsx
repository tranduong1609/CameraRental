import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { cameraApi } from '../../services/api';
import { useRental } from '../../contexts/RentalContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Calendar } from 'react-native-calendars';
import { NotificationBell, NotificationModal } from '../../components/NotificationModal';

const CATEGORY_ICONS: Record<string, string> = {
  mirrorless: 'camera',
  dslr: 'camera-outline',
  film: 'film',
  lens: 'eye',
  accessory: 'bag-handle',
};

const CATEGORY_COLORS: Record<string, string> = {
  mirrorless: '#8B5CF6',
  dslr: '#3B82F6',
  film: '#F59E0B',
  lens: '#10B981',
  accessory: '#F43F5E',
};

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openCalendar?: string }>();
  const { startDate, endDate, totalDays, setDates } = useRental();
  const { colors, isDark } = useTheme();
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredCameras, setFeaturedCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempStart, setTempStart] = useState<string | null>(null);
  const [tempEnd, setTempEnd] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Tự động mở calendar khi được chuyển từ trang khác với param openCalendar
  useEffect(() => {
    if (params.openCalendar === 'true' && !startDate) {
      openCalendar();
    }
  }, [params.openCalendar]);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 6, sort: 'popular' };
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      const [catRes, camRes] = await Promise.all([
        cameraApi.getCategories(),
        cameraApi.getCameras(params),
      ]);
      if (catRes.ok && catRes.data) setCategories(catRes.data.categories);
      if (camRes.ok && camRes.data) setFeaturedCameras(camRes.data.cameras);
    } catch (error) {
      console.error('Load home data error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar logic
  const today = new Date().toISOString().split('T')[0];

  const handleDayPress = (day: any) => {
    const dateStr = day.dateString;
    if (!tempStart || (tempStart && tempEnd)) {
      // Bắt đầu chọn mới
      setTempStart(dateStr);
      setTempEnd(null);
    } else {
      // Đã có start, chọn end
      if (dateStr <= tempStart) {
        setTempStart(dateStr);
        setTempEnd(null);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    const s = tempStart;
    const e = tempEnd;

    if (s && !e) {
      marked[s] = { startingDay: true, endingDay: true, color: colors.buttonPrimary, textColor: '#fff' };
    } else if (s && e) {
      let current = new Date(s);
      const endDt = new Date(e);
      while (current <= endDt) {
        const ds = current.toISOString().split('T')[0];
        const isStart = ds === s;
        const isEnd = ds === e;
        marked[ds] = {
          startingDay: isStart,
          endingDay: isEnd,
          color: isStart || isEnd ? colors.buttonPrimary : colors.accentPinkDim,
          textColor: isStart || isEnd ? '#fff' : colors.accentPink,
        };
        current.setDate(current.getDate() + 1);
      }
    }
    return marked;
  };

  const confirmDates = () => {
    if (tempStart && tempEnd) {
      setDates(tempStart, tempEnd);
      setShowCalendar(false);
      // Chuyển sang trang danh mục để hiện danh sách máy trống
      router.push('/(tabs)/category');
    }
  };

  const openCalendar = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setShowCalendar(true);
  };

  const clearRentalDates = () => {
    setDates(null, null);
    setTempStart(null);
    setTempEnd(null);
  };

  if (loading && !startDate) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accentPink} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View>
            <Text style={{ color: colors.accentPink, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>TinaCamera</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Cho thuê máy ảnh chuyên nghiệp</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <NotificationBell onPress={() => setShowNotificationModal(true)} />
            <TouchableOpacity
              style={{ backgroundColor: colors.surfaceContainerHigh, padding: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.separator, marginLeft: 8 }}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person" size={20} color={colors.accentPink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Date Picker Section ── */}
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.cardBackground }}
          onPress={openCalendar}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="calendar" size={18} color={colors.accentPink} />
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginLeft: 8 }}>Chọn ngày thuê</Text>
            {startDate && endDate && (
              <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={clearRentalDates}>
                <Ionicons name="close-circle" size={20} color={colors.iconDefault} />
              </TouchableOpacity>
            )}
          </View>

          {startDate && endDate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, backgroundColor: colors.surfaceContainerHigh, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Từ ngày</Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginTop: 4 }}>{formatDisplayDate(startDate)}</Text>
              </View>
              <View style={{ marginHorizontal: 12 }}>
                <Ionicons name="arrow-forward" size={20} color={colors.buttonPrimary} />
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surfaceContainerHigh, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Đến ngày</Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginTop: 4 }}>{formatDisplayDate(endDate)}</Text>
              </View>
              <View style={{ backgroundColor: colors.accentPinkDim, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 12 }}>
                <Text style={{ color: colors.accentPink, fontWeight: '700', fontSize: 14 }}>{totalDays} ngày</Text>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>Bấm để chọn khoảng ngày thuê thiết bị</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Hero Banner */}
        <View style={{ marginHorizontal: 20, marginTop: 16, padding: 24, borderRadius: 24, overflow: 'hidden', backgroundColor: isDark ? '#1a0a12' : colors.surfaceContainer }}>
          <View style={{ position: 'absolute', top: 0, right: 0, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.accentPinkDim, transform: [{ translateX: 40 }, { translateY: -40 }] }} />
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', lineHeight: 32 }}>
            Thuê máy ảnh xịn{'\n'}trong <Text style={{ color: colors.accentPink }}>60 giây</Text>
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 14, lineHeight: 20 }}>
            Canon, Sony, lens, tripod – có sẵn, giá minh bạch
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: colors.buttonPrimary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 }}
              onPress={() => {
                if (!startDate || !endDate) {
                  openCalendar();
                } else {
                  router.push('/(tabs)/category');
                }
              }}
            >
              <Text style={{ color: colors.buttonPrimaryText, fontWeight: '700', fontSize: 14 }}>Thuê ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.separator }}
              onPress={() => {
                if (!startDate || !endDate) {
                  openCalendar();
                } else {
                  router.push('/(tabs)/category');
                }
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Xem thiết bị</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.separator, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => router.push('/(tabs)/category')}
        >
          <Ionicons name="search" size={20} color={colors.iconDefault} />
          <Text style={{ color: colors.textMuted, marginLeft: 12, flex: 1 }}>Tìm kiếm thiết bị...</Text>
          <View style={{ backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
            <Ionicons name="options" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Categories */}
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Danh mục</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/category')}>
              <Text style={{ color: colors.accentPink, fontSize: 14, fontWeight: '600' }}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={`cat-${cat.id}`}
                style={{ alignItems: 'center', marginHorizontal: 8, width: 80 }}
                onPress={() => router.push({ pathname: '/(tabs)/category', params: { filter: cat.id } })}
              >
                <View
                  style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: (CATEGORY_COLORS[cat.id] || '#8B5CF6') + '20' }}
                >
                  <Ionicons
                    name={(CATEGORY_ICONS[cat.id] || 'cube') as any}
                    size={28}
                    color={CATEGORY_COLORS[cat.id] || '#8B5CF6'}
                  />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', textAlign: 'center' }} numberOfLines={1}>{cat.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>{cat.productCount} sp</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Products */}
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
                {startDate ? 'Thiết bị còn trống' : 'Sản phẩm nổi bật'}
              </Text>
              {startDate && endDate && (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)} ({totalDays} ngày)
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/category')}>
              <Text style={{ color: colors.accentPink, fontSize: 14, fontWeight: '600' }}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.accentPink} />
          ) : featuredCameras.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 12 }}>Không có thiết bị trống trong khoảng ngày này</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {featuredCameras.map((cam) => (
                <TouchableOpacity
                  key={`feat-${String(cam._id)}`}
                  style={{ width: '48%', backgroundColor: colors.cardBackground, borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.separator }}
                  onPress={() => {
                    if (!startDate) {
                      openCalendar();
                    } else {
                      router.push(`/product/${cam._id}`);
                    }
                  }}
                >
                  {cam.images && cam.images.length > 0 ? (
                    <View style={{ height: 128, width: '100%', backgroundColor: colors.surfaceContainerHigh }}>
                      <Image source={{ uri: cam.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                  ) : (
                    <View style={{ height: 128, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons
                        name={(CATEGORY_ICONS[cam.category] || 'cube') as any}
                        size={40}
                        color={colors.textMuted}
                      />
                    </View>
                  )}

                  <View style={{ padding: 12 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{cam.brand}</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 2 }} numberOfLines={2}>{cam.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Text style={{ color: colors.accentPink, fontWeight: '700', fontSize: 14 }}>{formatPrice(cam.price_per_day)}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 4 }}>/ngày</Text>
                    </View>
                    {totalDays > 0 && (
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        {totalDays} ngày: {formatPrice(cam.price_per_day * totalDays)}
                      </Text>
                    )}
                    {cam.rating_avg > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="star" size={12} color={colors.starColor} />
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>{cam.rating_avg.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Quy trình đơn giản */}
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 }}>Quy trình đơn giản</Text>

          <View style={{ gap: 16 }}>
            {/* Step 1 */}
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.separator, shadowColor: colors.primary, shadowOffset: { width: -4, height: 4 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name="search" size={24} color={colors.accentPink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>1. Chọn thiết bị</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>Tìm kiếm và chọn dòng máy phù hợp với nhu cầu của bạn.</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.separator, shadowColor: colors.primary, shadowOffset: { width: -4, height: 4 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name="calendar" size={24} color={colors.accentPink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>2. Đặt lịch</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>Chọn thời gian thuê và nhận máy nhanh chóng.</Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.separator, shadowColor: colors.primary, shadowOffset: { width: -4, height: 4 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 2 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name="checkmark-done" size={24} color={colors.accentPink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>3. Nhận máy</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>Đến cửa hàng nhận hoặc giao tận nơi chỉ trong 30p.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 40, backgroundColor: colors.surfaceContainer, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 112, borderTopWidth: 1, borderTopColor: colors.separator }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentPink, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="camera" size={18} color="#FFF" />
            </View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>TinaCamera</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 20, marginBottom: 24 }}>
            Đơn vị cho thuê máy ảnh, ống kính uy tín hàng đầu Hà Nội.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>LIÊN HỆ</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="call" size={14} color={colors.textMuted} style={{ width: 20 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>0901.234.567</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="mail" size={14} color={colors.textMuted} style={{ width: 20 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>support@tina.vn</Text>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>CHÍNH SÁCH</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>Quy định thuê</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>Bảo mật thông tin</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Bồi hoàn hư hỏng</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="share-social" size={18} color={colors.accentPink} />
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="globe-outline" size={18} color={colors.accentPink} />
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbubble" size={18} color={colors.accentPink} />
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: 16 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center' }}>
              © 2024 TinaCamera. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Chọn ngày thuê</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color={colors.iconDefault} />
              </TouchableOpacity>
            </View>

            {/* Selected Range Info */}
            {tempStart && tempEnd && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.accentPinkDim, borderRadius: 12 }}>
                <Text style={{ color: colors.accentPink, fontWeight: '600', fontSize: 14 }}>
                  {formatDisplayDate(tempStart)} → {formatDisplayDate(tempEnd)}
                  {' '}({Math.max(1, Math.ceil((new Date(tempEnd).getTime() - new Date(tempStart).getTime()) / (1000 * 60 * 60 * 24)))} ngày)
                </Text>
              </View>
            )}

            <Calendar
              minDate={today}
              markingType="period"
              markedDates={getMarkedDates()}
              onDayPress={handleDayPress}
              theme={{
                calendarBackground: colors.calendarBg,
                dayTextColor: colors.calendarText,
                monthTextColor: colors.calendarText,
                textDisabledColor: colors.calendarDisabled,
                arrowColor: colors.calendarArrow,
                todayTextColor: colors.calendarToday,
                textSectionTitleColor: colors.calendarSectionTitle,
                selectedDayBackgroundColor: colors.buttonPrimary,
                selectedDayTextColor: '#fff',
              }}
            />

            {/* Confirm Button */}
            <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
              <TouchableOpacity
                style={{ paddingVertical: 16, borderRadius: 999, alignItems: 'center', backgroundColor: tempStart && tempEnd ? colors.buttonPrimary : colors.surfaceContainerHigh }}
                onPress={confirmDates}
                disabled={!tempStart || !tempEnd}
              >
                <Text style={{ fontWeight: '700', fontSize: 18, color: tempStart && tempEnd ? colors.buttonPrimaryText : colors.textMuted }}>
                  {tempStart && tempEnd ? 'Xác nhận ngày' : 'Chọn ngày bắt đầu và kết thúc'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </SafeAreaView>
  );
}
