import { useRef, useState } from 'react';
import { uploadService } from '../services/uploadService';

export function AttachmentUploader({ files, onChange, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState([]);

  const handleSelect = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;

    const allFiles = [...files, ...selected];
    const validationErrors = uploadService.validateFiles(allFiles);
    if (validationErrors.length) { setErrors(validationErrors); return; }
    setErrors([]);
    setUploading(true);

    try {
      const uploaded = await uploadService.uploadFiles(
        selected,
        (fileIndex, pct) => setProgress(p => ({ ...p, [fileIndex]: pct }))
      );
      onChange([...files, ...uploaded]);
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setUploading(false);
      setProgress({});
      e.target.value = '';
    }
  };

  const handleRemove = async (index) => {
    const file = files[index];
    await uploadService.deleteFile(file.path);
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="att-uploader">
      <div className="att-label">Đính kèm ảnh / PDF (tùy chọn · tối đa 3 file · 10MB/file)</div>

      {files.length > 0 && (
        <div className="att-file-list">
          {files.map((f, i) => (
            <div key={i} className="att-file-item">
              {f.type?.startsWith('image/') ? (
                <img src={f.url} alt={f.name} className="att-thumb" referrerPolicy="no-referrer" />
              ) : (
                <span className="att-pdf-icon">📄</span>
              )}
              <span className="att-file-name">{f.name}</span>
              <span className="att-file-size">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
              <button className="att-remove" onClick={() => handleRemove(i)} type="button">×</button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="att-progress">
          Đang tải lên... {Object.values(progress).map((p, i) => <span key={i}>{p}% </span>)}
        </div>
      )}

      {errors.map((err, i) => <div key={i} className="att-error">{err}</div>)}

      {files.length < 3 && (
        <>
          <input
            ref={inputRef} type="file" multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            onChange={handleSelect} disabled={disabled || uploading}
            style={{ display: 'none' }}
          />
          <button type="button" className="att-add-btn" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
            📎 Đính kèm ảnh hoặc PDF
          </button>
        </>
      )}
    </div>
  );
}
