import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'

// Placeholder until slice 2 adds the File stage.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>Rollcheck — engine in progress.</main>
  </StrictMode>,
)
