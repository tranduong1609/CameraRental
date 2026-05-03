import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Search, CheckCircle, X, Camera, Calendar, Package, Clock, Truck, RotateCcw, Star, Ban } from 'lucide-react';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ TT' },
  { key: 'paid', label: 'Đã TT' },
  { key: 'verified', label: 'Đã xác minh' },
  { key: 'active', label: 'Đang thuê' },
  { key: 'returned', label: 'Đã trả' },
  { key: 'completed', label: 'Hoàn tất' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:   { label: 'Chờ thanh toán', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
  paid:      { label: 'Đã thanh toán',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: CheckCircle },
  verified:  { label: 'Đã xác minh',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: CheckCircle },
  active:    { label: 'Đang thuê',      color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: Package },
  overdue:   { label: 'Quá hạn',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: Clock },
  returned:  { label: 'Đã trả máy',    color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   icon: RotateCcw },
  completed: { label: 'Hoàn tất',       color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: Star },
  cancelled: { label: 'Đã hủy',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: Ban },
};

function getStatusInfo(status: string) {
  return STATUS_MAP[status] || { label: status, color: '#8E8E93', bg: '#f3f4f6', icon: Clock };
}

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [cccdNumber, setCccdNumber] = useState('');
  const [cccdName, setCccdName] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchBookings = async () => {
    if (!token) return;
    setLoading(true);
    const res = await adminApi.getBookings(token, activeTab, searchText.trim() || undefined);
    if (res.ok && res.data?.bookings) setBookings(res.data.bookings);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [token, activeTab, searchText]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    if (!token) return;
    setUpdating(true);
    const res = await adminApi.updateBookingStatus(token, bookingId, newStatus);
    if (res.ok) {
      showToast(`✅ Đã cập nhật: ${getStatusInfo(newStatus).label}`);
      setSelectedBooking(null);
      fetchBookings();
    } else {
      showToast('❌ ' + (res.message || 'Lỗi cập nhật'));
    }
    setUpdating(false);
  };

  const handlePickup = async (bookingId: string) => {
    if (!token) return;
    setUpdating(true);
    const cccdInfo = (cccdNumber && cccdName) ? { cccd_number: cccdNumber, full_name: cccdName } : undefined;
    const res = await adminApi.confirmPickup(token, bookingId, cccdInfo);
    if (res.ok) {
      showToast('✅ Khách đã nhận máy!');
      setSelectedBooking(null);
      setCccdNumber(''); setCccdName('');
      fetchBookings();
    } else {
      showToast('❌ ' + (res.message || 'Lỗi cập nhật'));
    }
    setUpdating(false);
  };

  const handleReturn = async (bookingId: string) => {
    if (!token) return;
    setUpdating(true);
    const res = await adminApi.confirmReturn(token, bookingId);
    if (res.ok) {
      showToast('✅ Đã xác nhận trả máy!');
      setSelectedBooking(null);
      fetchBookings();
    } else {
      showToast('❌ ' + (res.message || 'Lỗi cập nhật'));
    }
    setUpdating(false);
  };

  const formatCurrency = (n: number) => (n ?? 0).toLocaleString('vi-VN') + ' ₫';
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  // ─── Modal rendered via Portal ────────────────────────────────────────────
  const renderModal = () => {
    if (!selectedBooking) return null;
    const sb = selectedBooking;
    const si = getStatusInfo(sb.status);
    const StatusIcon = si.icon;
    const customerName = sb.user_id?.full_name || sb.customer_info?.full_name || 'Khách hàng';

    return createPortal(
      <div
        onClick={() => setSelectedBooking(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--card-bg)',
            borderRadius: 24, padding: 32,
            width: '90%', maxWidth: 580,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            animation: 'scaleIn 0.25s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--separator)' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Mã đơn</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>#{sb.booking_code}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: si.bg, color: si.color, fontWeight: 700, fontSize: 13 }}>
                <StatusIcon size={14} />
                {si.label}
              </span>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'var(--surface-high)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <InfoRow label="Khách hàng" value={customerName} sub={sb.user_id?.phone || sb.customer_info?.phone} />
            <InfoRow label="Thiết bị" value={sb.camera_id?.name || sb.camera_snapshot?.name || '—'} />
            <InfoRow label="Thời gian" value={`${formatDate(sb.start_date)} → ${formatDate(sb.end_date)}`} />
            <InfoRow label="Tiền thuê" value={formatCurrency(sb.total_amount)} accent />
            {sb.deposit_amount > 0 && (
              <InfoRow label="Tiền cọc (thu tại shop)" value={formatCurrency(sb.deposit_amount)} />
            )}
            {sb.cccd_info?.cccd_number && (
              <div style={{ gridColumn: '1 / -1', background: 'rgba(16,185,129,0.06)', padding: 14, borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                  <CheckCircle size={14} /> CCCD ĐÃ LƯU
                </div>
                <div style={{ fontWeight: 600 }}>{sb.cccd_info.cccd_number} — {sb.cccd_info.full_name}</div>
              </div>
            )}
          </div>

          {/* ── Action Section ── */}
          <div style={{ borderTop: '1px solid var(--separator)', paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Hành động</div>

            {/* PENDING → xác nhận TT hoặc huỷ */}
            {sb.status === 'pending' && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <ActionBtn color="#3b82f6" onClick={() => handleUpdateStatus(sb._id, 'paid')} disabled={updating} icon="💳">
                  Xác nhận đã thanh toán
                </ActionBtn>
                <ActionBtn color="#ef4444" outline onClick={() => handleUpdateStatus(sb._id, 'cancelled')} disabled={updating} icon="✕">
                  Hủy đơn
                </ActionBtn>
              </div>
            )}

            {/* PAID / VERIFIED → giao máy */}
            {(sb.status === 'paid' || sb.status === 'verified') && (
              <div style={{ background: 'var(--surface)', padding: 18, borderRadius: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={16} /> Giao máy cho khách
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>SỐ CCCD (tùy chọn)</span>
                    <input value={cccdNumber} onChange={e => setCccdNumber(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14 }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>HỌ TÊN TRÊN CCCD</span>
                    <input value={cccdName} onChange={e => setCccdName(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14 }} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <ActionBtn color="#10b981" onClick={() => handlePickup(sb._id)} disabled={updating} icon="📦">
                    {updating ? 'Đang xử lý...' : 'Xác nhận đã giao máy'}
                  </ActionBtn>
                  <ActionBtn color="#ef4444" outline onClick={() => handleUpdateStatus(sb._id, 'cancelled')} disabled={updating} icon="✕">
                    Hủy đơn
                  </ActionBtn>
                </div>
              </div>
            )}

            {/* ACTIVE → khách trả máy */}
            {sb.status === 'active' && (
              <div style={{ marginBottom: 16 }}>
                <ActionBtn color="#06b6d4" onClick={() => handleReturn(sb._id)} disabled={updating} icon="↩️" fullWidth>
                  {updating ? 'Đang xử lý...' : 'Xác nhận khách đã trả máy'}
                </ActionBtn>
              </div>
            )}

            {/* RETURNED → hoàn tất */}
            {sb.status === 'returned' && (
              <div style={{ marginBottom: 16 }}>
                <ActionBtn color="#22c55e" onClick={() => handleUpdateStatus(sb._id, 'completed')} disabled={updating} icon="⭐" fullWidth>
                  {updating ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
                </ActionBtn>
              </div>
            )}

            {/* Manual override dropdown */}
            <div style={{ padding: 14, background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--separator)' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                CHUYỂN TRẠNG THÁI THỦ CÔNG
              </label>
              <select
                value={sb.status}
                onChange={e => {
                  if (e.target.value !== sb.status) {
                    if (confirm(`Chuyển sang: ${getStatusInfo(e.target.value).label}?`)) {
                      handleUpdateStatus(sb._id, e.target.value);
                    }
                  }
                }}
                disabled={updating}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--input-border)', background: 'var(--input-bg)',
                  color: 'var(--text)', fontSize: 14, cursor: 'pointer',
                }}
              >
                <option value="pending">Chờ thanh toán</option>
                <option value="paid">Đã thanh toán</option>
                <option value="verified">Đã xác minh</option>
                <option value="active">Đang thuê (Đã nhận máy)</option>
                <option value="returned">Đã trả máy</option>
                <option value="completed">Hoàn tất</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 className="section-title">Quản lý đơn thuê</h1>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Tìm theo mã đơn, tên khách hàng..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: '100%', padding: '12px 16px 12px 46px', borderRadius: 12, border: '1px solid var(--input-border)', background: 'var(--card-bg)', fontSize: 14, color: 'var(--text)' }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', borderRadius: 20, whiteSpace: 'nowrap',
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--card-bg)',
              color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
              border: activeTab === tab.key ? 'none' : '1px solid var(--input-border)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: 16 }}>
          Không tìm thấy đơn hàng nào.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(booking => {
            const isOverdue = booking.status === 'active' && new Date(booking.end_date) < new Date(new Date().toDateString());
            const si = getStatusInfo(isOverdue ? 'overdue' : booking.status);
            const StatusIcon = si.icon;
            const customerName = booking.user_id?.full_name || booking.customer_info?.full_name || 'Khách hàng';

            return (
              <div
                key={booking._id}
                onClick={() => { setSelectedBooking(booking); setCccdNumber(''); setCccdName(''); }}
                style={{
                  background: 'var(--card-bg)', borderRadius: 16, padding: '16px 20px',
                  display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer',
                  border: '1px solid var(--separator)', transition: 'all 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = '', e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}
              >
                {/* Thumbnail */}
                <div style={{ width: 60, height: 60, borderRadius: 12, background: 'var(--surface-high)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {booking.camera_id?.images?.[0]
                    ? <img src={booking.camera_id.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <Camera size={24} color="var(--text-muted)" />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>#{booking.booking_code}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: si.bg, color: si.color, fontWeight: 700, fontSize: 12 }}>
                      <StatusIcon size={11} />{si.label}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, marginBottom: 4 }}>{customerName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Camera size={12} />{booking.camera_id?.name || 'Thiết bị'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{formatDate(booking.start_date)} – {formatDate(booking.end_date)}</span>
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Tổng tiền</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(booking.total_amount)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Portal Modal */}
      {renderModal()}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: 'white', padding: '12px 24px', borderRadius: 14, fontWeight: 600, fontSize: 14, zIndex: 99999, animation: 'fadeInUp 0.3s ease', whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────
function InfoRow({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ActionBtn({ color, onClick, disabled, icon, children, outline, fullWidth }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1,
        flex: fullWidth ? 1 : undefined, width: fullWidth ? '100%' : undefined,
        ...(outline
          ? { background: 'transparent', color, border: `2px solid ${color}` }
          : { background: color, color: 'white', border: 'none' }),
      }}
    >
      <span>{icon}</span>
      {children}
    </button>
  );
}
