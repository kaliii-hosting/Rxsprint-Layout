import React from 'react';

export default function Terminal() {
    return (
        <iframe 
            src="https://rxsprint-ai.ngrok.app"
            style={{
                width: '100vw',
                height: '100vh',
                border: 'none',
                display: 'block',
                margin: 0,
                padding: 0
            }}
            title="KALIII Terminal"
        />
    );
}