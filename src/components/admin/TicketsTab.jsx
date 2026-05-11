import { useState, useEffect, useCallback } from 'react';
import { ticketService, CATEGORIES } from '../../services/ticketService';

const STATUS_LABELS = {
  open: 'Mở', 'in-progress': 'Đang xử lý', resolved: 'Đã giải quyết', closed: 'Đóng',
};
const STATUS_CLASSES = {
  open: 'tk-status-open', 'in-progress': 'tk-status-progress', resolved: 'tk-status-resolved', closed: 'tk-status-closed',
};
const PRIORITY_LABELS = {
  low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn cấp',
};
const PRIORITY_CLASSES = {
  low: 'tk-pri-low', normal: 'tk-pri-normal', high: 'tk-pri-high', urgent: 'tk-pri-urgent',
};

function timeAgo(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}p trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h trước`;
  const days = Math.floor(hours / 24);
  return `${days}d trước`;
}

// ─── Ticket Detail Panel ───
function TicketDetail({ ticket, onUpdate }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState(ticket.internalNote || '');
  const [localMessages, setLocalMessages] = useState(ticket.messages || []);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const newMsg = await ticketService.adminReply(ticket.id, reply.trim());
      setLocalMessages(prev => [...prev, newMsg]);
      setReply('');
      onUpdate();
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleReply();
  };

  const handleStatusChange = async (status) => {
    if (status === 'closed' && !confirm('Đóng ticket này?')) return;
    await ticketService.updateTicket(ticket.id, { status });
    onUpdate();
  };

  const handlePriorityChange = async (priority) => {
    await ticketService.updateTicket(ticket.id, { priority });
    onUpdate();
  };

  const handleSaveNote = async () => {
    await ticketService.updateInternalNote(ticket.id, note);
  };

  return (
    <div className="tk-detail">
      {/* Header */}
      <div className="tk-detail-header">
        <div>
          <div className="tk-detail-cat">{CATEGORIES[ticket.category] || ticket.category}</div>
          <h3 className="tk-detail-subject">{ticket.subject}</h3>
          <div className="tk-detail-meta">
            {ticket.email || 'Khách vãng lai'} · {timeAgo(ticket.createdAt)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="tk-controls">
        <div className="tk-control-group">
          <label>Ưu tiên:</label>
          <select
            value={ticket.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="tk-select"
          >
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="tk-control-group">
          <label>Trạng thái:</label>
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="tk-select"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conversation */}
      <div className="tk-conversation custom-scrollbar">
        {localMessages.map(msg => (
          <div key={msg.id} className={`tk-msg ${msg.isAdmin ? 'tk-msg-admin' : 'tk-msg-user'}`}>
            <div className="tk-msg-author">
              {msg.isAdmin ? '🛡️ AI Translate Support' : (msg.authorName || 'Khách')}
              <span className="tk-msg-time">{timeAgo(msg.createdAt)}</span>
            </div>
            <div className="tk-msg-body">{msg.content}</div>
            {msg.attachments?.length > 0 && (
              <div className="tk-msg-attachments">
                {msg.attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" className="tk-attachment-link">
                    {att.type?.startsWith('image/') ? (
                      <img src={att.url} alt={att.name} className="tk-attachment-thumb" referrerPolicy="no-referrer" />
                    ) : <span>📄</span>}
                    <span className="tk-attachment-name">{att.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply */}
      <div className="tk-reply-area">
        <textarea
          className="tk-reply-input"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Viết phản hồi... (Ctrl+Enter để gửi)"
          rows={3}
        />
        <div className="tk-reply-actions">
          <button className="btn btn-primary" onClick={handleReply} disabled={sending || !reply.trim()}>
            {sending ? 'Đang gửi...' : 'Gửi reply'}
          </button>
          {ticket.status !== 'closed' && (
            <button className="btn btn-ghost" onClick={() => handleStatusChange('closed')}>
              Đóng ticket
            </button>
          )}
        </div>
      </div>

      {/* Internal note */}
      <div className="tk-note-area">
        <label className="tk-note-label">Ghi chú nội bộ (user không thấy):</label>
        <textarea
          className="tk-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú..."
          rows={2}
        />
        <button className="btn btn-ghost tk-note-save" onClick={handleSaveNote}>Lưu ghi chú</button>
      </div>
    </div>
  );
}

// ─── Main Tab ───
export function TicketsTab() {
  const [tickets, setTickets] = useState(null);
  const [filter, setFilter] = useState(null); // null = all
  const [selected, setSelected] = useState(null);

  const loadTickets = useCallback(async () => {
    const data = await ticketService.getTickets({ status: filter });
    setTickets(data);
  }, [filter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleUpdate = () => {
    loadTickets();
  };

  return (
    <div className="tk-layout">
      {/* Left: List */}
      <div className="tk-list-panel">
        <div className="admin-filter-bar">
          {[
            { id: null, label: 'Tất cả' },
            { id: 'open', label: 'Mở' },
            { id: 'in-progress', label: 'Đang xử lý' },
            { id: 'resolved', label: 'Đã giải quyết' },
          ].map(f => (
            <button
              key={f.id ?? 'all'}
              className={`admin-filter-btn ${filter === f.id ? 'active' : ''}`}
              onClick={() => { setFilter(f.id); setSelected(null); }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {tickets === null ? (
          <div className="admin-loading">
            <div className="shimmer" style={{ height: 60, marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 60, marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 60 }} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="admin-empty">Không có ticket nào</div>
        ) : (
          <div className="tk-ticket-list">
            {tickets.map(t => (
              <button
                key={t.id}
                className={`tk-ticket-item ${selected?.id === t.id ? 'active' : ''}`}
                onClick={() => setSelected(t)}
              >
                <div className="tk-ticket-item-top">
                  <span className="tk-ticket-subject">{t.subject}</span>
                  <span className={`tk-status-dot ${STATUS_CLASSES[t.status]}`} />
                </div>
                <div className="tk-ticket-item-meta">
                  <span>{t.email || 'Khách'}</span>
                  <span className={`tk-pri-badge ${PRIORITY_CLASSES[t.priority]}`}>
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                  <span>{timeAgo(t.createdAt)}</span>
                </div>
                <div className="tk-ticket-item-badges">
                  <span className="tk-cat-badge">{CATEGORIES[t.category]}</span>
                  <span className={`tk-status-badge ${STATUS_CLASSES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Detail */}
      <div className="tk-detail-panel">
        {selected ? (
          <TicketDetail key={selected.id} ticket={selected} onUpdate={handleUpdate} />
        ) : (
          <div className="tk-detail-empty">
            <div className="tk-detail-empty-icon">🎫</div>
            <p>Chọn ticket để xem chi tiết</p>
          </div>
        )}
      </div>
    </div>
  );
}
