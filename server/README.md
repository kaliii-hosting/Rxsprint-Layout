# RxSprint Proxy Server

This proxy server allows the RxSprint application to bypass network restrictions (like Zscaler) by routing ngrok tunnel traffic through a local Express server.

## Features

- Full HTTP/HTTPS proxy support
- WebSocket connection support for real-time features
- CORS configuration for iframe embedding
- Header preservation (cookies, auth tokens, etc.)
- Request/response logging
- Health check endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the proxy server:
```bash
npm run server
```

Or for development with auto-reload:
```bash
npm run server:dev
```

3. Start both frontend and backend together:
```bash
npm run dev:full
```

## Configuration

The proxy server runs on port 3001 by default. You can change this by setting the `PROXY_PORT` environment variable.

The ngrok URL is configured in `server/server.js`. Update the `NGROK_URL` constant to point to your ngrok tunnel:
```javascript
const NGROK_URL = 'https://rxsprint-ai.ngrok.app';
```

## Endpoints

- `/api/tunnel/*` - Proxy endpoint that forwards all requests to the ngrok URL
- `/health` - Health check endpoint
- `/` - Server info endpoint

## How It Works

1. The React Terminal component makes requests to `http://localhost:3001/api/tunnel/*`
2. The proxy server receives these requests and forwards them to the ngrok URL
3. Responses from ngrok are processed to:
   - Remove frame-blocking headers (X-Frame-Options)
   - Add appropriate CORS headers
   - Preserve cookies and authentication
4. The processed response is sent back to the React application

## Troubleshooting

- If the iframe is still blocked, check browser console for specific error messages
- Ensure the proxy server is running before accessing the Terminal page
- Check that the ngrok URL is correct and accessible
- Verify CORS settings match your frontend URL

## Security Notes

- This proxy is designed for development/internal use
- For production, implement proper authentication and rate limiting
- Consider using environment variables for sensitive URLs
- Review and restrict CORS origins as needed