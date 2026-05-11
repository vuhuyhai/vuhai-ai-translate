import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Fix cho Tauri: dùng localhost thay vì IP
  server: {
    port: 5173,
    strictPort: true,
  },

  // Fix @react-pdf/renderer compatibility with Vite
  resolve: {
    alias: {
      'pako/lib/zlib/zstream.js': 'pako',
    },
  },

  // Xóa dist cũ trước build
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@react-pdf/renderer') || id.includes('@react-pdf/')) return 'pdf-renderer';
          if (id.includes('pdfjs-dist')) return 'pdf-worker';
          if (id.includes('node_modules/firebase/') || id.includes('@firebase/')) return 'firebase-sdk';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  optimizeDeps: {
    include: ['@react-pdf/renderer'],
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
});
