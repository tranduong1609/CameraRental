import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { cameraApi } from '../../services/api';
import { useRental } from '../../contexts/RentalContext';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORY_ICONS: Record<string, string> = {
  mirrorless: 'camera',
  dslr: 'camera-outline',
  film: 'film',
  lens: 'eye',
  accessory: 'bag-handle',
};

const formatPrice = (price: number) => {
  return price.toLocaleString('vi-VN') + 'đ';
};

const SORT_OPTIONS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'price_asc', label: 'Giá tăng' },
  { key: 'price_desc', label: 'Giá giảm' },
  { key: 'popular', label: 'Phổ biến' },
];

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { startDate, endDate } = useRental();
  const { colors } = useTheme();

  const [categories, setCategories] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(params.filter || null);
  const [searchText, setSearchText] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const res = await cameraApi.getCategories();
      if (res.ok && res.data) setCategories(res.data.categories);
    };
    loadCategories();
  }, []);

  // Load cameras khi filter thay đổi
  useEffect(() => {
    loadCameras(1, true);
  }, [selectedCategory, sort, startDate, endDate]);

  const loadCameras = async (targetPage: number, reset: boolean) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const res = await cameraApi.getCameras({
      category: selectedCategory || undefined,
      search: searchText || undefined,
      sort,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page: targetPage,
      limit: 10,
    });

    if (res.ok && res.data) {
      if (reset) {
        setCameras(res.data.cameras);
      } else {
        // Loại bỏ trùng lặp khi append thêm data
        setCameras(prev => {
          const existingIds = new Set(prev.map(c => String(c._id)));
          const newItems = res.data!.cameras.filter((c: any) => !existingIds.has(String(c._id)));
          return [...prev, ...newItems];
        });
      }
      setPage(targetPage);
      setTotalPages(res.data.pagination.totalPages);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const handleSearch = () => {
    loadCameras(1, true);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore && !loading) {
      loadCameras(page + 1, false);
    }
  };

  const renderCamera = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.separator, marginHorizontal: 20 }}
      onPress={() => {
        if (!startDate) {
          import('react-native').then(({ Alert }) => {
            Alert.alert('Chưa chọn ngày thuê', 'Vui lòng quay lại Trang chủ để chọn khoảng thời gian thuê thiết bị trước khi xem chi tiết.', [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Về Trang chủ', onPress: () => router.push('/(tabs)') }
            ]);
          });
        } else {
          router.push(`/product/${item._id}`);
        }
      }}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      {item.images && item.images.length > 0 ? (
        <View style={{ width: 112, height: 112, backgroundColor: colors.surfaceContainerHigh }}>
          <Image source={{ uri: item.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      ) : (
        <View style={{ width: 112, height: 112, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons
            name={(CATEGORY_ICONS[item.category] || 'cube') as any}
            size={36}
            color={colors.textMuted}
          />
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>{item.brand}</Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 2 }} numberOfLines={2}>{item.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: colors.accentPink, fontWeight: '700' }}>{formatPrice(item.price_per_day)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 4 }}>/ngày</Text>
          </View>
          {startDate && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: (item.dynamic_available_quantity ?? item.available_quantity ?? 1) > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: (item.dynamic_available_quantity ?? item.available_quantity ?? 1) > 0 ? '#10B981' : '#F59E0B' }}>
                {(item.dynamic_available_quantity ?? item.available_quantity ?? 1) > 0 ? `Còn ${item.dynamic_available_quantity ?? item.available_quantity ?? 1}` : 'Hết hàng'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Danh mục thiết bị</Text>
      </View>

      {/* Search */}
      <View style={{ marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.separator, paddingHorizontal: 12 }}>
        <Ionicons name="search" size={18} color={colors.iconDefault} />
        <TextInput
          style={{ flex: 1, color: colors.text, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 }}
          placeholder="Tìm kiếm máy ảnh, ống kính..."
          placeholderTextColor={colors.placeholder}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchText(''); loadCameras(1, true); }}>
            <Ionicons name="close-circle" size={18} color={colors.iconDefault} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <View style={{ marginBottom: 8 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: 'Tất cả' }, ...categories]}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          keyExtractor={(item) => item.id || 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                marginRight: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: selectedCategory === item.id ? colors.accentPinkDim : colors.cardBackground,
                borderColor: selectedCategory === item.id ? colors.accentPink + '80' : colors.separator,
              }}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: selectedCategory === item.id ? colors.accentPink : colors.textSecondary,
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Sort Options */}
      <View style={{ marginBottom: 8 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORT_OPTIONS}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                marginRight: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: sort === item.key ? colors.surfaceContainerHigh : 'transparent',
              }}
              onPress={() => setSort(item.key)}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: sort === item.key ? colors.text : colors.textMuted }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Product List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accentPink} />
        </View>
      ) : cameras.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
          <Ionicons name="camera-outline" size={60} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, marginTop: 16, fontSize: 16 }}>Không tìm thấy sản phẩm</Text>
        </View>
      ) : (
        <FlatList
          data={cameras}
          keyExtractor={(item) => `cam-${String(item._id)}`}
          renderItem={renderCamera}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={colors.accentPink} style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
