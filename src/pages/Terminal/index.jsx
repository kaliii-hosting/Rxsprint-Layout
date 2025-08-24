import React from 'react';
import './Terminal.css';

export default function Terminal() {
    return (
        <div className="page-container terminal-page-container">
            <iframe 
                src="https://rxsprint-ai.ngrok.app"
                title="RX Sprint AI"
                className="rxsprint-iframe"
                allow="microphone; camera; clipboard-write; clipboard-read"
            />
        </div>
    );
}