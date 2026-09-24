import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css'
import App from './App'
import { registerServiceWorker, unregisterServiceWorker } from './utils/serviceWorkerRegister'

const basename = window.location.pathname.includes('/josephus/st.joseph/public')
  ? '/josephus/st.joseph/public'
  : window.location.pathname.includes('/josephus/st.joseph')
  ? '/josephus/st.joseph'
  : '/';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router basename={basename}>
      <App />
    </Router>
  </StrictMode>,
)

// Register service worker only in production builds.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerServiceWorker()
  } else {
    unregisterServiceWorker()
  }
}
