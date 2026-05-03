import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { chatApi } from '../services/api';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: 'bot', text: 'Xin chào! Tôi là trợ lý ảo của TinaCamera. Tôi có thể giúp bạn tìm thiết bị, tư vấn giá thuê hoặc trả lời thắc mắc. 📷' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const history = messages.map(m => ({ role: m.role === 'bot' ? 'model' : 'user', text: m.text }));
    const res = await chatApi.sendMessage(userMsg, history);

    if (res.ok && res.data?.reply) {
      setMessages(prev => [...prev, { role: 'bot', text: res.data!.reply }]);
    } else {
      setMessages(prev => [...prev, { role: 'bot', text: 'Xin lỗi, tôi gặp sự cố. Vui lòng thử lại sau.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button className="chatbot-toggle" onClick={() => setOpen(!open)} title="Chat hỗ trợ">
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>TinaCamera Bot</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trợ lý tư vấn 24/7</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-msg ${m.role}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg bot" style={{ display: 'flex', gap: 4, padding: '12px 20px' }}>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          <div className="chatbot-input-area">
            <input
              className="chatbot-input"
              placeholder="Nhập câu hỏi..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="chatbot-send" onClick={handleSend} disabled={loading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
