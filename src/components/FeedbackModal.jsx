import { useState, useEffect, useCallback, useRef } from 'react';
import { ticketService, CATEGORIES } from '../services/ticketService';
import { uploadService } from '../services/uploadService';
import { authService } from '../services/authService';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '../hooks/useToast';
import { AttachmentUploader } from './AttachmentUploader';

const CATEGORY_OPTIONS = [
  { id: 'bug', icon: '🐛', label: 'Tôi gặp lỗi kỹ thuật' },
  { id: 'quality', icon: '📝', label: 'Chất lượng dịch chưa tốt' },
  { id: 'feature', icon: '💡', label: 'Tôi có ý tưởng tính năng mới' },
  { id: 'other', icon: '❓', label: 'Câu hỏi khác' },
];

const STATUS_LABELS = {
  open: 'Mở', 'in-progress': 'Đang xử lý', resolved: 'Đã giải quyết', closed: 'Đóng',
};
const STATUS_CLASSES = {
  open: 'fb-status-open', 'in-progress': 'fb-status-progress', resolved: 'fb-status-resolved', closed: 'fb-status-closed',
};

function timeAgo(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

// ─── Login Gate ───
function LoginGate() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await authService.upgradeToGoogle();
    } catch { /* handled by auth state listener */ }
    setLoading(false);
  };

  return (
    <div className="fb-login-gate">
      <div className="fb-login-icon">💬</div>
      <p className="fb-login-title">Đăng nhập để gửi phản hồi</p>
      <p className="fb-login-desc">
        Chúng tôi muốn phản hồi lại bạn trực tiếp.
        Đăng nhập bằng Google — 1 click, không cần điền form.
      </p>
      <button className="fb-google-btn" onClick={handleLogin} disabled={loading}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
      </button>
    </div>
  );
}

