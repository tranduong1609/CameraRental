import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function QRScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (text: string) => void }) {
  const [error, setError] = useState('');
  
  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            html5QrCode.stop().then(() => {
              onScan(decodedText);
            }).catch(err => {
              console.error("Error stopping scanner", err);
              onScan(decodedText);
            });
          },
          (errorMessage) => {
            // parse errors are normal (no qr code found)
          }
        );
      } catch (err: any) {
        setError("Không thể mở Camera. Vui lòng cấp quyền sử dụng máy ảnh trong trình duyệt.");
        console.error(err);
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      
      <div style={{ background: 'var(--card-bg)', padding: 24, borderRadius: 24, width: '90%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Quét mã QR đơn hàng</h2>
          <button onClick={onClose} style={{ background: 'var(--surface-high)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div style={{ color: 'var(--danger, #ef4444)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            {error}
          </div>
        ) : (
          <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000' }}>
            <div id="reader" style={{ width: '100%' }}></div>
          </div>
        )}
        
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16 }}>
          Hãy đưa mã QR vào khung hình
        </div>
      </div>
    </div>
  );
}
