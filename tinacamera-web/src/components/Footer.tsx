import React from 'react';
import { Camera, Phone, Mail, MapPin, Globe, MessageCircle, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)' }}>
                <Camera size={16} />
              </div>
              TinaCamera
            </div>
            <p className="footer-desc">
              Đơn vị cho thuê máy ảnh, ống kính uy tín hàng đầu Hà Nội. Đa dạng thiết bị từ mirrorless, DSLR, film đến ống kính và phụ kiện chuyên nghiệp.
            </p>
            <div className="footer-socials">
              <a href="#" className="footer-social-icon"><Share2 size={16} /></a>
              <a href="#" className="footer-social-icon"><Globe size={16} /></a>
              <a href="#" className="footer-social-icon"><MessageCircle size={16} /></a>
            </div>
          </div>
          <div>
            <h4 className="footer-title">Liên hệ</h4>
            <a className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={14} /> 0901.234.567</a>
            <a className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} /> support@tina.vn</a>
            <a className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /> Thanh Xuân, Hà Nội</a>
          </div>
          <div>
            <h4 className="footer-title">Chính sách</h4>
            <a href="#" className="footer-link">Quy định thuê</a>
            <a href="#" className="footer-link">Bảo mật thông tin</a>
            <a href="#" className="footer-link">Bồi hoàn hư hỏng</a>
            <a href="#" className="footer-link">Hướng dẫn đặt hàng</a>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} TinaCamera. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
