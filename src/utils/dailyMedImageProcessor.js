/**
 * DailyMed Image Processing Utility
 * Processes HTML content and updates image src attributes to use the proxy endpoint
 * Handles MM codes, direct image names, and error cases gracefully
 */

/**
 * Process HTML content to fix DailyMed instruction images
 * @param {string} html - The raw HTML/XML content
 * @param {string} setId - The medication setId
 * @param {array} mediaImages - Array of media images from the API
 * @returns {string} - Processed HTML with properly mapped images
 */
export async function processInstructionImages(html, setId, mediaImages = []) {
  if (!html || !setId) {
    console.warn('Missing HTML content or setId for image processing');
    return html;
  }

  console.log(`🔍 Processing instruction images for setId: ${setId}`);
  console.log(`📸 Available media images: ${mediaImages.length}`);
  
  let processedHTML = html;
  
  // Step 1: Clean up any malformed HTML first
  processedHTML = cleanMalformedHTML(processedHTML);
  
  // Step 2: Process all img tags and update their src attributes
  processedHTML = updateImageSources(processedHTML, setId, mediaImages);
  
  // Step 3: Process data-image-id attributes
  processedHTML = processDataImageIds(processedHTML, setId, mediaImages);
  
  // Step 4: Add error handling to all images
  processedHTML = addImageErrorHandling(processedHTML);
  
  // Step 5: Process any renderMultiMedia elements
  processedHTML = processRenderMultiMedia(processedHTML, setId, mediaImages);
  
  console.log('✅ Image processing complete');
  
  return processedHTML;
}

/**
 * Clean up malformed HTML that could break image loading
 */
