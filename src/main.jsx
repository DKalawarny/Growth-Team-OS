import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initMonitoring } from './lib/monitoring'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

// HelmetProvider wraps the entire app so any <Helmet> in any page can update
// document <head> tags reactively. Required for per-page SEO meta + JSON-LD.
// See src/lib/seo.js for the canonical site config and helper builders.
// Before React mounts, so a crash during the first render is still reported.
initMonitoring()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
