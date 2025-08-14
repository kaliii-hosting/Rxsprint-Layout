import React from 'react';
import './Terminal.css';

export default function Terminal() {
    return (
        <div className="terminal-page-container">
            <iframe 
                src="https://rxsprint-ai.ngrok.app"
                className="terminal-iframe"
                title="KALIII Terminal"
                frameBorder="0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                loading="eager"
            />
        </div>
    );
}