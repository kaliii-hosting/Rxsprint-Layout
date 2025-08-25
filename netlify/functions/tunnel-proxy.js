// Enhanced Netlify Function for proxying with full path support
const https = require('https');
const http = require('http');
const { URL } = require('url');

const NGROK_URL = 'https://rxsprint-ai.ngrok.app';

// Helper function to determine if content is binary
const isBinaryContent = (contentType) => {
  const binaryTypes = [
    'image/', 'audio/', 'video/', 'application/octet-stream',
    'application/pdf', 'application/zip', 'application/gzip',
    'font/', 'application/vnd', 'application/x-'
  ];
  return binaryTypes.some(type => contentType?.includes(type));
};

// Main handler function
exports.handler = async (event, context) => {
  try {
    // Build the complete path from the URL
    const requestPath = event.path.replace('/.netlify/functions/tunnel-proxy', '') || '/';
    const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
    const fullPath = requestPath + queryString;
    const targetUrl = `${NGROK_URL}${fullPath}`;
    
    console.log(`[PROXY] ${event.httpMethod} ${fullPath} -> ${targetUrl}`);
    
    // Handle OPTIONS requests for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }
    
    // Parse the target URL
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    // Prepare headers to forward
    const forwardHeaders = {};
    
    // Copy relevant headers from the original request
    const headersToForward = [
      'accept', 'accept-encoding', 'accept-language', 'cache-control',
      'content-type', 'cookie', 'origin', 'referer', 'user-agent',
      'authorization', 'x-requested-with'
    ];
    
    for (const header of headersToForward) {
      if (event.headers[header]) {
        forwardHeaders[header] = event.headers[header];
      }
    }
    
    // Set proper host header
    forwardHeaders['host'] = parsedUrl.host;
    
    // Handle request body
    let requestBody = null;
    if (event.body) {
      if (event.isBase64Encoded) {
        requestBody = Buffer.from(event.body, 'base64');
        if (forwardHeaders['content-length']) {
          forwardHeaders['content-length'] = requestBody.length;
        }
      } else {
        requestBody = event.body;
      }
    }
    
    // Create options for the proxy request
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: event.httpMethod,
      headers: forwardHeaders,
      timeout: 25000, // Netlify function timeout is 26 seconds
      rejectUnauthorized: false // Allow self-signed certificates
    };
    
    // Make the proxy request
    return new Promise((resolve, reject) => {
      const proxyReq = httpModule.request(options, (proxyRes) => {
        const chunks = [];
        
        proxyRes.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        proxyRes.on('end', () => {
          const body = Buffer.concat(chunks);
          
          // Prepare response headers
          const responseHeaders = {};
          
          // Copy most headers from the proxy response
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            // Skip certain headers
            if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
              responseHeaders[key] = value;
            }
          }
          
          // Remove frame-blocking headers
          delete responseHeaders['x-frame-options'];
          delete responseHeaders['content-security-policy'];
          delete responseHeaders['x-content-security-policy'];
          
          // Add CORS headers
          responseHeaders['access-control-allow-origin'] = '*';
          responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
          responseHeaders['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
          responseHeaders['access-control-allow-credentials'] = 'true';
          
          // Add permissive CSP for iframe embedding
          responseHeaders['content-security-policy'] = "frame-ancestors *;";
          
          // Determine if content is binary
          const contentType = responseHeaders['content-type'] || '';
          const isBinary = isBinaryContent(contentType);
          
          console.log(`[PROXY RESPONSE] ${proxyRes.statusCode} for ${fullPath} (${contentType})`);
          
          // Handle redirects
          if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && responseHeaders['location']) {
            // Rewrite redirect location if it points to ngrok
            if (responseHeaders['location'].includes(NGROK_URL)) {
              responseHeaders['location'] = responseHeaders['location'].replace(
                NGROK_URL,
                '/.netlify/functions/tunnel-proxy'
              );
            }
          }
          
          resolve({
            statusCode: proxyRes.statusCode,
            headers: responseHeaders,
            body: isBinary ? body.toString('base64') : body.toString('utf-8'),
            isBase64Encoded: isBinary
          });
        });
      });
      
      proxyReq.on('error', (error) => {
        console.error('[PROXY ERROR]', error);
        resolve({
          statusCode: 502,
          headers: {
            'content-type': 'application/json',
            'access-control-allow-origin': '*'
          },
          body: JSON.stringify({
            error: 'Proxy Error',
            message: error.message,
            details: 'Failed to connect to ngrok tunnel. The tunnel might be offline or unreachable.',
            target: targetUrl,
            path: fullPath
          })
        });
      });
      
      proxyReq.on('timeout', () => {
        console.error('[PROXY TIMEOUT]');
        proxyReq.destroy();
        resolve({
          statusCode: 504,
          headers: {
            'content-type': 'application/json',
            'access-control-allow-origin': '*'
          },
          body: JSON.stringify({
            error: 'Gateway Timeout',
            message: 'Request to ngrok tunnel timed out',
            target: targetUrl,
            path: fullPath
          })
        });
      });
      
      // Send request body if present
      if (requestBody) {
        proxyReq.write(requestBody);
      }
      
      proxyReq.end();
    });
    
  } catch (error) {
    console.error('[FUNCTION ERROR]', error);
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};