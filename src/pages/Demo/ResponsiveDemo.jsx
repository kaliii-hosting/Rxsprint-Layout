import React, { useState } from 'react';
import { 
  FileText, 
  Save, 
  Download, 
  Share2, 
  Settings, 
  Trash2,
  Edit,
  Copy,
  Archive,
  RefreshCw
} from 'lucide-react';
import EnterpriseHeader, { 
  TabGroup, 
  TabButton, 
  HeaderDivider, 
  ActionGroup, 
  ActionButton 
} from '../../components/EnterpriseHeader/EnterpriseHeader';

const ResponsiveDemo = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [responsiveEnabled, setResponsiveEnabled] = useState(true);

  return (
    <div className="responsive-demo-page" style={{ padding: '1rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Responsive Page Settings Demo</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={responsiveEnabled}
            onChange={(e) => setResponsiveEnabled(e.target.checked)}
          />
          <span>Enable Responsive Mode (resize window or zoom to test)</span>
        </label>
      </div>

      <EnterpriseHeader 
        className="demo-header"
        responsive={responsiveEnabled}
        responsiveBreakpoint={968}
        settingsPosition="bottom-center"
      >
        <TabGroup>
          <TabButton 
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={FileText}
          >
            Overview
          </TabButton>
          <TabButton 
            active={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            icon={Settings}
            badge="3"
          >
            Details
          </TabButton>
          <TabButton 
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            icon={Archive}
          >
            History
          </TabButton>
        </TabGroup>
        
        <HeaderDivider />
        
        <ActionGroup>
          <ActionButton 
            onClick={() => alert('Edit clicked')}
            icon={Edit}
          >
            Edit
          </ActionButton>
          <ActionButton 
            onClick={() => alert('Copy clicked')}
            icon={Copy}
          >
            Copy
          </ActionButton>
          <ActionButton 
            onClick={() => alert('Save clicked')}
            icon={Save}
            primary
          >
            Save
          </ActionButton>
          <ActionButton 
            onClick={() => alert('Download clicked')}
            icon={Download}
          >
            Download
          </ActionButton>
          <ActionButton 
            onClick={() => alert('Share clicked')}
            icon={Share2}
          >
            Share
          </ActionButton>
          <ActionButton 
            onClick={() => alert('Refresh clicked')}
            icon={RefreshCw}
            secondary
          >
            Refresh
          </ActionButton>
          <ActionButton 
            onClick={() => alert('Delete clicked')}
            icon={Trash2}
            secondary
          >
            Delete
          </ActionButton>
        </ActionGroup>
      </EnterpriseHeader>

      <div style={{ 
        marginTop: '2rem', 
        padding: '2rem', 
        background: 'var(--card-background, #f6f8fa)', 
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e1e4e8)'
      }}>
        <h2>Content Area - {activeTab}</h2>
        <p>This is the main content area that remains below the responsive header.</p>
        <p>Try these actions to test the responsive settings dropdown:</p>
        <ul>
          <li>Resize your browser window to less than 968px width</li>
          <li>Use browser zoom (Ctrl/Cmd + Plus) to zoom in past 125%</li>
          <li>Test on a tablet or mobile device</li>
          <li>Toggle the "Enable Responsive Mode" checkbox above</li>
        </ul>
        <p>
          When the responsive mode is triggered, all toolbar buttons will be consolidated
          into a clean dropdown menu accessed via the "Page Settings" button.
        </p>
      </div>
    </div>
  );
};

export default ResponsiveDemo;