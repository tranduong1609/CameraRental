import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Camera, X, PlusCircle, CheckCircle, XCircle } from 'lucide-react';

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

export default function AdminInventoryPage() {
  const { token } = useAuth();
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', brand: '', category: 'mirrorless',
    price_per_day: '', deposit_amount: '', description: '', total_quantity: '1', available_quantity: '1',
    included_items: [] as string[],
    specs: {} as Record<string, string>,
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [accessoryInput, setAccessoryInput] = useState('');
  const [specKeyInput, setSpecKeyInput] = useState('');
  const [specValueInput, setSpecValueInput] = useState('');

  const fetchCameras = async () => {
    if (!token) return;
    setLoading(true);
    const res = await adminApi.getCameras(token);
    if (res.ok && res.data?.cameras) {
      setCameras(res.data.cameras);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCameras();
  }, [token]);

  const handleOpenModal = (camera: any = null) => {
    if (camera) {
      setEditingId(camera._id);
      setFormData({
        name: camera.name || '',
        brand: camera.brand || '',
        category: camera.category || 'mirrorless',
        price_per_day: camera.price_per_day || '',
        deposit_amount: camera.deposit_amount || '',
        description: camera.description || '',
        total_quantity: camera.quantity || camera.total_quantity || '1',
        available_quantity: camera.available_quantity || '1',
        included_items: camera.included_items && Array.isArray(camera.included_items) ? camera.included_items : [],
        specs: camera.specs || {},
        existing_images: camera.images || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', brand: '', category: 'mirrorless',
        price_per_day: '', deposit_amount: '', description: '', total_quantity: '1', available_quantity: '1',
        included_items: [] as string[],
        specs: {} as Record<string, string>,
        existing_images: [],
      });
    }
    setSelectedFiles([]);
    setAccessoryInput('');
    setSpecKeyInput('');
    setSpecValueInput('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);

    // Convert to proper types
    const submitData = {
      ...formData,
      price_per_day: Number(formData.price_per_day),
      deposit_amount: Number(formData.deposit_amount),
      quantity: Number(formData.total_quantity),
      available_quantity: Number(formData.available_quantity),
      included_items: formData.included_items || [],
      specs: formData.specs && Object.keys(formData.specs).length > 0 ? formData.specs : undefined,
      existing_images: formData.existing_images || [],
    };

    let res;
    if (editingId) {
      res = await adminApi.updateCamera(token, editingId, submitData, selectedFiles);
    } else {
      res = await adminApi.createCamera(token, submitData, selectedFiles);
    }

    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      fetchCameras();
      setToastMessage('Lưu thiết bị thành công!');
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      alert(res.message || 'Lỗi khi lưu thiết bị');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Bạn có chắc muốn xóa thiết bị này?')) return;
    const res = await adminApi.deleteCamera(token, id);
    if (res.ok) {
      fetchCameras();
    } else {
      alert(res.message || 'Lỗi khi xóa');
    }
  };

  const formatCurrency = (amount: number) => amount?.toLocaleString('vi-VN') + ' ₫';

  const readyCount = cameras.filter(c => c.available_quantity > 0).length;
  const rentedCount = cameras.length - readyCount;
  const totalCount = cameras.length;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>Quản lý thiết bị</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{totalCount} thiết bị trong kho</div>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Thêm
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface-high)', padding: '16px', borderRadius: 12, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{readyCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sẵn sàng</div>
        </div>
        <div style={{ background: 'var(--surface-high)', padding: '16px', borderRadius: 12, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{rentedCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang thuê</div>
        </div>
        <div style={{ background: 'var(--surface-high)', padding: '16px', borderRadius: 12, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{totalCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng cộng</div>
        </div>
      </div>

      {loading ? (
        <div className="spinner spinner-lg"></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {cameras.map(camera => (
            <div key={camera._id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: 12, background: 'var(--surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {camera.images?.[0] ? (
                    <img src={camera.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} alt="" />
                  ) : (
                    <Camera size={24} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{camera.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>
                    {camera.brand} • {camera.category === 'accessory' ? 'Phụ kiện' : camera.category === 'lens' ? 'Ống kính' : camera.category}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>{formatCurrency(camera.price_per_day)}/ngày</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>SL: {camera.available_quantity}{camera.total_quantity}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 20,
                  background: camera.available_quantity > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: camera.available_quantity > 0 ? '#10b981' : '#f59e0b',
                  fontSize: 12, fontWeight: 600
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: camera.available_quantity > 0 ? '#10b981' : '#f59e0b' }}></div>
                  {camera.available_quantity > 0 ? 'Sẵn sàng' : 'Đang cho thuê'}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--input-border)', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => handleOpenModal(camera)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => handleDelete(camera._id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal (Portal) */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 9999, alignItems: 'flex-start', padding: '16px', overflowY: 'auto' }}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ 
            width: '100%', 
            maxWidth: 600, 
            margin: 'auto', // Centers vertically if there's space, otherwise sticks to top padding
            padding: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            maxHeight: 'calc(100dvh - 32px)', 
            overflow: 'hidden' 
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{editingId ? 'Sửa thiết bị' : 'Thêm thiết bị mới'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={24} /></button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>TÊN THIẾT BỊ</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>DANH MỤC</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}>
                    <option value="mirrorless">Mirrorless</option>
                    <option value="dslr">DSLR</option>
                    <option value="film">Film</option>
                    <option value="lens">Ống kính (Lens)</option>
                    <option value="accessory">Phụ kiện</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>THƯƠNG HIỆU</label>
                  <input type="text" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>GIÁ CỌC (VNĐ)</label>
                  <input type="number" value={formData.deposit_amount} onChange={e => setFormData({ ...formData, deposit_amount: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>GIÁ THUÊ / NGÀY</label>
                  <input type="number" value={formData.price_per_day} onChange={e => setFormData({ ...formData, price_per_day: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>TỔNG SỐ LƯỢNG</label>
                  <input type="number" value={formData.total_quantity} onChange={e => setFormData({ ...formData, total_quantity: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>SẴN CÓ</label>
                  <input type="number" value={formData.available_quantity} onChange={e => setFormData({ ...formData, available_quantity: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                </div>
                {/* ── THÔNG SỐ KỸ THUẬT ── */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, display: 'block' }}>THÔNG SỐ KỸ THUẬT</label>
                  {(SPEC_TEMPLATES[formData.category] || []).map((spec) => (
                    <div key={spec.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>{spec.label}</label>
                      <input
                        type="text"
                        value={formData.specs?.[spec.key] || ''}
                        onChange={e => setFormData({ ...formData, specs: { ...formData.specs, [spec.key]: e.target.value } })}
                        placeholder={`Nhập ${spec.label.toLowerCase()}...`}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13 }}
                      />
                    </div>
                  ))}
                  {/* Custom specs already added */}
                  {Object.entries(formData.specs || {})
                    .filter(([key]) => !(SPEC_TEMPLATES[formData.category] || []).some(s => s.key === key))
                    .filter(([, val]) => val)
                    .map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>{key}</span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{val as string}</span>
                        <button onClick={() => {
                          const updated = { ...formData.specs };
                          delete updated[key];
                          setFormData({ ...formData, specs: updated });
                        }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2 }}>
                          <XCircle size={16} />
                        </button>
                      </div>
                    ))}
                  {/* Add custom spec */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input type="text" value={specKeyInput} onChange={e => setSpecKeyInput(e.target.value)} placeholder="Tên thông số" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13 }} />
                    <input type="text" value={specValueInput} onChange={e => setSpecValueInput(e.target.value)} placeholder="Giá trị" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13 }} />
                    <button onClick={() => {
                      const k = specKeyInput.trim();
                      const v = specValueInput.trim();
                      if (k && v) {
                        setFormData({ ...formData, specs: { ...formData.specs, [k]: v } });
                        setSpecKeyInput('');
                        setSpecValueInput('');
                      }
                    }} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <Plus size={14} /> Thêm
                    </button>
                  </div>
                </div>

                {/* ── PHỤ KIỆN ĐI KÈM ── */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, display: 'block' }}>PHỤ KIỆN ĐI KÈM</label>
                  {/* Predefined options */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {COMMON_ACCESSORIES.map((acc) => {
                      const isSelected = formData.included_items?.includes(acc);
                      return (
                        <button
                          key={acc}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormData({ ...formData, included_items: formData.included_items.filter((i: string) => i !== acc) });
                            } else {
                              setFormData({ ...formData, included_items: [...(formData.included_items || []), acc] });
                            }
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: isSelected ? 600 : 400, cursor: 'pointer',
                            background: isSelected ? 'var(--primary-light, rgba(139, 92, 246, 0.1))' : 'var(--surface-high)',
                            color: isSelected ? 'var(--primary)' : 'var(--text)',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--input-border)'}`,
                          }}
                        >
                          {isSelected ? <CheckCircle size={13} /> : <PlusCircle size={13} />}
                          {acc}
                        </button>
                      );
                    })}
                  </div>
                  {/* Custom accessory input */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value={accessoryInput} onChange={e => setAccessoryInput(e.target.value)} placeholder="Thêm phụ kiện khác..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = accessoryInput.trim();
                          if (trimmed && !formData.included_items?.includes(trimmed)) {
                            setFormData({ ...formData, included_items: [...(formData.included_items || []), trimmed] });
                            setAccessoryInput('');
                          }
                        }
                      }}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13 }} />
                    <button type="button" onClick={() => {
                      const trimmed = accessoryInput.trim();
                      if (trimmed && !formData.included_items?.includes(trimmed)) {
                        setFormData({ ...formData, included_items: [...(formData.included_items || []), trimmed] });
                        setAccessoryInput('');
                      }
                    }} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <Plus size={14} /> Thêm
                    </button>
                  </div>
                  {/* Custom items (not in COMMON list) */}
                  {formData.included_items?.filter((item: string) => !COMMON_ACCESSORIES.includes(item)).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {formData.included_items.filter((item: string) => !COMMON_ACCESSORIES.includes(item)).map((item: string) => (
                        <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <CheckCircle size={12} />
                          {item}
                          <button type="button" onClick={() => setFormData({ ...formData, included_items: formData.included_items.filter((i: string) => i !== item) })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 0, marginLeft: 2 }}>
                            <XCircle size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── MÔ TẢ ── */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>MÔ TẢ</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'none' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>HÌNH ẢNH ĐÃ CÓ</label>
                  {formData.existing_images && formData.existing_images.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>
                      {formData.existing_images.map((img: string, idx: number) => (
                        <div key={idx} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--input-border)' }}>
                          <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setFormData({ ...formData, existing_images: formData.existing_images.filter((_: any, i: number) => i !== idx) });
                            }}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, padding: 0 }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>THÊM HÌNH ẢNH MỚI (Tùy chọn)</label>
                  <input type="file" multiple accept="image/*" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px dashed var(--input-border)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thiết bị'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {toastMessage && createPortal(
        <div className="toast animate-fade-in" style={{ zIndex: 99999 }}>
          {toastMessage}
        </div>,
        document.body
      )}
    </div>
  );
}
