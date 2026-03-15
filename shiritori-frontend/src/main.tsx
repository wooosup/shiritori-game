import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './index.css';
import App from './App.tsx';
import AppErrorBoundary from './components/AppErrorBoundary.tsx';
import { initTelemetry, trackEvent } from './lib/telemetry.ts';
import { getRuntimePlatform } from './platform/runtime.ts';

void initTelemetry();
trackEvent('app_started', { platform: getRuntimePlatform() });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
