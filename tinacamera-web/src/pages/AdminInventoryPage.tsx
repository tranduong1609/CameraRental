import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Camera, X } from 'lucide-react';

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
    included_items: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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
        included_items: camera.included_items && Array.isArray(camera.included_items) ? camera.included_items.join(', ') : '',
        existing_images: camera.images || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', brand: '', category: 'mirrorless',
        price_per_day: '', deposit_amount: '', description: '', total_quantity: '1', available_quantity: '1',
        included_items: '',
        existing_images: [],
      });
    }
    setSelectedFiles([]);
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
      quantity: Number(formData.total_quantity), // backend expects quantity
      available_quantity: Number(formData.available_quantity),
      included_items: formData.included_items ? formData.included_items.split(',').map((i: string) => i.trim()).filter(Boolean) : [],
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="section-title" style={{ margin: 0 }}>Quản lý kho hàng</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Thêm thiết bị
        </button>
      </div>

      {loading ? (
        <div className="spinner spinner-lg"></div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {cameras.map(camera => (
            <div key={camera._id} className="card" style={{ padding: 16, display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: 12, background: 'var(--surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {camera.images?.[0] ? (
                  <img src={camera.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} alt="" />
                ) : (
                  <Camera size={24} color="var(--text-muted)" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>{camera.brand}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: camera.available_quantity > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: camera.available_quantity > 0 ? '#10b981' : '#ef4444' }}>
                    Còn {camera.available_quantity}/{camera.total_quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{camera.name}</div>
                <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>{formatCurrency(camera.price_per_day)}/ngày</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" onClick={() => handleOpenModal(camera)}><Edit2 size={18} /></button>
                <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(camera._id)}><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal (Portal) */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 9999 }}>
          <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingId ? 'Sửa thiết bị' : 'Thêm thiết bị mới'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>TÊN THIẾT BỊ</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>DANH MỤC</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}>
                  <option value="mirrorless">Mirrorless</option>
                  <option value="dslr">DSLR</option>
                  <option value="film">Film</option>
                  <option value="lens">Ống kính (Lens)</option>
                  <option value="accessory">Phụ kiện</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>THƯƠNG HIỆU</label>
                <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>GIÁ CỌC (VNĐ)</label>
                <input type="number" value={formData.deposit_amount} onChange={e => setFormData({...formData, deposit_amount: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>GIÁ THUÊ / NGÀY</label>
                <input type="number" value={formData.price_per_day} onChange={e => setFormData({...formData, price_per_day: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>TỔNG SỐ LƯỢNG</label>
                <input type="number" value={formData.total_quantity} onChange={e => setFormData({...formData, total_quantity: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>SẴN CÓ</label>
                <input type="number" value={formData.available_quantity} onChange={e => setFormData({...formData, available_quantity: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>PHỤ KIỆN ĐI KÈM (Cách nhau bằng dấu phẩy)</label>
                <input type="text" placeholder="VD: Pin, Sạc, Thẻ nhớ 64GB, Túi đựng" value={formData.included_items} onChange={e => setFormData({...formData, included_items: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>MÔ TẢ</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', resize: 'none' }} />
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
                            setFormData({...formData, existing_images: formData.existing_images.filter((_: any, i: number) => i !== idx)});
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

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thiết bị'}
            </button>
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
