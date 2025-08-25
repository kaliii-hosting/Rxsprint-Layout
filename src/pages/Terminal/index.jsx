import React, { useState, useEffect } from 'react';
import './Terminal.css';

export default function Terminal() {
    const [status, setStatus] = useState('Initializing...');
    const [connectionType, setConnectionType] = useState('auto');
    const [currentUrl, setCurrentUrl] = useState('');
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    
    // Different connection methods in order of reliability for corporate networks
    const connections = {
        'ws-tunnel': {
            name: 'WebSocket Tunnel',
            url: '/.netlify/functions/ws-tunnel',
            description: 'Uses WebSocket protocol which typically passes through firewalls'
        },
        'proxy': {
            name: 'Standard Proxy',
            url: '/.netlify/functions/terminal-proxy',
            description: 'Standard HTTP proxy through Netlify'
        },
        'direct': {
            name: 'Direct',
            url: 'https://rxsprint-ai.ngrok.app',
            description: 'Direct to ngrok (may be blocked by Zscaler)'
        }
    };
    
    useEffect(() => {
        // Set proper viewport height for mobile
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', setViewportHeight);
        
        // Detect best connection method
        const detectConnection = async () => {
            const isLocal = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
            
            if (isLocal) {
                // Use direct connection for local development
                setConnectionType('direct');
                setCurrentUrl(connections.direct.url);
                setStatus('Ready (Local)');
            } else {
                // For production, try WebSocket tunnel first
                setConnectionType('ws-tunnel');
                setCurrentUrl(connections['ws-tunnel'].url);
                setStatus('Ready');
                
                // Test if the connection works
                try {
                    const response = await fetch(connections['ws-tunnel'].url, { 
                        method: 'HEAD',
                        mode: 'no-cors' 
                    });
                    console.log('WebSocket tunnel available');
                } catch (e) {
                    console.log('WebSocket tunnel failed, falling back to standard proxy');
                    setConnectionType('proxy');
                    setCurrentUrl(connections.proxy.url);
                }
            }
        };
        
        detectConnection();
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', setViewportHeight);
            window.removeEventListener('orientationchange', setViewportHeight);
        };
    }, []);
    
    const handleConnectionChange = (type) => {
        setConnectionType(type);
        setCurrentUrl(connections[type].url);
        setStatus(`Switching to ${connections[type].name}...`);
    };
    
    const handleIframeLoad = () => {
        console.log(`Terminal loaded successfully using ${connectionType}`);
        setStatus(`Connected`);
    };
    
    const handleIframeError = (e) => {
        console.error(`Terminal error with ${connectionType}:`, e);
        setStatus(`Error - Try different connection`);
    };
    
    // Force refresh iframe
    const refreshIframe = () => {
        const timestamp = new Date().getTime();
        setCurrentUrl(`${connections[connectionType].url}?t=${timestamp}`);
        setStatus('Refreshing...');
    };
    
    const toggleControls = () => {
        setIsControlsVisible(!isControlsVisible);
    };
    
    return (
        <div className="page-container terminal-page-container">
            <div className="terminal-container">
            {/* Collapsible control bar */}
            <div className={`terminal-controls ${isControlsVisible ? '' : 'collapsed'}`}>
                <div className="controls-header">
                    <div className="status-info">
                        <span className="status-label">Status:</span>
                        <span className="status-value">{status}</span>
                    </div>
                    <div className="control-buttons">
                        <button 
                            onClick={refreshIframe}
                            className="control-btn refresh-btn"
                            title="Refresh Connection"
                        >
                            ↻
                        </button>
                        <button 
                            onClick={toggleControls}
                            className="control-btn toggle-btn"
                            title={isControlsVisible ? 'Hide Controls' : 'Show Controls'}
                        >
                            {isControlsVisible ? '▲' : '▼'}
                        </button>
                    </div>
                </div>
                
                {isControlsVisible && (
                    <div className="connection-methods">
                        {Object.entries(connections).map(([key, conn]) => (
                            <button
                                key={key}
                                onClick={() => handleConnectionChange(key)}
                                className={`connection-btn ${connectionType === key ? 'active' : ''}`}
                                title={conn.description}
                            >
                                {conn.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Main iframe container */}
            <div className="terminal-iframe-wrapper">
                <iframe
                    key={currentUrl}
                    src={currentUrl}
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