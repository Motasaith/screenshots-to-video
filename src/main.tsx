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

// No theme is applied here. Dark mode belongs to the editor and is switched on
// by the editor while it is mounted (see useEditorTheme); setting it globally at
// start-up turned the marketing pages and the dashboard dark too, which they
// have no styling for.

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