function cleanMalformedHTML(html) {
  console.log('🧹 Cleaning malformed HTML...');
  
  // Remove double src attributes
  html = html.replace(/src=""\s+src="/gi, 'src="');
  html = html.replace(/src=''\s+src='/gi, "src='");
  
  // Fix cases where there are multiple src attributes
  html = html.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, 
    (match, before, src1, middle, src2, after) => {
      const validSrc = src2 || src1;
      console.log(`🔧 Fixed double src: ${src1} & ${src2} -> ${validSrc}`);
      return `<img${before}src="${validSrc}"${middle}${after}>`;
    }
  );
  
  // Remove counsel URLs
  html = html.replace(/src=["'][^"']*counsel[^"']*/gi, 'src=""');
  
  return html;
}

/**
 * Update all image src attributes to use the proxy endpoint
 */
function updateImageSources(html, setId, mediaImages) {
  console.log('🔄 Updating image sources...');
  
  return html.replace(/<img([^>]*?)>/gi, (match) => {
    // Extract current src and data-image-id
    const srcMatch = match.match(/src=["']([^"']*)["']/i);
    const dataIdMatch = match.match(/data-image-id=["']([^"']+)["']/i);
    
    let imageName = null;
    
    // Determine the image name to use
    if (dataIdMatch && dataIdMatch[1]) {
      imageName = dataIdMatch[1];
      console.log(`📋 Using data-image-id: ${imageName}`);
    } else if (srcMatch && srcMatch[1] && !srcMatch[1].startsWith('/api/dailymed-image')) {
      // Extract filename from existing src
      const filename = srcMatch[1].split('/').pop().split('?')[0];
      if (filename && filename !== '') {
        imageName = filename;
        console.log(`📁 Using src filename: ${imageName}`);
      }
    }
    
    // Skip if no image name found or already processed
    if (!imageName || srcMatch && srcMatch[1].startsWith('/api/dailymed-image')) {
      return match;
    }
    
    // Build proxy URL
    const proxyUrl = buildProxyImageUrl(imageName, setId);
    
    // Replace or add src attribute
    if (srcMatch) {
      const newMatch = match.replace(srcMatch[0], `src="${proxyUrl}"`);
      console.log(`✅ Updated src: ${srcMatch[1]} -> ${proxyUrl}`);
      return newMatch;
    } else {
      // Add src attribute if missing
      const newMatch = match.replace('<img', `<img src="${proxyUrl}"`);
      console.log(`✅ Added src: ${proxyUrl}`);
      return newMatch;
    }
  });
}

/**
 * Process data-image-id attributes and ensure src matches
 */
function processDataImageIds(html, setId, mediaImages) {
  console.log('📋 Processing data-image-id attributes...');
  
  return html.replace(/<img([^>]*?)data-image-id=["']([^"']+)["']([^>]*?)>/gi, 
    (match, before, imageId, after) => {
      console.log(`🔍 Processing data-image-id: ${imageId}`);
      
      // Build proxy URL for this image ID
      const proxyUrl = buildProxyImageUrl(imageId, setId);
      
      // Ensure src attribute matches the data-image-id
      let updatedMatch = match;
      const srcMatch = match.match(/src=["']([^"']*)["']/i);
      
      if (srcMatch) {
        updatedMatch = updatedMatch.replace(srcMatch[0], `src="${proxyUrl}"`);
      } else {
        updatedMatch = updatedMatch.replace('<img', `<img src="${proxyUrl}"`);
      }
      
      console.log(`✅ Updated data-image-id mapping: ${imageId} -> ${proxyUrl}`);
      return updatedMatch;
    }
  );
}

/**
 * Add error handling attributes to all image tags
 */
function addImageErrorHandling(html) {
  console.log('🛡️ Adding error handling to images...');
  
  return html.replace(/<img([^>]*?)>/gi, (match) => {
    // Skip if already has error handling
    if (match.includes('onerror=') || match.includes('onError=')) {
      return match;
    }
    
    // Add error handling and styling
    const errorHandler = `onerror="console.warn('Failed to load DailyMed image:', this.src); this.style.display='none';"`;
    const styling = `style="max-width: 100%; height: auto; display: block; margin: 1rem auto;"`;
    const loading = `loading="eager"`;
    const className = `class="instruction-image"`;
    
    return match.replace('<img', `<img ${errorHandler} ${styling} ${loading} ${className}`);
  });
}

/**
 * Process renderMultiMedia elements
 */
function processRenderMultiMedia(html, setId, mediaImages) {
  console.log('📎 Processing renderMultiMedia elements...');
  
  return html.replace(
    /<renderMultiMedia[^>]*referencedObject=["']([^"']+)["'][^>]*\/?>/gi,
    (match, refId) => {
      console.log(`🔗 Processing renderMultiMedia: ${refId}`);
      
      // Try to find corresponding media image
      let imageName = refId;
      
      // Look for matching media by ID or name
      if (mediaImages.length > 0) {
        const matchingMedia = mediaImages.find(media => {
          const name = media.name || media;
          return name.includes(refId) || refId.includes(name.replace(/\.(jpg|jpeg|png|gif)$/i, ''));
        });
        
        if (matchingMedia) {
          imageName = matchingMedia.name || matchingMedia;
        } else {
          // Use sequential mapping as fallback
          const index = Math.min(mediaImages.length - 1, 0);
          imageName = mediaImages[index].name || mediaImages[index];
        }
      }
      
      const proxyUrl = buildProxyImageUrl(imageName, setId);
      
      return `<div class="instruction-figure" data-ref="${refId}">
                <img src="${proxyUrl}" 
                     alt="Instructions Image" 
                     class="instruction-image"
                     loading="eager"
                     style="max-width: 100%; height: auto; display: block; margin: 1rem auto;"
                     onerror="console.warn('Failed to load renderMultiMedia image:', this.src); this.style.display='none';">
              </div>`;
    }
  );
}

/**
 * Build proxy image URL
 */
function buildProxyImageUrl(imageName, setId) {
  if (!imageName || !setId) {
    console.error('Missing imageName or setId for proxy URL');
    return '';
  }
  
  // Clean the image name
  const cleanName = imageName.trim();
  
  // Build the proxy URL
  const url = `/api/dailymed-image?name=${encodeURIComponent(cleanName)}&id=${setId}`;
  
  console.log(`🔗 Built proxy URL: ${cleanName} -> ${url}`);
  return url;
}

/**
 * Extract image identifiers from HTML content
 */
export function extractImageIdentifiers(html) {
  if (!html) return [];
  
  const identifiers = new Set();
  
  // Extract from data-image-id attributes
  const dataIdMatches = html.matchAll(/data-image-id=["']([^"']+)["']/gi);
  for (const match of dataIdMatches) {
    identifiers.add(match[1]);
  }
  
  // Extract from src attributes (filenames)
  const srcMatches = html.matchAll(/src=["']([^"']+)["']/gi);
  for (const match of srcMatches) {
    const src = match[1];
    if (src && !src.startsWith('http') && !src.startsWith('/api') && !src.startsWith('data:')) {
      const filename = src.split('/').pop().split('?')[0];
      if (filename && filename.includes('.')) {
        identifiers.add(filename);
      }
    }
  }
  
  // Extract MM codes
  const mmMatches = html.matchAll(/MM\d+/gi);
  for (const match of mmMatches) {
    identifiers.add(match[0]);
  }
  
  return Array.from(identifiers);
}

/**
 * Process multiple sections with image content
 */
export async function processMultipleSections(sections, setId, mediaImages = []) {
  const processed = {};
  
  for (const [key, section] of Object.entries(sections)) {
    if (section && section.text && key.toLowerCase().includes('instruction')) {
      console.log(`🔄 Processing section: ${key}`);
      processed[key] = {
        ...section,
        text: await processInstructionImages(section.text, setId, mediaImages)
      };
    } else {
      processed[key] = section;
    }
  }
  
  return processed;
}

export default {
  processInstructionImages,
  extractImageIdentifiers,
  processMultipleSections
};