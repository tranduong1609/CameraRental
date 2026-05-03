import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, ShoppingCart, User, Sun, Moon, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCart();
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('tinacamera_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const saved = localStorage.getItem('tinacamera_theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => { setMenuOpen(false); setUserMenuOpen(false); }, [location]);

  const links = [
    { to: '/', label: 'Trang chủ' },
    { to: '/products', label: 'Sản phẩm' },
  ];

  if (isAuthenticated) {
    links.push({ to: '/orders', label: 'Đơn thuê' });
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="navbar-brand-icon"><Camera size={18} /></div>
          TinaCamera
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`navbar-link ${location.pathname === l.to ? 'active' : ''}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="navbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Đổi giao diện">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link to="/cart" className="btn-icon cart-badge" title="Giỏ hàng">
            <ShoppingCart size={18} />
            {totalItems > 0 && <span className="cart-badge-count">{totalItems}</span>}
          </Link>

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button className="btn-icon" onClick={() => setUserMenuOpen(!userMenuOpen)} title="Tài khoản">
                <User size={18} />
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: 'var(--card-bg)', border: '1px solid var(--separator)',
                  borderRadius: 'var(--radius)', padding: '8px', minWidth: 180,
                  boxShadow: 'var(--shadow-lg)', zIndex: 200,
                }} className="animate-scale-in">
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--separator)', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.full_name || 'Khách hàng'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
                  </div>
                  <Link to="/profile" style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 12px', background: 'transparent', color: 'var(--text)',
                    borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none',
                  }}>
                    <User size={16} /> Thông tin cá nhân
                  </Link>
                  {(user?.role === 'store_owner' || user?.role === 'admin') && (
                    <Link to={user.role === 'admin' ? "/admin" : "/admin"} style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '10px 12px', background: 'transparent', color: 'var(--accent)',
                      borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none',
                    }}>
                      <LayoutDashboard size={16} /> Trang quản trị
                    </Link>
                  )}
                  <button onClick={() => { logout(); navigate('/'); }} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 12px', background: 'transparent', color: 'var(--danger, #ef4444)',
                    borderRadius: 8, fontSize: 14, fontWeight: 600,
                  }}>
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Đăng nhập</Link>
          )}

          <button className="btn-icon mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
