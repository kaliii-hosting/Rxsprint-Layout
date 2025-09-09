/**
 * Universal Instructions Image Processor
 * Works with ANY medication by intelligently mapping images to references
 */

/**
 * Detect all possible figure/step/image references in HTML
 * @param {string} html - The HTML content to search
 * @returns {array} - Array of unique references found
 */
function detectAllReferences(html) {
  if (!html) return [];
  
  const references = new Set();
  
  // Comprehensive patterns to catch all reference types
  const patterns = [
    // Standard patterns: Figure 1, Step 2, Panel A, etc.
    /\b(Figure|Step|Panel|Diagram|Image|Illustration)\s+(\d+[A-Za-z]?|\d+\.\d+|[A-Z])\b/gi,
    // Abbreviated: Fig. 1, Fig 2
    /\b(Fig\.?)\s+(\d+[A-Za-z]?)\b/gi,
    // Parenthetical: (see Figure 1), (refer to Step 2)
    /\((see|refer to|reference)\s+(Figure|Step|Panel)\s+(\d+[A-Za-z]?)\)/gi,
    // Just numbers in specific contexts
    /\bStep\s+(\d+):?/gi,
    /\bFigure\s+(\d+):?/gi,
    // Letter references: Panel A, Step B
    /\b(Panel|Step|Part)\s+([A-Z])\b/gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      references.add(match[0]);
    }
  });
  
  // Convert to array and sort naturally (Figure 1 before Figure 2, etc.)
  return Array.from(references).sort((a, b) => {
    // Extract numbers for proper sorting
    const numA = parseInt(a.match(/\d+/) || '0');
    const numB = parseInt(b.match(/\d+/) || '0');
    return numA - numB || a.localeCompare(b);
  });
}

/**
 * Process Instructions HTML with MM code to actual filename mapping
 * @param {string} html - The raw HTML/XML content
 * @param {string} setId - The medication setId
 * @param {array} mediaImages - Array of media images from the API
 * @returns {string} - Processed HTML with properly mapped images
 */
export async function processInstructionsHTML(html, setId, mediaImages = []) {
  if (!html || !setId) return html;

  console.log(`🔍 Processing Instructions with MM code mapping (setId: ${setId})`);
  console.log(`📸 Available media images: ${mediaImages.length}`);
  console.log('📋 Original HTML sample:', html.substring(0, 500));
  
  // Fetch the actual media list from DailyMed to get correct MM mappings
  let actualMediaList = mediaImages;
  try {
    const mediaResponse = await fetch(`/api/dailymed/services/v2/spls/${setId}/media.json`);
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json();
      actualMediaList = mediaData.data?.media || mediaImages;
      console.log(`📋 Fetched ${actualMediaList.length} media files from DailyMed API`);
      console.log('📋 Actual media files:', actualMediaList.map(m => m.name));
    } else {
      console.warn('⚠️ Could not fetch media list, using provided mediaImages');
    }
  } catch (error) {
    console.warn('⚠️ Error fetching media list:', error);
  }
  
  let processedHTML = html;
  
  // Step 1: Clean up any existing double src attributes first
  processedHTML = cleanDoubleSrcAttributes(processedHTML);
  
  // Step 2: Fix the /counsel URL issue with proper MM code mapping
  processedHTML = fixCounselUrlIssue(processedHTML, setId, mediaImages);
  
  // Step 3: Map MM codes to actual image names using real media list
  processedHTML = mapMMCodesToImages(processedHTML, actualMediaList, setId);
  
  // Step 4: Fix any other malformed image URLs with complete replacement
  processedHTML = fixMalformedImageUrls(processedHTML, setId, mediaImages);
  
  // Step 5: Process ALL image patterns in SPL documents
  processedHTML = fixAllImageReferences(processedHTML, mediaImages, setId);
  
  // Step 4: Process renderMultiMedia elements if present
  if (processedHTML.includes('renderMultiMedia')) {
    processedHTML = processRenderMultiMedia(processedHTML, setId, mediaImages);
  }
  
  // Step 5: Process observationMedia elements if present
  if (processedHTML.includes('observationMedia')) {
    processedHTML = processObservationMedia(processedHTML, setId, mediaImages);
  }
  
  // Step 6: Smart injection for figure references without explicit images
  const references = detectAllReferences(processedHTML);
  const hasExistingImages = processedHTML.includes('<img') || processedHTML.includes('instruction-figure');
  
  if (references.length > 0 && !hasExistingImages && mediaImages.length > 0) {
    console.log(`🎯 Found ${references.length} references, injecting images...`);
    processedHTML = injectImagesForReferences(processedHTML, references, mediaImages, setId);
  }
  
  // Step 7: Clean up any remaining metadata elements
  processedHTML = processedHTML.replace(/<observationMedia[^>]*>[\s\S]*?<\/observationMedia>/gi, '');
  
  // Step 8: Final comprehensive cleanup
  processedHTML = finalImageCleanup(processedHTML, setId, mediaImages);
  
  // Step 9: Final validation - ensure all img tags have proper URLs
  processedHTML = ensureProperImageUrls(processedHTML, setId, mediaImages);
  
  console.log('📋 Image references found:', processedHTML.match(/<img[^>]*>/gi));
  console.log('📋 Final HTML sample:', processedHTML.substring(0, 500));
  
  return processedHTML;
}

