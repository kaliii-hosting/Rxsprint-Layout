import React, { useState } from 'react';
import './Terminal.css';

// Alternative Terminal component with multiple bypass methods
export default function TerminalAlternative() {
    const [method, setMethod] = useState('proxy');
    const ngrokUrl = 'https://rxsprint-ai.ngrok.app';
    
    // Different methods to bypass Zscaler
    const methods = {
        proxy: {
            name: 'Netlify Proxy',
            url: '/.netlify/functions/terminal-proxy',
            description: 'Routes through Netlify servers'
        },
        direct: {
            name: 'Direct Connection',
            url: ngrokUrl,
            description: 'Direct to ngrok (may be blocked)'
        },
        embed: {
            name: 'Embed Service',
            url: `https://www.openode.io/embed?url=${encodeURIComponent(ngrokUrl)}`,
            description: 'Using embed service'
        },
        google: {
            name: 'Google Translate Frame',
            url: `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(ngrokUrl)}`,
            description: 'Through Google Translate'
        }
    };
    
    const currentMethod = methods[method];
    
    return (
        <div className="page-container terminal-page-container">
            <div style={{ 
                padding: '15px', 
                background: '#f0f0f0', 
                borderBottom: '2px solid #ccc'
            }}>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Terminal Connection Method:</strong>
                    <select 
                        value={method} 
                        onChange={(e) => setMethod(e.target.value)}
                        style={{ 
                            marginLeft: '10px',
                            padding: '5px',
                            fontSize: '14px'
                        }}
                    >
                        {Object.keys(methods).map(key => (
                            <option key={key} value={key}>
                                {methods[key].name} - {methods[key].description}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                    Current URL: <code>{currentMethod.url}</code>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    If one method is blocked, try another. The Netlify Proxy should work on corporate networks.
                </div>
            </div>
            
            <iframe
                key={method} // Force reload when method changes
                src={currentMethod.url}
                title="RX Sprint AI Terminal"
                className="rxsprint-iframe"
                allow="microphone; camera; clipboard-write; clipboard-read; fullscreen; autoplay"
                style={{ 
                    width: '100%', 
                    height: 'calc(100% - 100px)', 
                    border: 'none' 
                }}
                onLoad={() => console.log(`Terminal loaded using ${currentMethod.name}`)}
                onError={(e) => console.error(`Terminal error with ${currentMethod.name}:`, e)}
            />
        </div>
    );
}