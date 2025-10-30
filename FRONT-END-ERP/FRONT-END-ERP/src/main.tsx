import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Service Worker temporairement désactivé pour éviter les erreurs MIME type
// if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
//   const registerServiceWorker = async () => {
//     try {
//       const existing = await navigator.serviceWorker.getRegistration('/');
//       if (existing) {
//         void existing.update();
//         return existing;
//       }
//       return await navigator.serviceWorker.register('/mobile-service-worker.js', { scope: '/' });
//     } catch (error) {
//       console.warn('[Wash&Go] Échec de l\'enregistrement du service worker mobile', error);
//       return null;
//     }
//   };

//   void registerServiceWorker();
// }

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
