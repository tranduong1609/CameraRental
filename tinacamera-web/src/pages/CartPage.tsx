import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Trash2, ArrowLeft, CheckCircle, QrCode, X, Loader2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { bookingApi, paymentApi } from '../services/api';

const formatPrice = (p: number) => (p ?? 0).toLocaleString('vi-VN') + 'đ';

type PaymentStep = 'cart' | 'processing' | 'success';

export default function CartPage() {
  const { items, removeFromCart, clearCart, totalPrice } = useCart();
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Payment state
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('cart');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const days = startDate && endDate ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)) : 0;
  const grandTotal = totalPrice * days;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Checkout: create bookings → create SePay QR → show QR ──
  const handleCheckout = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!startDate || !endDate) { showToast('Vui lòng chọn ngày thuê'); return; }
    if (items.length === 0) return;

    setLoading(true);
    const ids: string[] = [];
    let success = true;

    // 1. Create bookings
    for (const item of items) {
      const res = await bookingApi.createBooking(token!, {
        camera_id: item._id, start_date: startDate, end_date: endDate,
        payment_type: 'full', note,
      });
      if (res.ok && res.data?.booking) {
        ids.push(res.data.booking._id);
      } else {
        showToast(res.message || 'Lỗi đặt thuê');
        success = false;
        break;
      }
    }

    if (!success) { setLoading(false); return; }

    // 2. Create SePay QR
    const bookingIdStr = ids.join(',');
    const res = await paymentApi.createSepay({
      booking_id: bookingIdStr,
      amount: grandTotal,
      orderInfo: `Thanh toan don thue TinaCamera`,
    });

    setLoading(false);

    if (res.ok && res.data) {
      setQrCodeUrl(res.data.qrCodeUrl);
      setTransactionId(res.data.transactionId);
      setPaymentAmount(grandTotal);
      setPaymentStep('processing');
      startPolling(res.data.transactionId);
    } else {
      showToast('Lỗi tạo mã QR thanh toán');
    }
  };

  // ── Poll payment status every 5s ──
  const startPolling = (txnId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= 120) { // 10 min timeout
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      try {
        const res = await paymentApi.checkSepay(txnId);
        if (res.ok && res.data?.status === 'completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPaymentStep('success');
          clearCart();
        }
      } catch { /* ignore */ }
    }, 5000);
  };

  const cancelPayment = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPaymentStep('cart');
    setQrCodeUrl('');
    setTransactionId('');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Empty cart ──
  if (items.length === 0 && paymentStep !== 'success') return (
    <div className="container section empty-state">
      <div className="empty-state-icon">🛒</div>
      <div className="empty-state-title">Giỏ hàng trống</div>
      <p style={{ marginBottom: 24 }}>Hãy thêm thiết bị vào giỏ hàng để bắt đầu thuê</p>
      <Link to="/products" className="btn btn-primary">Xem sản phẩm</Link>
    </div>
  );

  // ── Payment Success ──
  if (paymentStep === 'success') return (
    <div className="container section empty-state animate-fade-in">
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      }}>
        <CheckCircle size={40} color="white" />
      </div>
      <div className="empty-state-title" style={{ color: '#10B981' }}>Thanh toán thành công!</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 8, maxWidth: 400 }}>
        Đơn thuê của bạn đã được xác nhận. Cửa hàng sẽ liên hệ để giao máy hoặc bạn có thể đến nhận trực tiếp.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Mã giao dịch: <strong>{transactionId}</strong>
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link to="/orders" className="btn btn-primary">Xem đơn thuê</Link>
        <Link to="/products" className="btn btn-secondary">Tiếp tục thuê</Link>
      </div>
    </div>
  );

  return (
    <div className="container section animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button className="btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <h1 className="section-title" style={{ margin: 0 }}>Giỏ hàng ({items.length})</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
        {/* Items */}
        <div>
          {items.map(item => (
            <div key={item._id} style={{ display: 'flex', gap: 16, background: 'var(--card-bg)', border: '1px solid var(--separator)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }} className="animate-slide-in">
              <img src={item.images?.[0] || ''} alt={item.name} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 12, background: 'var(--surface-high)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>{item.brand}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>{item.name}</div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>{formatPrice(item.price_per_day)}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>/ngày</span></span>
                  <button onClick={() => removeFromCart(item._id)} style={{ background: 'none', color: 'var(--danger, #ef4444)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><Trash2 size={14} /> Xóa</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Sidebar */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--separator)', borderRadius: 'var(--radius)', padding: 24, height: 'fit-content', position: 'sticky', top: 96 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Thông tin thuê</h3>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, display: 'block', marginBottom: 8 }}>NGÀY BẮT ĐẦU</label>
          <input type="date" min={today} value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, marginBottom: 16 }} />

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, display: 'block', marginBottom: 8 }}>NGÀY KẾT THÚC</label>
          <input type="date" min={startDate || today} value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, marginBottom: 16 }} />

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, display: 'block', marginBottom: 8 }}>GHI CHÚ</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú cho cửa hàng..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14, marginBottom: 20, resize: 'none' }} />

          <div style={{ borderTop: '1px solid var(--separator)', paddingTop: 16 }}>
            {days > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--text-muted)' }}>
                <span>Số ngày thuê</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{days} ngày</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: 'var(--text-muted)' }}>
              <span>Giá thuê/ngày</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatPrice(totalPrice)}</span>
            </div>
            {days > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--separator)' }}>
                <span>Tổng cộng</span><span style={{ color: 'var(--accent)' }}>{formatPrice(grandTotal)}</span>
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }} onClick={handleCheckout} disabled={loading}>
            {loading ? <span className="spinner" /> : <><QrCode size={18} /> Thanh toán</>}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* QR Payment Modal */}
      {/* ══════════════════════════════════════════ */}
      {paymentStep === 'processing' && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Quét mã QR để thanh toán</h2>
              <button onClick={cancelPayment} style={{ background: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Số tiền: <strong style={{ color: 'var(--accent)', fontSize: 22 }}>{formatPrice(paymentAmount)}</strong>
            </p>

            {/* QR Code */}
            {qrCodeUrl && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  background: 'white', borderRadius: 16, padding: 16,
                  display: 'inline-block', boxShadow: 'var(--shadow-lg)',
                }}>
                  <img
                    src={qrCodeUrl}
                    alt="QR thanh toán"
                    style={{ width: 260, height: 260, display: 'block' }}
                  />
                </div>
              </div>
            )}

            {/* Instructions */}
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: 16,
              marginBottom: 20, textAlign: 'left', fontSize: 13, lineHeight: 1.8,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Hướng dẫn:</div>
              <div>1. Mở app <strong>Ngân hàng</strong> trên điện thoại</div>
              <div>2. Chọn <strong>Quét mã QR</strong></div>
              <div>3. Quét mã bên trên và xác nhận chuyển khoản</div>
            </div>

            {/* Polling indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, color: 'var(--text-muted)', padding: '8px 0',
            }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Đang chờ xác nhận thanh toán...
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>
              Mã giao dịch: <strong>{transactionId}</strong>
            </div>

            <button className="btn btn-secondary" onClick={cancelPayment} style={{ width: '100%' }}>
              Hủy thanh toán
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast" style={{ background: toast.includes('thành công') ? 'var(--success)' : '#EF4444' }}><CheckCircle size={18} />{toast}</div>}
    </div>
  );
}
