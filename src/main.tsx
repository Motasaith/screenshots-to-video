import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

import { ScrollToTop } from "@/components/ScrollToTop"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { initTheme } from "@/hooks/useTheme"

// The theme is resolved before the first paint rather than in an effect. An
// effect runs after React has already painted, so somebody on dark mode would
// see a white flash on every load - which reads as a bug, not as a delay.
initTheme()

// Opts the page into entrance animations. Everything with a `reveal` class is
// hidden only while this class is present, so if this script never runs the
// content is visible rather than stuck at opacity zero. Set before render so
// it is in place for the first paint and nothing flashes in.
document.documentElement.classList.add('reveal-ready')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ScrollToTop />
          <TRPCProvider>
            <App />
            <Toaster />
          </TRPCProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
)
