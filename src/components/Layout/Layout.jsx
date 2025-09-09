import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Calculator, 
  Pill, 
  Calendar, 
  GitBranch,
  FileText,
  Package,
  Mic,
  User,
  Calculator as CalcIcon,
  ScanLine,
  Bookmark,
  Zap,
  Settings,
  Palette,
  Terminal,
  Brain,
  Clock,
  Phone
} from 'lucide-react';
import { useCalculator } from '../../contexts/CalculatorContext';
import { useSearch } from '../../contexts/SearchContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import VoiceTranscription from '../VoiceTranscription/VoiceTranscription';
import DigitalClock from '../DigitalClock/DigitalClock';
import './Layout.css';
import './TabletLayout.css';
import './LayoutMobileHeaderFix.css';

// Custom Speech Icon Component
const SpeechIcon = ({ size = 24 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="lucide lucide-speech-icon lucide-speech"
  >
    <path d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"/>
    <path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603"/>
    <path d="M17 15a3.5 3.5 0 0 0-.025-4.975"/>
  </svg>
);

// Custom Pump Icon Component
const PumpIcon = ({ size = 24 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="lucide lucide-keyboard-music-icon lucide-keyboard-music"
  >
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="M6 8h4"/>
    <path d="M14 8h.01"/>
    <path d="M18 8h.01"/>
    <path d="M2 12h20"/>
    <path d="M6 12v4"/>
    <path d="M10 12v4"/>
    <path d="M14 12v4"/>
    <path d="M18 12v4"/>
  </svg>
);

// Custom Notes Icon Component
const NotesIcon = ({ size = 24 }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="lucide lucide-notebook-pen-icon lucide-notebook-pen"
  >
    <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/>
    <path d="M2 6h4"/>
    <path d="M2 10h4"/>
    <path d="M2 14h4"/>
    <path d="M2 18h4"/>
    <path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>
  </svg>
);

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleCalculatorMode } = useCalculator();
  const { theme } = useTheme();
  const { lock } = useAuth();
  const [showVoiceTranscription, setShowVoiceTranscription] = useState(false);
  const [showDigitalClock, setShowDigitalClock] = useState(false);
  
  // Handle mobile viewport height
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);
  const { 
    searchQuery, 
    searchResults, 
    searchSuggestions,
    showDropdown, 
    showSuggestions,
    setShowDropdown,
    setShowSuggestions,
    performSearch, 
    navigateToMedication,
    clearSearch 
  } = useSearch();
  
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/calculator', icon: Calculator, label: 'Calculator' },
    { path: '/medications', icon: Pill, label: 'Medications' },
    { path: '/counsel', icon: SpeechIcon, label: 'Counsel' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/note-generator', icon: Zap, label: 'Note Generator' },
    { path: '/pump', icon: PumpIcon, label: 'Pump' },
    { path: '/supplies', icon: Package, label: 'Supplies' },
    { path: '/notes', icon: NotesIcon, label: 'Notes' },
    { path: '/analyzer', icon: ScanLine, label: 'Analyzer' },
    { path: '/phones', icon: Phone, label: 'Phones' },
    { path: '/bookmark-manager', icon: Bookmark, label: 'Bookmarks' },
    { path: '/board', icon: Palette, label: 'Board' }
  ];

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown, setShowSuggestions]);


  // Handle search input change
  const handleSearchChange = (e) => {
    performSearch(e.target.value);
    setSelectedIndex(-1);
  };

  // Handle search result click
  const handleResultClick = (item) => {
    navigateToMedication(item);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    performSearch(suggestion);
    setShowSuggestions(false);
  };

  // Handle keyboard navigation for both suggestions and results
  const handleKeyDown = (e) => {
    // Handle suggestions navigation
    if (showSuggestions && searchSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchSuggestions.length - 1 ? prev + 1 : 0
          );
          // Scroll to selected item
          setTimeout(() => {
            const selectedEl = document.querySelector('.suggestion-item.selected');
            if (selectedEl) {
              selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchSuggestions.length - 1
          );
          // Scroll to selected item
          setTimeout(() => {
            const selectedEl = document.querySelector('.suggestion-item.selected');
            if (selectedEl) {
              selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchSuggestions.length) {
            handleSuggestionClick(searchSuggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
      return;
    }

    // Handle search results navigation
    if (showDropdown && searchResults.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          // Scroll to selected item
          setTimeout(() => {
            const selectedEl = document.querySelector('.search-result-item.selected');
            if (selectedEl) {
              selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          // Scroll to selected item
          setTimeout(() => {
            const selectedEl = document.querySelector('.search-result-item.selected');
            if (selectedEl) {
              selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }, 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            handleResultClick(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowDropdown(false);
          setSelectedIndex(-1);
          break;
      }
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo" onClick={lock} style={{ cursor: 'pointer' }} title="Lock App">
          <img 
            src="https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png" 
            alt="RxSprint Logo" 
            className="logo-img"
          />
        </div>
        
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <Icon size={24} />
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="main-container">
        <header className="header">
          
          <div className="search-container" ref={searchRef}>
            <input
              type="text"
              placeholder="Search database"
              className="search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setShowDropdown(true)}
              onKeyDown={handleKeyDown}
            />
            
            {/* Search Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="search-suggestions" ref={dropdownRef}>
                <div className="suggestions-header">
                  <h3 className="suggestions-title">Suggestions</h3>
                </div>
                <div className="suggestions-content">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <span className="suggestion-text">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Search Results */}
            {showDropdown && searchResults.length > 0 && !showSuggestions && (
              <>
                <div 
                  className="search-dropdown-backdrop" 
                  onClick={() => setShowDropdown(false)}
                />
                <div className="search-dropdown" ref={dropdownRef}>
                  <div className="search-dropdown-header">
                    <h3 className="search-dropdown-title">Search Results</h3>
                  </div>
                  <div className="search-dropdown-content">
                    {searchResults.map((item, index) => (
                      <div
                        key={item.id}
                        className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                        onClick={() => handleResultClick(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="result-icon">
                          💊
                        </div>
                        <div className="result-content">
                          <h4 className="result-title">
                            {item.displayName || item.drug || item.brandName || item.genericName || 'Medication'}
                          </h4>
                          <p className="result-subtitle">
                            {item.resultType === 'scdMedication' ? (item.generic || 'SCD Medication') :
                             item.resultType === 'haeMedication' ? (item.brand || 'HAE Medication') :
                             (item.genericName || 'Lyso Medication')}
                          </p>
                        </div>
                        <div className="result-category">
                          {item.resultType === 'scdMedication' ? 'SCD' : 
                           item.resultType === 'haeMedication' ? 'HAE' : 'LYSO'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="header-actions">
            
            {/* Digital Clock Button */}
            <button 
              className="icon-button" 
              title="Digital Clock"
              onClick={() => setShowDigitalClock(true)}
            >
              <Clock size={20} />
            </button>
            
            {/* AI Terminal Button */}
            <button 
              className="icon-button" 
              title="AI Terminal"
              onClick={() => navigate('/terminal')}
            >
              <Brain size={20} />
            </button>
            
            <button 
              className="icon-button" 
              title="Voice Assistant"
              onClick={() => setShowVoiceTranscription(true)}
            >
              <Mic size={20} />
            </button>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </div>
      
      {/* Voice Transcription Modal */}
      <VoiceTranscription 
        isOpen={showVoiceTranscription}
        onClose={() => setShowVoiceTranscription(false)}
      />
      
      {/* Digital Clock Modal */}
      <DigitalClock
        isOpen={showDigitalClock}
        onClose={() => setShowDigitalClock(false)}
      />
    </div>
  );
};

export default Layout;