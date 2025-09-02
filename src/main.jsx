import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/ExcelTables.css' // Global Excel table styles
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { setupNetworkLogging } from './utils/networkLogger.js'

// Enable network logging to debug 500 errors
setupNetworkLogging();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
