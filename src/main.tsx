import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './site-theme/site-templates.css'
import './components/layout/public-shell.css'
import './site-theme/dashboard-templates.css'
import { TRPCProvider } from "@/providers/trpc"
import { CurrencyProvider } from "@/providers/CurrencyProvider"
import { LangProvider } from "@/hooks/useLang"
import { SiteBuilderProvider } from "@/site-builder/SiteBuilderProvider"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <TRPCProvider>
      <CurrencyProvider>
        <LangProvider>
          <SiteBuilderProvider>
            <App />
          </SiteBuilderProvider>
        </LangProvider>
      </CurrencyProvider>
    </TRPCProvider>
  </BrowserRouter>,
)
