import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { cameraApi } from '../services/api';

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

    try {
      // 1. Fetch available products for context
      let productContext = 'Chưa có sản phẩm.';
      try {
        const camRes = await cameraApi.getCameras({ limit: 10, search: userMsg });
        if (camRes.ok && camRes.data?.cameras) {
          productContext = camRes.data.cameras.slice(0, 10).map((c: any) => 
            `- ${c.name} (${c.brand}): ${c.price_per_day?.toLocaleString('vi-VN')}đ/ngày`
          ).join('\n');
        }
      } catch(e) {}

      // 2. Prepare Gemini history
      const history = messages
        .filter(m => m.role !== 'bot' || !m.text.includes('sự cố')) // Bỏ qua tin nhắn lỗi
        .map(m => ({ 
          role: m.role === 'bot' ? 'model' : 'user', 
          parts: [{ text: m.text }] 
        }));
      history.push({ role: 'user', parts: [{ text: userMsg }] });

      // 3. Call Gemini API directly from Frontend to bypass Render IP block
      const API_KEY = "AIzaSyA2q-n8qR2pRrBnw_au0LFFo8-vOrJ7cXY";
      const systemPrompt = `Bạn là TinaBot – trợ lý tư vấn của TinaCamera. QUY TẮC: Trả lời tiếng Việt, thân thiện, ngắn gọn (dưới 3 câu). Chỉ tập trung thông tin thuê máy. Ngoài lề -> gọi 0888888888. SẢN PHẨM: ${productContext}`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: history,
        })
      });

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setMessages(prev => [...prev, { role: 'bot', text: data.candidates[0].content.parts[0].text }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: data.error?.message || 'Xin lỗi, tôi gặp sự cố.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Xin lỗi, hệ thống mạng đang gặp sự cố.' }]);
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
