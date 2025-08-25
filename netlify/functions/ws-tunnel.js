// WebSocket tunnel to bypass Zscaler - uses standard HTTPS/WSS which passes through most firewalls
exports.handler = async (event, context) => {
  const NGROK_URL = 'https://rxsprint-ai.ngrok.app';
  
  // For WebSocket upgrade requests, we need to handle them differently
  if (event.headers['upgrade'] === 'websocket') {
    // WebSocket connections need special handling in Netlify Functions
    // We'll fall back to regular HTTP for now
    return {
      statusCode: 426,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'WebSocket upgrade required - use regular HTTP proxy'
    };
  }
  
  try {
    // Build the target URL
    const path = event.path.replace('/.netlify/functions/ws-tunnel', '') || '/';
    const targetUrl = `${NGROK_URL}${path}${event.rawQuery ? '?' + event.rawQuery : ''}`;
    
    // Forward the request
    const response = await fetch(targetUrl, {
      method: event.httpMethod || 'GET',
      headers: {
        ...Object.fromEntries(
          Object.entries(event.headers || {})
            .filter(([key]) => !key.startsWith('x-netlify') && key !== 'host')
        ),
        'Host': 'rxsprint-ai.ngrok.app',
        'Origin': NGROK_URL,
      },
      body: event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body) : undefined,
    });
    
    // Get response content
    const contentType = response.headers.get('content-type') || '';
    const isText = contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript');
    
    let body;
    let isBase64 = false;
    
    if (isText) {
      body = await response.text();
      
      // For HTML, inject a base tag and rewrite URLs
      if (contentType.includes('text/html')) {
        // Add base tag for relative URLs
        body = body.replace(/<head[^>]*>/, '$&<base href="/.netlify/functions/ws-tunnel/">');
        
        // Rewrite absolute paths
        body = body.replace(/href="\/([^"]*?)"/g, 'href="/.netlify/functions/ws-tunnel/$1"');
        body = body.replace(/src="\/([^"]*?)"/g, 'src="/.netlify/functions/ws-tunnel/$1"');
        body = body.replace(/action="\/([^"]*?)"/g, 'action="/.netlify/functions/ws-tunnel/$1"');
      }
    } else {
      const buffer = await response.arrayBuffer();
      body = Buffer.from(buffer).toString('base64');
      isBase64 = true;
    }
    
    // Build response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    
    // Remove frame-blocking headers
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['content-security-policy'];
    
    // Add CORS headers
    responseHeaders['access-control-allow-origin'] = '*';
    responseHeaders['access-control-allow-credentials'] = 'true';
    
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: body,
      isBase64Encoded: isBase64
    };
    
  } catch (error) {
    console.error('Tunnel error:', error);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: error.message }),
      headers: { 'content-type': 'application/json' }
    };
  }
};