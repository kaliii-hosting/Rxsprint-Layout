import React from 'react';
import './Terminal.css';

export default function Terminal() {
    return (
        <div className="page-container terminal-page-container">
            <iframe 
                src="https://rxsprint-ai.ngrok.app"
                title="RX Sprint AI"
                style={{ width: '100%', height: '100vh', border: 'none' }}
                allow="microphone; camera; clipboard-write; clipboard-read"
            />
        </div>
    );
}