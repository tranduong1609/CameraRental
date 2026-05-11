import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Camera, ShoppingCart, Users, DollarSign, TrendingUp, Calendar, BarChart2, ArrowUpRight } from 'lucide-react';

const PERIOD_OPTIONS = [
  { key: 'today',         label: 'Hôm nay' },
  { key: 'month_current', label: 'Tháng này' },
  { key: 'month3',        label: '3 tháng' },
  { key: 'custom',        label: 'Tùy chọn' },
];

function formatPrice(n?: number) {
  if (!n) return '0 ₫';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' tr ₫';
  return n.toLocaleString('vi-VN') + ' ₫';
}

function formatLabel(label: string, period: string) {
  if (!label) return '';
  if (period === 'today') {
    // HH:00 → HHh
    return label;
  }
  if (period === 'day' || period === 'custom' || period === 'month_current') {
    // YYYY-MM-DD → DD/MM
    const parts = label.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : label;
  }
  if (period === 'week') {
    // YYYY-Wxx → Tx
    return label.replace(/\d{4}-W/, 'T');
  }
  if (period === 'month' || period === 'all') {
    // YYYY-MM → Th.MM/YY
    const parts = label.split('-');
    if (parts.length === 2) return `Th.${parts[1]}/${parts[0].slice(2)}`;
  }
  return label;
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({ visible, x, y, label, revenue, orders }: any) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: 'translate(-50%, -110%)',
      background: '#1a1a2e',
      color: 'white',
      padding: '10px 14px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#f9b4d2' }}>{revenue?.toLocaleString('vi-VN')} ₫</div>
      <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{orders} đơn</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [period, setPeriod] = useState<string>('month_current');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [tooltip, setTooltip] = useState<any>({ visible: false });
  const [equipmentStats, setEquipmentStats] = useState<any>(null);
  const [showAllEquipment, setShowAllEquipment] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Custom date range
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [customStart, setCustomStart] = useState(firstOfMonth);
  const [customEnd, setCustomEnd] = useState(today);

  // Load stats once
  useEffect(() => {
    if (!token) return;
    Promise.all([
      adminApi.getStats(token),
      adminApi.getEquipmentStats(token)
    ]).then(([statsRes, eqRes]) => {
      if (statsRes.ok) setStats(statsRes.data);
      if (eqRes.ok) setEquipmentStats(eqRes.data);
      setLoading(false);
    });
  }, [token]);

  // Reload chart on period / custom dates change
  useEffect(() => {
    if (!token) return;
    if (period === 'custom' && (!customStart || !customEnd)) return;
    setChartLoading(true);
    adminApi.getRevenue(
      token,
      period,
      period === 'custom' ? customStart : undefined,
      period === 'custom' ? customEnd : undefined,
    ).then(res => {
      if (res.ok) setRevenue(res.data);
      setChartLoading(false);
    });
  }, [token, period, customStart, customEnd]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  const chartData: any[] = revenue?.data || [];
  const maxRevenue = Math.max(...chartData.map((d: any) => d.revenue), 1);

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    value: maxRevenue * r,
    pct: r * 100,
  }));

  return (
    <div className="animate-fade-in">
      <h1 className="section-title">Tổng quan hệ thống</h1>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 20, marginBottom: 36 }}>
        <StatCard
          icon={<ShoppingCart size={24} />}
          iconBg="rgba(245,158,11,0.12)" iconColor="#f59e0b"
          label="Đơn chờ duyệt"
          value={stats?.pendingBookings ?? 0}
        />
        <StatCard
          icon={<DollarSign size={24} />}
          iconBg="rgba(59,130,246,0.12)" iconColor="#3b82f6"
          label="Doanh thu tháng"
          value={formatPrice(revenue?.totalInPeriod)}
          large
        />
        <StatCard
          icon={<Camera size={24} />}
          iconBg="rgba(236,72,153,0.12)" iconColor="var(--accent)"
          label="Đang cho thuê"
          value={stats?.activeBookings ?? 0}
        />
        <StatCard
          icon={<Users size={24} />}
          iconBg="rgba(16,185,129,0.12)" iconColor="#10b981"
          label="Tổng đơn"
          value={stats?.totalBookings ?? 0}
        />
      </div>

      {/* ── Revenue Chart ── */}
      <div className="card" style={{ padding: 28 }}>
        {/* Chart Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <TrendingUp size={20} color="var(--accent)" />
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Biểu đồ doanh thu</h2>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
              <span>Tổng: <strong style={{ color: 'var(--accent)' }}>{revenue?.totalInPeriod?.toLocaleString('vi-VN')} ₫</strong></span>
              <span>{revenue?.totalOrders ?? 0} đơn</span>
            </div>
          </div>

          {/* Period Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 12, padding: 4, gap: 4 }}>
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key as any)}
                  style={{
                    padding: '8px 14px', borderRadius: 9, border: 'none',
                    background: period === opt.key ? 'var(--accent)' : 'transparent',
                    color: period === opt.key ? 'white' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom date range inputs */}
            {period === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.2s ease' }}>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={e => setCustomStart(e.target.value)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                />
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>→</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={today}
                  onChange={e => setCustomEnd(e.target.value)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, border: '1px solid var(--input-border)',
                    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Chart Body */}
        {chartLoading ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
            <BarChart2 size={48} strokeWidth={1} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Chưa có dữ liệu doanh thu</div>
          </div>
        ) : (
          <div ref={chartRef} style={{ position: 'relative', height: 300 }}>
            {/* Y-axis + Grid */}
            <div style={{ position: 'absolute', inset: 0, paddingBottom: 36, paddingLeft: 80 }}>
              {yTicks.map(tick => (
                <div key={tick.pct} style={{
                  position: 'absolute', left: 0, right: 0,
                  bottom: `calc(36px + ${tick.pct}% * (100% - 36px) / 100)`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{ width: 72, textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, marginLeft: -80 }}>
                    {formatPrice(tick.value)}
                  </div>
                  <div style={{ flex: 1, height: 1, background: tick.pct === 0 ? 'var(--separator)' : 'rgba(0,0,0,0.05)', borderTop: tick.pct === 0 ? '2px solid var(--separator)' : undefined }} />
                </div>
              ))}
            </div>

            {/* Bars */}
            <div style={{
              position: 'absolute', bottom: 0, left: 80, right: 0, height: '100%',
              display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 36,
            }}>
              {chartData.map((d: any, i: number) => {
                const heightPct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                const barLabel = formatLabel(d.label, period);
                return (
                  <div
                    key={i}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                    onMouseEnter={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const parentRect = chartRef.current!.getBoundingClientRect();
                      setTooltip({
                        visible: true,
                        x: rect.left - parentRect.left + rect.width / 2,
                        y: rect.top - parentRect.top,
                        label: d.label,
                        revenue: d.revenue,
                        orders: d.orders,
                      });
                    }}
                    onMouseLeave={() => setTooltip({ visible: false })}
                  >
                    {/* Value label on top of bar */}
                    {heightPct > 5 && (
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {d.revenue >= 1_000_000 ? (d.revenue / 1_000_000).toFixed(1) + 'tr' : d.revenue > 0 ? (d.revenue / 1000).toFixed(0) + 'k' : ''}
                      </div>
                    )}
                    {/* Bar */}
                    <div style={{
                      width: '80%', maxWidth: 48,
                      height: `${Math.max(heightPct, d.revenue > 0 ? 2 : 0)}%`,
                      minHeight: d.revenue > 0 ? 4 : 0,
                      background: d.revenue > 0
                        ? 'linear-gradient(to top, var(--accent), #f9b4d2)'
                        : 'var(--surface-high)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                    }} />
                    {/* X label */}
                    <div style={{
                      fontSize: chartData.length > 20 ? 8 : 10,
                      color: 'var(--text-muted)',
                      marginTop: 6,
                      transform: chartData.length > 10 ? 'rotate(-45deg)' : undefined,
                      transformOrigin: 'center top',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                    }}>
                      {barLabel}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tooltip */}
            <Tooltip {...tooltip} />
          </div>
        )}

        {/* Summary row */}
        {!chartLoading && chartData.length > 0 && (
          <div style={{ display: 'flex', gap: 24, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--separator)', flexWrap: 'wrap' }}>
            <SummaryPill label="Doanh thu kỳ này" value={`${revenue?.totalInPeriod?.toLocaleString('vi-VN')} ₫`} color="var(--accent)" />
            <SummaryPill label="Số đơn kỳ này" value={`${revenue?.totalOrders ?? 0} đơn`} color="#3b82f6" />
            <SummaryPill label="Tổng doanh thu" value={`${revenue?.allTimeRevenue?.toLocaleString('vi-VN')} ₫`} color="#10b981" />
            <SummaryPill label="Tổng tất cả đơn" value={`${revenue?.allTimeOrders ?? 0} đơn`} color="#f59e0b" />
          </div>
        )}
      </div>

      {/* ── Equipment Stats ── */}
      {equipmentStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 24 }}>
          {/* Top Cameras */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              🏆 Thiết bị thuê nhiều nhất
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(showAllEquipment ? equipmentStats.topCameras : equipmentStats.topCameras.slice(0, 3)).map((cam: any, i: number) => (
                <div key={cam.camera_id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 24, fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}.</div>
                  {cam.image ? (
                    <img src={cam.image} alt={cam.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📷</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{cam.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {cam.total_bookings} lần thuê • {(cam.total_revenue / 1000000).toFixed(1)}tr ₫
                    </div>
                  </div>
                </div>
              ))}
              
              {equipmentStats.topCameras.length > 3 && (
                <button 
                  onClick={() => setShowAllEquipment(!showAllEquipment)}
                  style={{ 
                    background: 'var(--surface-high)', border: 'none', padding: '10px', 
                    borderRadius: 8, color: 'var(--text)', fontWeight: 600, cursor: 'pointer',
                    marginTop: 8, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-high)'}
                >
                  {showAllEquipment ? 'Thu gọn' : `Xem thêm ${equipmentStats.topCameras.length - 3} thiết bị`}
                </button>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 Phân bổ danh mục
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {equipmentStats.categoryStats.map((cat: any) => {
                const total = equipmentStats.categoryStats.reduce((sum: number, c: any) => sum + c.count, 0);
                const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{cat.category}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{pct}% ({cat.count})</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface-high)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tỉ lệ sử dụng thiết bị</div>
              <div style={{ fontWeight: 800, color: '#10b981' }}>{equipmentStats.summary.utilization_rate}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, iconBg, iconColor, label, value, large }: any) {
  return (
    <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: large ? 22 : 28, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value, color }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
