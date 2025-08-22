// Open WebUI Authentication Service
// Handles authentication and configuration for embedded Open WebUI

class OpenWebUIAuthService {
    constructor() {
        this.baseUrl = 'https://rxsprint-ai.ngrok.app';
        this.isAuthenticated = false;
        this.config = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            auth: {
                mode: 'embedded',
                autoLogin: true,
                skipAuth: true,
                anonymousAccess: true
            },
            stt: {
                enabled: true,
                provider: 'webkitSpeechRecognition',
                engine: 'browser',
                continuous: true,
                interimResults: true
            },
            tts: {
                enabled: true,
                provider: 'browser',
                engine: 'speechSynthesis',
                voice: 'default',
                rate: 1.0,
                pitch: 1.0
            },
            ui: {
                hideNavigation: true,
                embedded: true,
                hideSettings: false,
                autoFocus: true
            },
            features: {
                voice: true,
                camera: true,
                fileUpload: true,
                codeExecution: false
            }
        };
    }

    // Generate a guest token for anonymous access
    generateGuestToken() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `guest_${timestamp}_${random}`;
    }

    // Initialize authentication for iframe
    async initializeAuth() {
        try {
            // Check for existing token
            let token = localStorage.getItem('openwebui_token');
            
            if (!token) {
                // Generate guest token
                token = this.generateGuestToken();
                localStorage.setItem('openwebui_token', token);
            }

            // Store user info
            const userInfo = {
                id: token,
                name: 'RX Sprint User',
                email: 'user@rxsprint.local',
                role: 'user',
                profile_image_url: null
            };

            localStorage.setItem('openwebui_user', JSON.stringify(userInfo));
            
            // Store config
            localStorage.setItem('openwebui_config', JSON.stringify(this.config));
            
            this.isAuthenticated = true;
            return { token, user: userInfo, config: this.config };
        } catch (error) {
            console.error('Failed to initialize Open WebUI auth:', error);
            return null;
        }
    }

    // Build iframe URL with auth parameters
    buildIframeUrl(token) {
        const params = new URLSearchParams({
            iframe: 'true',
            embedded: 'true',
            hideNav: 'true',
            autoAuth: 'true',
            skipLogin: 'true',
            guestMode: 'true',
            token: token
        });

        // Add config as base64 encoded parameter
        const configStr = btoa(JSON.stringify(this.config));
        params.append('config', configStr);

        return `${this.baseUrl}?${params.toString()}`;
    }

    // Handle postMessage communication
    setupMessageHandler(iframe) {
        const messageHandler = (event) => {
            if (event.origin !== this.baseUrl) return;

            // Handle different message types
            switch(event.data.type) {
                case 'AUTH_REQUIRED':
                case 'REQUEST_TOKEN':
                    this.sendAuthResponse(event.source, event.origin);
                    break;
                    
                case 'REQUEST_CONFIG':
                    this.sendConfigResponse(event.source, event.origin);
                    break;
                    
                case 'STT_ERROR':
                    this.handleSTTError(event.source, event.origin);
                    break;
                    
                default:
                    console.log('Unknown message type:', event.data.type);
            }
        };

        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }

    // Send authentication response
    sendAuthResponse(target, origin) {
        const token = localStorage.getItem('openwebui_token') || this.generateGuestToken();
        const user = JSON.parse(localStorage.getItem('openwebui_user') || '{}');
        
        target.postMessage({
            type: 'AUTH_RESPONSE',
            token: token,
            user: user,
            config: this.config
        }, origin);
    }

    // Send configuration response
    sendConfigResponse(target, origin) {
        target.postMessage({
            type: 'CONFIG_RESPONSE',
            config: this.config
        }, origin);
    }

    // Handle STT errors
    handleSTTError(target, origin) {
        // Send fallback STT configuration
        target.postMessage({
            type: 'STT_CONFIG',
            stt: {
                enabled: false, // Disable if causing errors
                provider: 'none',
                fallback: true
            }
        }, origin);
    }

    // Inject configuration directly into iframe after load
    injectConfig(iframe) {
        try {
            const iframeWindow = iframe.contentWindow;
            const iframeDocument = iframe.contentDocument || iframeWindow.document;
            
            // Create script to inject config
            const script = iframeDocument.createElement('script');
            script.textContent = `
                // Injected Open WebUI Configuration
                (function() {
                    // Override localStorage to provide default values
                    const originalGetItem = localStorage.getItem;
                    localStorage.getItem = function(key) {
                        if (key === 'token' && !originalGetItem.call(this, key)) {
                            return '${this.generateGuestToken()}';
                        }
                        if (key === 'settings' && !originalGetItem.call(this, key)) {
                            return '${JSON.stringify(this.config)}';
                        }
                        return originalGetItem.call(this, key);
                    };
                    
                    // Set default settings
                    if (!localStorage.getItem('settings')) {
                        localStorage.setItem('settings', '${JSON.stringify(this.config)}');
                    }
                    
                    // Emit user-join event if socket exists
                    if (window.socket) {
                        window.socket.emit('user-join', { 
                            token: localStorage.getItem('token'),
                            user: { id: 'guest', name: 'RX Sprint User' }
                        });
                    }
                    
                    console.log('Open WebUI configuration injected');
                })();
            `;
            
            iframeDocument.head.appendChild(script);
        } catch (error) {
            // Cross-origin restriction, fall back to postMessage
            console.log('Cannot inject script due to cross-origin policy');
        }
    }
}

export default new OpenWebUIAuthService();