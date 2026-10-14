import { track } from '@lab/core/track';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@lab/core/motion.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

track('davinci');
