import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert, StyleSheet, Modal, Image, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { adminApi } from '../../services/api';

const CATEGORIES = [
  { key: 'mirrorless', label: 'Mirrorless' },
  { key: 'dslr', label: 'DSLR' },
  { key: 'film', label: 'Film' },
  { key: 'lens', label: 'Ống kính' },
  { key: 'accessory', label: 'Phụ kiện' },
];

const COMMON_ACCESSORIES = [
  'Pin chính hãng', 'Pin dự phòng', 'Sạc pin', 'Sạc USB-C',
  'Túi máy', 'Dây đeo', 'Thẻ nhớ 64GB', 'Thẻ nhớ 128GB',
  'Filter UV', 'Hood lens', 'Tripod', 'Remote shutter',
  'Đầu đọc thẻ', 'Cáp truyền dữ liệu',
];

const SPEC_TEMPLATES: Record<string, { key: string; label: string }[]> = {
  mirrorless: [
    { key: 'sensor', label: 'Cảm biến' },
    { key: 'resolution', label: 'Độ phân giải' },
    { key: 'iso', label: 'ISO' },
    { key: 'video', label: 'Video' },
    { key: 'weight', label: 'Trọng lượng' },
    { key: 'stabilization', label: 'Chống rung' },
  ],
  dslr: [
    { key: 'sensor', label: 'Cảm biến' },
    { key: 'resolution', label: 'Độ phân giải' },
    { key: 'iso', label: 'ISO' },
    { key: 'fps', label: 'Tốc độ chụp liên tiếp' },
    { key: 'weight', label: 'Trọng lượng' },
  ],
  film: [
    { key: 'film_format', label: 'Định dạng phim' },
    { key: 'lens_mount', label: 'Ngàm ống kính' },
    { key: 'shutter_speed', label: 'Tốc độ màn trập' },
    { key: 'weight', label: 'Trọng lượng' },
  ],
  lens: [
    { key: 'focal_length', label: 'Tiêu cự' },
    { key: 'aperture', label: 'Khẩu độ' },
    { key: 'lens_mount', label: 'Ngàm' },
    { key: 'stabilization', label: 'Chống rung' },
    { key: 'weight', label: 'Trọng lượng' },
  ],
  accessory: [
    { key: 'type', label: 'Loại' },
    { key: 'compatibility', label: 'Tương thích' },
    { key: 'weight', label: 'Trọng lượng' },
  ],
};

const EMPTY_FORM = {
  name: '', brand: '', model: '', category: 'mirrorless',
  description: '', price_per_day: '', price_per_week: '',
  deposit_amount: '', included_items: [] as string[],
  specs: {} as Record<string, string>,
  quantity: '1',
};

