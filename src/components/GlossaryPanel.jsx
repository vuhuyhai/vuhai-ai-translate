import React, { useState, useMemo, useCallback } from 'react';
import useGlossaryStore from '../stores/glossaryStore';

const STATUS_CONFIG = {
  suggested: { label: 'Chờ duyệt', color: 'var(--color-warning)', bg: 'var(--status-translating-bg)', text: 'var(--status-translating-text)' },
  approved:  { label: 'Đã duyệt',  color: 'var(--color-success)', bg: 'var(--status-translated-bg)', text: 'var(--status-translated-text)' },
  rejected:  { label: 'Từ chối',    color: 'var(--color-danger)',  bg: 'var(--status-error-bg)',      text: 'var(--status-error-text)' },
};

const FILTERS = [
  { id: 'all',       label: 'Tất cả' },
  { id: 'suggested', label: 'Chờ duyệt' },
  { id: 'approved',  label: 'Đã duyệt' },
  { id: 'rejected',  label: 'Từ chối' },
];

// ─── Single Entry Row ───
function GlossaryEntry({ entry }) {
  const { approveEntry, rejectEntry, updateEntry } = useGlossaryStore();
  const [editing, setEditing] = useState(null); // 'termVI' | 'notes' | null
  const [editValue, setEditValue] = useState('');
  const cfg = STATUS_CONFIG[entry.status];

  const startEdit = (field) => {
    setEditing(field);
    setEditValue(entry[field]);
  };

  const saveEdit = () => {
    if (editing && editValue.trim()) {
      updateEntry(entry.id, { [editing]: editValue.trim() });
    }
    setEditing(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  return (
    <div className="gloss-entry">
      <div className="gloss-entry-header">
        <span className="gloss-term-en">{entry.termEN}</span>
        <span className="gloss-badge" style={{ background: cfg.bg, color: cfg.text }}>
          {cfg.label}
        </span>
      </div>

      <div className="gloss-term-vi-row">
        <span className="gloss-arrow">→</span>
        {editing === 'termVI' ? (
          <input
            className="gloss-inline-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEdit}
            autoFocus
          />
        ) : (
          <span
            className="gloss-term-vi"
            onClick={() => startEdit('termVI')}
            title="Nhấn để sửa"
          >
            {entry.termVI}
          </span>
        )}
      </div>

      {entry.termVIAlts.length > 0 && (
        <div className="gloss-alts">Alt: {entry.termVIAlts.join(', ')}</div>
      )}

      {entry.context && (
        <div className="gloss-context" title={entry.context}>
          "{entry.context}"
        </div>
      )}

      {editing === 'notes' ? (
        <input
          className="gloss-inline-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveEdit}
          placeholder="Ghi chú..."
          autoFocus
        />
      ) : entry.notes ? (
        <div className="gloss-notes" onClick={() => startEdit('notes')} title="Nhấn để sửa">
          📝 {entry.notes}
        </div>
      ) : null}

      <div className="gloss-actions">
        {entry.status !== 'approved' && (
          <button className="gloss-action-btn gloss-approve" onClick={() => approveEntry(entry.id)} title="Duyệt">
            ✓
          </button>
        )}
        {entry.status !== 'rejected' && (
          <button className="gloss-action-btn gloss-reject" onClick={() => rejectEntry(entry.id)} title="Từ chối">
            ✗
          </button>
        )}
        <button className="gloss-action-btn gloss-edit" onClick={() => startEdit(editing === 'notes' ? 'termVI' : 'notes')} title="Sửa ghi chú">
          ✎
        </button>
      </div>
    </div>
  );
}

// ─── Main Panel ───
export const GlossaryPanel = React.memo(function GlossaryPanel({ isOpen, onClose }) {
  const { entries, clearAll, approveAll, exportAsMarkdown } = useGlossaryStore();
  const [filter, setFilter] = useState('all');

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.status === filter);
  }, [entries, filter]);

  const counts = useMemo(() => ({
    all: entries.length,
    suggested: entries.filter(e => e.status === 'suggested').length,
    approved: entries.filter(e => e.status === 'approved').length,
    rejected: entries.filter(e => e.status === 'rejected').length,
  }), [entries]);

  const handleExport = useCallback(() => {
    const md = exportAsMarkdown();
    if (!md) return;
    navigator.clipboard.writeText(md);
  }, [exportAsMarkdown]);

  if (!isOpen) return null;

  return (
    <>
      <div className="gloss-overlay" onClick={onClose} />
      <aside className="gloss-panel">
        {/* Header */}
        <div className="gloss-panel-header">
          <div className="gloss-panel-title">
            📚 Bảng thuật ngữ
            <span className="gloss-count-badge">{entries.length}</span>
          </div>
          <div className="gloss-panel-actions">
            {counts.suggested > 0 && (
              <button className="btn btn-ghost gloss-header-btn" onClick={approveAll} title="Duyệt tất cả">
                ✓ Duyệt tất cả
              </button>
            )}
            <button className="btn btn-ghost gloss-header-btn" onClick={handleExport} title="Copy bảng thuật ngữ">
              📋
            </button>
            <button className="btn btn-ghost gloss-header-btn" onClick={clearAll} title="Xóa tất cả">
              🗑️
            </button>
            <button className="gloss-close-btn" onClick={onClose} aria-label="Đóng">
              ✕
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="gloss-filters">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`gloss-filter-btn ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {counts[f.id] > 0 && (
                <span className="gloss-filter-count">{counts[f.id]}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="gloss-list custom-scrollbar">
          {filteredEntries.length === 0 ? (
            <div className="gloss-empty">
              {entries.length === 0
                ? 'Chưa có thuật ngữ. Bắt đầu dịch để AI tự động phát hiện.'
                : 'Không có thuật ngữ nào trong bộ lọc này.'}
            </div>
          ) : (
            filteredEntries.map(entry => (
              <GlossaryEntry key={entry.id} entry={entry} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="gloss-panel-footer">
          Đang dùng <strong>{counts.approved}</strong> thuật ngữ trong prompt dịch
        </div>
      </aside>
    </>
  );
});
