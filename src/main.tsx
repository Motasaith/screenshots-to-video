import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

import { ThemeProvider } from "@/components/ThemeProvider"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
