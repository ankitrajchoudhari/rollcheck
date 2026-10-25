import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { applyTheme, readTheme } from './ui/shell/Shell'

applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
