/**
 * DailyMed Image Proxy Middleware
 * Handles MM code to filename mapping and serves images with fallback
 */
import fetch from 'node-fetch';

// Cache for media lists to avoid repeated API calls
const mediaCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch media list for a given setId with caching
 */
async function getMediaList(setId) {
  const cacheKey = `media_${setId}`;
  const cached = mediaCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Using cached media list for ${setId}`);
    return cached.data;
  }
  
  try {
    console.log(`🌐 Fetching media list for setId: ${setId}`);
    const response = await fetch(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setId}/media.json`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const mediaList = data.data?.media || [];
    
    console.log(`📋 Fetched ${mediaList.length} media files:`, mediaList.map(m => m.name));
    
    // Cache the result
    mediaCache.set(cacheKey, {
      data: mediaList,
      timestamp: Date.now()
    });
    
    return mediaList;
  } catch (error) {
    console.error(`❌ Failed to fetch media list for ${setId}:`, error.message);
    return [];
  }
}

/**
 * Map MM code to actual filename using multiple strategies
 */
function mapMMCodeToFilename(mmCode, mediaList) {
  if (!mmCode.startsWith('MM') || !mediaList.length) {
    return mmCode;
  }
  
  const mmNumber = parseInt(mmCode.replace('MM', ''));
  console.log(`🗺️ Mapping MM code: ${mmCode} (number: ${mmNumber})`);
  
  // Strategy 1: Direct index mapping (MM70 = index 0, MM71 = index 1, etc.)
  const indexOffset = 70; // Based on common DailyMed MM code patterns
  const targetIndex = mmNumber - indexOffset;
  
  if (targetIndex >= 0 && targetIndex < mediaList.length) {
    const filename = mediaList[targetIndex].name;
    console.log(`✅ Strategy 1 - Index mapping: ${mmCode} -> ${filename} (index ${targetIndex})`);
    return filename;
  }
  
  // Strategy 2: Find by number pattern in filename
  const patternMatch = mediaList.find(item => {
    const name = item.name;
    return name.includes(mmNumber.toString()) || 
           name.includes(mmNumber.toString().padStart(2, '0')) ||
           name.includes(mmNumber.toString().padStart(3, '0'));
  });
  
  if (patternMatch) {
    console.log(`✅ Strategy 2 - Pattern match: ${mmCode} -> ${patternMatch.name}`);
    return patternMatch.name;
  }
  
  // Strategy 3: Sequential mapping (MM70 = first image, MM71 = second, etc.)
  const sequentialIndex = mmNumber - 70; // Adjust offset as needed
  if (sequentialIndex >= 0 && sequentialIndex < mediaList.length) {
    const filename = mediaList[sequentialIndex].name;
    console.log(`✅ Strategy 3 - Sequential: ${mmCode} -> ${filename} (seq index ${sequentialIndex})`);
    return filename;
  }
  
  // Strategy 4: Use first image as fallback
  if (mediaList.length > 0) {
    const fallback = mediaList[0].name;
    console.log(`⚠️ Using fallback for ${mmCode}: ${fallback}`);
    return fallback;
  }
  
  console.warn(`❌ No mapping found for MM code: ${mmCode}`);
  return mmCode;
}

/**
 * Create transparent 1x1 PNG fallback
 */
function createTransparentPNG() {
  // Transparent 1x1 PNG in base64
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAHbhO4VfgAAAABJRU5ErkJggg==',
    'base64'
  );
}

/**
 * Fetch image from DailyMed with proper headers
 */
async function fetchDailyMedImage(imageName, setId) {
  // Clean the image name (remove extension for DailyMed API)
  const cleanName = imageName.replace(/\.(jpg|jpeg|png|gif)$/i, '');
  const imageUrl = `https://dailymed.nlm.nih.gov/dailymed/image.cfm?name=${encodeURIComponent(cleanName)}&setid=${setId}`;
  
  console.log(`🌐 Fetching image: ${imageUrl}`);
  
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'Referer': 'https://dailymed.nlm.nih.gov',
        'Origin': 'https://dailymed.nlm.nih.gov',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/*, */*'
      }
    });
    
    if (response.ok) {
      console.log(`✅ Image fetched successfully: ${imageName}`);
      return {
        success: true,
        data: await response.buffer(),
        contentType: response.headers.get('content-type') || 'image/jpeg'
      };
    } else {
      console.log(`❌ Image not found: ${imageName} (${response.status})`);
      return { success: false };
    }
  } catch (error) {
    console.error(`💥 Error fetching image ${imageName}:`, error.message);
    return { success: false };
  }
}

/**
 * Main image proxy handler
 */
export async function handleDailyMedImage(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let imageName = url.searchParams.get('name');
  const setId = url.searchParams.get('id');
  
  if (!imageName || !setId) {
    console.error('❌ Missing name or id parameter');
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing name or id parameter' }));
    return;
  }
  
  console.log(`🔍 Image request: name=${imageName}, setId=${setId}`);
  
  try {
    // If it's an MM code, fetch media list and map to actual filename
    if (imageName.startsWith('MM')) {
      const mediaList = await getMediaList(setId);
      imageName = mapMMCodeToFilename(imageName, mediaList);
      console.log(`🔄 MM code mapped to: ${imageName}`);
    }
    
    // Fetch the image from DailyMed
    const result = await fetchDailyMedImage(imageName, setId);
    
    if (result.success) {
      // Serve the actual image
      res.writeHead(200, {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*'
      });
      res.end(result.data);
    } else {
      // Serve transparent fallback
      console.log('📷 Serving transparent fallback image');
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(createTransparentPNG());
    }
  } catch (error) {
    console.error('💥 Image proxy error:', error);
    
    // Serve transparent fallback on error
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(createTransparentPNG());
  }
}

export default handleDailyMedImage;