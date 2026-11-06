import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import './app/theme/tokens.css';

if (window.localStorage.getItem('mui-mode') === 'system') {
  window.localStorage.setItem('mui-mode', 'light');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
