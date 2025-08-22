import React, { useEffect, useRef, useState } from 'react';
import openWebUIAuth from '../../services/openWebUIAuth';
import './Terminal.css';

export default function Terminal() {
    const iframeRef = useRef(null);
    const [iframeUrl, setIframeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initialize iframe with proper authentication
        const initializeIframe = async () => {
            try {
                // Initialize authentication
                const authData = await openWebUIAuth.initializeAuth();
                
                if (authData) {
                    // Build iframe URL with auth parameters
                    const url = openWebUIAuth.buildIframeUrl(authData.token);
                    setIframeUrl(url);
                    
                    // Setup iframe load handler
                    if (iframeRef.current) {
                        iframeRef.current.onload = () => {
                            // Try to inject configuration
                            openWebUIAuth.injectConfig(iframeRef.current);
                            
                            // Send initial config via postMessage
                            setTimeout(() => {
                                if (iframeRef.current && iframeRef.current.contentWindow) {
                                    iframeRef.current.contentWindow.postMessage({
                                        type: 'INIT_WEBUI',
                                        token: authData.token,
                                        user: authData.user,
                                        config: authData.config
                                    }, openWebUIAuth.baseUrl);
                                }
                            }, 500);
                            
                            setIsLoading(false);
                        };
                    }
                } else {
                    // Fallback to direct URL
                    setIframeUrl('https://rxsprint-ai.ngrok.app?iframe=true&guestMode=true');
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error initializing iframe:', error);
                setIframeUrl('https://rxsprint-ai.ngrok.app?iframe=true&guestMode=true');
                setIsLoading(false);
            }
        };
        
        initializeIframe();
        
        // Setup message handler
        const cleanup = openWebUIAuth.setupMessageHandler(iframeRef.current);
        
        return cleanup;
    }, []);

    return (
        <div className="page-container terminal-page-container">
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#666',
                    fontSize: '18px'
                }}>
                    Loading Open WebUI...
                </div>
            )}
            {iframeUrl && (
                <iframe 
                    ref={iframeRef}
                    id="rxsprint-ai"
                    src={iframeUrl}
                    title="RX Sprint AI"
                    allow="microphone *; camera *; autoplay; clipboard-write; clipboard-read; fullscreen; display-capture; web-share; storage-access *"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                    className="rxsprint-iframe"
                    style={{ opacity: isLoading ? 0 : 1 }}
                />
            )}
        </div>
    );
}