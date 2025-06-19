import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calculator, 
  Pill, 
  Calendar, 
  MessageSquare, 
  GitBranch,
  FileText,
  Droplet,
  Package,
  Search,
  Mic,
  User,
  Calculator as CalcIcon
} from 'lucide-react';
import { useCalculator } from '../../contexts/CalculatorContext';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const { toggleCalculatorMode } = useCalculator();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/calculator', icon: Calculator, label: 'Calculator' },
    { path: '/medications', icon: Pill, label: 'Medications' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/workflow', icon: GitBranch, label: 'Workflow' },
    { path: '/note-generator', icon: FileText, label: 'Note Generator' },
    { path: '/pump', icon: Droplet, label: 'Pump' },
    { path: '/supplies', icon: Package, label: 'Supplies' }
  ];

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
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Type to search"
              className="search-input"
            />
          </div>
          
          <div className="header-actions">
            {location.pathname === '/calculator' && (
              <button className="icon-button" title="Toggle Calculator Mode" onClick={toggleCalculatorMode}>
                <CalcIcon size={20} />
              </button>
            )}
            <button className="icon-button" title="Voice Assistant">
              <Mic size={20} />
            </button>
            <button className="icon-button" title="Profile">
              <User size={20} />
            </button>
          </div>
        </header>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;