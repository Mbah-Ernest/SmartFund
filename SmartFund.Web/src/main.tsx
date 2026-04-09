/// <reference path="./shims-react-router-dom.d.ts" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { PrivacyProvider } from '@/contexts/PrivacyContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <PrivacyProvider>
          <App />
          <Toaster />
        </PrivacyProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
