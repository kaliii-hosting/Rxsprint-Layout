import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import PinLock from './components/PinLock/PinLock'
import ErrorBoundary from './components/ErrorBoundary'
import { CalculatorProvider } from './contexts/CalculatorContext'
import { SearchProvider } from './contexts/SearchContext'
import { ThemeProvider } from './contexts/ThemeContext'
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
import GPT from './pages/GPT'
import './App.css'

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false)

  const handleUnlock = () => {
    setIsUnlocked(true)
  }

  if (!isUnlocked) {
    return (
      <ThemeProvider>
        <PinLock onUnlock={handleUnlock} />
      </ThemeProvider>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CalculatorProvider>
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
                  <Route path="/bookmarks" element={<BookmarkManager />} />
                  <Route path="/gpt" element={<GPT />} />
                </Routes>
              </Layout>
            </SearchProvider>
          </BrowserRouter>
        </CalculatorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
