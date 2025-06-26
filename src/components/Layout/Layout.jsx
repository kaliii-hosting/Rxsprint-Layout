import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calculator, 
  Pill, 
  Calendar, 
  MessageSquare, 
  GitBranch,
  FileText,
  Package,
  Mic,
  User,
  Calculator as CalcIcon,
  StickyNote,
  ScanLine,
  Sun,
  Moon,
  Bookmark
} from 'lucide-react';
import { useCalculator } from '../../contexts/CalculatorContext';
import { useSearch } from '../../contexts/SearchContext';
import { useTheme } from '../../contexts/ThemeContext';
import VoiceTranscription from '../VoiceTranscription/VoiceTranscription';
import CurlinPumpIcon from '../icons/CurlinPumpIcon';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const { toggleCalculatorMode } = useCalculator();
  const { theme, toggleTheme } = useTheme();
  const [showVoiceTranscription, setShowVoiceTranscription] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { 
    searchQuery, 
    searchResults, 
    showDropdown, 
    setShowDropdown,
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
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/workflow', icon: GitBranch, label: 'Workflow' },
    { path: '/note-generator', icon: FileText, label: 'Note Generator' },
    { path: '/pump', icon: CurlinPumpIcon, label: 'Pump' },
    { path: '/supplies', icon: Package, label: 'Supplies' },
    { path: '/notes', icon: StickyNote, label: 'Notes' },
    { path: '/analyzer', icon: ScanLine, label: 'Analyzer' },
    { path: '/bookmarks', icon: Bookmark, label: 'Bookmarks' }
  ];

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown]);

  // Handle search input change
  const handleSearchChange = (e) => {
    performSearch(e.target.value);
    setSelectedIndex(-1);
  };

  // Handle search result click
  const handleResultClick = (item) => {
    navigateToMedication(item);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
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
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <img 
            src="https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//Rxsprint%20logo.png" 
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
            
            {showDropdown && searchResults.length > 0 && (
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
                          {item.resultType === 'bookmark' ? '🔖' : '💊'}
                        </div>
                        <div className="result-content">
                          <h4 className="result-title">
                            {item.resultType === 'bookmark' ? item.title : item.brandName}
                          </h4>
                          {item.resultType === 'bookmark' && item.url ? (
                            <p className="result-subtitle">{item.url}</p>
                          ) : item.genericName ? (
                            <p className="result-subtitle">{item.genericName}</p>
                          ) : null}
                        </div>
                        <div className="result-category">
                          {item.resultType === 'bookmark' ? 'Bookmark' : 'Medication'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="header-actions">
            {location.pathname === '/calculator' && (
              <button className="icon-button" title="Toggle Calculator Mode" onClick={toggleCalculatorMode}>
                <CalcIcon size={20} />
              </button>
            )}
            <button 
              className="icon-button" 
              title="Voice Assistant"
              onClick={() => setShowVoiceTranscription(true)}
            >
              <Mic size={20} />
            </button>
            <button 
              className="icon-button theme-toggle" 
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
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
    </div>
  );
};

export default Layout;