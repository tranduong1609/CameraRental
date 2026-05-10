import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Star, X } from 'lucide-react';
import { cameraApi } from '../services/api';

const CATEGORY_COLORS: Record<string, string> = {
  mirrorless: '#8B5CF6', dslr: '#3B82F6', film: '#F59E0B', lens: '#10B981', accessory: '#F43F5E',
};
const SORT_OPTIONS = [
  { key: 'newest', label: 'Mới nhất' }, { key: 'price_asc', label: 'Giá tăng' },
  { key: 'price_desc', label: 'Giá giảm' }, { key: 'popular', label: 'Phổ biến' },
];
const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [startDate] = useState(searchParams.get('start_date') || '');
  const [endDate] = useState(searchParams.get('end_date') || '');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    cameraApi.getCategories().then(res => { if (res.ok && res.data) setCategories(res.data.categories); });
  }, []);

  useEffect(() => {
    loadCameras(1);
  }, [selectedCategory, sort]);

  const loadCameras = async (p: number) => {
    setLoading(true);
    const res = await cameraApi.getCameras({
      category: selectedCategory || undefined,
      search: search || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      sort, page: p, limit: 12,
    });
    if (res.ok && res.data) {
      setCameras(p === 1 ? res.data.cameras : [...cameras, ...res.data.cameras]);
      setPage(p);
      setTotalPages(res.data.pagination?.totalPages || 1);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCameras(1);
  };

  return (
    <div className="container section">
      <h1 className="section-title" style={{ marginBottom: 24 }}>Danh mục thiết bị</h1>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <div className="input-group">
          <Search size={20} className="input-icon" />
          <input placeholder="Tìm kiếm máy ảnh, ống kính..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button type="button" onClick={() => { setSearch(''); setTimeout(() => loadCameras(1), 0); }} style={{ background: 'none', color: 'var(--text-muted)' }}><X size={18} /></button>}
        </div>
      </form>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className={`chip ${!selectedCategory ? 'active' : ''}`} onClick={() => setSelectedCategory('')}>Tất cả</button>
        {categories.map(cat => (
          <button key={cat.id} className={`chip ${selectedCategory === cat.id ? 'active' : ''}`} onClick={() => setSelectedCategory(cat.id)}>
            <span style={{ color: CATEGORY_COLORS[cat.id] }}>●</span> {cat.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {SORT_OPTIONS.map(opt => (
          <button key={opt.key}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: sort === opt.key ? 'var(--surface-high)' : 'transparent', color: sort === opt.key ? 'var(--text)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
            onClick={() => setSort(opt.key)}
          >{opt.label}</button>
        ))}
      </div>

      {/* Products */}
      {loading && cameras.length === 0 ? (
        <div className="grid-products">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card"><div className="skeleton" style={{ aspectRatio: '4/3' }} /><div style={{ padding: 16 }}><div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 18, marginBottom: 12 }} /><div className="skeleton" style={{ height: 16, width: '40%' }} /></div></div>
          ))}
        </div>
      ) : cameras.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📷</div>
          <div className="empty-state-title">Không tìm thấy sản phẩm</div>
          <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <>
          <div className="grid-products">
            {cameras.map((cam, i) => {
              const sd = searchParams.get('start_date');
              const ed = searchParams.get('end_date');
              const dateQuery = sd && ed ? `?start_date=${sd}&end_date=${ed}` : '';
              return (
              <div 
                key={cam._id} 
                className="card product-card animate-fade-in" 
                style={{ animationDelay: `${(i % 12) * 0.04}s`, cursor: 'pointer' }}
                onClick={(e) => {
                  if (!sd || !ed) {
                    e.preventDefault();
                    alert('Vui lòng quay lại Trang chủ để chọn khoảng ngày thuê trước khi xem chi tiết thiết bị.');
                  } else {
                    navigate(`/product/${cam._id}${dateQuery}`);
                  }
                }}
              >
                <div className="card-image-wrapper">
                  {cam.images?.[0] ? <img src={cam.images[0]} alt={cam.name} className="card-image" loading="lazy" /> : <div className="card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--text-muted)' }}>📷</div>}
                  <div className="product-status">
                    {sd && ed && (
                      <span className={`badge ${(cam.dynamic_available_quantity ?? cam.available_quantity ?? 1) > 0 ? 'badge-success' : 'badge-warning'}`}>
                        {(cam.dynamic_available_quantity ?? cam.available_quantity ?? 1) > 0 ? `Còn ${cam.dynamic_available_quantity ?? cam.available_quantity ?? 1}` : 'Hết'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="product-brand">{cam.brand}</div>
                  <div className="product-name">{cam.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div><span className="product-price">{formatPrice(cam.price_per_day)}</span><span className="product-price-label">/ngày</span></div>
                    {cam.rating_avg > 0 && <div className="product-rating"><Star size={13} fill="var(--star)" color="var(--star)" />{cam.rating_avg.toFixed(1)}</div>}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          {page < totalPages && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className="btn btn-secondary" onClick={() => loadCameras(page + 1)} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Xem thêm'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
