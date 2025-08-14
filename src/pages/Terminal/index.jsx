import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';

// Terminal component with auto-focus and custom styling
export default function Terminal() {
    const [isOffline, setIsOffline] = useState(false);
    const [checkingConnection, setCheckingConnection] = useState(true);
    const [timestamp] = useState(Date.now());
    const iframeRef = useRef(null);
    
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch('https://rxsprint-ai.ngrok.app', {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                setIsOffline(false);
            } catch (error) {
                console.log('Terminal server not reachable');
                setIsOffline(true);
            } finally {
                setCheckingConnection(false);
            }
        };
        
        checkConnection();
        const interval = setInterval(checkConnection, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // Auto-focus iframe when component mounts and when clicked
    useEffect(() => {
        const focusIframe = () => {
            if (iframeRef.current && !isOffline) {
                try {
                    iframeRef.current.focus();
                    // Try to focus the iframe content window
                    if (iframeRef.current.contentWindow) {
                        iframeRef.current.contentWindow.focus();
                    }
                } catch (error) {
                    // Cross-origin restrictions may prevent this
                    console.log('Auto-focus limited by cross-origin policy');
                }
            }
        };

        // Focus after a short delay to ensure iframe is loaded
        const focusTimer = setTimeout(focusIframe, 1000);
        
        // Add click listener to page to focus iframe
        const handlePageClick = () => {
            focusIframe();
        };
        
        document.addEventListener('click', handlePageClick);
        
        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('click', handlePageClick);
        };
    }, [isOffline]);
    
    return (
        <div className="terminal-page-wrapper">
            {isOffline && (
                <div className="offline-overlay">
                    <div className="offline-popup">
                        <div className="offline-icon">⚠️</div>
                        <h2>Server Temporarily Offline</h2>
                        <p>The terminal server will be back online shortly.</p>
                        <p>Our admin team is aware of the downtime and working to restore service.</p>
                        <div className="offline-spinner"></div>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="offline-retry-btn"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            )}
            
            <div className="terminal-container-box">
                <iframe 
                    ref={iframeRef}
                    src={`https://rxsprint-ai.ngrok.app?t=${timestamp}&focus=1`}
                    title="KALIII AI Custom Launcher Terminal"
                    className="custom-launcher-iframe"
                    allowFullScreen
                    tabIndex="0"
                    allow="clipboard-read; clipboard-write; fullscreen"
                />
            </div>
        </div>
    );
}