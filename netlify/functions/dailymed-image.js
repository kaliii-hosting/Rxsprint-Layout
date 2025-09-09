/**
 * Netlify Function: DailyMed Image Proxy
 * Handles image requests from DailyMed to bypass CORS restrictions
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
      body: 'Method not allowed'
    };
  }

  try {
    const { name, id } = event.queryStringParameters || {};
    
    if (!name || !id) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain'
        },
        body: 'Missing name or id parameter'
      };
    }

    console.log(`Image request: name=${name}, setId=${id}`);

    // Handle MM codes by fetching media list first
    let imageName = name;
    if (name.startsWith('MM')) {
      try {
        const mediaUrl = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${id}/media.json`;
        const mediaResponse = await fetch(mediaUrl);
        
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          const mediaList = mediaData.data?.media || [];
          
          if (mediaList.length > 0) {
            // Map MM code to actual filename
            const mmNumber = parseInt(name.replace('MM', ''));
            const indexOffset = 70; // Common offset for MM codes
            const targetIndex = mmNumber - indexOffset;
            
            if (targetIndex >= 0 && targetIndex < mediaList.length) {
              imageName = mediaList[targetIndex].name;
              console.log(`MM code ${name} mapped to ${imageName}`);
            } else if (mediaList.length > 0) {
              // Fallback to first image
              imageName = mediaList[0].name;
              console.log(`Using fallback image for ${name}: ${imageName}`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching media list:', error);
      }
    }

    // Clean the image name (remove extension for DailyMed API)
    const cleanName = imageName.replace(/\.(jpg|jpeg|png|gif)$/i, '');
    const imageUrl = `https://dailymed.nlm.nih.gov/dailymed/image.cfm?name=${encodeURIComponent(cleanName)}&setid=${id}`;
    
    console.log(`Fetching image: ${imageUrl}`);

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://dailymed.nlm.nih.gov',
        'Origin': 'https://dailymed.nlm.nih.gov',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*, */*'
      }
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        },
        body: Buffer.from(buffer).toString('base64'),
        isBase64Encoded: true
      };
    } else {
      // Return transparent 1x1 PNG as fallback
      const transparentPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHbhO4VfgAAAABJRU5ErkJggg==';
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        },
        body: transparentPng,
        isBase64Encoded: true
      };
    }

  } catch (error) {
    console.error('Image proxy error:', error);
    
    // Return transparent 1x1 PNG on error
    const transparentPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHbhO4VfgAAAABJRU5ErkJggg==';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      },
      body: transparentPng,
      isBase64Encoded: true
    };
  }
};