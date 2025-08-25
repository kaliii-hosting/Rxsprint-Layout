const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PROXY_PORT || 3001;
const NGROK_URL = 'https://rxsprint-ai.ngrok.app';

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Range']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const proxyOptions = {
  target: NGROK_URL,
  changeOrigin: true,
  ws: true,
  secure: true,
  logLevel: 'debug',
  pathRewrite: {
    '^/api/tunnel': ''
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> ${NGROK_URL}${req.url.replace('/api/tunnel', '')}`);
    
    proxyReq.setHeader('X-Forwarded-For', req.ip || req.connection.remoteAddress);
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
    proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
    
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
    
    const contentType = req.headers['content-type'];
    if (contentType) {
      proxyReq.setHeader('Content-Type', contentType);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY RESPONSE] ${proxyRes.statusCode} for ${req.url}`);
    
    proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
    
    delete proxyRes.headers['x-frame-options'];
    delete proxyRes.headers['X-Frame-Options'];
    
    proxyRes.headers['Content-Security-Policy'] = "frame-ancestors 'self' http://localhost:* https://localhost:*";
    
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
        return cookie.replace(/; secure/gi, '')
                    .replace(/; samesite=none/gi, '; samesite=lax')
                    .replace(/; httponly/gi, '');
      });
    }
  },
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err);
    res.status(502).json({ 
      error: 'Proxy error', 
      message: err.message,
      target: NGROK_URL 
    });
  }
};

app.use('/api/tunnel', createProxyMiddleware(proxyOptions));

server.on('upgrade', (request, socket, head) => {
  console.log('[WS UPGRADE] Proxying WebSocket connection');
  
  const proxy = createProxyMiddleware({
    target: NGROK_URL,
    ws: true,
    changeOrigin: true,
    secure: true,
    pathRewrite: {
      '^/api/tunnel': ''
    }
  });
  
  proxy.upgrade(request, socket, head, {
    target: NGROK_URL
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    proxy: 'active',
    target: NGROK_URL,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'RxSprint Proxy Server',
    endpoints: {
      proxy: '/api/tunnel/*',
      health: '/health'
    }
  });
});

server.listen(PORT, () => {
  console.log(`
    🚀 Proxy server running on http://localhost:${PORT}
    📡 Proxying /api/tunnel/* to ${NGROK_URL}
    ✅ WebSocket support enabled
    🔒 CORS configured for localhost origins
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});