// Open WebUI Iframe Initialization Script
// This script handles authentication and configuration when Open WebUI runs in an iframe

(function() {
    // Check if running in iframe
    if (window.self !== window.top) {
        console.log('Open WebUI running in iframe mode');
        
        // Request token from parent window
        window.parent.postMessage({ type: 'REQUEST_TOKEN' }, '*');
        
        // Listen for token from parent
        window.addEventListener('message', function(event) {
            if (event.data.type === 'SET_TOKEN' && event.data.token) {
                console.log('Received authentication token from parent');
                
                // Set token in localStorage for Open WebUI
                localStorage.setItem('token', event.data.token);
                localStorage.setItem('openwebui_token', event.data.token);
                
                // Emit user-join event if needed
                if (window.socket) {
                    window.socket.emit('user-join', { token: event.data.token });
                }
                
                // Reload to apply authentication
                if (!localStorage.getItem('token_applied')) {
                    localStorage.setItem('token_applied', 'true');
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            }
        });
        
        // Override STT settings to prevent errors
        const defaultSTTSettings = {
            stt: {
                enabled: true,
                provider: 'browser',
                model: 'webkitSpeechRecognition'
            }
        };
        
        // Set default settings if not present
        if (!localStorage.getItem('settings')) {
            localStorage.setItem('settings', JSON.stringify(defaultSTTSettings));
        } else {
            try {
                const settings = JSON.parse(localStorage.getItem('settings'));
                if (!settings.stt) {
                    settings.stt = defaultSTTSettings.stt;
                    localStorage.setItem('settings', JSON.stringify(settings));
                }
            } catch (e) {
                console.error('Error parsing settings:', e);
                localStorage.setItem('settings', JSON.stringify(defaultSTTSettings));
            }
        }
        
        // Prevent navigation that would break iframe
        window.addEventListener('beforeunload', function(e) {
            // Allow navigation within the same origin
            return;
        });
    }
})();