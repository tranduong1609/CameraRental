import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Star, Calendar, CheckCircle, ChevronRight, X } from 'lucide-react';
import { cameraApi } from '../services/api';

const CATEGORY_COLORS: Record<string, string> = {
  mirrorless: '#8B5CF6', dslr: '#3B82F6', film: '#F59E0B', lens: '#10B981', accessory: '#F43F5E',
};
const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';
const formatDisplayDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`;
};

export default function HomePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date picker state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const totalDays = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
    : 0;

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    const params: any = { limit: 8, sort: 'popular' };
    if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    const [catRes, camRes] = await Promise.all([
      cameraApi.getCategories(),
      cameraApi.getCameras(params),
    ]);
    if (catRes.ok && catRes.data) setCategories(catRes.data.categories);
    if (camRes.ok && camRes.data) setFeatured(camRes.data.cameras);
    setLoading(false);
  };

  const clearDates = () => { setStartDate(''); setEndDate(''); };

  const handleConfirmDates = () => {
    if (startDate && endDate) {
      navigate(`/products?start_date=${startDate}&end_date=${endDate}`);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content animate-fade-in">
            <h1>Thuê máy ảnh xịn<br />trong <span>60 giây</span></h1>
            <p>Canon, Sony, Fujifilm – ống kính, tripod, phụ kiện. Có sẵn, giá minh bạch, giao tận nơi tại Hà Nội.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/products" className="btn btn-primary btn-lg">
                Thuê ngay <ArrowRight size={18} />
              </Link>
              <Link to="/products" className="btn btn-secondary btn-lg">
                Xem thiết bị
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Date Picker Section ── */}
      <div className="container" style={{ marginTop: -28, position: 'relative', zIndex: 2 }}>
        <div className="date-picker-card animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Chọn ngày thuê</span>
            {startDate && endDate && (
              <button onClick={clearDates} style={{ marginLeft: 'auto', background: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            )}
          </div>

          <div className="date-picker-group">
            {/* Start Date */}
            <div className="date-picker-input-wrapper">
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Từ ngày</label>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                  color: 'var(--text)', fontSize: 15, fontWeight: 600,
                }}
              />
            </div>

            {/* Arrow */}
            <div className="date-picker-arrow">→</div>

            {/* End Date */}
            <div className="date-picker-input-wrapper">
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Đến ngày</label>
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                  color: 'var(--text)', fontSize: 15, fontWeight: 600,
                }}
              />
            </div>

            {/* Days badge */}
            {totalDays > 0 && (
              <div className="date-picker-days-badge" style={{
                background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)',
                padding: '10px 16px', fontWeight: 700, color: 'var(--accent)',
                fontSize: 15, whiteSpace: 'nowrap',
              }}>
                {totalDays} ngày
              </div>
            )}

            {/* Search button */}
            <button
              className="btn btn-primary"
              onClick={handleConfirmDates}
              disabled={!startDate || !endDate}
            >
              <Search size={18} /> Tìm thiết bị trống
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="container" style={{ marginTop: 16, position: 'relative', zIndex: 1 }}>
        <Link to="/products" style={{ display: 'block' }}>
          <div className="input-group" style={{ height: 52 }}>
            <Search size={20} className="input-icon" />
            <input placeholder="Tìm kiếm máy ảnh, ống kính, phụ kiện..." readOnly style={{ cursor: 'pointer' }} />
          </div>
        </Link>
      </div>

      {/* Categories */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Danh mục</h2>
              <p className="section-subtitle">Tìm thiết bị theo nhu cầu</p>
            </div>
            <Link to="/products" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
              Xem tất cả <ChevronRight size={16} />
            </Link>
          </div>

          <div className="chips">
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: 120, height: 48 }} />
            )) : categories.map((cat, i) => (
              <Link to={`/products?category=${cat.id}`} key={cat.id} className="chip animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="chip-icon" style={{ background: (CATEGORY_COLORS[cat.id] || '#8B5CF6') + '20', color: CATEGORY_COLORS[cat.id] || '#8B5CF6' }}>
                  📷
                </div>
                {cat.name}
                <span className="badge badge-primary">{cat.productCount}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {startDate && endDate ? 'Thiết bị còn trống' : 'Sản phẩm nổi bật'}
              </h2>
              <p className="section-subtitle">
                {startDate && endDate
                  ? `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)} (${totalDays} ngày)`
                  : 'Được thuê nhiều nhất'}
              </p>
            </div>
            <Link to="/products" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
              Xem tất cả <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="grid-products">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card"><div className="skeleton" style={{ aspectRatio: '4/3' }} /><div style={{ padding: 16 }}><div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 12 }} /><div className="skeleton" style={{ height: 16, width: '40%' }} /></div></div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📷</div>
              <div className="empty-state-title">Không có thiết bị trống</div>
              <p>Không có thiết bị trống trong khoảng ngày này</p>
            </div>
          ) : (
            <div className="grid-products">
              {featured.map((cam, i) => (
                <div 
                  key={cam._id} 
                  className="card product-card animate-fade-in-up" 
                  style={{ animationDelay: `${i * 0.08}s`, cursor: 'pointer' }}
                  onClick={(e) => {
                    if (!startDate || !endDate) {
                      e.preventDefault();
                      alert('Vui lòng chọn khoảng ngày thuê ở phía trên để xem chi tiết thiết bị.');
                    } else {
                      navigate(`/product/${cam._id}?start_date=${startDate}&end_date=${endDate}`);
                    }
                  }}
                >
                  <div className="card-image-wrapper">
                    {cam.images?.[0] ? (
                      <img src={cam.images[0]} alt={cam.name} className="card-image" loading="lazy" />
                    ) : (
                      <div className="card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 40 }}>📷</div>
                    )}
                    <div className="product-status">
                      {startDate && endDate && (
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
                      <div>
                        <span className="product-price">{formatPrice(cam.price_per_day)}</span>
                        <span className="product-price-label">/ngày</span>
                      </div>
                      {cam.rating_avg > 0 && (
                        <div className="product-rating">
                          <Star size={13} fill="var(--star)" color="var(--star)" />
                          {cam.rating_avg.toFixed(1)}
                        </div>
                      )}
                    </div>
                    {totalDays > 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        {totalDays} ngày: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatPrice(cam.price_per_day * totalDays)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Process */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 8 }}>Quy trình đơn giản</h2>
          <p className="section-subtitle" style={{ textAlign: 'center', marginBottom: 36 }}>Chỉ 3 bước để có thiết bị trong tay</p>
          <div className="steps">
            {[
              { icon: <Search size={24} />, title: '1. Chọn thiết bị', desc: 'Tìm kiếm và chọn dòng máy phù hợp với nhu cầu của bạn.' },
              { icon: <Calendar size={24} />, title: '2. Đặt lịch', desc: 'Chọn thời gian thuê và thanh toán nhanh chóng.' },
              { icon: <CheckCircle size={24} />, title: '3. Nhận máy', desc: 'Đến cửa hàng nhận hoặc giao tận nơi chỉ trong 30 phút.' },
            ].map((s, i) => (
              <div key={i} className="step-card animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="step-icon">{s.icon}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
