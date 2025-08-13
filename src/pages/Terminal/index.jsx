import React from 'react';
import './Terminal.css';

const Terminal = () => {
  return (
    <div className="terminal-container">
      <iframe 
        src="http://192.168.1.167:8080" 
        className="terminal-iframe"
        allow="clipboard-read; clipboard-write"
        title="Terminal"
      />
    </div>
  );
};

export default Terminal;