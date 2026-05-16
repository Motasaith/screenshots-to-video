import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

import { ThemeProvider } from "@/components/ThemeProvider"
import { ScrollToTop } from "@/components/ScrollToTop"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <TRPCProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </TRPCProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
