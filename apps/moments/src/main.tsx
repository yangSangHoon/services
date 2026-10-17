import '@lab/core/motion.css';
import { track } from '@lab/core/track';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

track('moments');

// 홈 화면 설치 + 오프라인 실행 + 안드로이드 공유 시트(share_target)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => undefined);
}
