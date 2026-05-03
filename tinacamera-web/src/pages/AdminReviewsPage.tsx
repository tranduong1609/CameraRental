import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Star, MessageSquare, Eye, EyeOff, Send, Camera } from 'lucide-react';

export default function AdminReviewsPage() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchReviews = async () => {
    if (!token) return;
    setLoading(true);
    const res = await adminApi.getReviews(token);
    if (res.ok && res.data?.reviews) {
      setReviews(res.data.reviews);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [token]);

  const handleToggleVisibility = async (id: string, current: boolean) => {
    if (!token) return;
    setUpdating(true);
    const res = await adminApi.toggleReviewVisibility(token, id, !current);
    if (res.ok) fetchReviews();
    else alert(res.message);
    setUpdating(false);
  };

  const handleReply = async (id: string) => {
    if (!token || !replyText.trim()) return;
    setUpdating(true);
    const res = await adminApi.replyReview(token, id, replyText.trim());
    if (res.ok) {
      setReplyingTo(null);
      setReplyText('');
      fetchReviews();
    } else {
      alert(res.message);
    }
    setUpdating(false);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 className="section-title">Quản lý đánh giá</h1>

      {loading ? (
        <div className="spinner spinner-lg"></div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: 16 }}>
          Chưa có đánh giá nào.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map(review => (
            <div key={review._id} className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {review.user_id?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{review.user_id?.full_name || 'Khách hàng'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(review.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} color={i < review.rating ? '#f59e0b' : 'var(--separator)'} fill={i < review.rating ? '#f59e0b' : 'transparent'} />
                  ))}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 12, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Camera size={16} color="var(--text-muted)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{review.camera_id?.name || 'Thiết bị'}</span>
              </div>

              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{review.comment || 'Không có nhận xét.'}</p>

              {review.reply_comment && (
                <div style={{ background: 'var(--surface-high)', padding: 16, borderRadius: 12, marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Phản hồi của cửa hàng</div>
                  <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>{review.reply_comment}</p>
                </div>
              )}

              {replyingTo === review._id ? (
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <input 
                    type="text" 
                    value={replyText} 
                    onChange={e => setReplyText(e.target.value)} 
                    placeholder="Nhập phản hồi..." 
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  />
                  <button className="btn btn-primary" onClick={() => handleReply(review._id)} disabled={updating || !replyText.trim()}>
                    <Send size={16} /> Gửi
                  </button>
                  <button className="btn" style={{ background: 'var(--surface-high)' }} onClick={() => setReplyingTo(null)}>Hủy</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--separator)', paddingTop: 16 }}>
                  {!review.reply_comment && (
                    <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={() => setReplyingTo(review._id)}>
                      <MessageSquare size={14} /> Phản hồi
                    </button>
                  )}
                  <button 
                    className="btn btn-sm" 
                    style={{ background: 'transparent', border: '1px solid var(--separator)', color: 'var(--text-muted)' }} 
                    onClick={() => handleToggleVisibility(review._id, review.is_visible)}
                    disabled={updating}
                  >
                    {review.is_visible ? <><EyeOff size={14} /> Ẩn đánh giá</> : <><Eye size={14} /> Hiện đánh giá</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
