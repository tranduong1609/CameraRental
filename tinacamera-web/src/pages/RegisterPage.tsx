import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Vui lòng điền đầy đủ thông tin.'); return; }
    if (password.length < 6) { setError('Mật khẩu ít nhất 6 ký tự.'); return; }
    setLoading(true); setError('');
    const res = await register(name, email, password);
    setLoading(false);
    if (res.ok) { navigate('/login'); } else { setError(res.message || 'Đăng ký thất bại.'); }
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: 320, height: 320, borderRadius: '50%', background: 'var(--accent)', opacity: 0.04 }} />

      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)' }}>
            <Camera size={28} />
          </div>
        </div>
        <h1>Đăng ký</h1>
        <p className="auth-subtitle">Tạo tài khoản để bắt đầu thuê thiết bị</p>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '12px 16px', borderRadius: 12, marginBottom: 20, fontSize: 14 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>HỌ VÀ TÊN</label>
          <div className="input-group" style={{ marginBottom: 20 }}>
            <User size={20} className="input-icon" />
            <input placeholder="Nguyễn Văn A" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>EMAIL</label>
          <div className="input-group" style={{ marginBottom: 20 }}>
            <Mail size={20} className="input-icon" />
            <input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>MẬT KHẨU</label>
          <div className="input-group" style={{ marginBottom: 28 }}>
            <Lock size={20} className="input-icon" />
            <input type="password" placeholder="Ít nhất 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Đăng Ký'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
