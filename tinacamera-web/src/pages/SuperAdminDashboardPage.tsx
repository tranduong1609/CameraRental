import { useState, useEffect, useCallback } from 'react';
import { superAdminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, ShieldCheck, Store, UserX, TrendingUp, Activity } from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await superAdminApi.getUsers(token);
      if (res.ok && res.data) {
        setStats(res.data.stats);
        setUsers(res.data.users.slice(0, 8)); // Show last 8 accounts
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  const statCards = [
    { icon: <Users size={24} />, bg: 'rgba(99,102,241,0.12)', color: '#6366f1', label: 'Tổng tài khoản', value: stats?.total ?? 0 },
    { icon: <ShieldCheck size={24} />, bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Quản trị viên', value: stats?.admins ?? 0 },
    { icon: <Store size={24} />, bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Chủ cửa hàng', value: stats?.storeOwners ?? 0 },
    { icon: <Users size={24} />, bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Khách hàng', value: stats?.customers ?? 0 },
    { icon: <UserX size={24} />, bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Bị vô hiệu hoá', value: stats?.inactive ?? 0 },
  ];

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      admin: { label: 'Super Admin', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      store_owner: { label: 'Chủ cửa hàng', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      staff: { label: 'Nhân viên', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
      customer: { label: 'Khách hàng', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    };
    return map[role] || { label: role, color: '#888', bg: '#f1f1f1' };
  };

  return (
    <div className="animate-fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>
          Xin chào, {user?.full_name}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
          Quản trị hệ thống
        </h1>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 16, marginBottom: 36 }}>
        {statCards.map((card, i) => (
          <div key={i} className="card" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 52, height: 52, borderRadius: 14, background: card.bg, color: card.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2, lineHeight: 1.2 }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="dashboard-grid">

        {/* Recent users */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Activity size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Tài khoản gần đây</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => {
              const badge = getRoleBadge(u.role);
              return (
                <div key={u._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--surface)', borderRadius: 12,
                  opacity: u.is_active === false ? 0.55 : 1,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: badge.bg, color: badge.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14,
                  }}>
                    {u.full_name?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.full_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.email}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg,
                    padding: '4px 8px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role distribution */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <TrendingUp size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Phân bố vai trò</h2>
          </div>

          {stats && (() => {
            const total = stats.total || 1;
            const roles = [
              { label: 'Quản trị viên', value: stats.admins || 0, color: '#10b981' },
              { label: 'Chủ cửa hàng', value: stats.storeOwners || 0, color: '#f59e0b' },
              { label: 'Khách hàng', value: stats.customers || 0, color: '#3b82f6' },
            ];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {roles.map((role, i) => {
                  const pct = Math.round((role.value / total) * 100);
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{role.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: role.color }}>{role.value} ({pct}%)</span>
                      </div>
                      <div style={{ height: 10, background: 'var(--surface)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${role.color}, ${role.color}88)`,
                          borderRadius: 5,
                          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }} />
                      </div>
                    </div>
                  );
                })}

                {/* Inactive accounts */}
                <div style={{ 
                  marginTop: 12, padding: 16, borderRadius: 12,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserX size={16} color="#ef4444" />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#ef4444' }}>
                      {stats.inactive || 0} tài khoản bị vô hiệu hoá
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Chiếm {Math.round(((stats.inactive || 0) / total) * 100)}% tổng số tài khoản
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
