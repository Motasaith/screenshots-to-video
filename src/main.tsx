import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MotionConfig } from 'framer-motion'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

import { ThemeProvider } from "@/components/ThemeProvider"
import { ScrollToTop } from "@/components/ScrollToTop"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/ErrorBoundary"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* `reducedMotion="user"` makes every framer-motion animation in the app
          honour the OS setting. CSS alone cannot do this: framer-motion drives
          inline styles from JS, so a prefers-reduced-motion media query never
          sees those animations. Transform and layout movement is dropped while
          opacity fades are kept, so nothing becomes invisible. */}
      <MotionConfig reducedMotion="user">
        <HelmetProvider>
          <BrowserRouter>
            <ScrollToTop />
            <TRPCProvider>
              <ThemeProvider>
                <App />
                <Toaster />
              </ThemeProvider>
            </TRPCProvider>
          </BrowserRouter>
        </HelmetProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
)
