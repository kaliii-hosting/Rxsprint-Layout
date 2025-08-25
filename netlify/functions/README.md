# Netlify Functions - Ngrok Tunnel Proxy

This directory contains Netlify Functions that proxy requests to your ngrok tunnel, bypassing corporate network restrictions like Zscaler.

## Functions

### tunnel-proxy.js (Enhanced Version)
The main proxy function that handles all HTTP methods and paths.

**Features:**
- Full HTTP/HTTPS proxy support
- Handles all request methods (GET, POST, PUT, DELETE, etc.)
- Preserves headers, cookies, and authentication
- Removes frame-blocking headers for iframe compatibility
- Binary content support (images, PDFs, etc.)
- Proper error handling with descriptive messages
- Path preservation and query string support
- Redirect rewriting for seamless navigation

### tunnel.js (Basic Version)
A simpler proxy function with basic functionality.

## How It Works

1. **Production (Netlify):**
   - Terminal component makes requests to `/.netlify/functions/tunnel-proxy/*`
   - Netlify Function receives the request and forwards it to ngrok
   - Response is processed to remove security restrictions
   - Content is returned to the iframe

2. **Development (Local):**
   - Terminal component uses local Express proxy at `localhost:3001`
   - Allows testing without deploying to Netlify

## Configuration

Update the `NGROK_URL` constant in the function files to point to your ngrok tunnel:
```javascript
const NGROK_URL = 'https://rxsprint-ai.ngrok.app';
```

## Deployment

Functions are automatically deployed with your Netlify site. No additional configuration needed.

## Testing

Test the proxy endpoint directly:
```bash
# Health check
curl https://your-site.netlify.app/.netlify/functions/tunnel-proxy

# Proxy a specific path
curl https://your-site.netlify.app/.netlify/functions/tunnel-proxy/api/data
```

## Troubleshooting

1. **502 Bad Gateway:** Ngrok tunnel is offline or unreachable
2. **504 Gateway Timeout:** Request took too long (>25 seconds)
3. **CORS Errors:** Check browser console for specific headers needed
4. **Content not loading:** Verify ngrok URL is correct and accessible

## Security Notes

- This proxy is designed to bypass network restrictions for legitimate development use
- Always use HTTPS ngrok tunnels for security
- Consider adding authentication to the proxy function for production use
- Monitor function usage in Netlify dashboard to prevent abuse