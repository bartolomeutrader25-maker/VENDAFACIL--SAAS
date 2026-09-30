import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { FirebaseStartupGate } from './components/FirebaseStartupGate.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Workbox Service Worker for offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onOfflineReady() {
        console.log('[PWA] VendaFácil está pronta para operações offline com Workbox.');
      },
      onNeedRefresh() {
        console.log('[PWA] Nova versão disponível.');
      },
    });
  } catch (e) {
    // Graceful fallback in development or restricted iframe
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseStartupGate>
      <App />
    </FirebaseStartupGate>
  </StrictMode>,
);

