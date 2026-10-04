import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App.tsx';
import { AppStateProvider } from './app/AppState.tsx';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Локальные материалы открываем синхронно, сохраняя порядок навигации и фокуса. */}
    <BrowserRouter useTransitions={false}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>,
);
