// Simple Netlify Function to proxy requests to ngrok, bypassing Zscaler
exports.handler = async (event, context) => {
  const NGROK_URL = 'https://rxsprint-ai.ngrok.app';
  
  try {
    // Get the path after the function name
    const path = event.path.replace('/.netlify/functions/terminal-proxy', '') || '/';
    const targetUrl = `${NGROK_URL}${path}${event.rawQuery ? '?' + event.rawQuery : ''}`;
    
    console.log(`Proxying: ${event.path} -> ${targetUrl}`);
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: ''
      };
    }
    
    // Prepare headers for the request
    const headers = {
      ...event.headers,
      host: 'rxsprint-ai.ngrok.app',
    };
    
    // Remove Netlify-specific headers
    delete headers['x-netlify-event-type'];
    delete headers['x-nf-request-id'];
    
    // Make the request to ngrok
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: headers,
      body: event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body) : undefined,
    });
    
    // Get response body
    const contentType = response.headers.get('content-type') || '';
    let body;
    let isBase64Encoded = false;
    
    if (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml')) {
      body = await response.text();
    } else {
      const buffer = await response.arrayBuffer();
      body = Buffer.from(buffer).toString('base64');
      isBase64Encoded = true;
    }
    
    // Build response headers
    const responseHeaders = {
      'content-type': contentType,
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true',
    };
    
    // Remove X-Frame-Options to allow iframe embedding
    const headersToSkip = ['x-frame-options', 'content-security-policy', 'x-content-security-policy'];
    
    response.headers.forEach((value, key) => {
      if (!headersToSkip.includes(key.toLowerCase()) && !key.startsWith('cf-')) {
        responseHeaders[key] = value;
      }
    });
    
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: body,
      isBase64Encoded: isBase64Encoded
    };
    
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'content-type': 'text/plain',
        'access-control-allow-origin': '*',
      },
      body: `Proxy Error: ${error.message}`
    };
  }
};