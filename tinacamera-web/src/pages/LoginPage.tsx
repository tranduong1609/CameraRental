import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email không đúng định dạng.'); return; }
    setLoading(true); setError('');
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) { navigate('/'); } else { setError(res.message || 'Sai email hoặc mật khẩu.'); }
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 320, height: 320, borderRadius: '50%', background: 'var(--accent)', opacity: 0.04, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 384, height: 384, borderRadius: '50%', background: 'var(--accent)', opacity: 0.04, pointerEvents: 'none' }} />

      <div className="auth-card" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)' }}>
            <Camera size={28} />
          </div>
        </div>
        <h1>TinaCamera</h1>
        <p className="auth-subtitle">Chào mừng trở lại! Đăng nhập để tiếp tục.</p>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '12px 16px', borderRadius: 12, marginBottom: 20, fontSize: 14, fontWeight: 500 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>EMAIL</label>
          <div className="input-group" style={{ marginBottom: 20 }}>
            <Mail size={20} className="input-icon" />
            <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>MẬT KHẨU</label>
          <div className="input-group" style={{ marginBottom: 28 }}>
            <Lock size={20} className="input-icon" />
            <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ background: 'none', color: 'var(--text-muted)' }}>
              {showPw ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Đăng Nhập'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 700 }}>Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