/**
 * Clean up double src attributes that cause malformed HTML
 */
function cleanDoubleSrcAttributes(html) {
  console.log('🧹 Cleaning up double src attributes...');
  
  // Remove empty src="" attributes that precede another src attribute
  html = html.replace(/src=""\s+src="/gi, 'src="');
  html = html.replace(/src=''\s+src='/gi, "src='");
  
  // Fix cases where there are multiple src attributes in one img tag
  html = html.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, (match, before, src1, middle, src2, after) => {
    console.log('🔧 Found double src:', src1, '&', src2);
    // Use the non-empty src attribute
    const validSrc = src2 || src1;
    return `<img${before}src="${validSrc}"${middle}${after}>`;
  });
  
  return html;
}

/**
 * Map MM codes to actual image names using DailyMed media list
 */
function mapMMCodesToImages(html, mediaImages, setId) {
  if (!mediaImages.length) return html;
  
  console.log('🗺️ Mapping MM codes to actual filenames...');
  console.log('📋 Available media images:', mediaImages.map(img => img.name || img));
  
  // Extract all MM codes from the HTML
  const existingMMCodes = [...html.matchAll(/MM\d+/gi)].map(m => m[0]);
  console.log('🔍 Found MM codes in HTML:', existingMMCodes);
  
  // Create mapping using multiple strategies
  const mmCodeMap = {};
  
  existingMMCodes.forEach(mmCode => {
    const mmNumber = parseInt(mmCode.replace('MM', ''));
    let actualImageName = null;
    
    // Strategy 1: Direct index mapping (MM70 = index 0, MM71 = index 1, etc.)
    const indexOffset = 70; // Based on console logs showing MM70 being first
    const targetIndex = mmNumber - indexOffset;
    
    if (targetIndex >= 0 && targetIndex < mediaImages.length) {
      const mediaItem = mediaImages[targetIndex];
      actualImageName = mediaItem.name || mediaItem;
      console.log(`✅ Strategy 1 - Index mapping: ${mmCode} -> ${actualImageName} (index ${targetIndex})`);
    } else {
      // Strategy 2: Find by number pattern in filename
      const possibleImage = mediaImages.find(img => {
        const imgName = img.name || img;
        return imgName.includes(mmNumber.toString()) || 
               imgName.includes(mmNumber.toString().padStart(2, '0'));
      });
      
      if (possibleImage) {
        actualImageName = possibleImage.name || possibleImage;
        console.log(`✅ Strategy 2 - Pattern match: ${mmCode} -> ${actualImageName}`);
      } else {
        // Strategy 3: Sequential mapping based on order in HTML
        const mmCodeIndex = existingMMCodes.indexOf(mmCode);
        if (mmCodeIndex >= 0 && mmCodeIndex < mediaImages.length) {
          const mediaItem = mediaImages[mmCodeIndex];
          actualImageName = mediaItem.name || mediaItem;
          console.log(`✅ Strategy 3 - Sequential: ${mmCode} -> ${actualImageName} (seq index ${mmCodeIndex})`);
        }
      }
    }
    
    if (actualImageName) {
      mmCodeMap[mmCode] = actualImageName;
    } else {
      console.warn(`⚠️ No mapping found for ${mmCode}, using first image as fallback`);
      const fallback = mediaImages[0];
      mmCodeMap[mmCode] = fallback.name || fallback;
    }
  });
  
  console.log('🎯 Final MM code mappings:', mmCodeMap);
  
  // Replace MM codes in src attributes with actual image names
  html = html.replace(/src=["']([^"']*MM\d+[^"']*)["']/gi, (match, src) => {
    console.log('🔍 Processing MM code in src:', src);
    
    const mmCodeMatch = src.match(/MM\d+/i);
    if (mmCodeMatch) {
      const mmCode = mmCodeMatch[0];
      if (mmCodeMap[mmCode]) {
        const imageName = mmCodeMap[mmCode];
        const newUrl = buildImageUrl(imageName, setId);
        console.log(`✅ Replaced MM code: ${mmCode} -> ${imageName} -> ${newUrl}`);
        return `src="${newUrl}"`;
      }
    }
    
    return match;
  });
  
  // Replace MM codes in data-image-id attributes
  Object.entries(mmCodeMap).forEach(([mmCode, imageName]) => {
    const dataIdRegex = new RegExp(`(data-image-id=["'])([^"']*${mmCode}[^"']*)(["'])`, 'gi');
    html = html.replace(dataIdRegex, `$1${imageName}$3`);
    console.log(`🔄 Updated data-image-id: ${mmCode} -> ${imageName}`);
  });
  
  return html;
}

