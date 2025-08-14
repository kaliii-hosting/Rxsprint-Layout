import React, { useEffect, useState } from 'react';

const Terminal = () => {
  const [isHTTPS, setIsHTTPS] = useState(false);

  useEffect(() => {
    // Check protocol
    const currentProtocol = window.location.protocol;
    setIsHTTPS(currentProtocol === 'https:');
    
    // Force HTTP for terminal page only
    if (currentProtocol === 'https:') {
      window.location.protocol = 'http:';
    }
  }, []);

  // If still on HTTPS (before redirect), show message
  if (isHTTPS) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)', background: '#0a0a0a' }}>
        <h1 style={{ color: '#ff8800', marginBottom: '20px' }}>Redirecting to HTTP...</h1>
        <p style={{ color: '#fff', marginBottom: '30px' }}>Terminal requires HTTP for iframe compatibility</p>
      </div>
    );
  }

  // HTTP version - show iframe
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', background: '#0a0a0a' }}>
      <iframe 
        src="http://172.20.246.72:8080"
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="clipboard-read; clipboard-write; camera; microphone"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        title="KALIII Terminal">
      </iframe>
    </div>
  );
};

export default Terminal;