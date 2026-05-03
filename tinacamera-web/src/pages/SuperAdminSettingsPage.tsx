import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Shield, Bell, Database, Globe, Info, Lock } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const { user } = useAuth();

  const settingSections = [
    {
      title: 'Thông tin hệ thống',
      icon: <Info size={18} />,
      items: [
        { label: 'Phiên bản ứng dụng', value: '1.0.0', type: 'info' as const },
        { label: 'Nền tảng', value: 'React + Node.js + MongoDB', type: 'info' as const },
        { label: 'Môi trường', value: 'Development', type: 'info' as const },
        { label: 'API Server', value: 'http://localhost:5000', type: 'info' as const },
      ]
    },
    {
      title: 'Bảo mật',
      icon: <Lock size={18} />,
      items: [
        { label: 'Xác thực hai lớp (2FA)', value: 'Chưa kích hoạt', type: 'info' as const },
        { label: 'Phiên đăng nhập', value: '24 giờ', type: 'info' as const },
        { label: 'Mã hoá mật khẩu', value: 'bcrypt (10 rounds)', type: 'info' as const },
      ]
    },
    {
      title: 'Thông báo',
      icon: <Bell size={18} />,
      items: [
        { label: 'Thông báo email khi đơn mới', value: 'Đang bật', type: 'info' as const },
        { label: 'Nhắc nhở quá hạn (Cron job)', value: 'Mỗi giờ', type: 'info' as const },
      ]
    },
    {
      title: 'Cơ sở dữ liệu',
      icon: <Database size={18} />,
      items: [
        { label: 'Engine', value: 'MongoDB Atlas', type: 'info' as const },
        { label: 'Lưu trữ ảnh', value: 'Cloudinary', type: 'info' as const },
      ]
    },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Settings size={24} color="#ef4444" />
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Cài đặt hệ thống</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
          Thông tin cấu hình và trạng thái hệ thống TinaCamera
        </p>
      </div>

      {/* Admin info card */}
      <div className="card" style={{ padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: 'white', fontSize: 20,
        }}>
          {user?.full_name?.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{user?.full_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#ef4444',
          background: 'rgba(239,68,68,0.1)', padding: '6px 12px', borderRadius: 8,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          Super Admin
        </span>
      </div>

      {/* Settings sections */}
      {settingSections.map((section, i) => (
        <div key={i} className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--separator)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--surface-high)',
          }}>
            <div style={{ color: '#ef4444' }}>{section.icon}</div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{section.title}</h3>
          </div>
          {section.items.map((item, j) => (
            <div
              key={j}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 20px',
                borderBottom: j < section.items.length - 1 ? '1px solid var(--separator)' : 'none',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      ))}

      {/* Status badge */}
      <div style={{
        textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontWeight: 600 }}>Hệ thống đang hoạt động bình thường</span>
        </div>
        <div>TinaCamera Platform v1.0.0</div>
      </div>
    </div>
  );
}