// ─── Create Form ───
function CreateForm({ onCreated, onCleanup }) {
  const toast = useToast();
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);

  // Expose cleanup for parent (delete uploaded files if modal closes without submit)
  useEffect(() => {
    onCleanup?.(() => attachments);
  }, [attachments, onCleanup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || message.trim().length < 20) return;
    setSending(true);
    try {
      await ticketService.createTicket({
        category, subject: subject.trim(), message: message.trim(), attachments,
      });
      toast.success('Cảm ơn bạn! Chúng tôi đọc mọi phản hồi và sẽ trả lời trong 24 giờ.');
      setAttachments([]);
      onCreated();
    } catch (error) {
      toast.error('Gửi thất bại', error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="fb-form">
      <label className="fb-label">Loại vấn đề</label>
      <div className="fb-category-grid">
        {CATEGORY_OPTIONS.map(c => (
          <button key={c.id} type="button"
            className={`fb-category-btn ${category === c.id ? 'active' : ''}`}
            onClick={() => setCategory(c.id)}>
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      <label className="fb-label">Tiêu đề</label>
      <input className="fb-input" value={subject} onChange={(e) => setSubject(e.target.value)}
        placeholder="Mô tả ngắn gọn vấn đề..." maxLength={120} required />

      <label className="fb-label">Mô tả chi tiết</label>
      <textarea className="fb-textarea" value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder="Mô tả chi tiết vấn đề bạn gặp phải..." rows={4} required />
      <div className="fb-hint">
        {message.length < 20 ? `Tối thiểu 20 ký tự (còn ${20 - message.length})` : '✓ Đủ chi tiết'}
      </div>

      <AttachmentUploader files={attachments} onChange={setAttachments} disabled={sending} />

      <button type="submit" className="btn btn-primary-lg fb-submit"
        disabled={sending || !subject.trim() || message.trim().length < 20}>
        {sending ? 'Đang gửi...' : 'Gửi phản hồi →'}
      </button>
    </form>
  );
}

// ─── Thread View ───
function ThreadView({ ticket, onBack }) {
  return (
    <div className="fb-thread">
      <button className="fb-back-btn" onClick={onBack}>← Quay lại</button>
      <div className="fb-thread-header">
        <span className={`fb-status ${STATUS_CLASSES[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
        <span className="fb-thread-cat">{CATEGORIES[ticket.category] || ticket.category}</span>
      </div>
      <h3 className="fb-thread-subject">{ticket.subject}</h3>
      <div className="fb-messages">
        {(ticket.messages || []).map(msg => (
          <div key={msg.id} className={`fb-msg ${msg.isAdmin ? 'fb-msg-admin' : 'fb-msg-user'}`}>
            <div className="fb-msg-author">
              {msg.isAdmin ? '🛡️ AI Translate Support' : msg.authorName}
              <span className="fb-msg-time">{timeAgo(msg.createdAt)}</span>
            </div>
            <div className="fb-msg-content">{msg.content}</div>
            {msg.attachments?.length > 0 && (
              <div className="fb-msg-attachments">
                {msg.attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" className="fb-attachment-link">
                    {att.type?.startsWith('image/') ? (
                      <img src={att.url} alt={att.name} className="fb-attachment-thumb" referrerPolicy="no-referrer" />
                    ) : <span>📄</span>}
                    <span className="fb-attachment-name">{att.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ticket List ───
function TicketList({ tickets, onSelect }) {
  if (tickets.length === 0) return <div className="fb-empty">Bạn chưa gửi phản hồi nào.</div>;
  return (
    <div className="fb-ticket-list">
      {tickets.map(t => (
        <button key={t.id} className="fb-ticket-item" onClick={() => onSelect(t)}>
          <div className="fb-ticket-item-top">
            <span className="fb-ticket-subject">{t.subject}</span>
            <span className={`fb-status fb-status-sm ${STATUS_CLASSES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
          </div>
          <div className="fb-ticket-item-meta">
            {CATEGORIES[t.category]} · {timeAgo(t.createdAt)}
            {t.messages?.length > 1 && ` · ${t.messages.length} tin nhắn`}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main Modal ───
export function FeedbackModal({ onClose }) {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [view, setView] = useState('create');
  const [tickets, setTickets] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const cleanupDataRef = useRef(null);
  const cleanupRef = useCallback((getAttachments) => {
    // Store reference to get current attachments for cleanup
    cleanupDataRef.current = getAttachments;
  }, []);

  // Listen for auth changes (login gate → form transition)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return unsubscribe;
  }, []);

  const loadTickets = useCallback(async () => {
    const data = await ticketService.getMyTickets();
    setTickets(data);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleCreated = () => {
    setSubmitted(true);
    loadTickets();
    setView('list');
  };

  const handleClose = async () => {
    // Cleanup uploaded files if not submitted
    if (!submitted && cleanupDataRef.current) {
      const attachments = cleanupDataRef.current();
      for (const att of attachments) {
        await uploadService.deleteFile(att.path);
      }
    }
    onClose();
  };

  const isAnonymous = !currentUser || currentUser.isAnonymous;

  return (
    <>
      <div className="gloss-overlay" onClick={handleClose} />
      <div className="fb-modal fade-in">
        <div className="fb-modal-header">
          <h2 className="fb-modal-title">
            {isAnonymous ? 'Gửi phản hồi' : view === 'create' ? 'Gửi phản hồi' : view === 'thread' ? 'Chi tiết' : 'Phản hồi của bạn'}
          </h2>
          <div className="fb-modal-actions">
            {!isAnonymous && view !== 'create' && (
              <button className="fb-tab-btn" onClick={() => setView('create')}>+ Tạo mới</button>
            )}
            {!isAnonymous && view !== 'list' && tickets && tickets.length > 0 && (
              <button className="fb-tab-btn" onClick={() => { setView('list'); setSelectedTicket(null); }}>
                Lịch sử ({tickets.length})
              </button>
            )}
            <button className="gloss-close-btn" onClick={handleClose}>✕</button>
          </div>
        </div>

        <div className="fb-modal-body custom-scrollbar">
          {isAnonymous ? (
            <LoginGate />
          ) : (
            <>
              {view === 'create' && <CreateForm onCreated={handleCreated} onCleanup={cleanupRef} />}
              {view === 'list' && (
                tickets === null
                  ? <div className="shimmer" style={{ height: 100 }} />
                  : <TicketList tickets={tickets} onSelect={(t) => { setSelectedTicket(t); setView('thread'); }} />
              )}
              {view === 'thread' && selectedTicket && (
                <ThreadView ticket={selectedTicket} onBack={() => setView('list')} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
