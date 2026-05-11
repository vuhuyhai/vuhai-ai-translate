import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_PDFMONKEY_API_KEY) {
    console.warn('[PDF] VITE_PDFMONKEY_API_KEY ch\u01B0a set \u2014 s\u1EBD d\u00F9ng @react-pdf fallback')
  }
  if (!import.meta.env.VITE_PDFMONKEY_TEMPLATE_ID) {
    console.warn('[PDF] VITE_PDFMONKEY_TEMPLATE_ID ch\u01B0a set')
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
