import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Check if we're in dev mode (no Supabase) or prod mode
const isDev = !import.meta.env.VITE_SUPABASE_URL || 
              import.meta.env.VITE_SUPABASE_URL === 'https://your-project.supabase.co' ||
              import.meta.env.VITE_USE_DEV_MODE === 'true';

// Dynamically import the appropriate App component
const AppComponent = isDev 
  ? (await import('./App.dev.tsx')).default 
  : (await import('./App.tsx')).default;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppComponent />
  </StrictMode>,
)