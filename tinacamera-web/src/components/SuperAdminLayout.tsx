import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  Shield,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
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

  if (user.role !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
        <Shield size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Truy cập bị từ chối</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Chỉ quản trị viên hệ thống (Super Admin) mới được phép truy cập.</p>
        <Link to="/" className="btn btn-primary">Về trang chủ</Link>
      </div>
    );
  }

  const navItems = [
    { to: '/superadmin', icon: LayoutDashboard, label: 'Tổng quan' },
    { to: '/superadmin/users', icon: Users, label: 'Quản lý tài khoản' },
    { to: '/superadmin/settings', icon: Settings, label: 'Cài đặt hệ thống' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: 272, 
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 100,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'white' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #ef4444, #f97316)', 
              padding: 10, borderRadius: 14, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
            }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>TinaCamera</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>Super Admin</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '8px 16px', marginBottom: 4 }}>
            Điều hướng
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || 
              (item.to !== '/superadmin' && location.pathname.startsWith(item.to));
            return (
              <Link 
                key={item.to} 
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 12, textDecoration: 'none',
                  background: isActive ? 'rgba(239,68,68,0.15)' : 'transparent',
                  color: isActive ? '#ef4444' : 'rgba(255,255,255,0.5)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 14,
                  transition: 'all 0.2s',
                  borderLeft: isActive ? '3px solid #ef4444' : '3px solid transparent',
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}

          {/* Separator + link to admin panel */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, padding: '8px 16px', marginBottom: 4 }}>
            Chuyển nhanh
          </div>
          <Link 
            to="/admin"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderRadius: 12, textDecoration: 'none',
              background: 'rgba(255,255,255,0.03)',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 500, fontSize: 14,
              transition: 'all 0.2s',
              borderLeft: '3px solid transparent',
            }}
          >
            <Activity size={18} />
            Panel Admin cửa hàng
          </Link>
        </nav>

        {/* User footer */}
        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ 
              width: 42, height: 42, borderRadius: '50%', 
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontWeight: 700, color: 'white', fontSize: 16 
            }}>
              {user.full_name?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.full_name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.email}</div>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 272, padding: 32, overflowY: 'auto', background: 'var(--surface)', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
