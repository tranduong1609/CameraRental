import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { superAdminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Search, ShieldAlert, ShieldCheck, UserX, UserCheck, Shield, X, ChevronDown, Filter } from 'lucide-react';

const ROLES = [
  { key: 'customer', label: 'Khách hàng', color: '#3b82f6' },
  { key: 'store_owner', label: 'Chủ cửa hàng', color: '#f59e0b' },
  { key: 'staff', label: 'Nhân viên', color: '#8b5cf6' },
  { key: 'admin', label: 'Quản trị viên', color: '#10b981' },
];

const getRoleDisplay = (role: string) => ROLES.find(r => r.key === role) || { key: role, label: role, color: '#9d8d92' };

export default function SuperAdminUsersPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal state
  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm toggle modal
  const [confirmUser, setConfirmUser] = useState<any>(null);
  const [toggling, setToggling] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await superAdminApi.getUsers(token, search, roleFilter, statusFilter);
      if (res.ok && res.data) {
        setUsers(res.data.users);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleToggleStatus = (u: any) => {
    if (!token) return;
    if (String(u._id) === String(currentUser?._id)) return;
    setConfirmUser(u);
  };

  const executeToggle = async () => {
    if (!token || !confirmUser) return;
    setToggling(true);
    const isCurrentlyActive = confirmUser.is_active !== false;
    const nextStatus = !isCurrentlyActive;
    try {
      const res = await superAdminApi.toggleUserStatus(token, confirmUser._id, nextStatus);
      if (res.ok) {
        setConfirmUser(null);
        fetchUsers();
      } else {
        alert(res.message || 'Lỗi');
      }
    } finally {
      setToggling(false);
    }
  };

  const openRoleModal = (u: any) => {
    if (u._id === currentUser?._id) {
      alert('Bạn không thể tự thay đổi quyền của chính mình.');
      return;
    }
    setEditUser(u);
    setNewRole(u.role);
  };

  const saveRole = async () => {
    if (!token || !editUser) return;
    setSaving(true);
    try {
      const res = await superAdminApi.updateUserRole(token, editUser._id, newRole);
      if (res.ok) {
        setEditUser(null);
        fetchUsers();
      } else {
        alert(res.message || 'Lỗi');
      }
    } finally {
      setSaving(false);
    }
  };

  const filterTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'customer', label: 'Khách hàng' },
    { key: 'store_owner', label: 'Chủ cửa hàng' },
    { key: 'admin', label: 'Quản trị viên' },
  ];

  const statusTabs = [
    { key: 'all', label: 'Tất cả TT' },
    { key: 'active', label: 'Hoạt động' },
    { key: 'inactive', label: 'Đã khóa' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Quản lý tài khoản</h1>
        {stats && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            <span>Tổng: <strong style={{ color: 'var(--text)' }}>{stats.total}</strong></span>
            <span>Admin: <strong style={{ color: '#10b981' }}>{stats.admins}</strong></span>
            <span>Cửa hàng: <strong style={{ color: '#f59e0b' }}>{stats.storeOwners}</strong></span>
            <span>Khách: <strong style={{ color: '#3b82f6' }}>{stats.customers}</strong></span>
            <span>Khóa: <strong style={{ color: '#ef4444' }}>{stats.inactive}</strong></span>
          </div>
        )}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 300px',
          background: 'var(--card-bg)', borderRadius: 12, padding: '10px 16px',
          border: '1px solid var(--input-border)',
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            placeholder="Tìm tên, email, SĐT..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              color: 'var(--text)', fontSize: 14, fontWeight: 500,
            }}
          />
        </div>

        {/* Role filter */}
        <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: 10, padding: 3, gap: 3, border: '1px solid var(--input-border)' }}>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700,
                background: roleFilter === tab.key ? '#ef4444' : 'transparent',
                color: roleFilter === tab.key ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: 10, padding: 3, gap: 3, border: '1px solid var(--input-border)' }}>
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700,
                background: statusFilter === tab.key ? '#6366f1' : 'transparent',
                color: statusFilter === tab.key ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 500 }}>
        Tìm thấy <strong>{users.length}</strong> tài khoản
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-high)', borderBottom: '2px solid var(--separator)' }}>
                <th style={thStyle}>NGƯỜI DÙNG</th>
                <th style={thStyle}>LIÊN HỆ</th>
                <th style={thStyle}>VAI TRÒ</th>
                <th style={thStyle}>TRẠNG THÁI</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const roleInfo = getRoleDisplay(u.role);
                const isMe = u._id === currentUser?._id;
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid var(--separator)', opacity: u.is_active === false ? 0.55 : 1 }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: `${roleInfo.color}18`, color: roleInfo.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 15,
                        }}>
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {u.full_name} {isMe && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>(Bạn)</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Tham gia: {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>{u.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.phone || '—'}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, color: roleInfo.color,
                        background: `${roleInfo.color}15`, padding: '4px 10px', borderRadius: 8,
                        textTransform: 'uppercase',
                      }}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {u.is_active !== false ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                          Hoạt động
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {!isMe && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openRoleModal(u)}
                            title="Phân quyền"
                            style={iconBtnStyle}
                          >
                            <Shield size={16} color="#6366f1" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={u.is_active !== false ? 'Khóa tài khoản' : 'Mở khóa'}
                            style={{
                              ...iconBtnStyle,
                              background: u.is_active !== false ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                            }}
                          >
                            {u.is_active !== false
                              ? <UserX size={16} color="#ef4444" />
                              : <UserCheck size={16} color="#10b981" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontWeight: 500 }}>
                    Không tìm thấy tài khoản nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Edit Modal (Portal) */}
      {editUser && createPortal(
        <div
          onClick={() => setEditUser(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)', borderRadius: 20, padding: 28,
              width: '100%', maxWidth: 440,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Cập nhật phân quyền</h2>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            {/* User info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14,
              background: 'var(--surface)', borderRadius: 14, marginBottom: 20,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `${getRoleDisplay(editUser.role).color}18`,
                color: getRoleDisplay(editUser.role).color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16,
              }}>
                {editUser.full_name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{editUser.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{editUser.email}</div>
              </div>
            </div>

            {/* Role selector */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>Chọn vai trò mới:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {ROLES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setNewRole(r.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                    border: newRole === r.key ? `2px solid ${r.color}` : '2px solid var(--input-border)',
                    background: newRole === r.key ? `${r.color}08` : 'transparent',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `2px solid ${newRole === r.key ? r.color : 'var(--text-muted)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {newRole === r.key && <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: newRole === r.key ? r.color : 'var(--text)' }}>
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Save button */}
            <button
              onClick={saveRole}
              disabled={saving || newRole === editUser.role}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                background: newRole !== editUser.role ? '#ef4444' : 'var(--surface-high)',
                color: newRole !== editUser.role ? 'white' : 'var(--text-muted)',
                fontWeight: 700, fontSize: 15, cursor: newRole !== editUser.role ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Đang lưu...' : newRole === editUser.role ? 'Chưa thay đổi' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Toggle Status Modal (Portal) */}
      {confirmUser && createPortal(
        <div
          onClick={() => setConfirmUser(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10001, animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)', borderRadius: 20, padding: 28,
              width: '100%', maxWidth: 400, textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.25s ease',
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
              background: confirmUser.is_active !== false ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {confirmUser.is_active !== false
                ? <UserX size={28} color="#ef4444" />
                : <UserCheck size={28} color="#10b981" />}
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
              {confirmUser.is_active !== false ? 'Vô hiệu hoá tài khoản?' : 'Mở khóa tài khoản?'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
              {confirmUser.is_active !== false
                ? <>Tài khoản <strong style={{ color: 'var(--text)' }}>{confirmUser.full_name}</strong> sẽ bị khóa và không thể đăng nhập.</>
                : <>Tài khoản <strong style={{ color: 'var(--text)' }}>{confirmUser.full_name}</strong> sẽ được mở khóa và có thể đăng nhập lại.</>}
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmUser(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--input-border)',
                  background: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={executeToggle}
                disabled={toggling}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                  background: confirmUser.is_active !== false ? '#ef4444' : '#10b981',
                  color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  opacity: toggling ? 0.6 : 1,
                }}
              >
                {toggling ? 'Đang xử lý...' : confirmUser.is_active !== false ? 'Vô hiệu hoá' : 'Mở khóa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Shared styles ────────────────────────────
const thStyle: React.CSSProperties = { padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5 };
const tdStyle: React.CSSProperties = { padding: '14px 16px' };
const iconBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: 'none',
  background: 'rgba(99,102,241,0.08)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s',
};
