import React from 'react';
import './Terminal.css';

export default function Terminal() {
    return (
        <div className="page-container terminal-page-container">
            <iframe 
                id="rxsprint-ai"
                src="https://rxsprint-ai.ngrok.app"
                title="RX Sprint AI"
                allow="microphone *; camera *; autoplay; clipboard-write; clipboard-read; fullscreen"
                className="rxsprint-iframe"
            />
        </div>
    );
}