export default function AdminInventory() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [accessoryInput, setAccessoryInput] = useState('');
  const [specKeyInput, setSpecKeyInput] = useState('');
  const [specValueInput, setSpecValueInput] = useState('');

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
    title: { color: colors.text, fontSize: 24, fontWeight: '700' },
    subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: colors.onPrimary, fontWeight: '700', marginLeft: 4, fontSize: 14 },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14, gap: 8 },
    summaryCard: { flex: 1, backgroundColor: colors.cardBackground, borderRadius: 14, padding: 12, borderLeftWidth: 3 },
    summaryNum: { color: colors.text, fontSize: 22, fontWeight: '700' },
    summaryLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    listSection: { paddingHorizontal: 16, marginTop: 16 },
    card: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.outlineVariant },
    cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    cardImage: { width: 52, height: 52, borderRadius: 12, marginRight: 12 },
    cardImagePlaceholder: { backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    camName: { color: colors.text, fontSize: 14, fontWeight: '700' },
    camBrand: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    camPrice: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 3 },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
    statusTextBadge: { fontSize: 11, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 8 },
    editBtn: { backgroundColor: colors.surfaceContainerHigh, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: colors.outlineVariant },
    deleteBtn: { backgroundColor: colors.cardBackground, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#ef444430' },
    modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.modalBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    formLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    formInput: { backgroundColor: colors.inputBackground, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.inputBorder },
    rowInputs: { flexDirection: 'row' },
    catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.surfaceContainerHigh, marginRight: 8, borderWidth: 1, borderColor: colors.outlineVariant },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    catChipTextActive: { color: colors.onPrimary },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: colors.onPrimary, fontWeight: '700', fontSize: 15 },
  }), [colors]);
  const fetchCameras = useCallback(async () => {
    if (!token) return;
    try {
      const res = await adminApi.getCameras(token);
      if (res.ok && res.data?.cameras) setCameras(res.data.cameras);
    } catch (error) {
      console.error('Fetch cameras error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  const onRefresh = () => { setRefreshing(true); fetchCameras(); };

  const openCreateForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setExistingImages([]);
    setNewImages([]);
    setAccessoryInput('');
    setShowForm(true);
  };

  const openEditForm = (cam: any) => {
    setForm({
      name: cam.name || '',
      brand: cam.brand || '',
      model: cam.model || '',
      category: cam.category || 'mirrorless',
      description: cam.description || '',
      price_per_day: cam.price_per_day?.toString() || '',
      price_per_week: cam.price_per_week?.toString() || '',
      deposit_amount: cam.deposit_amount?.toString() || '',
      included_items: cam.included_items || [],
      specs: cam.specs || {},
      quantity: cam.quantity?.toString() || '1',
    });
    setEditingId(cam._id);
    setExistingImages(cam.images || []);
    setNewImages([]);
    setAccessoryInput('');
    setShowForm(true);
  };

  const pickImage = async () => {
    if (existingImages.length + newImages.length >= 5) {
      Alert.alert('Lỗi', 'Chỉ được chọn tối đa 5 ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setNewImages([...newImages, ...uris].slice(0, 5 - existingImages.length));
    }
  };

  const removeExistingImage = (index: number) => {
    const imgs = [...existingImages];
    imgs.splice(index, 1);
    setExistingImages(imgs);
  };

  const removeNewImage = (index: number) => {
    const imgs = [...newImages];
    imgs.splice(index, 1);
    setNewImages(imgs);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.name || !form.category || !form.price_per_day || !form.deposit_amount) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ: Tên, Danh mục, Giá/ngày, Tiền cọc.');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name,
        brand: form.brand || undefined,
        model: form.model || undefined,
        category: form.category,
        description: form.description || undefined,
        price_per_day: Number(form.price_per_day),
        price_per_week: form.price_per_week ? Number(form.price_per_week) : undefined,
        deposit_amount: Number(form.deposit_amount),
        included_items: form.included_items.length > 0 ? form.included_items : undefined,
        specs: Object.keys(form.specs).length > 0 ? form.specs : undefined,
        quantity: form.quantity ? Number(form.quantity) : 1,
      };

      let res;
      if (editingId) {
        res = await adminApi.updateCamera(token, editingId, { ...data, existing_images: existingImages }, newImages);
      } else {
        res = await adminApi.createCamera(token, data, newImages);
      }

      if (res.ok) {
        Alert.alert('Thành công', editingId ? 'Đã cập nhật thiết bị.' : 'Đã thêm thiết bị mới.');
        setShowForm(false);
        fetchCameras();
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể lưu.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cam: any) => {
    Alert.alert(
      'Xóa thiết bị',
      `Bạn có chắc chắn muốn xóa "${cam.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive', onPress: async () => {
            if (!token) return;
            try {
              const res = await adminApi.deleteCamera(token, cam._id);
              if (res.ok) {
                Alert.alert('Đã xóa', 'Thiết bị đã được xóa.');
                fetchCameras();
              } else {
                Alert.alert('Lỗi', res.message || 'Không thể xóa.');
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Có lỗi xảy ra.');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => amount?.toLocaleString('vi-VN') + 'đ';

  const getStatusStyle = (status: string) => {
    if (status === 'rented') return { label: 'Đang cho thuê', color: '#f59e0b', bg: '#f59e0b20' };
    if (status === 'maintenance') return { label: 'Bảo trì', color: '#ef4444', bg: '#ef444420' };
    return { label: 'Sẵn sàng', color: '#10b981', bg: '#10b98120' };
  };

  const totalCameras = cameras.length;
  const availableCount = cameras.filter(c => c.rental_status === 'available').length;
  const rentedCount = cameras.filter(c => c.rental_status === 'rented').length;

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
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Quản lý thiết bị</Text>
            <Text style={s.subtitle}>{totalCameras} thiết bị trong kho</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openCreateForm}>
            <Ionicons name="add" size={22} color={colors.onPrimary} />
            <Text style={s.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { borderLeftColor: '#10b981' }]}>
            <Text style={s.summaryNum}>{availableCount}</Text>
            <Text style={s.summaryLabel}>Sẵn sàng</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={s.summaryNum}>{rentedCount}</Text>
            <Text style={s.summaryLabel}>Đang thuê</Text>
          </View>
          <View style={[s.summaryCard, { borderLeftColor: colors.primary }]}>
            <Text style={s.summaryNum}>{totalCameras}</Text>
            <Text style={s.summaryLabel}>Tổng cộng</Text>
          </View>
        </View>

        {/* Camera List */}
        <View style={s.listSection}>
          {cameras.map((cam) => {
            const statusStyle = getStatusStyle(cam.rental_status);
            const imageUri = cam.images?.[0];
            return (
              <View key={cam._id} style={s.card}>
                <View style={s.cardRow}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={s.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={[s.cardImage, s.cardImagePlaceholder]}>
                      <Ionicons name="camera" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={s.cardInfo}>
                    <Text style={s.camName} numberOfLines={1}>{cam.name}</Text>
                    <Text style={s.camBrand}>{cam.brand} • {CATEGORIES.find(c => c.key === cam.category)?.label || cam.category}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 }}>
                      <Text style={s.camPrice}>{formatCurrency(cam.price_per_day)}/ngày</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>SL: {cam.available_quantity ?? cam.quantity ?? 1}/{cam.quantity ?? 1}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.cardActions}>
                  <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: statusStyle.color }]} />
                    <Text style={[s.statusTextBadge, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                  </View>
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEditForm(cam)}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(cam)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={s.modalContent} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? 'Sửa thiết bị' : 'Thêm thiết bị mới'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <Text style={s.formLabel}>Hình ảnh (Tối đa 5)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {existingImages.map((uri, idx) => (
                <View key={`existing-${idx}`} style={{ marginRight: 10, position: 'relative' }}>
                  <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                  <TouchableOpacity
                    style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 2 }}
                    onPress={() => removeExistingImage(idx)}>
                    <Ionicons name="close" size={16} color="#10b981" />
                  </TouchableOpacity>
                </View>
              ))}
              {newImages.map((uri, idx) => (
                <View key={`new-${idx}`} style={{ marginRight: 10, position: 'relative' }}>
                  <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                  <TouchableOpacity
                    style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 2 }}
                    onPress={() => removeNewImage(idx)}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {(existingImages.length + newImages.length) < 5 && (
                <TouchableOpacity style={[s.formInput, { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 0 }]} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </ScrollView>

            <Text style={s.formLabel}>Tên thiết bị *</Text>
            <TextInput style={s.formInput} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="VD: Sony Alpha A7 IV" placeholderTextColor={colors.placeholder} />

            <Text style={s.formLabel}>Hãng</Text>
            <TextInput style={s.formInput} value={form.brand} onChangeText={(v) => setForm({ ...form, brand: v })} placeholder="VD: Sony" placeholderTextColor={colors.placeholder} />

            <Text style={s.formLabel}>Model</Text>
            <TextInput style={s.formInput} value={form.model} onChangeText={(v) => setForm({ ...form, model: v })} placeholder="VD: A7M4" placeholderTextColor={colors.placeholder} />

            <Text style={s.formLabel}>Danh mục *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.catChip, form.category === cat.key && s.catChipActive]}
                  onPress={() => setForm({ ...form, category: cat.key })}
                >
                  <Text style={[s.catChipText, form.category === cat.key && s.catChipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.formLabel}>Mô tả</Text>
            <TextInput style={[s.formInput, { height: 70 }]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Mô tả thiết bị..." placeholderTextColor={colors.placeholder} multiline />

            <View style={s.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>Giá/ngày (đ) *</Text>
                <TextInput style={s.formInput} value={form.price_per_day} onChangeText={(v) => setForm({ ...form, price_per_day: v })} placeholder="500000" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>Giá/tuần (đ)</Text>
                <TextInput style={s.formInput} value={form.price_per_week} onChangeText={(v) => setForm({ ...form, price_per_week: v })} placeholder="3000000" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
              </View>
            </View>

            <View style={s.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>Tiền cọc (đ) *</Text>
                <TextInput style={s.formInput} value={form.deposit_amount} onChangeText={(v) => setForm({ ...form, deposit_amount: v })} placeholder="5000000" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>Số lượng *</Text>
                <TextInput style={s.formInput} value={form.quantity} onChangeText={(v) => setForm({ ...form, quantity: v })} placeholder="1" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
              </View>
            </View>

            {/* ── Thông số kỹ thuật ── */}
            <Text style={s.formLabel}>Thông số kỹ thuật</Text>
            <View style={{ marginBottom: 14 }}>
              {/* Template specs theo danh mục */}
              {(SPEC_TEMPLATES[form.category] || []).map((spec) => (
                <View key={spec.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13, width: 110, fontWeight: '600' }}>{spec.label}</Text>
                  <TextInput
                    style={[s.formInput, { flex: 1, marginBottom: 0 }]}
                    value={form.specs[spec.key] || ''}
                    onChangeText={(v) => setForm({ ...form, specs: { ...form.specs, [spec.key]: v } })}
                    placeholder={`Nhập ${spec.label.toLowerCase()}...`}
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              ))}
              {/* Thêm thông số tùy chỉnh */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                <TextInput
                  style={[s.formInput, { flex: 1, marginBottom: 0 }]}
                  value={specKeyInput}
                  onChangeText={setSpecKeyInput}
                  placeholder="Tên thông số"
                  placeholderTextColor={colors.placeholder}
                />
                <TextInput
                  style={[s.formInput, { flex: 1, marginBottom: 0 }]}
                  value={specValueInput}
                  onChangeText={setSpecValueInput}
                  placeholder="Giá trị"
                  placeholderTextColor={colors.placeholder}
                />
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 10 }}
                  onPress={() => {
                    const k = specKeyInput.trim();
                    const v = specValueInput.trim();
                    if (k && v) {
                      setForm({ ...form, specs: { ...form.specs, [k]: v } });
                      setSpecKeyInput('');
                      setSpecValueInput('');
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
              {/* Hiển thị specs đã thêm ngoài template */}
              {Object.entries(form.specs)
                .filter(([key]) => !(SPEC_TEMPLATES[form.category] || []).some(s => s.key === key))
                .filter(([, val]) => val)
                .map(([key, val]) => (
                  <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13, width: 110, fontWeight: '600' }}>{key}</Text>
                    <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{val}</Text>
                    <TouchableOpacity onPress={() => {
                      const updated = { ...form.specs };
                      delete updated[key];
                      setForm({ ...form, specs: updated });
                    }}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>

            {/* ── Phụ kiện đi kèm ── */}
            <Text style={s.formLabel}>Phụ kiện đi kèm</Text>
            {/* Gợi ý có sẵn */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {COMMON_ACCESSORIES.map((acc) => {
                const isSelected = form.included_items.includes(acc);
                return (
                  <TouchableOpacity
                    key={acc}
                    onPress={() => {
                      if (isSelected) {
                        setForm({ ...form, included_items: form.included_items.filter((i: string) => i !== acc) });
                      } else {
                        setForm({ ...form, included_items: [...form.included_items, acc] });
                      }
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: isSelected ? colors.primary + '20' : colors.surfaceContainerHigh,
                      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
                      borderWidth: 1, borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    }}
                  >
                    <Ionicons name={isSelected ? 'checkmark-circle' : 'add-circle-outline'} size={14} color={isSelected ? colors.primary : colors.textMuted} />
                    <Text style={{ color: isSelected ? colors.primary : colors.text, fontSize: 12, marginLeft: 5, fontWeight: isSelected ? '600' : '400' }}>{acc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Thêm phụ kiện tùy chỉnh */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TextInput
                style={[s.formInput, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                value={accessoryInput}
                onChangeText={setAccessoryInput}
                placeholder="Thêm phụ kiện khác..."
                placeholderTextColor={colors.placeholder}
                onSubmitEditing={() => {
                  const trimmed = accessoryInput.trim();
                  if (trimmed && !form.included_items.includes(trimmed)) {
                    setForm({ ...form, included_items: [...form.included_items, trimmed] });
                    setAccessoryInput('');
                  }
                }}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                  const trimmed = accessoryInput.trim();
                  if (trimmed && !form.included_items.includes(trimmed)) {
                    setForm({ ...form, included_items: [...form.included_items, trimmed] });
                    setAccessoryInput('');
                  }
                }}
              >
                <Ionicons name="add" size={22} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
            {/* Hiển thị phụ kiện custom (không nằm trong COMMON) */}
            {form.included_items.filter((item: string) => !COMMON_ACCESSORIES.includes(item)).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {form.included_items.filter((item: string) => !COMMON_ACCESSORIES.includes(item)).map((item: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerHigh, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.outlineVariant }}>
                    <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                    <Text style={{ color: colors.text, fontSize: 13, marginLeft: 5 }}>{item}</Text>
                    <TouchableOpacity
                      style={{ marginLeft: 8 }}
                      onPress={() => {
                        setForm({ ...form, included_items: form.included_items.filter((i: string) => i !== item) });
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
                <Text style={s.saveBtnText}>{editingId ? 'Cập nhật' : 'Thêm thiết bị'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}


