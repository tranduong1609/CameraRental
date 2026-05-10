import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  Users, 
  LogOut,
  Camera
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // e.g. ['store_owner', 'admin']
}

export default function AdminLayout({ children, allowedRoles = ['store_owner', 'admin'] }: AdminLayoutProps) {
  const { user, token, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Không có quyền truy cập</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Tài khoản của bạn không có quyền truy cập trang này.</p>
        <Link to="/" className="btn btn-primary">Về trang chủ</Link>
      </div>
    );
  }

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Tổng quan', roles: ['store_owner', 'admin'] },
    { to: '/admin/inventory', icon: Package, label: 'Kho hàng', roles: ['store_owner', 'admin'] },
    { to: '/admin/orders', icon: ShoppingCart, label: 'Đơn thuê', roles: ['store_owner', 'admin'] },
    { to: '/admin/reviews', icon: MessageSquare, label: 'Đánh giá', roles: ['store_owner', 'admin'] },
    { to: '/superadmin', icon: Users, label: 'Super Admin', roles: ['admin'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ 
        background: 'var(--card-bg)', 
        borderRight: '1px solid var(--separator)',
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--separator)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--text)' }}>
            <div style={{ background: 'var(--accent)', color: 'white', padding: 8, borderRadius: 12 }}>
              <Camera size={20} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>TinaCamera</span>
          </Link>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
            {user.role === 'admin' ? 'HỆ THỐNG (SUPER ADMIN)' : 'QUẢN LÝ CỬA HÀNG'}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredNav.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to));
            return (
              <Link 
                key={item.to} 
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 12, textDecoration: 'none',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: 20, borderTop: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {user.full_name?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.email}</div>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px', background: 'transparent', color: 'var(--danger, #ef4444)',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