/**
 * Fix the specific /counsel URL issue - AGGRESSIVE FIXING
 */
function fixCounselUrlIssue(html, setId, mediaImages) {
  console.log('🚨 Fixing /counsel URL issue...');
  
  // First, completely replace any img tags with counsel URLs
  html = html.replace(/<img([^>]*?)src=["']([^"']*counsel[^"']*)["']([^>]*?)>/gi, (match, before, src, after) => {
    console.log('🔧 Found counsel URL in img tag:', src);
    
    // Extract any image reference from the path
    const imageMatch = src.match(/([a-zA-Z0-9\-_]+\.(jpg|jpeg|png|gif))/i);
    if (imageMatch) {
      const imageName = imageMatch[1];
      console.log('📸 Extracted image name from counsel URL:', imageName);
      const newUrl = buildImageUrl(imageName, setId);
      return `<img${before}src="${newUrl}"${after}>`;
    }
    
    // If no image found in path, use first available media image
    if (mediaImages.length > 0) {
      const fallbackImage = mediaImages[0];
      const imageName = fallbackImage.name || fallbackImage;
      console.log('🔄 Using fallback image for counsel URL:', imageName);
      const newUrl = buildImageUrl(imageName, setId);
      return `<img${before}src="${newUrl}"${after}>`;
    }
    
    // Remove broken image completely if no fallback available
    console.warn('⚠️ Removing broken counsel image - no fallback available');
    return '';
  });
  
  // Final cleanup - remove any remaining counsel references in src attributes
  html = html.replace(/src=["'][^"']*counsel[^"']*/gi, (match) => {
    if (mediaImages.length > 0) {
      const fallbackImage = mediaImages[0];
      const imageName = fallbackImage.name || fallbackImage;
      return `src="${buildImageUrl(imageName, setId)}"`;
    }
    return 'src=""';
  });
  
  return html;
}

/**
 * Process ALL image patterns in SPL documents
 */
