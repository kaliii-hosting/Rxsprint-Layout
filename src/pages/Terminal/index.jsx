import React, { useMemo } from 'react';
import './Terminal.css';

const Terminal = () => {
  const terminalURL = useMemo(() => {
    // Detect if we're on HTTPS or HTTP
    const isHTTPS = window.location.protocol === 'https:';
    
    // Set the appropriate terminal URL
    const terminalHost = '192.168.1.167';
    return isHTTPS 
      ? `https://${terminalHost}:8443` 
      : `http://${terminalHost}:8080`;
  }, []);

  return (
    <div className="page-container">
      <div className="terminal-page-wrapper">
        <h2>KALIII AI Terminal</h2>
        <div className="terminal-box">
          <div className="terminal-container">
            <iframe 
              src={terminalURL} 
              className="terminal-iframe"
              allow="clipboard-read; clipboard-write"
              title="KALIII AI Terminal"
              sandbox="allow-scripts allow-same-origin allow-forms"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;