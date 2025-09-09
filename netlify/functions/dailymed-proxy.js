/**
 * Netlify Function: DailyMed API Proxy
 * Handles all DailyMed API requests to bypass CORS restrictions
 */

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract the path from query parameters
    const { path } = event.queryStringParameters || {};
    
    if (!path) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ error: 'Missing path parameter' })
      };
    }

    // Build the DailyMed API URL
    const baseUrl = 'https://dailymed.nlm.nih.gov/dailymed';
    const fullUrl = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    
    console.log('Proxying request to:', fullUrl);

    // Make the request to DailyMed
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'RxSprint/1.0',
        'Referer': 'https://dailymed.nlm.nih.gov',
        'Origin': 'https://dailymed.nlm.nih.gov'
      }
    });

    // Get the response body
    const contentType = response.headers.get('content-type');
    let body;
    
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else {
      // For non-JSON responses (HTML, XML, etc.)
      const text = await response.text();
      
      // Check if it's an HTML error page
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        console.error('Received HTML instead of JSON:', text.substring(0, 500));
        return {
          statusCode: 502,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'DailyMed API returned HTML instead of JSON',
            details: 'The API endpoint may be incorrect or the service may be unavailable'
          })
        };
      }
      
      // For XML responses, return as text
      body = text;
    }

    // Return the proxied response
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': contentType || 'application/json',
        'Cache-Control': response.status === 200 ? 'public, max-age=3600' : 'no-cache'
      },
      body: typeof body === 'string' ? body : JSON.stringify(body)
    };

  } catch (error) {
    console.error('Proxy error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Proxy server error',
        message: error.message,
        details: 'Failed to fetch data from DailyMed API'
      })
    };
  }
};