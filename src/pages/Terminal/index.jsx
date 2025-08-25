import React from 'react';
import './Terminal.css';

export default function Terminal() {
    // Use Netlify Function in production, local proxy in development
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const proxyUrl = isProduction 
        ? '/.netlify/functions/tunnel-proxy'
        : `${window.location.protocol}//${window.location.hostname}:3001/api/tunnel`;
    
    return (
        <div className="page-container terminal-page-container">
            <iframe 
                src={proxyUrl}
                title="RX Sprint AI"
                className="rxsprint-iframe"
                allow="microphone; camera; clipboard-write; clipboard-read; fullscreen"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
            />
        </div>
    );
}