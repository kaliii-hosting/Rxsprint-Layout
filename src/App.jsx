import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout/Layout'
import PinLock from './components/PinLock/PinLock'
import ErrorBoundary from './components/ErrorBoundary'
import { CalculatorProvider } from './contexts/CalculatorContext'
import { SearchProvider } from './contexts/SearchContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { MedicationProvider } from './contexts/MedicationContext'
import MedicationChatbot from './components/MedicationChatbot/MedicationChatbot'
import Home from './pages/Home'
import Calculator from './pages/Calculator'
import Medications from './pages/Medications'
import Calendar from './pages/Calendar'
import Workflow from './pages/Workflow'
import NoteGenerator from './pages/NoteGenerator'
import Pump from './pages/Pump'
import Shop from './pages/Shop'
import Supplies from './pages/Supplies'
import Notes from './pages/Notes'
import Analyzer from './pages/Analyzer'
import BookmarkManager from './pages/BookmarkManager'
import Board from './pages/Board'
import Terminal from './pages/Terminal'
import './App.css'

function AppContent() {
  const { isUnlocked, unlock } = useAuth()

  useEffect(() => {
    // Global HTTPS redirect protection - exclude /terminal route
    if (window.location.pathname !== '/terminal' && window.location.protocol === 'http:') {
      // Uncomment the line below if you want to enforce HTTPS for all pages except terminal
      // window.location.protocol = 'https:';
    }
  }, []);

  if (!isUnlocked) {
    return <PinLock onUnlock={unlock} />
  }

  return (
    <ErrorBoundary>
      <CalculatorProvider>
        <MedicationProvider>
          <BrowserRouter>
            <SearchProvider>
              <Layout>
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/medications" element={<Medications />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/workflow" element={<Workflow />} />
                <Route path="/note-generator" element={<NoteGenerator />} />
                <Route path="/pump" element={<Pump />} />
                <Route path="/supplies" element={<Supplies />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/analyzer" element={<Analyzer />} />
                <Route path="/bookmark-manager" element={<BookmarkManager />} />
                <Route path="/board" element={<Board />} />
                <Route path="/terminal" element={<Terminal />} />
              </Routes>
            </Layout>
            <MedicationChatbot />
          </SearchProvider>
        </BrowserRouter>
      </MedicationProvider>
    </CalculatorProvider>
  </ErrorBoundary>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
