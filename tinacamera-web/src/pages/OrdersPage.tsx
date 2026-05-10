import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Star, X, CheckCircle, Send, QrCode, Loader2, Ban, AlertTriangle } from 'lucide-react';
import { bookingApi, paymentApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const formatPrice = (p: number) => (p ?? 0).toLocaleString('vi-VN') + 'đ';
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Chờ thanh toán', cls: 'badge-warning' },
  paid: { label: 'Đã thanh toán', cls: 'badge-primary' },
  verified: { label: 'Đã xác minh', cls: 'badge-primary' },
  active: { label: 'Đang thuê', cls: 'badge-success' },
  returned: { label: 'Đã trả máy', cls: 'badge-primary' },
  completed: { label: 'Hoàn thành', cls: 'badge-success' },
  cancelled: { label: 'Đã hủy', cls: 'badge-danger' },
  refunded: { label: 'Đã hoàn tiền', cls: 'badge-danger' },
};

export default function OrdersPage() {
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Payment modal state
  const [payBooking, setPayBooking] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cancel modal state
  const [cancelBooking, setCancelBooking] = useState<any>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [toast, setToast] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (token) {
      bookingApi.getMyBookings(token).then(res => {
        if (res.ok && res.data) setBookings(res.data.bookings || []);
        setLoading(false);
      }).catch(() => { setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token, authLoading]);

  // Cleanup polling
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // ── Review ──
  const openReviewModal = (booking: any) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewHover(0);
    setReviewComment('');
  };

  const closeReviewModal = () => setReviewBooking(null);

  const submitReview = async () => {
    if (!reviewBooking || !token) return;
    setReviewLoading(true);
    const res = await bookingApi.submitReview(token, reviewBooking._id, reviewRating, reviewComment);
    setReviewLoading(false);
    if (res.ok) {
      setBookings(prev => prev.map(b => b._id === reviewBooking._id ? { ...b, has_reviewed: true } : b));
      closeReviewModal();
      showToast('Cảm ơn bạn đã đánh giá! ⭐');
    } else {
      showToast(res.message || 'Gửi đánh giá thất bại');
    }
  };

  // ── Payment ──
  const openPayModal = async (booking: any) => {
    setPayBooking(booking);
    setPayLoading(true);
    setQrCodeUrl('');
    setTransactionId('');

    const res = await paymentApi.createSepay({
      booking_id: booking._id,
      amount: booking.total_amount,
      orderInfo: `Thanh toan ${booking.booking_code || booking._id}`,
    });

    setPayLoading(false);

    if (res.ok && res.data) {
      setQrCodeUrl(res.data.qrCodeUrl);
      setTransactionId(res.data.transactionId);
      startPolling(res.data.transactionId, booking._id);
    } else {
      showToast('Lỗi tạo mã QR thanh toán');
      setPayBooking(null);
    }
  };

  const closePayModal = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPayBooking(null);
    setQrCodeUrl('');
    setTransactionId('');
  };

  const startPolling = (txnId: string, bookingId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= 120) { if (pollingRef.current) clearInterval(pollingRef.current); return; }
      try {
        const res = await paymentApi.checkSepay(txnId);
        if (res.ok && res.data?.status === 'completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          // Update booking status locally
          setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'paid' } : b));
          closePayModal();
          showToast('Thanh toán thành công! ✅');
        }
      } catch { /* ignore */ }
    }, 5000);
  };

  // ── Cancel ──
  const confirmCancel = async () => {
    if (!cancelBooking || !token) return;
    setCancelLoading(true);
    const res = await bookingApi.cancelBooking(token, cancelBooking._id);
    setCancelLoading(false);
    if (res.ok) {
      setBookings(prev => prev.map(b => b._id === cancelBooking._id ? { ...b, status: 'cancelled' } : b));
      setCancelBooking(null);
      showToast('Đã hủy đơn thành công');
    } else {
      showToast(res.message || 'Hủy đơn thất bại');
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Show loading while auth is checking
  if (authLoading) return (
    <div className="container section" style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
      <div className="spinner spinner-lg"></div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="container section empty-state">
      <div className="empty-state-icon">🔒</div>
      <div className="empty-state-title">Bạn cần đăng nhập</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Đăng nhập để xem các đơn thuê của bạn</p>
      <Link to="/login" className="btn btn-primary">Đăng nhập</Link>
    </div>
  );

  const canReview = (b: any) => b.status === 'completed' && !b.has_reviewed && !b.has_review;

  return (
    <div className="container section animate-fade-in">
      <h1 className="section-title" style={{ marginBottom: 32 }}>Đơn thuê của tôi</h1>

      {loading ? (
        <div>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 'var(--radius)' }} />)}</div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Chưa có đơn thuê</div>
          <p>Hãy thuê thiết bị đầu tiên của bạn</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop: 16 }}>Xem sản phẩm</Link>
        </div>
      ) : (
        <div>
          {bookings.map(b => {
            const status = STATUS_MAP[b.status] || { label: b.status, cls: 'badge-primary' };
            return (
              <div key={b._id} className="card order-card animate-slide-in" style={{ marginBottom: 12, cursor: 'default' }}>
                <div className="order-card-inner">
                  <img
                    src={b.camera_id?.images?.[0] || ''}
                    alt={b.camera_id?.name || ''}
                    className="order-card-img"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>{b.camera_id?.brand}</div>
                        <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.3 }}>{b.camera_id?.name || 'Thiết bị'}</div>
                      </div>
                      <span className={`badge ${status.cls}`} style={{ flexShrink: 0, marginTop: 2 }}>{status.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {formatDate(b.start_date)} → {formatDate(b.end_date)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {b.total_days} ngày</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(b.total_amount)}</span>
                    </div>

                    {/* ── Action buttons ── */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {/* Pending: Pay + Cancel */}
                      {b.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openPayModal(b)}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 12 }}
                          >
                            <QrCode size={14} /> Thanh toán
                          </button>
                          <button
                            onClick={() => setCancelBooking(b)}
                            className="btn btn-sm"
                            style={{ fontSize: 12, background: 'none', border: '1px solid var(--danger, #ef4444)', color: 'var(--danger, #ef4444)' }}
                          >
                            <Ban size={14} /> Hủy đơn
                          </button>
                        </>
                      )}

                      {/* Completed: Review */}
                      {canReview(b) && (
                        <button
                          onClick={() => openReviewModal(b)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 12 }}
                        >
                          <Star size={14} /> Đánh giá
                        </button>
                      )}

                      {/* Already reviewed */}
                      {(b.has_reviewed || b.has_review) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--star)', fontSize: 13, fontWeight: 600 }}>
                          <Star size={14} fill="var(--star)" /> Đã đánh giá
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* Payment QR Modal */}
      {/* ══════════════════════════════════════════ */}
      {payBooking && (
        <div className="modal-overlay" onClick={closePayModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Thanh toán đơn thuê</h2>
              <button onClick={closePayModal} style={{ background: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            {/* Booking info */}
            <div style={{
              display: 'flex', gap: 12, padding: 14, background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)', marginBottom: 20, alignItems: 'center', textAlign: 'left',
            }}>
              <img
                src={payBooking.camera_id?.images?.[0] || ''}
                alt=""
                style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', background: 'var(--surface-high)' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{payBooking.camera_id?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatDate(payBooking.start_date)} → {formatDate(payBooking.end_date)} · {payBooking.total_days} ngày
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Số tiền: <strong style={{ color: 'var(--accent)', fontSize: 22 }}>{formatPrice(payBooking.total_amount)}</strong>
            </p>

            {payLoading ? (
              <div style={{ padding: 40 }}>
                <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
                <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Đang tạo mã QR...</p>
              </div>
            ) : qrCodeUrl ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    background: 'white', borderRadius: 16, padding: 16,
                    display: 'inline-block', boxShadow: 'var(--shadow-lg)',
                  }}>
                    <img src={qrCodeUrl} alt="QR thanh toán" style={{ width: 260, height: 260, display: 'block' }} />
                  </div>
                </div>

                <div style={{
                  background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: 14,
                  marginBottom: 16, textAlign: 'left', fontSize: 13, lineHeight: 1.8,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Hướng dẫn:</div>
                  <div>1. Mở app <strong>Ngân hàng</strong> trên điện thoại</div>
                  <div>2. Chọn <strong>Quét mã QR</strong></div>
                  <div>3. Quét mã bên trên và xác nhận chuyển khoản</div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, color: 'var(--text-muted)', padding: '8px 0',
                }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Đang chờ xác nhận thanh toán...
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
                  Mã giao dịch: <strong>{transactionId}</strong>
                </div>
              </>
            ) : null}

            <button className="btn btn-secondary" onClick={closePayModal} style={{ width: '100%' }}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* Cancel Confirmation Modal */}
      {/* ══════════════════════════════════════════ */}
      {cancelBooking && (
        <div className="modal-overlay" onClick={() => setCancelBooking(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FEE2E2, #FECACA)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertTriangle size={32} color="#EF4444" />
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Xác nhận hủy đơn</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>
              Bạn có chắc muốn hủy đơn thuê này?
            </p>

            {/* Booking info */}
            <div style={{
              display: 'flex', gap: 12, padding: 14, background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)', marginBottom: 20, alignItems: 'center', textAlign: 'left',
            }}>
              <img
                src={cancelBooking.camera_id?.images?.[0] || ''}
                alt=""
                style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', background: 'var(--surface-high)' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{cancelBooking.camera_id?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatDate(cancelBooking.start_date)} → {formatDate(cancelBooking.end_date)} · {formatPrice(cancelBooking.total_amount)}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 20 }}>
              Hành động này không thể hoàn tác.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setCancelBooking(null)} style={{ flex: 1 }}>
                Giữ lại
              </button>
              <button
                className="btn btn-sm"
                onClick={confirmCancel}
                disabled={cancelLoading}
                style={{
                  flex: 1, background: '#EF4444', color: 'white', border: 'none',
                  borderRadius: 'var(--radius-sm)', padding: '12px 20px', fontWeight: 600,
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                {cancelLoading ? <span className="spinner" /> : <><Ban size={16} /> Hủy đơn</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* Review Modal */}
      {/* ══════════════════════════════════════════ */}
      {reviewBooking && (
        <div className="modal-overlay" onClick={closeReviewModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Đánh giá thiết bị</h2>
              <button onClick={closeReviewModal} style={{ background: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{
              display: 'flex', gap: 16, padding: 16, background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)', marginBottom: 24, alignItems: 'center',
            }}>
              <img
                src={reviewBooking.camera_id?.images?.[0] || ''} alt=""
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', background: 'var(--surface-high)' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>{reviewBooking.camera_id?.brand}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{reviewBooking.camera_id?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(reviewBooking.start_date)} → {formatDate(reviewBooking.end_date)}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>Bạn hài lòng thế nào?</label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    onMouseEnter={() => setReviewHover(star)}
                    onMouseLeave={() => setReviewHover(0)}
                    style={{
                      background: 'none', padding: 4, cursor: 'pointer',
                      transform: (reviewHover || reviewRating) >= star ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <Star size={36} fill={(reviewHover || reviewRating) >= star ? 'var(--star)' : 'none'} color={(reviewHover || reviewRating) >= star ? 'var(--star)' : 'var(--text-muted)'} strokeWidth={1.5} />
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>
                {reviewRating === 1 && 'Rất tệ 😞'}{reviewRating === 2 && 'Tệ 😕'}{reviewRating === 3 && 'Bình thường 😐'}{reviewRating === 4 && 'Tốt 😊'}{reviewRating === 5 && 'Tuyệt vời! 🤩'}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Nhận xét (không bắt buộc)</label>
              <textarea
                value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm thuê thiết bị của bạn..." rows={4}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                  color: 'var(--text)', fontSize: 14, resize: 'none', lineHeight: 1.6, outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={closeReviewModal} style={{ flex: 1 }}>Hủy</button>
              <button className="btn btn-primary" onClick={submitReview} disabled={reviewLoading} style={{ flex: 1 }}>
                {reviewLoading ? <span className="spinner" /> : <><Send size={16} /> Gửi đánh giá</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ background: toast.includes('thành công') || toast.includes('⭐') || toast.includes('✅') ? 'var(--success)' : '#EF4444' }}>
          <CheckCircle size={18} />{toast}
        </div>
      )}
    </div>
  );
}
