import { storage, auth } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;
const MAX_FILES = 3;

export const uploadService = {
  validateFiles(files) {
    const errors = [];
    if (files.length > MAX_FILES) {
      errors.push(`Tối đa ${MAX_FILES} file mỗi ticket`);
    }
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Chỉ chấp nhận ảnh (JPG/PNG/GIF/WebP) hoặc PDF`);
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`${file.name}: Vượt quá ${MAX_SIZE_MB}MB`);
      }
    }
    return errors;
  },

  async uploadFile(file, onProgress) {
    const user = auth.currentUser;
    if (!user) throw new Error('Cần đăng nhập để đính kèm file');

    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const filePath = `ticket-attachments/${user.uid}/${fileName}`;
    const storageRef = ref(storage, filePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed',
        (snapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(percent);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, path: filePath, name: file.name, size: file.size, type: file.type });
        }
      );
    });
  },

  async uploadFiles(files, onProgress) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadFile(files[i], (pct) => onProgress?.(i, pct));
      results.push(result);
    }
    return results;
  },

  async deleteFile(filePath) {
    try { await deleteObject(ref(storage, filePath)); } catch { /* already deleted */ }
  },
};
