import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Save, CheckCircle, LogOut, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user, updateUser, logout, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Sync form when user data loads
  if (user && !fullName && user.full_name) {
    setFullName(user.full_name);
    setEmail(user.email || '');
    setPhone(user.phone || '');
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    if (!fullName.trim()) { showToast('Vui lòng nhập họ tên', 'error'); return; }
    if (phone.trim() && !/^(0[3-9][0-9]{8})$/.test(phone.trim())) { showToast('SĐT không hợp lệ (VD: 0899259410)', 'error'); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { showToast('Email không đúng định dạng', 'error'); return; }

    setSaving(true);
    const res = await updateUser({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
    setSaving(false);

    if (res.ok) {
      showToast('Đã lưu thông tin thành công! ✅');
    } else {
      showToast(res.message || 'Lỗi cập nhật thông tin', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (authLoading) return (
    <div className="container section" style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
      <div className="spinner spinner-lg"></div>
    </div>
  );

  if (!isAuthenticated) return (
    <div className="container section empty-state">
      <div className="empty-state-icon">🔒</div>
      <div className="empty-state-title">Bạn cần đăng nhập</div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Đăng nhập để xem và chỉnh sửa thông tin cá nhân</p>
      <Link to="/login" className="btn btn-primary">Đăng nhập</Link>
    </div>
  );

  const hasChanges = fullName !== (user?.full_name || '') || email !== (user?.email || '') || phone !== (user?.phone || '');

  return (
    <div className="container section animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button className="btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <h1 className="section-title" style={{ margin: 0 }}>Thông tin cá nhân</h1>
      </div>

      {/* Avatar & Info Card */}
      <div className="card" style={{ padding: 32, marginBottom: 24, textAlign: 'center' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px',
          background: user?.avatar_url ? `url(${user.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '3px solid var(--separator)', boxShadow: 'var(--shadow-md)',
        }}>
          {!user?.avatar_url && <Camera size={32} color="white" />}
        </div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{user?.full_name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{user?.email}</div>
        {user?.auth_provider && user.auth_provider !== 'local' && (
          <span className="badge badge-primary" style={{ marginTop: 8, fontSize: 11 }}>
            Đăng nhập qua {user.auth_provider === 'google' ? 'Google' : user.auth_provider === 'facebook' ? 'Facebook' : user.auth_provider}
          </span>
        )}
      </div>

      {/* Edit Form */}
      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={18} /> Chỉnh sửa thông tin
        </h3>

        {/* Full Name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <User size={14} /> HỌ VÀ TÊN
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Nguyễn Văn A"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--text)', fontSize: 15, outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Mail size={14} /> EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--text)', fontSize: 15, outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />
        </div>

        {/* Phone */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Phone size={14} /> SỐ ĐIỆN THOẠI
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="0912 345 678"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--text)', fontSize: 15, outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />
        </div>

        {/* Save Button */}
        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', opacity: hasChanges ? 1 : 0.5 }}
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? <span className="spinner" /> : <><Save size={18} /> Lưu thay đổi</>}
        </button>

        {hasChanges && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
            Bạn có thay đổi chưa lưu
          </p>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="btn btn-sm"
        style={{
          width: '100%', marginTop: 16, background: 'none',
          border: '1px solid var(--danger, #ef4444)', color: 'var(--danger, #ef4444)',
          borderRadius: 'var(--radius-sm)', padding: '14px 20px',
          fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, cursor: 'pointer',
        }}
      >
        <LogOut size={16} /> Đăng xuất
      </button>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ background: toastType === 'success' ? 'var(--success)' : '#EF4444' }}>
          <CheckCircle size={18} />{toast}
        </div>
      )}
    </div>
  );
}
