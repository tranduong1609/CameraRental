import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Star, ShoppingCart, ChevronRight, Shield, Tag, Store, MapPin, CheckCircle, ChevronLeft } from 'lucide-react';
import { cameraApi } from '../services/api';
import { useCart } from '../contexts/CartContext';

const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

const CATEGORY_LABELS: Record<string, string> = {
  mirrorless: 'Mirrorless', dslr: 'DSLR', film: 'Film', lens: 'Ống kính', accessory: 'Phụ kiện',
};
const SPEC_LABELS: Record<string, string> = {
  sensor: 'Cảm biến', iso: 'ISO', fps: 'Tốc độ chụp', video: 'Quay video', autofocus: 'Lấy nét',
  battery: 'Pin', weight: 'Trọng lượng', mount: 'Ngàm', resolution: 'Độ phân giải',
  aperture: 'Khẩu độ', focal_length: 'Tiêu cự', filter_size: 'Filter', stabilization: 'Chống rung',
};

const MAX_THUMBS = 4;

function ProductImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [activeImg, setActiveImg] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((idx: number) => {
    if (idx < 0) idx = images.length - 1;
    if (idx >= images.length) idx = 0;
    setActiveImg(idx);
  }, [images.length]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(activeImg + 1);
      else goTo(activeImg - 1);
    }
  };

  // Mouse drag for desktop
  const mouseStartX = useRef(0);
  const isDragging = useRef(false);
  const handleMouseDown = (e: React.MouseEvent) => { mouseStartX.current = e.clientX; isDragging.current = true; };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = mouseStartX.current - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(activeImg + 1);
      else goTo(activeImg - 1);
    }
  };

  if (images.length === 0) return null;

  const showThumbs = images.length > 1;
  const visibleThumbs = images.slice(0, MAX_THUMBS);
  const extraCount = images.length - MAX_THUMBS;

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* Main image with swipe */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDragging.current = false; }}
        style={{ position: 'relative', cursor: images.length > 1 ? 'grab' : 'default', overflow: 'hidden', borderRadius: 'var(--radius)' }}
      >
        <img
          src={images[activeImg]}
          alt={name}
          draggable={false}
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius)', display: 'block', transition: 'opacity 0.3s ease' }}
        />

        {/* Image counter badge - top right */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', borderRadius: 20, padding: '4px 12px',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            📷 {activeImg + 1}/{images.length}
          </div>
        )}

        {/* Prev/Next arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(activeImg - 1); }}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.2s', opacity: 0.7,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(activeImg + 1); }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.2s', opacity: 0.7,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Dot indicators - bottom center, overlay on image */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute', bottom: showThumbs ? 72 : 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 6,
          }}>
            {images.map((_: string, i: number) => (
              <div
                key={i}
                onClick={() => setActiveImg(i)}
                style={{
                  width: i === activeImg ? 20 : 8, height: 8,
                  borderRadius: i === activeImg ? 4 : '50%',
                  background: i === activeImg ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', transition: 'all 0.25s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              />
            ))}
          </div>
        )}

        {/* Thumbnail strip - overlay at bottom of image */}
        {showThumbs && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            display: 'flex', gap: 6,
          }}>
            {visibleThumbs.map((img: string, i: number) => (
              <img
                key={i}
                src={img}
                alt=""
                onClick={() => setActiveImg(i)}
                draggable={false}
                style={{
                  width: 48, height: 48, objectFit: 'cover', borderRadius: 8,
                  cursor: 'pointer',
                  border: i === activeImg ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.6)',
                  opacity: i === activeImg ? 1 : 0.75,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              />
            ))}
            {extraCount > 0 && (
              <div
                onClick={() => setActiveImg(MAX_THUMBS)}
                style={{
                  width: 48, height: 48, borderRadius: 8,
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  border: '2px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                +{extraCount}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [camera, setCamera] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const sd = params.get('start_date');
      const ed = params.get('end_date');
      cameraApi.getCameraDetail(id, sd || undefined, ed || undefined).then(res => {
        if (res.ok && res.data) { setCamera(res.data.camera); setReviews(res.data.reviews || []); }
        setLoading(false);
      });
    }
  }, [id]);

  const handleAddToCart = () => {
    if (!camera) return;
    const params = new URLSearchParams(window.location.search);
    const sd = params.get('start_date');
    const ed = params.get('end_date');
    if (!sd || !ed) {
      alert('Vui lòng quay lại Trang chủ để chọn khoảng ngày thuê trước khi thêm vào giỏ hàng.');
      navigate('/');
      return;
    }
    const availQty = camera.dynamic_available_quantity ?? camera.available_quantity ?? 1;
    if (availQty <= 0) {
      alert('Thiết bị này đã được đặt hết trong khoảng thời gian bạn chọn.');
      return;
    }
    addToCart(camera);
    setToast('Đã thêm vào giỏ hàng!');
    setTimeout(() => setToast(''), 2500);
  };

  const handleRentNow = () => {
    if (!camera) return;
    const params = new URLSearchParams(window.location.search);
    const sd = params.get('start_date');
    const ed = params.get('end_date');
    if (!sd || !ed) {
      alert('Vui lòng quay lại Trang chủ để chọn khoảng ngày thuê trước khi tiến hành thuê.');
      navigate('/');
      return;
    }
    const availQty = camera.dynamic_available_quantity ?? camera.available_quantity ?? 1;
    if (availQty <= 0) {
      alert('Thiết bị này đã được đặt hết trong khoảng thời gian bạn chọn.');
      return;
    }
    addToCart(camera);
    navigate(`/cart?start_date=${sd}&end_date=${ed}`);
  };

  const timeAgo = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return 'Hôm nay';
    if (days < 30) return `${days} ngày trước`;
    if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
    return `${Math.floor(days / 365)} năm trước`;
  };

  if (loading) return (
    <div className="container section">
      <div className="product-detail-grid">
        <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius)' }} />
        <div><div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 12 }} /><div className="skeleton" style={{ height: 32, width: '80%', marginBottom: 16 }} /><div className="skeleton" style={{ height: 80, marginBottom: 16 }} /><div className="skeleton" style={{ height: 48, width: '50%' }} /></div>
      </div>
    </div>
  );

  if (!camera) return (
    <div className="container section empty-state">
      <div className="empty-state-icon">😕</div>
      <div className="empty-state-title">Không tìm thấy sản phẩm</div>
      <Link to="/products" className="btn btn-primary" style={{ marginTop: 16 }}>Quay lại</Link>
    </div>
  );

  const specs = camera.specs || {};
  const store = camera.store_id;

  return (
    <div className="container section animate-fade-in">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Trang chủ</Link><span className="sep">/</span>
        <Link to="/products">Sản phẩm</Link><span className="sep">/</span>
        <span style={{ color: 'var(--text)' }}>{camera.name}</span>
      </div>

      <div className="product-detail-grid">
        {/* Gallery - Swipeable */}
        <div className="product-gallery" style={{ position: 'relative' }}>
          {camera.images?.length > 0 ? (
            <ProductImageCarousel images={camera.images} name={camera.name} />
          ) : (
            <div style={{ aspectRatio: '1', background: 'var(--surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)', fontSize: 80, color: 'var(--text-muted)' }}>📷</div>
          )}
        </div>

        {/* Info */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className="badge badge-primary">{CATEGORY_LABELS[camera.category] || camera.category}</span>
            {new URLSearchParams(window.location.search).get('start_date') && (
              <span className={`badge ${(camera.dynamic_available_quantity ?? camera.available_quantity ?? 1) > 0 ? 'badge-success' : 'badge-warning'}`}>
                {(camera.dynamic_available_quantity ?? camera.available_quantity ?? 1) > 0 ? `● Sẵn sàng (${camera.dynamic_available_quantity ?? camera.available_quantity ?? 1} còn)` : '● Hết hàng'}
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>{camera.brand}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, letterSpacing: -0.5 }}>{camera.name}</h1>

          {camera.rating_avg > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Star size={16} fill="var(--star)" color="var(--star)" />
              <span style={{ fontWeight: 700 }}>{camera.rating_avg.toFixed(1)}</span>
              <span style={{ color: 'var(--text-muted)' }}>({camera.total_reviews} đánh giá)</span>
            </div>
          )}

          {/* Price */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--separator)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{formatPrice(camera.price_per_day)}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>/ngày</span>
            </div>
            {camera.price_per_week && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#10B981', fontSize: 14 }}>
                <Tag size={14} /> Thuê tuần: {formatPrice(camera.price_per_week)} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(tiết kiệm hơn)</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#60A5FA', fontSize: 14 }}>
              <Shield size={14} /> Đặt cọc: {formatPrice(camera.deposit_amount)}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button className="btn btn-secondary" onClick={handleAddToCart} style={{ flex: 1 }}>
              <ShoppingCart size={18} /> Thêm giỏ
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleRentNow} style={{ flex: 1 }}>
              Thuê ngay
            </button>
          </div>

          {/* Store */}
          {store && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--card-bg)', border: '1px solid var(--separator)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Store size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{store.name || 'Cửa hàng'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={12} /> {store.address || 'Hà Nội'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description, Specs, Included items */}
      <div style={{ maxWidth: 800, marginTop: 48 }}>
        {camera.description && (
          <div style={{ marginBottom: 32 }}>
            <h2 className="section-title">Mô tả</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{camera.description}</p>
          </div>
        )}

        {Object.keys(specs).length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 className="section-title">Thông số kỹ thuật</h2>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--separator)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <table className="specs-table">
                <tbody>
                  {Object.entries(specs).map(([k, v]) => (
                    <tr key={k}><td>{SPEC_LABELS[k.toLowerCase()] || k.replace(/_/g, ' ')}</td><td>{String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {camera.included_items?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 className="section-title">Phụ kiện đi kèm</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {camera.included_items.map((item: string, i: number) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-high)', border: '1px solid var(--separator)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
                  <CheckCircle size={14} color="#10B981" /> {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="section-title" style={{ margin: 0 }}>Đánh giá ({reviews.length})</h2>
              {camera.rating_avg > 0 && (
                <span className="badge badge-warning" style={{ fontSize: 14 }}>
                  <Star size={14} fill="var(--star)" color="var(--star)" /> {camera.rating_avg.toFixed(1)}
                </span>
              )}
            </div>

            {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r: any) => (
              <div key={r._id} className="review-card animate-fade-in">
                <div className="review-header">
                  <div className="review-avatar">{(r.user_id?.full_name || 'K').charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.user_id?.full_name || 'Khách hàng'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(r.createdAt)}</div>
                  </div>
                  <div className="review-stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={14} fill={i < r.rating ? 'var(--star)' : 'none'} color={i < r.rating ? 'var(--star)' : 'var(--text-muted)'} />
                    ))}
                  </div>
                </div>
                {r.comment && <p style={{ fontSize: 14, lineHeight: 1.6 }}>{r.comment}</p>}
                {r.reply_comment && (
                  <div className="review-reply">
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>↩️ Phản hồi từ cửa hàng</div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.reply_comment}</p>
                  </div>
                )}
              </div>
            ))}

            {reviews.length > 3 && !showAllReviews && (
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => setShowAllReviews(true)}>
                Xem tất cả {reviews.length} đánh giá
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="toast"><CheckCircle size={18} />{toast}</div>}
    </div>
  );
}