function fixAllImageReferences(html, mediaImages, setId) {
  console.log('🔧 Processing ALL image patterns in SPL...');
  
  // Sort media images naturally to match figure order (handles complex numbering like dupixent-01.jpg through dupixent-130.jpg)
  const sortedImages = [...mediaImages].sort((a, b) => {
    const aName = a.name || a;
    const bName = b.name || b;
    
    // Extract numbers for natural sorting
    const aNum = parseInt(aName.match(/\d+/)?.[0] || '0');
    const bNum = parseInt(bName.match(/\d+/)?.[0] || '0');
    
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    
    // Fallback to alphabetical
    return aName.localeCompare(bName);
  });
  
  console.log('📋 Sorted images for natural order:', sortedImages.map(img => img.name || img));
  
  // Pattern 1: Fix existing img tags with any src
  html = html.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
    // Skip if already properly formatted
    if (src.startsWith('/api/dailymed-image')) {
      return match;
    }
    
    console.log('🔍 Processing existing img tag with src:', src);
    
    // Extract filename from any path
    const filename = src.split('/').pop().split('?')[0];
    console.log('📁 Extracted filename:', filename);
    
    // Find matching media image
    const mediaImage = sortedImages.find(img => {
      const imgName = img.name || img;
      return imgName.includes(filename) || filename.includes(imgName.replace(/\.(jpg|jpeg|png|gif)$/i, ''));
    });
    
    if (mediaImage) {
      const fixedSrc = buildImageUrl(mediaImage.name || mediaImage, setId);
      console.log('✅ Fixed img src:', src, '->', fixedSrc);
      return match.replace(src, fixedSrc);
    }
    
    console.warn('⚠️ No matching media image found for:', filename);
    return match;
  });
  
  // Pattern 2: Auto-inject images for figure references without img tags
  const figureRefs = html.match(/\b(Figure|Step|Panel|Diagram|Image|Illustration)\s+(\d+[A-Za-z]?)/gi) || [];
  console.log('🎯 Found figure references:', figureRefs);
  
  figureRefs.forEach((ref, index) => {
    // Only inject if we have enough images and this reference doesn't already have an image nearby
    if (index >= sortedImages.length) {
      console.warn('⚠️ Not enough images for reference:', ref, 'at index', index);
      return;
    }
    
    const img = sortedImages[index];
    const imgName = img.name || img;
    
    // Check if this image is already referenced in the HTML
    if (html.includes(imgName)) {
      console.log('ℹ️ Image already referenced:', imgName);
      return;
    }
    
    const imgTag = `<div class="auto-injected-figure"><img src="${buildImageUrl(imgName, setId)}" alt="${ref}" class="instruction-image" style="max-width: 100%; height: auto; margin: 1rem 0;" /></div>`;
    
    // Only inject if not already present
    const beforeLength = html.length;
    html = html.replace(new RegExp(`(${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'), `$1${imgTag}`);
    
    if (html.length > beforeLength) {
      console.log('✅ Injected image for reference:', ref, '->', imgName);
    }
  });
  
  return html;
}

/**
 * Build proper image URL with enhanced logic for DailyMed images
 */
function buildImageUrl(name, setId) {
  if (!name || !setId) return '';
  
  // Clean the image name
  let cleanName = name;
  
  // Handle different name formats
  if (cleanName.startsWith('MM')) {
    // MM codes should be handled by the mapping function first
    console.log('⚠️ MM code passed to buildImageUrl, should be mapped first:', cleanName);
  }
  
  // Remove any path components, keep just the filename
  cleanName = cleanName.split('/').pop();
  
  // Ensure proper file extension for images
  if (!cleanName.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
    // Try to determine extension or default to jpg
    if (cleanName.includes('jpg') || cleanName.includes('jpeg')) {
      cleanName += '.jpg';
    } else if (cleanName.includes('png')) {
      cleanName += '.png';
    } else if (cleanName.includes('gif')) {
      cleanName += '.gif';
    } else {
      cleanName += '.jpg'; // Default extension
    }
  }
  
  // Build the proxy URL (using 'id' parameter to match proxy configuration)
  const url = `/api/dailymed-image?name=${encodeURIComponent(cleanName)}&id=${setId}`;
  console.log(`🔗 Built image URL: ${name} -> ${url}`);
  
  return url;
}

/**
 * Fix malformed image URLs in existing img tags with complete replacement
 */
function fixMalformedImageUrls(html, setId, mediaImages) {
  // Fix any img src that doesn't start with /api/dailymed, http, or data:
  return html.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, src, after) => {
      // Skip if already properly formatted
      if (src.startsWith('/api/dailymed-image') || src.startsWith('http') || src.startsWith('data:')) {
        return match;
      }
      
      console.log(`🔧 Fixing malformed URL: ${src}`);
      
      // Extract just the filename from the path
      const filename = src.split('/').pop().split('?')[0];
      
      // Try to find matching image in mediaImages first
      if (mediaImages && mediaImages.length > 0) {
        const matchingImage = mediaImages.find(img => {
          const imgName = img.name || img;
          return imgName.includes(filename) || filename.includes(imgName.replace(/\.(jpg|jpeg|png|gif)$/i, ''));
        });
        
        if (matchingImage) {
          const imageName = matchingImage.name || matchingImage;
          const fixedUrl = buildImageUrl(imageName, setId);
          console.log(`✅ Fixed with matching image: ${src} -> ${fixedUrl}`);
          return `<img${before}src="${fixedUrl}"${after}>`;
        }
      }
      
      // Fallback to using filename with proxy
      const fixedUrl = buildImageUrl(filename, setId);
      console.log(`✅ Fixed with filename: ${src} -> ${fixedUrl}`);
      return `<img${before}src="${fixedUrl}"${after}>`;
    }
  );
}

/**
 * Process renderMultiMedia elements with smart mapping
 */
function processRenderMultiMedia(html, setId, mediaImages) {
  const sortedImages = [...mediaImages].sort((a, b) => {
    const nameA = (a.name || a).toLowerCase();
    const nameB = (b.name || b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  let imageIndex = 0;
  
  return html.replace(
    /<renderMultiMedia[^>]*referencedObject=["']([^"']+)["'][^>]*\/?>/gi,
    (match, refId) => {
      console.log(`📎 Processing renderMultiMedia: ${refId}`);
      
      // Try to extract any number from the reference
      const numMatch = refId.match(/\d+/);
      const targetIndex = numMatch ? parseInt(numMatch[0]) - 1 : imageIndex;
      
      // Get the image at the calculated index
      const image = sortedImages[targetIndex] || sortedImages[imageIndex];
      imageIndex++;
      
      if (!image) {
        console.warn(`⚠️ No image available for reference: ${refId}`);
        return match;
      }
      
      const imageName = image.name || image;
      const imgUrl = buildImageUrl(imageName, setId);
      
      return `<div class="instruction-figure" data-ref="${refId}">
                <img src="${imgUrl}" 
                     alt="Instructions Image ${targetIndex + 1}" 
                     class="instruction-image"
                     loading="eager"
                     style="max-width: 100%; height: auto; display: block; margin: 1rem auto;"
                     onerror="console.error('Failed to load: ${imageName}')">
              </div>`;
    }
  );
}

/**
 * Process observationMedia elements
 */
function processObservationMedia(html, setId, mediaImages) {
  // Extract observationMedia content first
  const mediaMap = {};
  const obsMediaRegex = /<observationMedia[^>]*ID=["']([^"']+)["'][^>]*>([\s\S]*?)<\/observationMedia>/gi;
  let match;
  
  while ((match = obsMediaRegex.exec(html)) !== null) {
    const id = match[1];
    const content = match[2];
    
    // Try to extract image reference from content
    const valueMatch = content.match(/value=["']([^"']+)["']/i);
    if (valueMatch) {
      mediaMap[id] = valueMatch[1];
      console.log(`📦 Found observationMedia ${id}: ${valueMatch[1]}`);
    }
  }
  
  // Now replace any references to these IDs
  Object.entries(mediaMap).forEach(([id, imageName]) => {
    const regex = new RegExp(`#${id}|${id}`, 'gi');
    const imgUrl = buildImageUrl(imageName, setId);
    const imgTag = `<img src="${imgUrl}" alt="${imageName}" class="instruction-image" style="max-width: 100%; height: auto;">`;
    
    html = html.replace(regex, imgTag);
  });
  
  return html;
}

/**
 * Inject images for detected references using smart mapping
 */
function injectImagesForReferences(html, references, mediaImages, setId) {
  // Sort media images alphabetically for consistent mapping
  const sortedImages = [...mediaImages].sort((a, b) => {
    const nameA = (a.name || a).toLowerCase();
    const nameB = (b.name || b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  console.log(`🗂️ Sorted ${sortedImages.length} images for mapping to ${references.length} references`);
  
  // Map each reference to an image based on position
  references.forEach((ref, index) => {
    if (index >= sortedImages.length) {
      console.warn(`⚠️ No image available for reference ${index + 1}: ${ref}`);
      return;
    }
    
    const image = sortedImages[index];
    const imageName = image.name || image;
    const imgUrl = buildImageUrl(imageName, setId);
    
    console.log(`🔗 Mapping ${ref} -> ${imageName}`);
    
    // Create image tag
    const imgTag = `
      <div class="instruction-figure auto-injected" data-reference="${ref}">
        <img src="${imgUrl}" 
             alt="${ref}" 
             class="instruction-image"
             loading="eager"
             style="max-width: 100%; height: auto; display: block; margin: 1rem auto;"
             onerror="console.error('Failed to load image for ${ref}: ${imageName}')">
        <div class="figure-caption" style="text-align: center; margin-top: 0.5rem; font-style: italic;">${ref}</div>
      </div>`;
    
    // Insert image after the first occurrence of the reference
    // Use a more precise regex to avoid replacing within tags
    const safeRef = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const insertRegex = new RegExp(`(${safeRef})(?![^<]*>)(?![^<]*<\/)`, 'i');
    
    if (insertRegex.test(html)) {
      html = html.replace(insertRegex, `$1${imgTag}`);
    } else {
      // If exact match fails, try a more lenient approach
      const lenientRegex = new RegExp(`(${safeRef})`, 'i');
      if (lenientRegex.test(html)) {
        html = html.replace(lenientRegex, `$1${imgTag}`);
      }
    }
  });
  
  return html;
}

/**
 * Final comprehensive cleanup that preserves correct image mappings
 */
function finalImageCleanup(html, setId, mediaImages) {
  console.log('🧹 Final comprehensive image cleanup - preserving mappings...');
  
  // Step 1: Fix images that have data-image-id attributes by using that ID for the src
  html = html.replace(/<img([^>]*?)src="[^"]*"([^>]*?)data-image-id="([^"]+)"([^>]*?)>/gi, 
    (match, before, middle, imageId, after) => {
      let imageName = imageId;
      
      console.log(`🔍 Processing image with data-image-id: ${imageId}`);
      
      // If it's an MM code, try to map it to actual image
      if (imageId.startsWith('MM') && mediaImages && mediaImages.length > 0) {
        const mmIndex = parseInt(imageId.substring(2)) - 3000006;
        if (mmIndex >= 0 && mmIndex < mediaImages.length) {
          imageName = mediaImages[mmIndex].name || mediaImages[mmIndex];
          console.log(`🔗 Mapped MM code ${imageId} -> ${imageName}`);
        }
      }
      
      // Use the actual image name from data-image-id or mapped name
      const newSrc = buildImageUrl(imageName, setId);
      console.log(`✅ Fixed src with data-image-id: ${imageId} -> ${newSrc}`);
      return `<img${before}src="${newSrc}"${middle}data-image-id="${imageId}"${after}>`;
    }
  );
  
  // Step 2: Fix any remaining double src issues more carefully
  html = html.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, (match, before, src1, middle, src2, after) => {
    // Choose the non-empty, more specific src
    let validSrc = src2;
    if (!src2 || src2.length === 0) {
      validSrc = src1;
    } else if (src1 && src1.startsWith('/api/dailymed-image') && !src2.startsWith('/api/dailymed-image')) {
      validSrc = src1; // Prefer already processed URLs
    }
    
    console.log(`🔧 Final fix double src: "${src1}" & "${src2}" -> using "${validSrc}"`);
    return `<img${before}src="${validSrc}"${middle}${after}>`;
  });
  
  // Step 3: Handle empty src attributes - but preserve any existing mappings
  html = html.replace(/<img([^>]*?)src=["']?["']?([^>]*?)>/gi, (match, before, after) => {
    // Only fix truly empty src attributes
    const srcMatch = match.match(/src=["']([^"']*)["']/);
    if (srcMatch && srcMatch[1] && srcMatch[1].length > 0) {
      return match; // Already has valid src, don't touch it
    }
    
    console.log('🔧 Found empty src attribute, looking for data-image-id...');
    
    // Look for data-image-id to determine correct image
    const imageIdMatch = match.match(/data-image-id=["']([^"']+)["']/);
    if (imageIdMatch) {
      let imageName = imageIdMatch[1];
      
      // Map MM codes to actual images
      if (imageName.startsWith('MM') && mediaImages && mediaImages.length > 0) {
        const mmIndex = parseInt(imageName.substring(2)) - 3000006;
        if (mmIndex >= 0 && mmIndex < mediaImages.length) {
          imageName = mediaImages[mmIndex].name || mediaImages[mmIndex];
        }
      }
      
      const fallbackUrl = buildImageUrl(imageName, setId);
      console.log(`✅ Fixed empty src with data-image-id: ${imageIdMatch[1]} -> ${imageName}`);
      return `<img${before}src="${fallbackUrl}"${after}>`;
    }
    
    // Only use first image as absolute last resort
    if (mediaImages && mediaImages.length > 0) {
      const fallbackImage = mediaImages[0];
      const imageName = fallbackImage.name || fallbackImage;
      const fallbackUrl = buildImageUrl(imageName, setId);
      console.log('⚠️ Using first image as absolute fallback for empty src');
      return `<img${before}src="${fallbackUrl}"${after}>`;
    }
    
    return match;
  });
  
  // Step 4: Clean up /counsel references in src attributes without destroying mappings
  html = html.replace(/<img([^>]*?)src=["']([^"']*counsel[^"']*)["']([^>]*?)>/gi, (match, before, src, after) => {
    console.log(`🚨 Found counsel URL in src: ${src}`);
    
    // Try to extract filename from the counsel path
    const filenameMatch = src.match(/([^\/]+\.(jpg|jpeg|png|gif))$/i);
    if (filenameMatch) {
      const filename = filenameMatch[1];
      const newUrl = buildImageUrl(filename, setId);
      console.log(`✅ Extracted filename from counsel URL: ${filename}`);
      return `<img${before}src="${newUrl}"${after}>`;
    }
    
    // Look for data-image-id as backup
    const imageIdMatch = match.match(/data-image-id=["']([^"']+)["']/);
    if (imageIdMatch) {
      let imageName = imageIdMatch[1];
      if (imageName.startsWith('MM') && mediaImages && mediaImages.length > 0) {
        const mmIndex = parseInt(imageName.substring(2)) - 3000006;
        if (mmIndex >= 0 && mmIndex < mediaImages.length) {
          imageName = mediaImages[mmIndex].name || mediaImages[mmIndex];
        }
      }
      const newUrl = buildImageUrl(imageName, setId);
      console.log(`✅ Used data-image-id for counsel URL: ${imageName}`);
      return `<img${before}src="${newUrl}"${after}>`;
    }
    
    // Last resort - use first image
    if (mediaImages && mediaImages.length > 0) {
      const fallbackImage = mediaImages[0];
      const imageName = fallbackImage.name || fallbackImage;
      const newUrl = buildImageUrl(imageName, setId);
      console.log('⚠️ Using first image as fallback for counsel URL');
      return `<img${before}src="${newUrl}"${after}>`;
    }
    
    return match;
  });
  
  return html;
}

/**
 * Ensure all img tags have proper proxy URLs without overriding existing mappings
 */
function ensureProperImageUrls(html, setId, mediaImages) {
  console.log('✅ Final URL validation - preserving existing mappings...');
  
  // Fix any remaining img tags that might have incorrect URLs
  return html.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, src, after) => {
      // Skip if already properly formatted
      if (src.startsWith('/api/dailymed-image') || src.startsWith('http') || src.startsWith('data:')) {
        return match;
      }
      
      console.log(`🔍 Final validation of src: ${src}`);
      
      // Look for data-image-id to preserve correct mapping
      const imageIdMatch = match.match(/data-image-id=["']([^"']+)["']/);
      if (imageIdMatch) {
        let imageName = imageIdMatch[1];
        
        // Map MM codes to actual images  
        if (imageName.startsWith('MM') && mediaImages && mediaImages.length > 0) {
          const mmIndex = parseInt(imageName.substring(2)) - 3000006;
          if (mmIndex >= 0 && mmIndex < mediaImages.length) {
            imageName = mediaImages[mmIndex].name || mediaImages[mmIndex];
            console.log(`🔗 Final MM mapping: ${imageIdMatch[1]} -> ${imageName}`);
          }
        }
        
        const properUrl = buildImageUrl(imageName, setId);
        console.log(`✅ Used data-image-id for final URL: ${imageName}`);
        return `<img${before}src="${properUrl}"${after} class="instruction-image" loading="eager">`;
      }
      
      // Extract filename from src and try to match with media images
      const filename = src.split('/').pop().split('?')[0];
      
      // Try to find matching media image
      if (mediaImages && mediaImages.length > 0) {
        const matchingImage = mediaImages.find(img => {
          const imgName = img.name || img;
          return imgName.includes(filename) || filename.includes(imgName.replace(/\.(jpg|jpeg|png|gif)$/i, ''));
        });
        
        if (matchingImage) {
          const imageName = matchingImage.name || matchingImage;
          const properUrl = buildImageUrl(imageName, setId);
          console.log(`✅ Final URL with matching image: ${src} -> ${imageName}`);
          return `<img${before}src="${properUrl}"${after} class="instruction-image" loading="eager">`;
        }
      }
      
      // Fallback to using filename with proxy
      const properUrl = buildImageUrl(filename, setId);
      console.log(`✅ Final URL with filename: ${src} -> ${filename}`);
      return `<img${before}src="${properUrl}"${after} class="instruction-image" loading="eager">`;
    }
  );
}

/**
 * Process multiple instruction sections if they exist
 */
export function processMultipleInstructionSections(sections, setId, mediaImages = []) {
  const processed = {};
  
  for (const [key, section] of Object.entries(sections)) {
    if (key.toLowerCase().includes('instruction') && section.text) {
      processed[key] = {
        ...section,
        text: processInstructionsHTML(section.text, setId, mediaImages)
      };
    } else {
      processed[key] = section;
    }
  }
  
  return processed;
}

/**
 * Extract filename from various path formats
 */
function extractFilename(path) {
  if (!path) return '';
  
  // Remove query strings and fragments
  let cleanPath = path.split('?')[0].split('#')[0];
  
  // Remove leading ./ or ../ or /
  cleanPath = cleanPath.replace(/^[.\/]+/, '');
  
  // Get the last part after any slashes
  const parts = cleanPath.split('/');
  let filename = parts[parts.length - 1];
  
  // If no extension, try to determine from context
  if (!filename.match(/\.[a-z]{3,4}$/i)) {
    // Default to .jpg for images
    filename += '.jpg';
  }
  
  return filename;
}

export default {
  processInstructionsHTML,
  processMultipleInstructionSections,
  detectAllReferences
};