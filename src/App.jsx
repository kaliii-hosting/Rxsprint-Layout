import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import PinLock from './components/PinLock/PinLock'
import ErrorBoundary from './components/ErrorBoundary'
import { CalculatorProvider } from './contexts/CalculatorContext'
import { SearchProvider } from './contexts/SearchContext'
import Home from './pages/Home'
import Calculator from './pages/Calculator'
import Medications from './pages/Medications'
import Calendar from './pages/Calendar'
import Chat from './pages/Chat'
import Workflow from './pages/Workflow'
import NoteGenerator from './pages/NoteGenerator'
import Pump from './pages/Pump'
import Supplies from './pages/Supplies'
import Notes from './pages/Notes'
import './App.css'

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false)

  const handleUnlock = () => {
    setIsUnlocked(true)
  }

  if (!isUnlocked) {
    return <PinLock onUnlock={handleUnlock} />
  }

  return (
    <ErrorBoundary>
      <CalculatorProvider>
        <BrowserRouter>
          <SearchProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/medications" element={<Medications />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/workflow" element={<Workflow />} />
                <Route path="/note-generator" element={<NoteGenerator />} />
                <Route path="/pump" element={<Pump />} />
                <Route path="/supplies" element={<Supplies />} />
                <Route path="/notes" element={<Notes />} />
              </Routes>
            </Layout>
          </SearchProvider>
        </BrowserRouter>
      </CalculatorProvider>
    </ErrorBoundary>
  )
}

export default App
