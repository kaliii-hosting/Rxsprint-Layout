import React, { useState, useEffect } from 'react';
import './Terminal.css';

export default function Terminal() {
    const [status, setStatus] = useState('Connecting...');
    // Always use direct connection
    const directUrl = 'https://rxsprint-ai.ngrok.app';
    
    useEffect(() => {
        // Set proper viewport height for mobile
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', setViewportHeight);
        
        // Set status to ready when component mounts
        setStatus('Connected');
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', setViewportHeight);
            window.removeEventListener('orientationchange', setViewportHeight);
        };
    }, []);
    
    const handleIframeLoad = () => {
        console.log('Terminal loaded successfully');
        setStatus('Connected');
    };
    
    const handleIframeError = (e) => {
        console.error('Terminal error:', e);
        setStatus('Connection Error');
    };
    
    return (
        <div className="terminal-page-container">
            <div className="terminal-container">
                {/* Main iframe container - Direct connection only */}
                <div className="terminal-iframe-wrapper">
                    <iframe
                        src={directUrl}
                        title="RX Sprint AI Terminal"
                        className="terminal-iframe"
                        allow="microphone; camera; clipboard-write; clipboard-read; fullscreen; autoplay"
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                    />
                </div>
            </div>
        </div>
    );
}