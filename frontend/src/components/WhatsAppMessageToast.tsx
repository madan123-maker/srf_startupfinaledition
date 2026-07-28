import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './WhatsAppMessageToast.css';

export interface ToastMessage {
  _id: string;
  senderId: {
    _id: string;
    name?: string;
    role?: string;
    state?: string;
    email?: string;
  };
  content: string;
  createdAt: string;
}

// Function to play gentle Web Audio synth chime sound
const playWhatsAppChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.1); // E6
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
};

const WhatsAppMessageToast: React.FC = () => {
  const navigate = useNavigate();
  const [activeToasts, setActiveToasts] = useState<ToastMessage[]>([]);
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const pollUnreadMessages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages/unread-latest`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const unreadMsgs: ToastMessage[] = await response.json();
          if (Array.isArray(unreadMsgs) && unreadMsgs.length > 0) {
            const newMsgs = unreadMsgs.filter(m => !seenMessageIds.has(m._id));

            if (newMsgs.length > 0) {
              // Play chime sound
              playWhatsAppChime();

              // Add to seen set
              setSeenMessageIds(prev => {
                const updated = new Set(prev);
                newMsgs.forEach(m => updated.add(m._id));
                return updated;
              });

              // Add to active toasts
              setActiveToasts(prev => [...newMsgs, ...prev].slice(0, 3));
            }
          }
        }
      } catch (err) {
        console.error('Error polling WhatsApp pop-up messages:', err);
      }
    };

    // Initial check and poll every 4 seconds
    pollUnreadMessages();
    const interval = setInterval(pollUnreadMessages, 4000);
    return () => clearInterval(interval);
  }, [seenMessageIds]);

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveToasts(prev => prev.filter(t => t._id !== id));
  };

  const handleToastClick = (toast: ToastMessage) => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const targetPath = user?.role === 'USER' ? '/user-dashboard/messages' : '/admin/messages';

    // Remove from active toasts and navigate with contact state
    setActiveToasts(prev => prev.filter(t => t._id !== toast._id));
    const sender = typeof toast.senderId === 'object' ? toast.senderId : { _id: toast.senderId };
    navigate(targetPath, { state: { contactId: sender._id } });
  };

  if (activeToasts.length === 0) return null;

  return (
    <div className="whatsapp-toast-container">
      {activeToasts.map(toast => {
        const sender = typeof toast.senderId === 'object' ? toast.senderId : null;
        const senderName = sender?.name || sender?.state || sender?.email || 'New Sender';
        const senderRole = sender?.role ? sender.role.replace('_', ' ') : 'Contact';
        const initial = senderName.charAt(0).toUpperCase();

        const formattedTime = new Date(toast.createdAt || Date.now()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });

        return (
          <div
            key={toast._id}
            className="whatsapp-toast-card"
            onClick={() => handleToastClick(toast)}
          >
            <div className="whatsapp-toast-header">
              <div className="whatsapp-toast-badge">
                <span className="whatsapp-toast-dot"></span>
                <span>WhatsApp Message</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="whatsapp-toast-time">{formattedTime}</span>
                <button
                  className="whatsapp-toast-close-btn"
                  onClick={(e) => handleDismiss(e, toast._id)}
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="whatsapp-toast-body">
              <div className="whatsapp-toast-avatar">
                {initial}
              </div>
              <div className="whatsapp-toast-content">
                <div className="whatsapp-toast-sender">{senderName}</div>
                <div className="whatsapp-toast-role">{senderRole}</div>
                <div className="whatsapp-toast-message-bubble">
                  {toast.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WhatsAppMessageToast;
