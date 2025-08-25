const https = require('https');
const http = require('http');
const { URL } = require('url');

const NGROK_URL = 'https://rxsprint-ai.ngrok.app';

exports.handler = async (event, context) => {
  try {
    // Extract the path from query parameters or use root
    const path = event.queryStringParameters?.path || '';
    const targetUrl = `${NGROK_URL}${path}`;
    
    console.log(`[PROXY] ${event.httpMethod} ${path} -> ${targetUrl}`);
    
    // Parse the target URL
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    // Prepare headers to forward
    const forwardHeaders = { ...event.headers };
    
    // Remove Netlify-specific headers
    delete forwardHeaders['x-netlify-event-type'];
    delete forwardHeaders['x-netlify-function-context'];
    delete forwardHeaders['x-nf-request-id'];
    delete forwardHeaders['x-forwarded-for'];
    delete forwardHeaders['x-forwarded-proto'];
    delete forwardHeaders['host'];
    
    // Set proper host header
    forwardHeaders['host'] = parsedUrl.host;
    
    // Add origin if not present
    if (!forwardHeaders['origin']) {
      forwardHeaders['origin'] = NGROK_URL;
    }
    
    // Handle request body
    let requestBody = null;
    if (event.body) {
      if (event.isBase64Encoded) {
        requestBody = Buffer.from(event.body, 'base64');
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
        let responseBody = [];
        
        proxyRes.on('data', (chunk) => {
          responseBody.push(chunk);
        });
        
        proxyRes.on('end', () => {
          const body = Buffer.concat(responseBody);
          
          // Prepare response headers
          const responseHeaders = { ...proxyRes.headers };
          
          // Remove frame-blocking headers
          delete responseHeaders['x-frame-options'];
          delete responseHeaders['content-security-policy'];
          delete responseHeaders['x-content-security-policy'];
          
          // Add CORS headers for iframe support
          responseHeaders['access-control-allow-origin'] = '*';
          responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
          responseHeaders['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
          responseHeaders['access-control-allow-credentials'] = 'true';
          
          // Add permissive CSP for iframe embedding
          responseHeaders['content-security-policy'] = "frame-ancestors *;";
          
          // Check if response is binary
          const contentType = responseHeaders['content-type'] || '';
          const isBinary = !contentType.includes('text') && 
                          !contentType.includes('json') && 
                          !contentType.includes('xml') &&
                          !contentType.includes('javascript');
          
          console.log(`[PROXY RESPONSE] ${proxyRes.statusCode} for ${path}`);
          
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
            target: NGROK_URL
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
            target: NGROK_URL
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
        target: NGROK_URL
      })
    };
  }
};