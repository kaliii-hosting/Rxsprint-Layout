// API endpoint that redirects to ngrok - sometimes redirects work better than proxies
exports.handler = async (event, context) => {
  const targetUrl = event.queryStringParameters?.url || 'https://rxsprint-ai.ngrok.app';
  
  // For GET requests to /api/embed, redirect to the target
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 302,
      headers: {
        'Location': targetUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: ''
    };
  }
  
  // For other methods, proxy the request
  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        ...event.headers,
        'Host': new URL(targetUrl).host,
      },
      body: event.body
    });
    
    const body = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'text/html',
        'access-control-allow-origin': '*',
      },
      body: body
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};