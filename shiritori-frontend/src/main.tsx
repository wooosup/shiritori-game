import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.DEV) {
  console.log('API URL:', import.meta.env.VITE_API_URL);
  console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);
}
