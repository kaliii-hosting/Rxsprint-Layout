// Enhanced DailyMed API Service with Complete HTML and Image Support
import splParser from './splParser.js';
import splImageExtractor from './splImageExtractor.js';

class DailyMedService {
  constructor() {
    this.baseUrl = 'https://dailymed.nlm.nih.gov/dailymed';
    
    // Environment-aware API configuration
    this.isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
    
    // Always use proxy to avoid CORS issues
    // In development: Vite proxy handles it
    // In production: Netlify functions handle it
    this.proxyUrl = '/api/dailymed';
    
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    
    console.log(`DailyMed Service initialized: ${this.isDevelopment ? 'Development' : 'Production'} mode`);
    console.log(`Using API URL: ${this.proxyUrl} (proxied)`);
  }

  /**
   * Enhanced fetch wrapper with error handling
   */
  async safeFetch(url, options = {}) {
    console.log(`🌐 Making API request: ${url}`);
    
    try {
      // Simple headers since we're using proxy
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      const response = await fetch(url, fetchOptions);
      
      // Check if response is actually HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type') || '';
      console.log(`📄 Response Content-Type: ${contentType}`);
      
      if (!response.ok) {
        console.error(`❌ HTTP Error ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Verify we're getting JSON content
      if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
        console.warn(`⚠️ Unexpected content type: ${contentType}`);
        
        // Try to read response as text to see what we got
        const responseText = await response.text();
        console.error('❌ Non-JSON response received:', responseText.substring(0, 200));
        
        // If we got HTML, it's likely an error page
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          throw new Error('Server returned HTML instead of JSON - API endpoint may not exist');
        }
        
        // Try to parse as JSON anyway
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
      }

      const data = await response.json();
      console.log(`✅ API request successful: ${url}`);
      return data;
      
    } catch (error) {
      console.error(`💥 API request failed: ${url}`, error);
      
      // Re-throw with more context
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error(`Network error: Unable to reach ${this.isDevelopment ? 'proxy server' : 'DailyMed API'}. ${this.isDevelopment ? 'Check if dev server is running.' : 'Check internet connection.'}`);
      }
      
      throw error;
    }
  }

  // Clear all DailyMed cache
  clearCache() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('dailymed_') || key.includes('search_') || key.includes('details_') || key.includes('images_'))) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keys.length} DailyMed cache entries`);
    return keys.length;
  }

  // Get cached data
  getCachedData(key) {
    try {
      const cached = localStorage.getItem(`dailymed_${key}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < this.cacheExpiry) {
          return data.value;
        }
        localStorage.removeItem(`dailymed_${key}`);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  // Set cached data
  setCachedData(key, value) {
    const data = {
      value,
      timestamp: Date.now()
    };
    
    const serializedData = JSON.stringify(data);
    const sizeInMB = new Blob([serializedData]).size / (1024 * 1024);
    
    // Skip caching if data is too large (>5MB)
    if (sizeInMB > 5) {
      console.warn(`Data too large to cache (${sizeInMB.toFixed(2)}MB), skipping cache for key: ${key}`);
      return;
    }
    
    try {
      localStorage.setItem(`dailymed_${key}`, serializedData);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, performing aggressive cache cleanup...');
        this.aggressiveCacheCleanup();
        try {
          localStorage.setItem(`dailymed_${key}`, serializedData);
        } catch (retryError) {
          console.error('Cache write failed after aggressive cleanup:', retryError);
          // Clear all cache as last resort
          this.clearAllCache();
          try {
            localStorage.setItem(`dailymed_${key}`, serializedData);
          } catch (finalError) {
            console.error('Cache write failed even after clearing all cache:', finalError);
          }
        }
      } else {
        console.error('Cache write error:', error);
      }
    }
  }
  
  // Clear old cache entries
  clearOldCache() {
    const keysToRemove = [];
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dailymed_')) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (!cached.timestamp || cached.timestamp < oneHourAgo) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} old cache entries`);
  }

  // Aggressive cache cleanup - removes entries older than 10 minutes
  aggressiveCacheCleanup() {
    const keysToRemove = [];
    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000);
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dailymed_')) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (!cached.timestamp || cached.timestamp < tenMinutesAgo) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Aggressive cleanup: cleared ${keysToRemove.length} cache entries`);
  }

  // Clear all DailyMed cache
  clearAllCache() {
    const keysToRemove = [];
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dailymed_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared all cache: removed ${keysToRemove.length} entries`);
  }

  // Get autocomplete suggestions
  async getAutocompleteSuggestions(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    console.log('🔍 Getting autocomplete suggestions for:', searchTerm);
    
    try {
      // Use the same successful search endpoint but with smaller pagesize for autocomplete
      const url = `${this.proxyUrl}/services/v2/spls.json?drug_name=${encodeURIComponent(searchTerm)}&pagesize=8`;
      console.log('📡 Autocomplete URL:', url);
      
      const data = await this.safeFetch(url);
      console.log('📋 Raw API response structure:', {
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        sampleItems: data.data?.slice(0, 2)
      });
      
      const suggestions = [];
      const seen = new Set();
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`🔍 Processing ${data.data.length} autocomplete items`);
        
        data.data.forEach((item, index) => {
          // Just add brand_name as that's most commonly what users search for
          if (item.brand_name && !seen.has(item.brand_name.toLowerCase())) {
            suggestions.push(item.brand_name);
            seen.add(item.brand_name.toLowerCase());
          }
          
          // Also add drug_name if different from brand name
          if (item.drug_name && 
              item.drug_name !== item.brand_name && 
              !seen.has(item.drug_name.toLowerCase())) {
            suggestions.push(item.drug_name);
            seen.add(item.drug_name.toLowerCase());
          }
        });
      } else {
        console.warn('⚠️ No data.data array in autocomplete response');
      }
      
      console.log('✅ Final autocomplete suggestions:', suggestions);
      return suggestions.slice(0, 8);
      
    } catch (error) {
      console.error('❌ Autocomplete error:', error);
      return [];
    }
  }

  // Search medications (supports drug name and NDC)
  async searchMedications(searchTerm) {
    if (!searchTerm) return { results: [], count: 0 };
    
    const cacheKey = `search_${searchTerm.toLowerCase()}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('Returning cached search results');
      return cached;
    }
    
    try {
      // Check if search term looks like an NDC (format: ####-####-## or ##########)
      const isNDC = /^\d{4,5}-\d{3,4}-\d{1,2}$|^\d{10,11}$/.test(searchTerm.replace(/\s/g, ''));
      
      let url;
      if (isNDC) {
        // Search by NDC
        console.log('Detected NDC format, searching by NDC:', searchTerm);
        url = `${this.proxyUrl}/services/v2/spls.json?ndc=${encodeURIComponent(searchTerm.replace(/\s/g, ''))}&pagesize=25`;
      } else {
        // Search by drug name
        url = `${this.proxyUrl}/services/v2/spls.json?drug_name=${encodeURIComponent(searchTerm)}&pagesize=25`;
      }
      console.log('Searching medications:', url);
      
      const data = await this.safeFetch(url);
      const results = [];
      
      if (data.data && data.data.length > 0) {
        // Process all items in parallel for better performance
        const promises = data.data.map(async (item) => {
          // Fetch image and NDC codes in parallel
          const [imageUrl, ndcDataFromAPI] = await Promise.all([
            this.getPackageImage(item.setid),
            this.getNDCCodes(item.setid).catch(err => {
              console.error('Error fetching NDC codes:', err);
              return [];
            })
          ]);
          
          // Extract NDC codes from various possible fields
          let ndcCodes = [];
          
          // Try products field
          if (item.products && Array.isArray(item.products)) {
            ndcCodes = item.products.map(p => p.product_code || p.ndc || p.product_ndc).filter(Boolean);
          }
          
          // Try product_codes field
          if (!ndcCodes.length && item.product_codes) {
            if (Array.isArray(item.product_codes)) {
              ndcCodes = item.product_codes;
            } else if (typeof item.product_codes === 'string') {
              ndcCodes = [item.product_codes];
            }
          }
          
          // Try ndc field directly
          if (!ndcCodes.length && item.ndc) {
            if (Array.isArray(item.ndc)) {
              ndcCodes = item.ndc;
            } else if (typeof item.ndc === 'string') {
              ndcCodes = [item.ndc];
            }
          }
          
          // Try package_ndcs field
          if (!ndcCodes.length && item.package_ndcs) {
            if (Array.isArray(item.package_ndcs)) {
              ndcCodes = item.package_ndcs;
            } else if (typeof item.package_ndcs === 'string') {
              ndcCodes = item.package_ndcs.split(',').map(ndc => ndc.trim());
            }
          }
          
          // Use NDC codes from API if not found in search result
          if (!ndcCodes.length && ndcDataFromAPI && ndcDataFromAPI.length > 0) {
            ndcCodes = ndcDataFromAPI.map(ndc => ndc.ndcCode).filter(Boolean);
            console.log(`Found ${ndcCodes.length} NDC codes from API for ${item.brand_name || item.title}`);
          }
          
          return {
            setId: item.setid,
            title: item.title || `${item.brand_name} (${item.drug_name})`,
            brandName: item.brand_name || this.extractBrandName(item.title),
            genericName: item.drug_name || item.generic_name || this.extractGenericName(item.title),
            labelerName: item.labeler_name || this.extractLabelerName(item.title),
            dosageForm: item.dosage_form,
            route: item.route,
            marketingStatus: item.marketing_status,
            deaSchedule: item.dea_schedule,
            ndcCodes: ndcCodes,
            imageUrl: imageUrl,
            splVersion: item.spl_version,
            publishedDate: item.published_date
          };
        });
        
        // Wait for all items to be processed
        const processedResults = await Promise.all(promises);
        results.push(...processedResults);
      }
      
      const searchData = {
        results: results,
        count: data.metadata ? data.metadata.total_elements : results.length
      };

      this.setCachedData(cacheKey, searchData);
      return searchData;
    } catch (error) {
      console.error('Search error:', error);
      return { results: [], count: 0, error: error.message };
    }
  }

  // Get package image URL for search results
  async getPackageImage(setId) {
    try {
      // Use environment-aware URL for media fetching
      const mediaUrl = `${this.proxyUrl}/services/v2/spls/${setId}/media.json`;
      const mediaData = await this.safeFetch(mediaUrl);
      
      if (!mediaData) {
        console.warn(`Failed to fetch package image for ${setId}`);
        return null;
      }
      console.log('📦 Package image API response for', setId, ':', mediaData);
      
      // FIX: API returns data.media, not data.data
      if (mediaData.data && mediaData.data.media && Array.isArray(mediaData.data.media)) {
        // Prioritize package images first, then any image
        const packageImage = mediaData.data.media.find(m => {
          if (!m.mime_type?.includes('image')) return false;
          const name = m.name.toLowerCase();
          return name.includes('package') || name.includes('product') || 
                 name.match(/\b(tablet|capsule|pill|bottle|vial|syringe|pen)-?\d*\.(jpg|jpeg|png)$/i);
        });
        
        if (packageImage) {
          console.log('📦 Found package image:', packageImage.name);
          return packageImage.url; // Use the direct URL provided by API
        }
        
        // Fallback to first available image
        const firstImage = mediaData.data.media.find(m => m.mime_type?.includes('image'));
        if (firstImage) {
          console.log('📦 Using first available image:', firstImage.name);
          return firstImage.url; // Use the direct URL provided by API
        }
      }
      
      console.warn('📦 No images found in media data for', setId);
    } catch (error) {
      console.error('❌ Error fetching package image:', error);
    }
    return null;
  }

  // Extract brand name from title
  extractBrandName(title) {
    if (!title) return '';
    const match = title.match(/^([^(]+)/);
    return match ? match[1].trim() : title;
  }

  // Extract generic name from title
  extractGenericName(title) {
    if (!title) return '';
    const match = title.match(/\(([^)]+)\)/);
    return match ? match[1].trim() : '';
  }

  // Extract labeler from title
  extractLabelerName(title) {
    if (!title) return '';
    const match = title.match(/\[([^\]]+)\]/);
    return match ? match[1].trim() : '';
  }

  // Main method to get medication details with comprehensive parsing
  async getMedicationDetails(setId) {
    if (!setId) return null;

    const cacheKey = `details_${setId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('Returning cached medication details for:', setId);
      return cached;
    }

    try {
      console.log('Fetching medication details for setId:', setId);
      
      // Fetch all data sources in parallel for best coverage
      const [xmlDetails, mediaImages, ndcData, rxNormData, pharmacologicClass, history, packaging, drugNames, drugClasses] = await Promise.all([
        this.fetchAndParseXML(setId),
        this.fetchMediaImages(setId),
        this.getNDCCodes(setId),
        this.getRxNormMappings(setId),
        this.getPharmacologicClass(setId),
        this.getSPLHistory(setId),
        this.getPackagingInfo(setId),
        this.getDrugNames(setId),
        this.getDrugClasses(setId)
      ]);
      
      let details = null;
      
      if (xmlDetails && Object.keys(xmlDetails.sections).length > 0) {
        console.log('Successfully parsed XML with', Object.keys(xmlDetails.sections).length, 'sections');
        
        // Re-extract sections with media images for proper image handling
        console.log('Re-extracting sections with', mediaImages.length, 'media images');
        const instructionImgs = mediaImages.filter(img => img.isInstructionImage);
        console.log('📍 Found', instructionImgs.length, 'instruction images:', instructionImgs.map(img => img.name));
        xmlDetails.sections = this.extractSections(xmlDetails.parsedDoc, setId, mediaImages);
        
        details = xmlDetails;
      } else {
        // Try JSON fallback if XML failed
        console.log('XML parsing failed, trying JSON fallback');
        details = await this.fetchJSONDetails(setId) || { sections: {} };
      }
      
      // Add all supplementary data for complete medication information
      details.images = mediaImages;
      details.packages = ndcData;
      details.rxNormMappings = rxNormData;
      details.pharmacologicClass = pharmacologicClass;
      details.history = history;
      details.packaging = packaging;
      details.drugNames = drugNames;
      details.drugClasses = drugClasses;
      
      // Log comprehensive data availability
      console.log('Comprehensive medication data loaded:', {
        sections: Object.keys(details.sections || {}).length,
        images: mediaImages?.length || 0,
        ndcCodes: ndcData?.length || 0,
        rxNormMappings: rxNormData?.length || 0,
        pharmacologicClasses: pharmacologicClass?.length || 0,
        historyVersions: history?.length || 0,
        packagingInfo: packaging?.length || 0,
        drugNames: drugNames?.length || 0,
        drugClasses: drugClasses?.length || 0
      });
      
      // CRITICAL: Ensure all patient counseling sections are present
      console.log('🔍 Ensuring all critical counseling sections are present...');
      await this.ensureAllCriticalSections(details, setId);
      
      // No additional reference checking needed here since cleanupReferenceSections handles it
      
      console.log('📊 Final section count:', Object.keys(details.sections).length);
      console.log('📋 Sections available:', Object.keys(details.sections));
      
      return details;
    } catch (error) {
      console.error('Error getting medication details:', error);
      return this.getErrorDetails(setId, error.message);
    }
  }
  
  // Enhance details with HTML content if available
  async enhanceWithHTMLContent(details, setId) {
    try {
      // Try to fetch the HTML version which might have better formatting
      const htmlUrl = `${this.proxyUrl}/drugInfo.cfm?setid=${setId}`;
      const response = await fetch(htmlUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
      
      if (response.ok) {
        const htmlText = await response.text();
        // Extract any missing sections from HTML
        this.extractMissingSectionsFromHTML(details, htmlText, setId);
      }
    } catch (error) {
      console.log('Could not enhance with HTML content:', error.message);
    }
  }
  
  // Extract missing sections from HTML response
  extractMissingSectionsFromHTML(details, htmlText, setId) {
    // Check if Instructions for Use has complete figures
    if (details.sections.instructionsForUse && !details.sections.instructionsForUse.hasFigures) {
      // Look for figure references in HTML
      const figurePattern = /<img[^>]*src="[^"]*image\.cfm[^"]*"[^>]*>/gi;
      const figures = htmlText.match(figurePattern);
      if (figures && figures.length > 0) {
        console.log(`Found ${figures.length} figures in HTML for Instructions section`);
        // Mark that figures are available
        details.sections.instructionsForUse.hasFigures = true;
      }
    }
    
    // Extract any sections that might be missing from XML
    const sectionPatterns = {
      'recentMajorChanges': /<div[^>]*class="[^"]*RecentMajorChanges[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      'suppliedHow': /<div[^>]*class="[^"]*HowSupplied[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      'indications': [
        /<div[^>]*class="[^"]*[Ii]ndication[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<section[^>]*>[^<]*INDICATIONS\s+AND\s+USAGE[^<]*([\s\S]*?)<\/section>/i,
        /<h[1-6][^>]*>[^<]*INDICATIONS\s+AND\s+USAGE[^<]*<\/h[1-6]>\s*([\s\S]*?)(?=<h[1-6]|$)/i
      ]
    };
    
    for (const [key, patterns] of Object.entries(sectionPatterns)) {
      if (!details.sections[key]) {
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];
        let match = null;
        
        for (const pattern of patternArray) {
          match = htmlText.match(pattern);
          if (match && match[1]) {
            break;
          }
        }
        
        if (match && match[1]) {
          details.sections[key] = {
            title: this.formatSectionTitle(key),
            text: match[1],
            order: key === 'indications' ? 1 : 999, // Give indications higher priority
            source: 'html'
          };
          console.log(`Extracted missing section from HTML: ${key}`);
        }
      }
    }
  }

  // Fetch media images from the media.json endpoint
  async fetchMediaImages(setId) {
    try {
      // Use environment-aware URL for media fetching
      const mediaUrl = `${this.proxyUrl}/services/v2/spls/${setId}/media.json`;
      console.log('🖼️  Fetching media images from:', mediaUrl);
      
      const responseData = await this.safeFetch(mediaUrl);
      if (!responseData) {
        console.warn('❌ Media fetch failed for setId:', setId);
        return [];
      }
      console.log('📋 Raw media API response:', responseData);
      
      const images = [];
      
      // FIX: API returns data.media, not data.data
      if (responseData.data && responseData.data.media && Array.isArray(responseData.data.media)) {
        console.log(`🔍 Processing ${responseData.data.media.length} media items`);
        
        responseData.data.media.forEach((item, index) => {
          if (item.mime_type && item.mime_type.includes('image')) {
            console.log(`📸 Processing image ${index + 1}: ${item.name} (${item.mime_type})`);
            
            // Classify image types based on filename patterns
            const imageType = this.classifyImageType(item.name);
            
            // Check if the URL is valid or needs to be constructed
            let primaryUrl = item.url;
            if (!primaryUrl || !primaryUrl.startsWith('http')) {
              // If no valid URL, construct it using our proxy with 'id' parameter
              primaryUrl = `/api/dailymed-image?name=${encodeURIComponent(item.name)}&id=${setId}`;
            }
            
            // Create fallback URLs as backup - USE PROXY ONLY with 'id' parameter
            const fallbackUrls = [
              // Primary: Proxy through our server with id parameter
              `/api/dailymed-image?name=${encodeURIComponent(item.name)}&id=${setId}`,
              // Fallback 1: Proxy without id
              `/api/dailymed-image?name=${encodeURIComponent(item.name)}`,
              // Fallback 2: Try with .jpg extension through proxy
              `/api/dailymed-image?name=${encodeURIComponent(item.name.replace(/\.(jpg|jpeg|png|gif)$/i, '.jpg'))}&id=${setId}`
            ];
            
            images.push({
              name: item.name,
              url: primaryUrl,
              fallbacks: fallbackUrls,
              type: item.mime_type,
              imageType: imageType,
              size: item.size || 0,
              isPackageImage: imageType === 'package',
              isInstructionImage: imageType === 'instruction',
              isLabelImage: imageType === 'label'
            });
          }
        });
      } else {
        console.warn('⚠️  Unexpected API response structure:', responseData);
      }
      
      console.log(`✅ Successfully processed ${images.length} images for medication`);
      
      // Log image types for debugging
      const packageImages = images.filter(img => img.isPackageImage);
      const instructionImages = images.filter(img => img.isInstructionImage);
      const labelImages = images.filter(img => img.isLabelImage);
      
      console.log(`📦 Package images: ${packageImages.length}`);
      console.log(`📋 Instruction images: ${instructionImages.length}`);
      console.log(`🏷️  Label images: ${labelImages.length}`);
      
      return images;
    } catch (error) {
      console.error('❌ Error fetching media images:', error);
      return [];
    }
  }

  // Classify image type based on filename patterns
  classifyImageType(filename) {
    const name = filename.toLowerCase();
    
    // Instruction images (step-by-step usage) - Check FIRST for highest priority
    // Look for patterns like: ifu, figure, step, injection-sites, pfs (pre-filled syringe)
    if (name.includes('ifu') || 
        name.includes('figure') || 
        name.includes('step') || 
        name.includes('injection') ||
        name.includes('instruction') ||
        name.includes('diagram') ||
        name.match(/figure\s*[a-z]/i) ||  // Figure A, Figure B, etc.
        name.match(/pfs-ifu/i) ||  // Pre-filled syringe instructions
        name.match(/ifu-\d+/i) ||  // ifu-1, ifu-2, etc.
        name.match(/step-?\d+/i)) {  // step1, step-2, etc.
      return 'instruction';
    }
    
    // Label images (carton labels and packaging views)
    if (name.includes('carton') || 
        name.includes('label') || 
        name.includes('panel') ||
        name.includes('display')) {
      return 'label';
    }
    
    // Package/Product images (main product photos)
    // These are typically the first image or specifically named product images
    // Also look for brand names or dosage forms in the filename
    if (name.includes('package') || 
        name.includes('product') || 
        name.match(/^[a-z-]+-01\.(jpg|jpeg|png)$/i) ||  // First image (01) often is product
        name.match(/^[a-z-]+-1\.(jpg|jpeg|png)$/i) ||  // First image (1) often is product  
        name.match(/\b(tablet|capsule|pill|bottle|vial|syringe|pen|inhaler|patch|tube|kit|autoinjector)-?\d*\.(jpg|jpeg|png)$/i) ||
        // For Humira and similar - look for simple numbered patterns without ifu/figure
        (name.match(/^[a-z0-9-]+-\d{1,2}\.(jpg|jpeg|png)$/i) && !name.includes('ifu') && !name.includes('figure'))) {
      return 'package';
    }
    
    // Clinical/Graph images (charts, graphs, clinical data)
    if (name.includes('uspi') || 
        name.includes('graph') || 
        name.includes('chart') ||
        name.includes('table') ||
        name.includes('clinical')) {
      return 'clinical';
    }
    
    // Check for numbered patterns that are likely part of instruction sequences
    // Like taltz-20mg-pfs-ifu-3.jpg, taltz-ai-ifu-2-v2.jpg
    if (name.match(/-(ifu|pfs|ai)-.*\d+.*\.(jpg|jpeg|png)$/i)) {
      return 'instruction';
    }
    
    // Default classification for numbered images
    // If it's the first few numbered images (01-05), likely product images
    if (name.match(/-0[1-5]\.(jpg|jpeg|png)$/i)) {
      return 'package';
    }
    
    // Other numbered images at the end
    if (name.match(/-\d+\.(jpg|jpeg|png)$/i) || name.match(/-[0-9a-f]{2}\.(jpg|jpeg|png)$/i)) {
      // If it's just numbered at the end (beyond 05), likely a label
      return 'label';
    }
    
    // For unknown images, default to package to ensure they show up
    return 'package';
  }

  // Fetch comprehensive data from DailyMed (all sections at once)
  async fetchComprehensiveData(setId) {
    try {
      console.log('🔍 Attempting comprehensive data fetch for setId:', setId);
      
      // Fetch all data sources in parallel
      const [xmlData, jsonData, ndcData, mediaImages] = await Promise.all([
        this.fetchAndParseXML(setId).catch(err => {
          console.error('XML fetch failed:', err);
          return null;
        }),
        this.fetchJSONDetails(setId).catch(err => {
          console.error('JSON fetch failed:', err);
          return null;
        }),
        this.getNDCCodes(setId),
        this.fetchMediaImages(setId)
      ]);
      
      // Start with the best data source
      let details = xmlData || jsonData || { sections: {} };
      
      // Enhance with all available data
      if (!details.packages) details.packages = ndcData;
      if (!details.images) details.images = mediaImages;
      
      // Ensure all critical patient counseling sections are present
      await this.ensurePatientCounselingSections(details, setId);
      
      console.log('📊 Comprehensive fetch complete. Total sections:', Object.keys(details.sections).length);
      console.log('Sections found:', Object.keys(details.sections));
      
      return details;
    } catch (error) {
      console.error('Comprehensive fetch failed:', error);
      return null;
    }
  }
  
  // Clean up reference sections and ensure we have full content
  cleanupReferenceSections(sections) {
    if (!sections) return;
    
    // Critical sections that must have full content
    const criticalSections = ['dosage', 'patientCounselingInformation', 'patientInfo', 'indications', 'warningsAndPrecautions'];
    
    // First, identify which sections have reference content vs full content
    const sectionStatus = {};
    
    Object.keys(sections).forEach(key => {
      const text = sections[key]?.text || '';
      const hasReferenceText = text.includes('see Full Prescribing Information') || 
                               text.includes('For pretreatment recommendations') ||
                               text.includes('For dosage and administration modifications');
      const isShort = text.length < 500;
      
      sectionStatus[key] = {
        hasContent: text.length > 0,
        isReference: hasReferenceText && isShort,
        length: text.length
      };
    });
    
    // For each critical section, find the best available version
    criticalSections.forEach(sectionKey => {
      // Look for all related sections
      const relatedKeys = Object.keys(sections).filter(key => {
        // Match the base key or numbered variants
        return key === sectionKey || 
               key.startsWith(`${sectionKey}_`) ||
               (sectionKey === 'patientCounselingInformation' && (key === 'patientInfo' || key.startsWith('patientInfo_'))) ||
               (sectionKey === 'patientInfo' && (key === 'patientCounselingInformation' || key.startsWith('patientCounselingInformation_')));
      });
      
      if (relatedKeys.length === 0) {
        console.log(`⚠️ No ${sectionKey} section found`);
        return;
      }
      
      // Find the best version (longest non-reference content)
      let bestKey = null;
      let bestLength = 0;
      
      relatedKeys.forEach(key => {
        const status = sectionStatus[key];
        if (status.hasContent && !status.isReference && status.length > bestLength) {
          bestKey = key;
          bestLength = status.length;
        }
      });
      
      // If no non-reference version found, use the longest available
      if (!bestKey) {
        relatedKeys.forEach(key => {
          const status = sectionStatus[key];
          if (status.hasContent && status.length > bestLength) {
            bestKey = key;
            bestLength = status.length;
          }
        });
      }
      
      if (bestKey && bestKey !== sectionKey) {
        console.log(`✅ Using ${bestKey} as source for ${sectionKey} (${bestLength} chars)`);
        sections[sectionKey] = sections[bestKey];
        
        // Remove duplicates but keep the primary key
        relatedKeys.forEach(key => {
          if (key !== sectionKey) {
            delete sections[key];
          }
        });
      } else if (!bestKey) {
        console.warn(`❌ No valid content found for ${sectionKey}`);
      }
    });
    
    // Ensure patient counseling information is available under both common keys
    if (sections['patientInfo'] && !sections['patientCounselingInformation']) {
      sections['patientCounselingInformation'] = sections['patientInfo'];
    } else if (sections['patientCounselingInformation'] && !sections['patientInfo']) {
      sections['patientInfo'] = sections['patientCounselingInformation'];
    }
  }
  
  // Ensure ALL critical sections are complete
  async ensureAllCriticalSections(details, setId) {
    if (!details.sections) details.sections = {};
    
    // Priority sections that MUST be complete
    const criticalSections = [
      'patientCounselingInformation',
      'dosage',  // Dosage and Administration
      'patientInfo', 
      'medGuide',
      'instructionsForUse',
      'warningsAndPrecautions',
      'adverseReactions',
      'drugInteractions',
      'contraindications',
      'indications'
    ];
    
    console.log('🔍 Checking for critical sections...');
    console.log('Current sections available:', Object.keys(details.sections));
    
    // Special handling for Dosage and Administration - may be under different keys
    if (!details.sections['dosage'] || details.sections['dosage'].text.length < 100) {
      // Try to find dosage section under alternative names
      const dosageKeys = ['dosageAndAdministration', 'dosage', 'dosageAdministration', 'administration'];
      for (const key of Object.keys(details.sections)) {
        if (dosageKeys.some(dk => key.toLowerCase().includes(dk.toLowerCase()))) {
          if (!details.sections['dosage'] || details.sections[key].text.length > (details.sections['dosage']?.text?.length || 0)) {
            details.sections['dosage'] = details.sections[key];
            console.log(`📋 Found dosage section under key: ${key}`);
          }
        }
      }
    }
    
    // Special handling for Patient Counseling - may be under different keys
    if (!details.sections['patientCounselingInformation'] || details.sections['patientCounselingInformation'].text.length < 100) {
      const counselingKeys = ['patientCounseling', 'counseling', 'patientInfo', 'patientInformation'];
      for (const key of Object.keys(details.sections)) {
        if (counselingKeys.some(ck => key.toLowerCase().includes(ck.toLowerCase()))) {
          if (!details.sections['patientCounselingInformation'] || details.sections[key].text.length > (details.sections['patientCounselingInformation']?.text?.length || 0)) {
            details.sections['patientCounselingInformation'] = details.sections[key];
            console.log(`📋 Found patient counseling section under key: ${key}`);
          }
        }
      }
    }
    
    const missingSections = criticalSections.filter(key => 
      !details.sections[key] || !details.sections[key].text || details.sections[key].text.trim().length < 50
    );
    
    if (missingSections.length > 0) {
      console.log('⚠️ Missing or incomplete critical sections:', missingSections);
      
      // Try multiple recovery strategies
      
      // 1. Try direct XML extraction for missing sections
      if (details.parsedDoc) {
        console.log('📄 Attempting to re-extract missing sections from parsed XML document');
        missingSections.forEach(sectionKey => {
          if (!details.sections[sectionKey] || details.sections[sectionKey].text.length < 50) {
            // Try to find the section in the XML by multiple methods
            const section = this.findSectionInXML(details.parsedDoc, sectionKey);
            if (section && section.text && section.text.length > 50) {
              details.sections[sectionKey] = section;
              console.log(`✅ Recovered ${sectionKey} from XML re-extraction (${section.text.length} chars)`);
            }
          }
        });
      }
      
      // 2. Try the comprehensive fetch if we haven't already
      if (missingSections.filter(key => !details.sections[key] || !details.sections[key].text).length > 0) {
        try {
          const comprehensiveData = await this.fetchComprehensiveData(setId);
          if (comprehensiveData && comprehensiveData.sections) {
            missingSections.forEach(sectionKey => {
              if (comprehensiveData.sections[sectionKey] && 
                  comprehensiveData.sections[sectionKey].text &&
                  (!details.sections[sectionKey] || details.sections[sectionKey].text.length < 50)) {
                details.sections[sectionKey] = comprehensiveData.sections[sectionKey];
                console.log(`✅ Recovered ${sectionKey} from comprehensive fetch`);
              }
            });
          }
        } catch (err) {
          console.log('Comprehensive fetch failed:', err.message);
        }
      }
      
      // 3. Create placeholder sections for any still missing
      missingSections.forEach(sectionKey => {
        if (!details.sections[sectionKey]) {
          details.sections[sectionKey] = {
            title: this.formatSectionTitle(sectionKey),
            text: '<p><em>This section is not available in the current labeling.</em></p>',
            source: 'placeholder'
          };
          console.log(`ℹ️ Added placeholder for ${sectionKey}`);
        }
      });
    }
    
    return details;
  }
  
  // Find section directly in XML document
  findSectionInXML(doc, sectionKey) {
    // Map section keys to their LOINC codes
    const loincMap = {
      'patientCounselingInformation': ['88436-1', '34076-0', '68498-5'],
      'patientInfo': ['34076-0', '42232-9', '68498-5'],
      'medGuide': ['42230-3', '51945-4'],
      'instructionsForUse': ['42231-1', '51727-6', '69718-5', '69719-3', '59845-8'],
      'warningsAndPrecautions': ['43685-7', '34071-1'],
      'adverseReactions': ['34084-4'],
      'drugInteractions': ['34073-7'],
      'contraindications': ['34070-3'],
      'dosage': ['34068-7', '34068-0'],
      'indications': ['34067-9', '34067-0']
    };
    
    const loincCodes = loincMap[sectionKey] || [];
    
    // Try to find section by LOINC code
    for (const code of loincCodes) {
      const sections = doc.querySelectorAll(`section`);
      for (const section of sections) {
        const codeEl = section.querySelector('code');
        if (codeEl && codeEl.getAttribute('code') === code) {
          const titleEl = section.querySelector('title');
          const textEl = section.querySelector('text');
          
          if (textEl) {
            const htmlContent = this.extractCompleteHTML(textEl, '', sectionKey, []);
            if (htmlContent && htmlContent.trim().length > 50) {
              return {
                title: titleEl ? titleEl.textContent.trim() : this.formatSectionTitle(sectionKey),
                text: htmlContent,
                loincCode: code,
                source: 'xml-recovery'
              };
            }
          }
        }
      }
    }
    
    // Try to find by display name patterns
    const namePatterns = {
      'patientCounselingInformation': /patient\s+counseling/i,
      'patientInfo': /patient\s+information/i,
      'medGuide': /medication\s+guide/i,
      'instructionsForUse': /instructions\s+for\s+use/i,
      'warningsAndPrecautions': /warnings\s+and\s+precautions/i,
      'adverseReactions': /adverse\s+reactions/i,
      'drugInteractions': /drug\s+interactions/i,
      'contraindications': /contraindications/i,
      'dosage': /dosage\s+and\s+administration/i,
      'indications': /indications\s+and\s+usage/i
    };
    
    const pattern = namePatterns[sectionKey];
    if (pattern) {
      const sections = doc.querySelectorAll('section');
      for (const section of sections) {
        const codeEl = section.querySelector('code');
        const displayName = codeEl ? codeEl.getAttribute('displayName') : '';
        const titleEl = section.querySelector('title');
        const titleText = titleEl ? titleEl.textContent : '';
        
        if (pattern.test(displayName) || pattern.test(titleText)) {
          const textEl = section.querySelector('text');
          if (textEl) {
            const htmlContent = this.extractCompleteHTML(textEl, '', sectionKey, []);
            if (htmlContent && htmlContent.trim().length > 50) {
              return {
                title: titleEl ? titleEl.textContent.trim() : this.formatSectionTitle(sectionKey),
                text: htmlContent,
                source: 'xml-pattern-recovery'
              };
            }
          }
        }
      }
    }
    
    return null;
  }
  
  // Extract section from full HTML document
  extractSectionFromFullHTML(htmlText, sectionKey) {
    const patterns = {
      patientCounselingInformation: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?PATIENT\s+COUNSELING\s+INFORMATION[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="34076-0"[^>]*>([\s\S]*?)<\/section>/i
      ],
      patientInfo: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?PATIENT\s+INFORMATION[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="42232-9"[^>]*>([\s\S]*?)<\/section>/i
      ],
      indications: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?(?:1\s+)?INDICATIONS\s+AND\s+USAGE[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?\d?\s*[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="34067-9"[^>]*>([\s\S]*?)<\/section>/i
      ],
      dosage: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?(?:2\s+)?DOSAGE\s+AND\s+ADMINISTRATION[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?\d?\s*[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="34068-7"[^>]*>([\s\S]*?)<\/section>/i
      ],
      warningsAndPrecautions: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?(?:5\s+)?WARNINGS\s+AND\s+PRECAUTIONS[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?\d?\s*[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="43685-7"[^>]*>([\s\S]*?)<\/section>/i
      ],
      adverseReactions: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?(?:6\s+)?ADVERSE\s+REACTIONS[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?\d?\s*[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="34084-4"[^>]*>([\s\S]*?)<\/section>/i
      ],
      drugInteractions: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?(?:7\s+)?DRUG\s+INTERACTIONS[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?\d?\s*[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="34073-7"[^>]*>([\s\S]*?)<\/section>/i
      ],
      contraindications: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?(?:4\s+)?CONTRAINDICATIONS[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?\d?\s*[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="34070-3"[^>]*>([\s\S]*?)<\/section>/i
      ],
      medGuide: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?MEDICATION\s+GUIDE[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="42230-3"[^>]*>([\s\S]*?)<\/section>/i
      ],
      instructionsForUse: [
        /<(?:h[1-6]|div)[^>]*>[\s\S]*?INSTRUCTIONS\s+FOR\s+USE[\s\S]*?<\/(?:h[1-6]|div)>([\s\S]*?)(?=<(?:h[1-6]|div)[^>]*>[\s\S]*?[A-Z\s]{4,}[\s\S]*?<\/(?:h[1-6]|div)>|<\/body>|$)/i,
        /<section[^>]*data-section-code="42231-1"[^>]*>([\s\S]*?)<\/section>/i
      ]
    };
    
    const sectionPatterns = patterns[sectionKey] || [];
    
    for (const pattern of sectionPatterns) {
      const match = htmlText.match(pattern);
      if (match && match[1] && match[1].trim().length > 50) {
        return {
          title: this.formatSectionTitle(sectionKey),
          text: match[1].trim(),
          source: 'html-full-recovery'
        };
      }
    }
    
    return null;
  }
  
  // Ensure patient counseling sections are complete
  async ensurePatientCounselingSections(details, setId) {
    const counselingSections = [
      'patientCounselingInformation',
      'patientInfo',
      'medGuide',
      'instructionsForUse',
      'warningsAndPrecautions',
      'adverseReactions',
      'drugInteractions',
      'contraindications',
      'dosage',
      'indications'
    ];
    
    // Check if key counseling sections are missing
    const missingSections = counselingSections.filter(key => !details.sections[key] || !details.sections[key].text);
    
    if (missingSections.length > 0) {
      console.log('⚠️ Missing critical counseling sections:', missingSections);
      
      // Try to fetch from the rendered HTML version which might be more complete
      try {
        const htmlUrl = `${this.proxyUrl}/services/v2/spls/${setId}.html`;
        const response = await fetch(htmlUrl);
        
        if (response.ok) {
          const htmlText = await response.text();
          
          // Extract sections from HTML using pattern matching
          missingSections.forEach(sectionKey => {
            const sectionData = this.extractSectionFromHTML(htmlText, sectionKey);
            if (sectionData && sectionData.text) {
              details.sections[sectionKey] = sectionData;
              console.log(`✅ Recovered section from HTML: ${sectionKey}`);
            }
          });
        }
      } catch (err) {
        console.log('Could not fetch HTML version for section recovery');
      }
    }
    
    return details;
  }
  
  // Extract a specific section from HTML content
  extractSectionFromHTML(htmlText, sectionKey) {
    const sectionPatterns = {
      patientCounselingInformation: [
        /<h[1-6][^>]*>.*?PATIENT\s+COUNSELING\s+INFORMATION.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*counseling[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<div[^>]*class="[^"]*counseling[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      ],
      patientInfo: [
        /<h[1-6][^>]*>.*?PATIENT\s+INFORMATION.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*patient-info[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<div[^>]*class="[^"]*patient[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      ],
      indications: [
        /<h[1-6][^>]*>.*?INDICATIONS\s+AND\s+USAGE.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*indications[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<div[^>]*class="[^"]*indication[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      ],
      dosage: [
        /<h[1-6][^>]*>.*?DOSAGE\s+AND\s+ADMINISTRATION.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<h[1-6][^>]*>.*?2\s+DOSAGE\s+AND\s+ADMINISTRATION.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?\d\s+[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*dosage[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<div[^>]*class="[^"]*dosage[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*id="section-2"[^>]*>([\s\S]*?)(?=<div[^>]*id="section-\d+"|<\/body>|$)/i
      ],
      warningsAndPrecautions: [
        /<h[1-6][^>]*>.*?WARNINGS\s+AND\s+PRECAUTIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<h[1-6][^>]*>.*?5\s+WARNINGS\s+AND\s+PRECAUTIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?\d\s+[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*warnings[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        /<div[^>]*class="[^"]*warning[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      ],
      adverseReactions: [
        /<h[1-6][^>]*>.*?ADVERSE\s+REACTIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<h[1-6][^>]*>.*?6\s+ADVERSE\s+REACTIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?\d\s+[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*adverse[^"]*"[^>]*>([\s\S]*?)<\/section>/i
      ],
      drugInteractions: [
        /<h[1-6][^>]*>.*?DRUG\s+INTERACTIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<h[1-6][^>]*>.*?7\s+DRUG\s+INTERACTIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?\d\s+[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*drug-interaction[^"]*"[^>]*>([\s\S]*?)<\/section>/i
      ],
      contraindications: [
        /<h[1-6][^>]*>.*?CONTRAINDICATIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?[A-Z]{3,}|<\/body>|$)/i,
        /<h[1-6][^>]*>.*?4\s+CONTRAINDICATIONS.*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>.*?\d\s+[A-Z]{3,}|<\/body>|$)/i,
        /<section[^>]*id="[^"]*contraindication[^"]*"[^>]*>([\s\S]*?)<\/section>/i
      ]
    };
    
    const patterns = sectionPatterns[sectionKey] || [];
    
    for (const pattern of patterns) {
      const match = htmlText.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted text
        let text = match[1].trim();
        
        // Remove any nested section headers that don't belong
        text = text.replace(/<h[1-6][^>]*>.*?(?:FULL\s+PRESCRIBING|PRINCIPAL\s+DISPLAY).*?<\/h[1-6]>[\s\S]*$/i, '');
        
        // Ensure we captured meaningful content
        if (text.length > 50) {
          console.log(`✅ Extracted ${sectionKey} from HTML (${text.length} chars)`);
          return {
            title: this.formatSectionTitle(sectionKey),
            text: text,
            source: 'html-recovery'
          };
        }
      }
    }
    
    return null;
  }

  // Fetch and parse XML document
  async fetchAndParseXML(setId) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls/${setId}.xml`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch XML: ${response.status}`);
      }
      
      const xmlText = await response.text();
      
      // Use the new image extractor for better image categorization
      const imageData = splImageExtractor.extractAndCategorizeImages(xmlText, setId);
      console.log('Image extraction summary:', splImageExtractor.getSummary(imageData));
      
      // Parse the XML for sections
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      
      // Parse medication details from XML document
      const details = this.parseXMLDocument(doc, setId);
      
      // Add categorized images to details
      details.categorizedImages = imageData;
      details.productGalleryImages = imageData.productGallery;
      details.instructionImages = imageData.instructionsForUse;
      details.patientLabelingImages = imageData.patientLabeling;
      
      // Extract sections
      const sections = this.extractSections(doc, setId, imageData.productGallery);
      
      // Clean up sections - ensure we have full content, not references
      this.cleanupReferenceSections(sections);
      
      details.sections = sections;
      
      // Store parsed doc for later use
      details.parsedDoc = doc;
      
      return details;
    } catch (error) {
      console.error('Error in fetchAndParseXML:', error);
      // Continue with original implementation as fallback
    }
    
    // Original implementation as fallback
    try {
      const xmlUrl = `${this.proxyUrl}/services/v2/spls/${setId}.xml`;
      console.log('Fetching XML from:', xmlUrl);
      
      const response = await fetch(xmlUrl);
      if (!response.ok) {
        throw new Error(`XML fetch failed with status ${response.status}`);
      }

      const xmlText = await response.text();
      console.log('XML fetched, size:', xmlText.length, 'characters');
      
      // Parse XML
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        throw new Error('Failed to parse XML document');
      }
      
      return this.parseXMLDocument(doc, setId);
    } catch (error) {
      console.error('Error fetching/parsing XML:', error);
      throw error;
    }
  }

  // Parse XML document
  parseXMLDocument(doc, setId) {
    const details = {
      setId: setId,
      title: '',
      brandName: '',
      genericName: '',
      labelerName: '',
      effectiveTime: '',
      version: '',
      dosageForms: [],
      routes: [],
      sections: {}
    };

    // Extract title from the XML document
    const titleEl = doc.querySelector('title');
    if (titleEl) {
      details.title = titleEl.textContent.trim();
      details.brandName = this.extractBrandName(details.title);
      details.genericName = this.extractGenericName(details.title);
      details.labelerName = this.extractLabelerName(details.title);
    }

    // Extract effective time
    const effectiveTimeEl = doc.querySelector('effectiveTime');
    if (effectiveTimeEl) {
      const value = effectiveTimeEl.getAttribute('value');
      if (value && value.length >= 8) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        details.effectiveTime = `${month}/${day}/${year}`;
      }
    }

    // Extract version
    const versionEl = doc.querySelector('versionNumber');
    if (versionEl) {
      details.version = versionEl.getAttribute('value');
    }

    // Extract dosage forms
    const dosageFormElements = doc.querySelectorAll('formCode');
    const dosageFormSet = new Set();
    dosageFormElements.forEach(el => {
      const displayName = el.getAttribute('displayName');
      if (displayName) {
        dosageFormSet.add(displayName);
      }
    });
    details.dosageForms = Array.from(dosageFormSet);

    // Extract routes
    const routeElements = doc.querySelectorAll('routeCode');
    const routeSet = new Set();
    routeElements.forEach(el => {
      const displayName = el.getAttribute('displayName');
      if (displayName) {
        routeSet.add(displayName);
      }
    });
    details.routes = Array.from(routeSet);

    // Extract sections with proper ordering - need to pass mediaImages from getMedicationDetails
    const sections = this.extractSections(doc, setId, []);
    details.sections = sections;

    console.log('Parsed XML document:', {
      title: details.title,
      sectionsFound: Object.keys(sections).length,
      sectionNames: Object.keys(sections)
    });

    // Store the parsed document for re-processing with media images
    details.parsedDoc = doc;
    return details;
  }

  // Extract sections from XML document with proper DailyMed ordering
  extractSections(doc, setId, mediaImages = []) {
    // Try using the new SPL parser first for better accuracy
    try {
      // Convert DOM document to XML string for SPL parser
      const serializer = new XMLSerializer();
      const xmlText = serializer.serializeToString(doc);
      
      const splData = splParser.parseSPLDocument(xmlText, setId);
      if (splData && Object.keys(splData.sections).length > 0) {
        console.log('SPL Parser successfully extracted', Object.keys(splData.sections).length, 'sections');
        
        // Convert SPL parser format to our existing format
        const sections = {};
        Object.entries(splData.sections).forEach(([key, section]) => {
          sections[key] = {
            title: section.title,
            text: section.content,
            order: section.priority || 0,
            loincCode: section.loincCode,
            displayName: section.displayName,
            media: section.media || [],
            type: section.type
          };
        });
        
        // Log Instructions for Use sections specifically
        const iouSections = Object.entries(sections).filter(([k, v]) => 
          v.type === 'instructions-for-use' || k.includes('instructions')
        );
        if (iouSections.length > 0) {
          console.log('Found', iouSections.length, 'Instructions for Use sections:', 
            iouSections.map(([k, v]) => `${k} (LOINC: ${v.loincCode})`));
        }
        
        return sections;
      }
    } catch (error) {
      console.error('SPL Parser failed, falling back to original parser:', error);
    }
    
    // Fallback to original extraction method
    const sections = {};
    const unmappedSections = [];
    
    // Define DailyMed standard section order (comprehensive)
    const sectionOrder = [
      'boxedWarning',
      'highlights',
      'recentMajorChanges',
      'indications',
      'dosage',
      'dosageForms',
      'contraindications',
      'warnings',
      'warningsAndPrecautions',
      'adverseReactions',
      'drugInteractions',
      'useInSpecificPopulations',
      'pregnancy',
      'lactation',
      'femalesAndMalesOfReproductivePotential',
      'pediatricUse',
      'geriatricUse',
      'hepaticImpairment',
      'renalImpairment',
      'overdosage',
      'description',
      'clinicalPharmacology',
      'mechanismOfAction',
      'pharmacokinetics',
      'pharmacodynamics',
      'microbiology',
      'nonclinicalToxicology',
      'carcinogenesisMutagenesisImpairmentOfFertility',
      'animalToxicology',
      'clinicalStudies',
      'references',
      'howSupplied',
      'storage',
      'patientInfo',
      'patientCounselingInformation',
      'medGuide',
      'instructionsForUse',
      'principalDisplayPanel',
      'packaging',
      'ingredientsAndAppearance'
    ];
    
    // Find all section elements including nested ones
    const sectionElements = doc.querySelectorAll('section');
    console.log(`Found ${sectionElements.length} section elements in XML`);
    
    // Also look for component sections (sometimes sections are nested in components)
    const componentSections = doc.querySelectorAll('component > section');
    console.log(`Found ${componentSections.length} component sections`);
    
    // Combine all sections
    const allSections = [...sectionElements, ...componentSections];
    const uniqueSections = Array.from(new Set(allSections));
    
    // First pass: collect all sections
    const tempSections = {};
    
    // Check if we're processing highlights sections and skip them for critical content
    let currentlyInHighlights = false;
    
    uniqueSections.forEach((section, index) => {
      const codeEl = section.querySelector(':scope > code');
      if (!codeEl) return;
      
      const code = codeEl.getAttribute('code');
      const displayName = codeEl.getAttribute('displayName');
      const codeSystem = codeEl.getAttribute('codeSystem');
      
      if (!code) return;
      
      // Check if this is a highlights section (LOINC: 48780-1)
      if (code === '48780-1' || displayName?.toLowerCase().includes('highlights')) {
        currentlyInHighlights = true;
        console.log('⚠️ Entering highlights section - will skip reference content');
        return; // Skip the highlights section itself
      }
      
      // Check if we're inside highlights by looking at parent sections
      const parentSection = section.closest('section');
      if (parentSection && parentSection !== section) {
        const parentCode = parentSection.querySelector(':scope > code')?.getAttribute('code');
        if (parentCode === '48780-1') {
          console.log(`⚠️ Skipping section ${code} - ${displayName} (inside highlights)`);
          return; // Skip sections inside highlights
        }
      }
      
      // Get section key from LOINC code
      const sectionKey = this.mapLOINCToSection(code);
      
      // Special logging for indications section
      if (code === '34067-9' || displayName?.toLowerCase().includes('indication')) {
        console.log(`INDICATIONS section found: LOINC ${code}, mapped to: ${sectionKey}`);
      }
      
      if (!sectionKey) {
        // Store unmapped sections for potential fallback processing
        unmappedSections.push({
          code: code,
          displayName: displayName,
          codeSystem: codeSystem
        });
        console.warn(`Unmapped LOINC code: ${code} - ${displayName}`);
        
        // Try to create a section key from display name as fallback
        if (displayName) {
          const fallbackKey = this.createSectionKeyFromDisplayName(displayName);
          if (fallbackKey && !tempSections[fallbackKey]) {
            const titleEl = section.querySelector(':scope > title');
            const title = titleEl ? titleEl.textContent.trim() : displayName;
            const textEl = section.querySelector(':scope > text');
            
            if (textEl) {
              const htmlContent = this.extractCompleteHTML(textEl, setId, fallbackKey, mediaImages);
              if (htmlContent && htmlContent.trim()) {
                tempSections[fallbackKey] = {
                  title: title,
                  text: htmlContent,
                  code: code,
                  displayName: displayName,
                  source: 'unmapped'
                };
                console.log(`Added unmapped section with fallback key: ${fallbackKey}`);
              }
            }
          }
        }
        return;
      }
      
      // For subsections, check if we should merge with parent or keep separate
      const shouldMerge = this.shouldMergeSubsection(sectionKey);
      const targetKey = shouldMerge ? this.getParentSectionKey(sectionKey) : sectionKey;
      
      // Skip if we already have this section (unless merging)
      if (tempSections[targetKey] && !shouldMerge) return;
      
      // Get title
      const titleEl = section.querySelector(':scope > title');
      const title = titleEl ? titleEl.textContent.trim() : displayName || this.formatSectionTitle(sectionKey);
      
      // Extract complete HTML content from text element
      const textEl = section.querySelector(':scope > text');
      if (!textEl) return;
      
      const htmlContent = this.extractCompleteHTML(textEl, setId, sectionKey, mediaImages);
      
      if (htmlContent && htmlContent.trim()) {
        // Check if this is reference content (from highlights/summary sections)
        // Be more careful - only flag as reference if it's SHORT AND contains reference text
        const isReferenceContent = (htmlContent.length < 300 && 
                                    htmlContent.includes('see Full Prescribing Information')) ||
                                  (htmlContent.length < 200 && (
                                    htmlContent.includes('For pretreatment recommendations') ||
                                    htmlContent.includes('For dosage and administration modifications') ||
                                    htmlContent.includes('For instructions on preparation')
                                  ));
        
        if (shouldMerge && tempSections[targetKey]) {
          // Merge with existing section
          tempSections[targetKey].text += `\n<div class="subsection">\n<h3>${title}</h3>\n${htmlContent}\n</div>`;
          console.log(`Merged subsection ${sectionKey} into ${targetKey}`);
        } else {
          // If we already have this section and the new one looks like a reference, skip it
          if (tempSections[targetKey] && isReferenceContent) {
            console.log(`Skipping reference/summary content for ${targetKey} - already have full content`);
            return;
          }
          
          // If we have a reference section but find full content, replace it
          if (tempSections[targetKey] && !isReferenceContent && 
              tempSections[targetKey].text.includes('see Full Prescribing Information')) {
            console.log(`Replacing reference content with FULL content for ${targetKey}`);
          }
          
          // Only use content if it's not a reference OR if we have nothing else
          if (!isReferenceContent || !tempSections[targetKey]) {
            tempSections[targetKey] = {
              title: title,
              text: htmlContent,
              code: code,
              displayName: displayName,
              isReference: isReferenceContent
            };
            console.log(`Extracted section: ${targetKey} (LOINC: ${code}) - ${isReferenceContent ? 'REFERENCE' : 'FULL'} content (${htmlContent.length} chars)`);
            
            // Special logging for critical sections
            if (targetKey === 'indications' || targetKey === 'dosage' || targetKey === 'patientCounselingInformation') {
              console.log(`${targetKey.toUpperCase()} content length: ${htmlContent.length} characters`);
              console.log(`${targetKey.toUpperCase()} preview: ${htmlContent.substring(0, 200)}...`);
            }
          }
        }
      } else if (sectionKey === 'indications') {
        console.warn('INDICATIONS section found but no content extracted!');
      }
    });
    
    // Log summary of unmapped sections if any
    if (unmappedSections.length > 0) {
      console.log('Summary of unmapped LOINC codes:', unmappedSections);
    }
    
    // CRITICAL SECTION RESCUE: Aggressive search for missing key sections
    this.ensureCriticalSections(doc, tempSections, setId, mediaImages);
    
    // Log extraction results for audit
    console.log('📊 EXTRACTION AUDIT:', {
      totalSections: Object.keys(tempSections).length,
      sections: Object.keys(tempSections),
      sectionSizes: Object.entries(tempSections).map(([key, section]) => ({
        name: key,
        textLength: section.text ? section.text.length : 0,
        hasImages: section.text ? section.text.includes('<img') : false,
        hasTables: section.text ? section.text.includes('<table') : false
      }))
    });
    
    // Generate Table of Contents from extracted sections
    this.generateTableOfContents(tempSections);
    
    // Second pass: order sections according to DailyMed standard
    let orderIndex = 0;
    sectionOrder.forEach(sectionKey => {
      if (tempSections[sectionKey]) {
        sections[sectionKey] = {
          ...tempSections[sectionKey],
          order: orderIndex++
        };
      }
    });
    
    // Add any remaining sections not in standard order
    Object.keys(tempSections).forEach(sectionKey => {
      if (!sections[sectionKey]) {
        sections[sectionKey] = {
          ...tempSections[sectionKey],
          order: orderIndex++
        };
      }
    });
    
    return sections;
  }

  // Aggressive search for critical sections that might be missing
  ensureCriticalSections(doc, tempSections, setId, mediaImages) {
    console.log('🔍 CRITICAL SECTION RESCUE: Searching for missing key sections...');
    
    const criticalSections = {
      'highlights': {
        codes: ['42229-5', '48780-1'],
        patterns: ['highlight', 'prescribing information', 'highlights of prescribing', 'recent major changes', 'boxed warning'],
        required: true
      },
      'tableOfContents': {
        codes: ['43685-1', '34076-1'],
        patterns: ['table of contents', 'contents', 'toc'],
        required: false
      },
      'indications': {
        codes: ['34067-9', '34067-0', '34067'],
        patterns: [
          'indications and usage', 
          'indications & usage',
          'indications/usage',
          'indications', 
          'usage', 
          'indicated for', 
          'indication',
          'therapeutic indication',
          'what is.*used for',
          'approved indication',
          'clinical indication'
        ],
        required: true
      },
      'dosage': {
        codes: ['34068-7', '34068-0'],
        patterns: ['dosage and administration', 'dosage', 'administration', 'recommended dose', 'dose'],
        required: true
      }
    };
    
    Object.entries(criticalSections).forEach(([sectionKey, config]) => {
      if (tempSections[sectionKey]) {
        console.log(`✅ ${sectionKey} already found`);
        return;
      }
      
      console.log(`🚨 MISSING: ${sectionKey} - starting aggressive search...`);
      
      // Log all available sections first for debugging
      console.log(`📋 DEBUG: Available sections in XML:`, Array.from(doc.querySelectorAll('section')).map(s => {
        const codeEl = s.querySelector(':scope > code');
        const titleEl = s.querySelector(':scope > title');
        return {
          code: codeEl?.getAttribute('code'),
          displayName: codeEl?.getAttribute('displayName'),
          title: titleEl?.textContent?.trim()
        };
      }));
      
      // Strategy 1: Search by LOINC codes with fuzzy matching
      config.codes.forEach(code => {
        console.log(`🔍 Searching for LOINC code: ${code} for section: ${sectionKey}`);
        
        // Try multiple XPath variations
        const xpathVariations = [
          `//section[code[@code="${code}"]]`,
          `//section[descendant::code[@code="${code}"]]`,
          `//section/code[@code="${code}"]/..`,
          `//section[.//code[@code="${code}"]]`
        ];
        
        for (const xpath of xpathVariations) {
          try {
            console.log(`🔍 Trying XPath: ${xpath}`);
            const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (result.singleNodeValue) {
              this.extractSectionFromElement(result.singleNodeValue, sectionKey, tempSections, setId, mediaImages);
              console.log(`✅ Found ${sectionKey} via LOINC code ${code} with XPath: ${xpath}`);
              return;
            }
          } catch (e) {
            console.log(`XPath search failed for ${xpath}: ${e.message}`);
          }
        }
      });
      
      if (tempSections[sectionKey]) return;
      
      // Strategy 2: Search by display name patterns
      config.patterns.forEach(pattern => {
        const sections = doc.querySelectorAll('section');
        for (const section of sections) {
          const codeEl = section.querySelector(':scope > code');
          const titleEl = section.querySelector(':scope > title');
          
          if (codeEl || titleEl) {
            const displayName = codeEl?.getAttribute('displayName') || '';
            const title = titleEl?.textContent || '';
            const searchText = (displayName + ' ' + title).toLowerCase();
            
            if (searchText.includes(pattern.toLowerCase())) {
              this.extractSectionFromElement(section, sectionKey, tempSections, setId, mediaImages);
              console.log(`✅ Found ${sectionKey} via pattern "${pattern}"`);
              return;
            }
          }
        }
      });
      
      if (tempSections[sectionKey]) return;
      
      // Strategy 3: Deep search in all text content
      const allSections = doc.querySelectorAll('section');
      for (const section of allSections) {
        const textContent = section.textContent.toLowerCase();
        if (config.patterns.some(pattern => textContent.includes(pattern.toLowerCase()))) {
          // Found potential section, extract it
          this.extractSectionFromElement(section, sectionKey, tempSections, setId, mediaImages);
          console.log(`✅ Found ${sectionKey} via deep text search`);
          break;
        }
      }
      
      if (!tempSections[sectionKey] && config.required) {
        console.warn(`⚠️ Section '${sectionKey}' not found - this medication may not have this section`);
      }
    });
  }
  
  // Extract section content from a DOM element
  extractSectionFromElement(sectionElement, sectionKey, tempSections, setId, mediaImages) {
    if (!sectionElement) return;
    
    const titleEl = sectionElement.querySelector(':scope > title');
    const textEl = sectionElement.querySelector(':scope > text');
    const codeEl = sectionElement.querySelector(':scope > code');
    
    if (!textEl) {
      console.warn(`No text element found for ${sectionKey}`);
      return;
    }
    
    const title = titleEl ? titleEl.textContent.trim() : this.formatSectionTitle(sectionKey);
    const htmlContent = this.extractCompleteHTML(textEl, setId, sectionKey, mediaImages);
    
    if (htmlContent && htmlContent.trim()) {
      tempSections[sectionKey] = {
        title: title,
        text: htmlContent,
        code: codeEl?.getAttribute('code') || 'rescued',
        displayName: codeEl?.getAttribute('displayName') || title,
        source: 'critical_rescue'
      };
      console.log(`🎯 RESCUED: ${sectionKey} with ${htmlContent.length} characters of content`);
    }
  }

  // Generate Table of Contents from extracted sections
  generateTableOfContents(tempSections) {
    console.log('📚 Generating Table of Contents from extracted sections...');
    
    // Skip if TOC already exists
    if (tempSections['tableOfContents']) {
      console.log('✅ Table of Contents already exists, skipping generation');
      return;
    }
    
    // Define section display order for TOC
    const tocOrder = [
      'highlights',
      'boxedWarning', 
      'indications',
      'dosage',
      'dosageForms',
      'contraindications',
      'warningsAndPrecautions',
      'adverseReactions',
      'drugInteractions',
      'useInSpecificPopulations',
      'overdosage',
      'description',
      'clinicalPharmacology',
      'nonclinicalToxicology',
      'clinicalStudies',
      'references',
      'howSupplied',
      'patientInfo',
      'medGuide',
      'instructionsForUse',
      'instructionsForUse2',
      'instructionsForUse3',
      'instructionsForUse4',
      'principalDisplayPanel',
      'principalDisplayPanel2',
      'principalDisplayPanel3',
      'principalDisplayPanel4',
      'principalDisplayPanel5',
      'ingredientsAndAppearance'
    ];
    
    const tocItems = [];
    tocOrder.forEach(sectionKey => {
      if (tempSections[sectionKey]) {
        const section = tempSections[sectionKey];
        tocItems.push(`<li><a href="#${sectionKey}" class="toc-link">${section.title}</a></li>`);
      }
    });
    
    // Add any remaining sections not in the standard order
    Object.keys(tempSections).forEach(sectionKey => {
      if (!tocOrder.includes(sectionKey)) {
        const section = tempSections[sectionKey];
        tocItems.push(`<li><a href="#${sectionKey}" class="toc-link">${section.title}</a></li>`);
      }
    });
    
    if (tocItems.length > 0) {
      const tocHtml = `
        <div class="table-of-contents">
          <ul class="toc-list">
            ${tocItems.join('\n')}
          </ul>
        </div>
      `;
      
      tempSections['tableOfContents'] = {
        title: 'Table of Contents',
        text: tocHtml,
        code: 'generated',
        displayName: 'Table of Contents',
        source: 'generated'
      };
      
      console.log(`📚 Generated Table of Contents with ${tocItems.length} sections`);
    }
  }
  
  // Determine if a subsection should be merged with its parent
  shouldMergeSubsection(sectionKey) {
    const mergeableSubsections = [
      'pregnancy', 'lactation', 'pediatricUse', 'geriatricUse',
      'hepaticImpairment', 'renalImpairment', 'femalesAndMalesOfReproductivePotential',
      'mechanismOfAction', 'pharmacokinetics', 'pharmacodynamics', 'microbiology',
      'carcinogenesisMutagenesisImpairmentOfFertility', 'animalToxicology'
    ];
    return mergeableSubsections.includes(sectionKey);
  }
  
  // Get parent section key for subsections
  getParentSectionKey(subsectionKey) {
    const parentMap = {
      'pregnancy': 'useInSpecificPopulations',
      'lactation': 'useInSpecificPopulations',
      'pediatricUse': 'useInSpecificPopulations',
      'geriatricUse': 'useInSpecificPopulations',
      'hepaticImpairment': 'useInSpecificPopulations',
      'renalImpairment': 'useInSpecificPopulations',
      'femalesAndMalesOfReproductivePotential': 'useInSpecificPopulations',
      'mechanismOfAction': 'clinicalPharmacology',
      'pharmacokinetics': 'clinicalPharmacology',
      'pharmacodynamics': 'clinicalPharmacology',
      'microbiology': 'clinicalPharmacology',
      'carcinogenesisMutagenesisImpairmentOfFertility': 'nonclinicalToxicology',
      'animalToxicology': 'nonclinicalToxicology'
    };
    return parentMap[subsectionKey] || subsectionKey;
  }
  
  // Create section key from display name for unmapped sections
  createSectionKeyFromDisplayName(displayName) {
    if (!displayName) return null;
    
    // Common display name to section key mappings
    const displayNameMap = {
      'SPL PATIENT PACKAGE INSERT': 'patientPackageInsert',
      'PACKAGE LABEL.PRINCIPAL DISPLAY PANEL': 'principalDisplayPanel',
      'RECENT MAJOR CHANGES': 'recentMajorChanges',
      'FULL PRESCRIBING INFORMATION': 'fullPrescribingInfo',
      'PATIENT INFORMATION': 'patientInfo',
      'INFORMATION FOR PATIENTS': 'patientInfo',
      'INGREDIENTS AND APPEARANCE': 'ingredientsAndAppearance'
    };
    
    const upperDisplay = displayName.toUpperCase();
    for (const [key, value] of Object.entries(displayNameMap)) {
      if (upperDisplay.includes(key)) {
        return value;
      }
    }
    
    // Create a camelCase key from display name as last resort
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^\w/, char => char.toLowerCase());
  }

  // Extract complete HTML content including tables and formatting
  extractCompleteHTML(textEl, setId, sectionKey = '', mediaImages = []) {
    let html = '';
    // Check if this is any type of Instructions for Use section
    const isInstructionsSection = sectionKey.toLowerCase().includes('instructionsforuse') || 
                                   sectionKey.toLowerCase().includes('instructions_for_use') ||
                                   sectionKey.toLowerCase().includes('instructions-for-use') ||
                                   sectionKey.toLowerCase().includes('instructions') ||
                                   sectionKey === 'instructionsForUse' ||
                                   sectionKey === 'instructionsForUse2' ||
                                   sectionKey === 'instructionsForUse3' ||
                                   sectionKey === 'instructionsForUse4';
    
    // Check if this is dosage section which often has complex tables
    const isDosageSection = sectionKey.toLowerCase().includes('dosage') || 
                           sectionKey === 'dosage' ||
                           sectionKey.toLowerCase().includes('administration');
    
    // Check if this is patient counseling section
    const isCounselingSection = sectionKey.toLowerCase().includes('counseling') || 
                                sectionKey.toLowerCase().includes('patientinfo') ||
                                sectionKey === 'patientCounselingInformation';
    
    if (isInstructionsSection) {
      console.log(`🎯 Processing Instructions section: ${sectionKey}, mediaImages available: ${mediaImages.length}`);
    }
    
    if (isDosageSection) {
      console.log(`💊 Processing Dosage section: ${sectionKey} - ensuring ALL content including tables and subsections are preserved`);
    }
    
    if (isCounselingSection) {
      console.log(`👥 Processing Patient Counseling section: ${sectionKey} - ensuring complete extraction`);
    }
    
    // For critical sections, also check for subsections within the text element
    if (isDosageSection || isCounselingSection) {
      // Check if there are nested section elements (subsections)
      const nestedSections = textEl.querySelectorAll('section');
      if (nestedSections.length > 0) {
        console.log(`📦 Found ${nestedSections.length} nested subsections in ${sectionKey}`);
      }
    }
    
    // For Instructions sections, we need to get the raw XML to preserve renderMultiMedia tags
    let innerHTML = '';
    
    if (isInstructionsSection) {
      // For Instructions sections, we MUST preserve renderMultiMedia and observationMedia elements
      // These are SPL-specific XML elements that don't survive normal HTML parsing
      
      // Strategy 1: Try XMLSerializer first
      try {
        const serializer = new XMLSerializer();
        innerHTML = serializer.serializeToString(textEl);
        console.log('Used XMLSerializer for Instructions extraction');
      } catch (e) {
        console.log('XMLSerializer failed:', e);
        innerHTML = '';
      }
      
      // Strategy 2: If XMLSerializer didn't work or returned empty, try raw text
      if (!innerHTML || innerHTML === '[object XMLDocument]' || innerHTML.length < 100) {
        // Get the raw XML text - this should preserve all XML elements
        if (textEl.outerHTML) {
          innerHTML = textEl.outerHTML;
          console.log('Used outerHTML for Instructions extraction');
        } else if (textEl.innerHTML) {
          innerHTML = textEl.innerHTML;
          console.log('Used innerHTML for Instructions extraction');
        } else if (textEl.textContent) {
          // Last resort - but this will lose XML structure
          innerHTML = textEl.textContent;
          console.log('WARNING: Used textContent for Instructions extraction (XML structure lost)');
        }
      }
      
      // Log what we found
      console.log('Instructions extraction results:', {
        length: innerHTML.length,
        hasRenderMultiMedia: innerHTML.includes('renderMultiMedia'),
        hasObservationMedia: innerHTML.includes('observationMedia'),
        hasFigureRefs: /Figure\s+\d+/i.test(innerHTML),
        hasStepRefs: /Step\s+\d+/i.test(innerHTML),
        sample: innerHTML.substring(0, 200)
      });
      
      // If we have figure references but no renderMultiMedia, inject placeholders
      if (!innerHTML.includes('renderMultiMedia') && /\b(Figure|Step)\s+\d+/gi.test(innerHTML)) {
        console.log('No renderMultiMedia found but have figure references, injecting placeholders...');
        const figureRefs = innerHTML.match(/\b(Figure|Step)\s+\d+\b/gi);
        if (figureRefs) {
          const uniqueRefs = [...new Set(figureRefs)];
          console.log('Injecting placeholders for:', uniqueRefs);
          
          uniqueRefs.forEach(ref => {
            const num = ref.match(/\d+/)[0];
            const imageRef = `obsMedia-${num}`;
            const imageTag = `<renderMultiMedia referencedObject="${imageRef}"/>`;
            // Add the renderMultiMedia tag after the figure reference
            innerHTML = innerHTML.replace(
              new RegExp(`(${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'g'),
              `$1 ${imageTag}`
            );
          });
          console.log('Injected', uniqueRefs.length, 'renderMultiMedia placeholders');
        }
      }
    } else {
      // For non-instructions sections, use innerHTML
      innerHTML = textEl.innerHTML || '';
      
      // For critical sections, try XMLSerializer for complete extraction
      if ((isDosageSection || isCounselingSection) && (!innerHTML || innerHTML.length < 100)) {
        try {
          const serializer = new XMLSerializer();
          const serialized = serializer.serializeToString(textEl);
          if (serialized && serialized.length > innerHTML.length) {
            innerHTML = serialized;
            console.log(`Used XMLSerializer for ${sectionKey} - got ${serialized.length} chars`);
          }
        } catch (e) {
          console.log('XMLSerializer failed for critical section:', e);
        }
      }
    }
    
    // If innerHTML contains actual HTML tags, use it
    if (innerHTML && (innerHTML.includes('<table') || innerHTML.includes('<p>') || innerHTML.includes('<list') || innerHTML.includes('renderMultiMedia'))) {
      html = innerHTML;
      
      // First, check if we're dealing with CDATA content
      if (html.includes('<![CDATA[')) {
        // Extract CDATA content
        const cdataMatch = html.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
        if (cdataMatch) {
          html = cdataMatch[1];
          console.log('Extracted content from CDATA section');
        }
      }
      
      // Replace renderMultiMedia elements with actual images - handle complete elements
      html = html.replace(/<renderMultiMedia[^>]*>[\s\S]*?<\/renderMultiMedia>/gi, (match) => {
        console.log('Found renderMultiMedia element:', match.substring(0, 200));
        console.log(`Processing renderMultiMedia in section: ${sectionKey}, setId: ${setId}, isInstructionsSection: ${isInstructionsSection}`);
        
        // Try multiple patterns to find the image reference
        let imageName = null;
        
        // Look for referencedObject with value attribute
        const refObjPattern = /<referencedObject[^>]*value="([^"]+)"/i;
        const refObjMatch = match.match(refObjPattern);
        if (refObjMatch) {
          imageName = refObjMatch[1];
          console.log('Found image name from referencedObject:', imageName);
        }
        
        // Pattern 2: value attribute anywhere
        if (!imageName) {
          const valueMatch = match.match(/value="([^"]+)"/i);
          if (valueMatch) {
            imageName = valueMatch[1];
            console.log('Found image name from value attribute:', imageName);
          }
        }
        
        // Pattern 3: ID attribute
        if (!imageName) {
          const idMatch = match.match(/ID="([^"]+)"/i);
          if (idMatch) {
            imageName = idMatch[1];
            console.log('Found image name from ID:', imageName);
          }
        }

        // Pattern 4: Check for any filename with common image extensions
        if (!imageName) {
          const fileMatch = match.match(/([A-Za-z0-9_-]+\.(jpg|jpeg|png|gif|bmp|svg))/i);
          if (fileMatch) {
            imageName = fileMatch[1];
            console.log('Found image name from file pattern:', imageName);
          }
        }

        // Pattern 5: Look for Figure references (Figure1, Figure2, etc.)
        if (!imageName) {
          const figureMatch = match.match(/(Figure\d+(?:\.[a-z]{3,4})?)/i);
          if (figureMatch) {
            imageName = figureMatch[1];
            // Add .jpg if no extension
            if (!imageName.includes('.')) {
              imageName += '.jpg';
            }
            console.log('Found image name from Figure pattern:', imageName);
          }
        }

        // Pattern 6: Look for MM references (MM1.jpg, MM2.jpg etc.)
        if (!imageName) {
          const mmMatch = match.match(/(MM\d+(?:\.[a-z]{3,4})?)/i);
          if (mmMatch) {
            imageName = mmMatch[1];
            if (!imageName.includes('.')) {
              imageName += '.jpg';
            }
            console.log('Found image name from MM pattern:', imageName);
          }
        }
        
        // Extract caption if present
        let caption = '';
        const captionMatch = match.match(/<caption[^>]*>(.*?)<\/caption>/i);
        if (captionMatch) {
          caption = captionMatch[1].replace(/<[^>]+>/g, '').trim();
        }
        
        if (!imageName) {
          console.warn('Could not extract image name from renderMultiMedia element');
          return match; // Return original if we can't extract
        }
        if (imageName) {
          // Clean the image name (remove # prefix if present)
          imageName = imageName.replace(/^#/, '');
          
          // Remove any file extension if duplicated in the name
          if (imageName.includes('.')) {
            const parts = imageName.split('.');
            const extension = parts[parts.length - 1];
            // Check if extension appears twice (e.g., image.jpg.jpg)
            if (parts.length > 2 && parts[parts.length - 2] === extension) {
              imageName = parts.slice(0, -1).join('.');
            }
          }
          
          // Try to find the image in the media images first
          console.log('Trying to match renderMultiMedia image:', imageName, 'against', mediaImages.length, 'media images');
          let imageUrl;
          const mediaImage = mediaImages.find(img => {
            const match1 = img.name.toLowerCase().includes(imageName.toLowerCase());
            const match2 = imageName.toLowerCase().includes(img.name.toLowerCase().replace(/\.[^.]+$/, ''));
            console.log(`Testing ${img.name} vs ${imageName}: match1=${match1}, match2=${match2}`);
            return match1 || match2;
          });
          
          if (mediaImage) {
            // Use proxy URL to avoid CORS
            if (mediaImage.url && mediaImage.url.startsWith('http')) {
              // If it's already a full URL, use proxy
              imageUrl = `/api/dailymed-image?name=${encodeURIComponent(mediaImage.name)}&id=${setId}`;
            } else if (mediaImage.url) {
              // If it's a relative path, use proxy
              imageUrl = `/api/dailymed-image?name=${encodeURIComponent(mediaImage.name)}&id=${setId}`;
            } else {
              // Fallback to proxy with just the name
              imageUrl = `/api/dailymed-image?name=${encodeURIComponent(mediaImage.name)}&id=${setId}`;
            }
            console.log('Found matching media image:', mediaImage.name, '-> Using proxy URL:', imageUrl);
          } else {
            // Multiple fallback strategies for images
            const possibleUrls = [
              // Strategy 1: Proxy through our server with setid
              `/api/dailymed-image?name=${encodeURIComponent(imageName)}&id=${setId}`,
              // Strategy 2: Proxy without setid
              `/api/dailymed-image?name=${encodeURIComponent(imageName)}`,
              // Strategy 3: Try with .jpg extension through proxy
              `/api/dailymed-image?name=${encodeURIComponent(imageName.replace(/\.(jpg|jpeg|png|gif)$/i, '.jpg'))}&id=${setId}`,
              // Strategy 4: Try without extension
              `/api/dailymed-image?name=${encodeURIComponent(imageName.replace(/\.[^.]+$/, ''))}&id=${setId}`
            ];
            
            imageUrl = possibleUrls[0]; // Start with the most reliable
            console.log('Using fallback image URL:', imageUrl);
            console.log('Additional fallback URLs:', possibleUrls.slice(1));
          }
          
          // Special handling for Instructions section - add figure class
          const figureClass = isInstructionsSection ? 'dm-figure instruction-figure' : 'dm-figure';
          const imageClass = isInstructionsSection ? 'dm-image instruction-image' : 'dm-image';
          
          // Create multiple fallback URLs for robust image loading - USE PROXY
          const fallbackUrls = [
            // Primary: Proxy through our server with setid
            `/api/dailymed-image?name=${encodeURIComponent(imageName)}&id=${setId}`,
            // Fallback 1: Proxy without setid
            `/api/dailymed-image?name=${encodeURIComponent(imageName)}`,
            // Fallback 2: Proxy with .jpg extension if missing
            `/api/dailymed-image?name=${encodeURIComponent(imageName.includes('.') ? imageName : imageName + '.jpg')}&id=${setId}`
          ];

          // Start with first fallback if media image URL failed
          if (!mediaImage) {
            imageUrl = fallbackUrls[0];
          }

          // Create robust image element with cascading fallbacks
          const fallbackScript = `
            let currentIndex = 0;
            const fallbacks = ${JSON.stringify(fallbackUrls)};
            this.onerror = function() {
              currentIndex++;
              if (currentIndex < fallbacks.length) {
                console.warn('Image failed, trying fallback ' + currentIndex + ':', fallbacks[currentIndex]);
                this.src = fallbacks[currentIndex];
              } else {
                console.error('All image fallbacks failed for ${imageName}');
                this.style.background = '#f0f0f0';
                this.style.minHeight = '200px';
                this.style.border = '2px dashed #ccc';
                this.alt = 'Image failed to load: ${imageName}';
                this.onerror = null;
              }
            };
          `.replace(/\n\s*/g, ' ');

          const imgHtml = `
            <div class="${figureClass}" data-image-name="${imageName}" data-setid="${setId}" style="margin: 1.5rem auto; text-align: center;">
              <img src="${imageUrl}" 
                   class="${imageClass}" 
                   alt="${caption || imageName}" 
                   loading="eager"
                   style="display: block !important; max-width: 100%; height: auto; margin: 0 auto; border: 1px solid #ddd;"
                   onload="console.log('✅ Successfully loaded instruction image:', this.src);"
                   onerror="${fallbackScript}">
              ${caption ? `<div class="dm-figure-caption" style="font-size: 12px; color: #666; margin-top: 0.5rem;">${caption}</div>` : ''}
            </div>
          `;
          
          if (isInstructionsSection) {
            console.log(`📸 Inserting instruction image: ${imageName} with URL: ${imageUrl}`);
          }
          
          return imgHtml;
        }
        return '';
      });
      
      // Process observationMedia elements (for figures embedded in the XML)
      html = html.replace(/<observationMedia[^>]*>[\s\S]*?<\/observationMedia>/gi, (match) => {
        console.log('Found observationMedia element:', match.substring(0, 200));
        
        // Extract image reference from various patterns
        let imageName = null;
        
        // Pattern 1: value attribute in value element
        const valueMatch = match.match(/<value[^>]*value="([^"]+)"/i);
        if (valueMatch) {
          imageName = valueMatch[1];
          console.log('Found image from value element:', imageName);
        }
        
        // Pattern 2: direct value attribute
        if (!imageName) {
          const directValueMatch = match.match(/value="([^"]+)"/i);
          if (directValueMatch) {
            imageName = directValueMatch[1];
            console.log('Found image from direct value:', imageName);
          }
        }
        
        // Pattern 3: ID attribute
        if (!imageName) {
          const idMatch = match.match(/ID="([^"]+)"/i);
          if (idMatch) {
            imageName = idMatch[1];
            console.log('Found image from ID:', imageName);
          }
        }
        
        // Extract caption
        let caption = '';
        const captionMatch = match.match(/<text[^>]*>(.*?)<\/text>/i);
        if (captionMatch) {
          caption = captionMatch[1].replace(/<[^>]+>/g, '').trim();
        }
        
        if (!imageName) {
          console.warn('Could not extract image name from observationMedia element');
          return match;
        }
        if (imageName) {
          // Clean the image name
          imageName = imageName.replace(/^#/, '');
          
          // Remove any file extension if duplicated
          if (imageName.includes('.')) {
            const parts = imageName.split('.');
            const extension = parts[parts.length - 1];
            if (parts.length > 2 && parts[parts.length - 2] === extension) {
              imageName = parts.slice(0, -1).join('.');
            }
          }
          
          // Try to find the image in the media images first
          let imageUrl;
          const mediaImage = mediaImages.find(img => 
            img.name.toLowerCase().includes(imageName.toLowerCase()) ||
            imageName.toLowerCase().includes(img.name.toLowerCase().replace(/\.[^.]+$/, ''))
          );
          
          if (mediaImage) {
            // Use proxy URL to avoid CORS
            imageUrl = `/api/dailymed-image?name=${encodeURIComponent(mediaImage.name)}&id=${setId}`;
            console.log('Found matching observationMedia image:', mediaImage.name, '-> Using proxy URL:', imageUrl);
          } else {
            // Fallback to DailyMed image URL via proxy
            // Add proper extension if missing
            let imageFileName = imageName;
            if (!imageFileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
              imageFileName += '.jpg'; // Default to jpg
            }
            imageUrl = `/api/dailymed/image.cfm?setid=${setId}&name=${encodeURIComponent(imageFileName)}`;
            console.log('Using fallback proxy URL for observationMedia:', imageUrl);
          }
          
          const figureClass = isInstructionsSection ? 'dm-figure instruction-figure' : 'dm-figure';
          const imageClass = isInstructionsSection ? 'dm-image instruction-image' : 'dm-image';
          
          const obsImgHtml = `
            <div class="${figureClass}" data-image-name="${imageName}" data-setid="${setId}" style="margin: 1.5rem auto; text-align: center;">
              <img src="${imageUrl}" 
                   class="${imageClass}" 
                   alt="${caption || imageName}" 
                   loading="eager"
                   style="display: block !important; max-width: 100%; height: auto; margin: 0 auto; border: 1px solid #ddd;"
                   onerror="console.error('Failed to load observationMedia image:', '${imageUrl}');"
                   onload="console.log('✅ Successfully loaded observationMedia image:', '${imageUrl}');">
              ${caption ? `<div class="dm-figure-caption" style="font-size: 12px; color: #666; margin-top: 0.5rem;">${caption}</div>` : ''}
            </div>
          `;
          
          if (isInstructionsSection) {
            console.log(`📸 Inserting observationMedia image: ${imageName} with URL: ${imageUrl}`);
          }
          
          return obsImgHtml;
        }
        return '';
      });
      
      // Process linkHtml elements (figure references)
      html = html.replace(/<linkHtml[^>]*href="#([^"]+)"[^>]*>(.*?)<\/linkHtml>/gi, (match, ref, text) => {
        // Create anchor link to figure
        return `<a href="#${ref}" class="figure-reference">${text}</a>`;
      });
      
      // Process figure elements with IDs for linking
      html = html.replace(/<figure[^>]*>/gi, (match) => {
        const idMatch = match.match(/ID="([^"]+)"/i);
        if (idMatch) {
          return `<div class="dm-figure" id="${idMatch[1]}">`;
        }
        return '<div class="dm-figure">';
      });
      html = html.replace(/<\/figure>/gi, '</div>');
      
      // Convert XML table elements to HTML
      html = html.replace(/<table[^>]*>/gi, '<table class="dm-table">');
      html = html.replace(/<thead>/gi, '<thead>');
      html = html.replace(/<tbody>/gi, '<tbody>');
      html = html.replace(/<tr>/gi, '<tr>');
      html = html.replace(/<th([^>]*)>/gi, (match, attrs) => {
        return `<th${attrs}>`;
      });
      html = html.replace(/<td([^>]*)>/gi, (match, attrs) => {
        return `<td${attrs}>`;
      });
      
      // Convert paragraph elements
      html = html.replace(/<paragraph[^>]*>/gi, '<p>');
      html = html.replace(/<\/paragraph>/gi, '</p>');
      
      // Convert list elements
      html = html.replace(/<list[^>]*listType="ordered"[^>]*>/gi, '<ol>');
      html = html.replace(/<list[^>]*>/gi, '<ul>');
      html = html.replace(/<\/list>/gi, (match, offset, string) => {
        // Check what type of list this closes
        const beforeContent = string.substring(0, offset);
        const lastListOpen = Math.max(
          beforeContent.lastIndexOf('<ol>'),
          beforeContent.lastIndexOf('<ul>')
        );
        if (lastListOpen !== -1) {
          const isOrdered = beforeContent.substring(lastListOpen, lastListOpen + 3) === '<ol';
          return isOrdered ? '</ol>' : '</ul>';
        }
        return '</ul>';
      });
      html = html.replace(/<item>/gi, '<li>');
      html = html.replace(/<\/item>/gi, '</li>');
      
      // Convert content styling
      html = html.replace(/<content[^>]*styleCode="bold"[^>]*>(.*?)<\/content>/gi, '<strong>$1</strong>');
      html = html.replace(/<content[^>]*styleCode="italics"[^>]*>(.*?)<\/content>/gi, '<em>$1</em>');
      html = html.replace(/<content[^>]*styleCode="underline"[^>]*>(.*?)<\/content>/gi, '<u>$1</u>');
      html = html.replace(/<content[^>]*>(.*?)<\/content>/gi, '$1');
      
      // Handle sub and sup
      html = html.replace(/<sub>(.*?)<\/sub>/gi, '<sub>$1</sub>');
      html = html.replace(/<sup>(.*?)<\/sup>/gi, '<sup>$1</sup>');
      
      // Handle line breaks
      html = html.replace(/<br\/>/gi, '<br>');
      
      // Clean up any remaining XML tags
      html = html.replace(/<caption>/gi, '<div class="dm-figure-caption">');
      html = html.replace(/<\/caption>/gi, '</div>');
      
      // Process numbered steps for Instructions sections
      if (isInstructionsSection) {
        // Wrap numbered steps in special formatting
        html = html.replace(/<p>\s*(Step\s+\d+[:.])?\s*/gi, (match, step) => {
          if (step) {
            return `<p class="instruction-step"><span class="step-number">${step}</span> `;
          }
          return match;
        });
        
        // Handle warning boxes in instructions
        html = html.replace(/<p>\s*(Warning:|CAUTION:|Important:)/gi, '<p class="warning-box"><strong>$1</strong> ');
        
        // Process any remaining image references that might have been missed
        html = html.replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, (match, src) => {
          // If src doesn't start with http or /, it needs to be converted
          if (!src.startsWith('http') && !src.startsWith('/')) {
            const cleanSrc = src.replace(/^.*\//, ''); // Get just the filename
            const newSrc = `${this.proxyUrl}/image.cfm?name=${encodeURIComponent(cleanSrc)}&id=${setId}`;
            return match.replace(src, newSrc);
          }
          return match;
        });
        
        // Handle figure references from CDATA sections
        html = html.replace(/\[Figure\s+(\d+)\]/gi, '<span class="figure-ref">[Figure $1]</span>');
        html = html.replace(/See Figure\s+(\d+)/gi, '<a href="#figure$1" class="figure-reference">See Figure $1</a>');
      }
      
      // Special handling for critical sections to ensure complete extraction
      // ALWAYS ensure we have complete content for critical sections
      if (isDosageSection || isCounselingSection) {
        // Check if content seems to be a reference/summary
        const isReference = html.includes('see Full Prescribing Information') || 
                           html.includes('For pretreatment recommendations') ||
                           html.includes('For dosage and administration modifications') ||
                           html.includes('For instructions on preparation');
        
        if (isReference || html.length < 500) {
          console.log(`⚠️ ${sectionKey} appears to be a reference/summary (${html.length} chars), using FULL DOM extraction`);
          
          // Force complete extraction directly from DOM
          let fullContent = '';
          
          // Get all paragraphs
          const paragraphs = textEl.querySelectorAll('paragraph');
          paragraphs.forEach(p => {
            fullContent += `<p>${this.processChildren(p, setId, false)}</p>`;
          });
          
          // Get all lists
          const lists = textEl.querySelectorAll('list');
          lists.forEach(list => {
            const listType = list.getAttribute('listType') === 'ordered' ? 'ol' : 'ul';
            fullContent += `<${listType}>`;
            const items = list.querySelectorAll('item');
            items.forEach(item => {
              fullContent += `<li>${this.processChildren(item, setId, false)}</li>`;
            });
            fullContent += `</${listType}>`;
          });
          
          // Get all tables - CRITICAL for dosage sections
          const tables = textEl.querySelectorAll('table');
          tables.forEach(table => {
            fullContent += this.processTable(table, setId, false);
          });
          
          // Get all content elements
          const contents = textEl.querySelectorAll('content');
          contents.forEach(content => {
            fullContent += this.processChildren(content, setId, false);
          });
          
          if (fullContent.length > html.length) {
            html = fullContent;
            console.log(`✅ Extracted FULL ${sectionKey} content using DOM extraction (${fullContent.length} chars)`);
          }
        }
        
        // Also try to extract nested sections
        const nestedSections = textEl.querySelectorAll('section');
        if (nestedSections.length > 0) {
          let nestedHTML = '';
          nestedSections.forEach(section => {
            const titleEl = section.querySelector('title');
            const textEl = section.querySelector('text');
            if (titleEl && textEl) {
              const title = titleEl.textContent.trim();
              const content = this.processChildren(textEl, setId, false);
              if (content && content.length > 50) { // Only add if there's substantial content
                nestedHTML += `<div class="subsection"><h4>${title}</h4>${content}</div>`;
              }
            }
          });
          if (nestedHTML) {
            html += nestedHTML;
            console.log(`✅ Added ${nestedSections.length} subsections to ${sectionKey}`);
          }
        }
      }
      
      return html;
    }
    
    // Always use processXMLNodes for complete extraction
    // This ensures tables, lists, and images are properly processed
    return this.processXMLNodes(textEl, setId, isInstructionsSection || isDosageSection || isCounselingSection);
  }

  // Process XML nodes (fallback method)
  processXMLNodes(node, setId, isInstructionsSection = false) {
    let html = '';
    
    const processNode = (n) => {
      if (!n) return '';
      
      if (n.nodeType === Node.TEXT_NODE) {
        return n.textContent;
      }
      
      const nodeName = n.nodeName.toLowerCase();
      
      switch(nodeName) {
        case 'paragraph':
          return `<p>${this.processChildren(n, setId, isInstructionsSection)}</p>`;
          
        case 'list':
          const listType = n.getAttribute('listType') || 'unordered';
          const tag = listType === 'ordered' ? 'ol' : 'ul';
          const items = Array.from(n.querySelectorAll(':scope > item')).map(item => 
            `<li>${this.processChildren(item, setId, isInstructionsSection)}</li>`
          ).join('');
          return `<${tag}>${items}</${tag}>`;
          
        case 'table':
          return this.processTable(n, setId, isInstructionsSection);
          
        case 'content':
          const styleCode = n.getAttribute('styleCode') || '';
          const content = this.processChildren(n, setId, isInstructionsSection);
          if (styleCode === 'bold') return `<strong>${content}</strong>`;
          if (styleCode === 'italics') return `<em>${content}</em>`;
          if (styleCode === 'underline') return `<u>${content}</u>`;
          return content;
          
        case 'rendermultimedia':
          const referencedObject = n.querySelector('referencedObject');
          let imageName = null;
          
          if (referencedObject) {
            imageName = referencedObject.getAttribute('value');
          }
          
          // Also check for ID attribute
          if (!imageName) {
            imageName = n.getAttribute('ID');
          }
          
          if (imageName) {
            // Clean the image name - remove # and any path
            imageName = imageName.replace(/^#/, '').replace(/^.*\//, '');
            
            // For instructions images, ensure we get the correct image
            let imageUrl;
            if (isInstructionsSection) {
              // Try multiple formats for instruction images
              imageUrl = `${this.proxyUrl}/image.cfm?name=${encodeURIComponent(imageName)}&id=${setId}`;
              console.log(`🖼️ Instructions image: ${imageName} -> ${imageUrl}`);
            } else {
              imageUrl = `${this.proxyUrl}/image.cfm?name=${encodeURIComponent(imageName)}&id=${setId}`;
            }
            
            const caption = n.querySelector('caption');
            const captionText = caption ? caption.textContent : '';
            
            const figureClass = isInstructionsSection ? 'dm-figure instruction-figure' : 'dm-figure';
            const imageClass = isInstructionsSection ? 'dm-image instruction-image' : 'dm-image';
            const figureId = n.getAttribute('ID') ? ` id="figure${n.getAttribute('ID').replace(/\D/g, '')}"` : '';
            
            return `
              <div class="${figureClass}"${figureId}>
                <img src="${imageUrl}" class="${imageClass}" alt="${captionText || imageName}" loading="lazy" onerror="console.error('Failed to load image:', this.src)">
                ${captionText ? `<div class="dm-figure-caption">${captionText}</div>` : ''}
              </div>
            `;
          }
          return '';
          
        case 'br':
          return '<br>';
          
        case 'sub':
          return `<sub>${this.processChildren(n, setId, isInstructionsSection)}</sub>`;
          
        case 'sup':
          return `<sup>${this.processChildren(n, setId, isInstructionsSection)}</sup>`;
          
        default:
          return this.processChildren(n, setId, isInstructionsSection);
      }
    };
    
    Array.from(node.childNodes).forEach(child => {
      html += processNode(child);
    });
    
    return html;
  }

  // Process children nodes
  processChildren(node, setId, isInstructionsSection = false) {
    let content = '';
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        content += child.textContent;
      } else {
        content += this.processXMLNodes(child, setId, isInstructionsSection);
      }
    });
    return content;
  }

  // Process table elements
  processTable(tableNode, setId, isInstructionsSection = false) {
    let html = '<table class="dm-table">';
    
    // Process header
    const thead = tableNode.querySelector('thead');
    if (thead) {
      html += '<thead>';
      const rows = thead.querySelectorAll('tr');
      rows.forEach(row => {
        html += '<tr>';
        const cells = row.querySelectorAll('th, td');
        cells.forEach(cell => {
          const colspan = cell.getAttribute('colspan');
          const rowspan = cell.getAttribute('rowspan');
          const attrs = [];
          if (colspan) attrs.push(`colspan="${colspan}"`);
          if (rowspan) attrs.push(`rowspan="${rowspan}"`);
          // Process cell content recursively to preserve nested elements
          const cellContent = this.processChildren(cell, setId, isInstructionsSection);
          html += `<th ${attrs.join(' ')}>${cellContent}</th>`;
        });
        html += '</tr>';
      });
      html += '</thead>';
    }
    
    // Process body
    const tbody = tableNode.querySelector('tbody');
    const bodyRows = tbody ? tbody.querySelectorAll('tr') : tableNode.querySelectorAll('tr');
    
    if (bodyRows.length > 0) {
      html += '<tbody>';
      bodyRows.forEach(row => {
        html += '<tr>';
        const cells = row.querySelectorAll('td, th');
        cells.forEach(cell => {
          const colspan = cell.getAttribute('colspan');
          const rowspan = cell.getAttribute('rowspan');
          const attrs = [];
          if (colspan) attrs.push(`colspan="${colspan}"`);
          if (rowspan) attrs.push(`rowspan="${rowspan}"`);
          const tag = cell.nodeName.toLowerCase();
          // Process cell content recursively to preserve nested elements
          const cellContent = this.processChildren(cell, setId, isInstructionsSection);
          html += `<${tag} ${attrs.join(' ')}>${cellContent}</${tag}>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    
    html += '</table>';
    return html;
  }

  // Comprehensive LOINC code mapping based on FDA documentation
  mapLOINCToSection(code) {
    const map = {
      // Prescription Drug Labeling - Primary sections
      '34066-1': 'boxedWarning',
      '42229-5': 'highlights',
      '48780-1': 'highlights', // Alternative highlights code
      '34067-9': 'indications',
      '34067-0': 'indications', // Alternative indications code
      '34068-7': 'dosage',
      '34068-0': 'dosage', // Alternative dosage code
      '43678-2': 'dosageForms',
      '48779-3': 'dosageForms',
      '34070-3': 'contraindications',
      '34071-1': 'warnings',
      '43685-7': 'warningsAndPrecautions',
      '34084-4': 'adverseReactions',
      '34073-7': 'drugInteractions',
      '34074-5': 'useInSpecificPopulations',
      '34088-5': 'overdosage',
      '34089-3': 'description',
      '34090-1': 'clinicalPharmacology',
      '34091-9': 'nonclinicalToxicology',
      '34092-7': 'clinicalStudies',
      '34093-5': 'references',
      '34069-5': 'howSupplied',
      '44425-7': 'storage',
      '34076-0': 'patientInfo',
      '42232-9': 'patientInfo',
      '68498-5': 'patientInfo',
      
      // Medication Guide and Instructions
      '51945-4': 'medGuide',
      '42230-3': 'instructionsForUse',
      '51727-6': 'instructionsForUse',
      '69718-5': 'instructionsForUse',
      '69719-3': 'instructionsForUse',
      '48780-1': 'instructionsForUse',
      '42231-1': 'instructionsForUse',
      '59845-8': 'instructionsForUse',
      '43685-8': 'instructionsForUse',
      
      // Use in Specific Populations subsections
      '42228-7': 'pregnancy',
      '34080-2': 'lactation',
      '77290-5': 'lactation',
      '8356-8': 'femalesAndMalesOfReproductivePotential',
      '34081-0': 'pediatricUse',
      '34082-8': 'geriatricUse',
      '34085-1': 'hepaticImpairment',
      '88829-7': 'hepaticImpairment',
      '34086-9': 'renalImpairment',
      '88830-5': 'renalImpairment',
      
      // Clinical Pharmacology subsections
      '43679-0': 'mechanismOfAction',
      '43680-8': 'pharmacokinetics',
      '43681-6': 'pharmacodynamics',
      '49489-8': 'microbiology',
      
      // Nonclinical Toxicology subsections
      '43682-4': 'carcinogenesisMutagenesisImpairmentOfFertility',
      '43683-2': 'carcinogenesis',
      '43684-0': 'animalToxicology',
      
      // Additional sections
      '34072-9': 'clinicalStudies',
      '34075-2': 'labeling',
      '34077-8': 'clinicalStudies',
      '51947-0': 'formulationAndManufacturing',
      '51948-8': 'microbiology',
      '34086-2': 'clinicalStudiesExperience',
      '34078-6': 'ingredientsAndAppearance',
      '53411-5': 'packaging',
      '51945-7': 'principalDisplayPanel',
      
      // OTC Drug Facts sections
      '50569-6': 'otcPurpose',
      '50572-0': 'otcActiveIngredient',
      '55106-9': 'otcActiveIngredient',
      '50565-1': 'otcKeepOutOfReachOfChildren',
      '50565-4': 'otcWarnings',
      '34071-1': 'otcWarnings',
      '50567-0': 'otcInactiveIngredients',
      '53413-1': 'otcQuestions',
      '53414-9': 'otcWhenUsing',
      '50566-2': 'otcStopUse',
      '50568-5': 'otcAskDoctorPharmacist',
      '50568-8': 'otcDoNotUse',
      '50570-1': 'otcDoNotUse',
      '50570-4': 'otcAskDoctor',
      '50571-2': 'otcAskDoctorOrPharmacist',
      '50573-8': 'otcUses',
      '34067-0': 'otcIndications',
      '50574-6': 'otcDirections',
      '34068-0': 'otcDosageAndAdministration',
      '51724-3': 'otcOtherInformation',
      
      // Additional patient information sections
      '88436-1': 'patientCounselingInformation',
      '59845-5': 'summaryOfRiskAndBenefitInformation',
      '59846-3': 'importantDrugInformation',
      '34076-0': 'patientCounselingInformation', // Alternative code
      '68498-5': 'patientCounselingInformation', // Another alternative
      '53617-7': 'recentMajorChanges',
      '77264-0': 'accessibilityInformation',
      
      // Table of Contents
      '43685-1': 'tableOfContents',
      '34076-1': 'tableOfContents',
      
      // Multiple Instructions for Use sections (HUMIRA has multiple)
      '51726-8': 'instructionsForUse2',
      '51727-6': 'instructionsForUse3', 
      '51728-4': 'instructionsForUse4',
      '69718-5': 'instructionsForUse2',
      '69719-3': 'instructionsForUse3',
      
      // Principal Display Panel sections (multiple for different strengths/packages)
      '51945-7': 'principalDisplayPanel',
      '51946-5': 'principalDisplayPanel2',
      '51947-3': 'principalDisplayPanel3',
      '51948-1': 'principalDisplayPanel4',
      '51949-9': 'principalDisplayPanel5',
      '69717-7': 'principalDisplayPanel2',
      '69718-5': 'principalDisplayPanel3',
      
      // Ingredients and Appearance
      '34078-6': 'ingredientsAndAppearance',
      '51945-4': 'ingredientsAndAppearance',
      
      // SPL unclassified sections
      '42231-1': 'splUnclassifiedSection',
      '48779-3': 'splUnclassifiedSection',
      '49489-8': 'splUnclassifiedSection'
    };
    
    return map[code] || null;
  }

  // Fallback to JSON endpoint
  async fetchJSONDetails(setId) {
    try {
      const jsonUrl = `${this.proxyUrl}/services/v2/spls.json?setid=${setId}`;
      console.log('Fetching JSON fallback from:', jsonUrl);
      
      const data = await this.safeFetch(jsonUrl);
      if (!data || !data.data || data.data.length === 0) {
        throw new Error('No data found in JSON response');
      }
      
      const item = data.data[0];
      
      // Create structured details from JSON
      const details = {
        setId: setId,
        title: item.title,
        brandName: item.brand_name || this.extractBrandName(item.title),
        genericName: item.drug_name || item.generic_name || this.extractGenericName(item.title),
        labelerName: item.labeler_name || this.extractLabelerName(item.title),
        effectiveTime: item.published_date,
        version: item.spl_version,
        dosageForms: item.dosage_form ? [item.dosage_form] : [],
        routes: item.route ? [item.route] : [],
        sections: {}
      };
      
      // Try to fetch the full HTML content
      try {
        const htmlUrl = `${this.proxyUrl}/spl/stylesheet/${setId}/document`;
        const htmlResponse = await fetch(htmlUrl);
        if (htmlResponse.ok) {
          const htmlText = await htmlResponse.text();
          details.sections = this.parseHTMLSections(htmlText, setId);
        }
      } catch (htmlError) {
        console.warn('Could not fetch HTML content:', htmlError);
      }
      
      // If no sections were extracted, create basic sections
      if (Object.keys(details.sections).length === 0) {
        details.sections = this.createBasicSections(item);
      }
      
      return details;
    } catch (error) {
      console.error('JSON fallback error:', error);
      return null;
    }
  }

  // Parse sections from HTML content
  parseHTMLSections(htmlText, setId) {
    const sections = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Look for sections with specific classes or IDs
    const sectionMappings = {
      'boxed-warning': 'boxedWarning',
      'indications-usage': 'indications',
      'dosage-administration': 'dosage',
      'dosage-forms': 'dosageForms',
      'contraindications': 'contraindications',
      'warnings-precautions': 'warningsAndPrecautions',
      'adverse-reactions': 'adverseReactions',
      'drug-interactions': 'drugInteractions',
      'specific-populations': 'useInSpecificPopulations',
      'overdosage': 'overdosage',
      'description': 'description',
      'clinical-pharmacology': 'clinicalPharmacology',
      'how-supplied': 'howSupplied',
      'patient-counseling': 'patientInfo',
      'medication-guide': 'medGuide',
      'instructions-use': 'instructionsForUse'
    };
    
    // Define section order exactly matching DailyMed
    const sectionOrder = [
      'highlights',
      'tableOfContents', 
      'boxedWarning',
      'indications',
      'dosage',
      'dosageForms',
      'contraindications',
      'warningsAndPrecautions',
      'adverseReactions',
      'drugInteractions',
      'useInSpecificPopulations',
      'overdosage',
      'description',
      'clinicalPharmacology',
      'nonclinicalToxicology',
      'clinicalStudies',
      'references',
      'howSupplied',
      'patientInfo',
      'medGuide',
      'instructionsForUse',
      'instructionsForUse2',
      'instructionsForUse3',
      'instructionsForUse4',
      'principalDisplayPanel',
      'principalDisplayPanel2',
      'principalDisplayPanel3',
      'principalDisplayPanel4',
      'principalDisplayPanel5',
      'ingredientsAndAppearance'
    ];
    
    let orderIndex = 0;
    const tempSections = {};
    
    Object.entries(sectionMappings).forEach(([className, sectionKey]) => {
      const element = doc.querySelector(`.${className}`) || doc.querySelector(`#${className}`);
      if (element) {
        // Process images in the HTML
        let html = element.innerHTML;
        
        // Replace image sources
        html = html.replace(/src="([^"]+)"/gi, (match, src) => {
          if (!src.startsWith('http') && !src.startsWith('/')) {
            return `src="${this.proxyUrl}/image.cfm?name=${encodeURIComponent(src)}&id=${setId}"`;
          }
          return match;
        });
        
        tempSections[sectionKey] = {
          title: this.formatSectionTitle(sectionKey),
          text: html
        };
      }
    });
    
    // Order sections
    sectionOrder.forEach(sectionKey => {
      if (tempSections[sectionKey]) {
        sections[sectionKey] = {
          ...tempSections[sectionKey],
          order: orderIndex++
        };
      }
    });
    
    return sections;
  }

  // Create basic sections from JSON data
  createBasicSections(item) {
    const sections = {};
    let orderIndex = 0;
    
    if (item.indications_and_usage) {
      sections.indications = {
        title: 'Indications and Usage',
        text: `<p>${item.indications_and_usage}</p>`,
        order: orderIndex++
      };
    }
    
    if (item.dosage_and_administration) {
      sections.dosage = {
        title: 'Dosage and Administration',
        text: `<p>${item.dosage_and_administration}</p>`,
        order: orderIndex++
      };
    }
    
    if (item.warnings) {
      sections.warnings = {
        title: 'Warnings',
        text: `<p>${item.warnings}</p>`,
        order: orderIndex++
      };
    }
    
    return sections;
  }

  // Format section title
  formatSectionTitle(key) {
    const titles = {
      highlights: 'Highlights of Prescribing Information',
      tableOfContents: 'Table of Contents', 
      boxedWarning: 'Boxed Warning',
      indications: 'Indications and Usage',
      dosage: 'Dosage and Administration',
      dosageForms: 'Dosage Forms and Strengths',
      contraindications: 'Contraindications',
      warnings: 'Warnings',
      warningsAndPrecautions: 'Warnings and Precautions',
      adverseReactions: 'Adverse Reactions',
      drugInteractions: 'Drug Interactions',
      useInSpecificPopulations: 'Use in Specific Populations',
      overdosage: 'Overdosage',
      description: 'Description',
      clinicalPharmacology: 'Clinical Pharmacology',
      nonclinicalToxicology: 'Nonclinical Toxicology',
      clinicalStudies: 'Clinical Studies',
      references: 'References',
      howSupplied: 'How Supplied/Storage and Handling',
      storage: 'Storage and Handling',
      patientInfo: 'Patient Counseling Information',
      medGuide: 'Medication Guide',
      instructionsForUse: 'Instructions for Use',
      instructionsForUse2: 'Instructions for Use',
      instructionsForUse3: 'Instructions for Use', 
      instructionsForUse4: 'Instructions for Use',
      principalDisplayPanel: 'Principal Display Panel',
      principalDisplayPanel2: 'Principal Display Panel',
      principalDisplayPanel3: 'Principal Display Panel',
      principalDisplayPanel4: 'Principal Display Panel',
      principalDisplayPanel5: 'Principal Display Panel',
      ingredientsAndAppearance: 'Ingredients and Appearance'
    };
    
    return titles[key] || key.replace(/([A-Z])/g, ' $1').trim();
  }

  // Get NDC codes
  async getNDCCodes(setId) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls/${setId}/ndcs.json`;
      const data = await this.safeFetch(url);
      
      if (!data) return [];
      const packages = [];
      
      // Check if data.data exists and is an array
      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          packages.push({
            ndcCode: item.ndc || item.ndc_code,
            packageDescription: item.package_description || item.description,
            marketingStatus: item.marketing_status,
            marketingStartDate: item.marketing_start_date,
            marketingEndDate: item.marketing_end_date
          });
        });
      } else if (data && Array.isArray(data)) {
        // Sometimes the response is directly an array
        data.forEach(item => {
          packages.push({
            ndcCode: item.ndc || item.ndc_code,
            packageDescription: item.package_description || item.description,
            marketingStatus: item.marketing_status,
            marketingStartDate: item.marketing_start_date,
            marketingEndDate: item.marketing_end_date
          });
        });
      } else {
        console.log('NDC data format unexpected:', data);
      }
      
      return packages;
    } catch (error) {
      console.error('Error fetching NDC codes:', error);
      return [];
    }
  }

  // Get RxNorm mappings for a medication
  async getRxNormMappings(setId) {
    try {
      // Use the correct RxCUI endpoint as shown in the API documentation
      const url = `${this.proxyUrl}/services/v2/spls/${setId}/rxcuis.json`;
      console.log('Fetching RxNorm mappings from:', url);
      
      const data = await this.safeFetch(url);
      if (!data) {
        console.warn('RxNorm fetch failed for setId:', setId);
        return null;
      }
      const rxNormConcepts = [];
      
      // Parse RxNorm data structure
      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          rxNormConcepts.push({
            rxcui: item.rxcui || item.RXCUI,
            rxString: item.name || item.rxstring || item.RXSTRING,
            rxTty: item.tty || item.rxtty || item.RXTTY,
            synonyms: item.synonyms || []
          });
        });
        console.log(`Found ${rxNormConcepts.length} RxNorm concepts`);
      }
      
      return rxNormConcepts.length > 0 ? rxNormConcepts : null;
    } catch (error) {
      console.error('Error fetching RxNorm mappings:', error);
      return null;
    }
  }

  // Get SPL history for tracking version changes
  async getSPLHistory(setId) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls/${setId}/history.json`;
      console.log('Fetching SPL history from:', url);
      
      const data = await this.safeFetch(url);
      if (!data || !data.data) {
        console.warn('SPL history fetch failed for setId:', setId);
        return null;
      }
      
      // Return history with version information
      return data.data.map(item => ({
        version: item.spl_version || item.version,
        effectiveTime: item.effective_time,
        setId: item.spl_set_id || setId
      }));
    } catch (error) {
      console.error('Error fetching SPL history:', error);
      return null;
    }
  }

  // Get packaging information
  async getPackagingInfo(setId) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls/${setId}/packaging.json`;
      console.log('Fetching packaging info from:', url);
      
      const data = await this.safeFetch(url);
      if (!data || !data.data) {
        console.warn('Packaging info fetch failed for setId:', setId);
        return null;
      }
      
      // Return packaging descriptions
      return data.data;
    } catch (error) {
      console.error('Error fetching packaging info:', error);
      return null;
    }
  }

  // Get drug names
  async getDrugNames(setId) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls/${setId}/drugnames.json`;
      console.log('Fetching drug names from:', url);
      
      const data = await this.safeFetch(url);
      if (!data || !data.data) {
        console.warn('Drug names fetch failed for setId:', setId);
        return null;
      }
      
      // Return all drug names associated with this SPL
      return data.data;
    } catch (error) {
      console.error('Error fetching drug names:', error);
      return null;
    }
  }

  // Get drug classes using the correct endpoint
  async getDrugClasses(setId) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls/${setId}/drugclasses.json`;
      console.log('Fetching drug classes from:', url);
      
      const data = await this.safeFetch(url);
      if (!data || !data.data) {
        console.warn('Drug classes fetch failed for setId:', setId);
        return null;
      }
      
      // Return drug class information
      return data.data.map(item => ({
        className: item.drug_class || item.class_name,
        classCode: item.drug_class_code || item.code,
        classType: item.class_type || 'Pharmacologic',
        source: item.source || 'FDA'
      }));
    } catch (error) {
      console.error('Error fetching drug classes:', error);
      return null;
    }
  }

  // Get pharmacologic class information
  async getPharmacologicClass(setId) {
    try {
      // Try to extract from XML first as it's more reliable
      const xmlUrl = `${this.proxyUrl}/services/v2/spls/${setId}.xml`;
      const response = await fetch(xmlUrl);
      
      if (!response.ok) {
        console.warn('Pharmacologic class XML fetch failed:', response.status);
        return null;
      }
      
      const xmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      
      const pharmacologicClasses = [];
      
      // Look for pharmacologic class codes in the XML
      const pharmaClassElements = doc.querySelectorAll('generalizedMedicineClass code, pharm_class_moa code, pharm_class_pe code, pharm_class_epc code, pharm_class_cs code');
      
      pharmaClassElements.forEach(element => {
        const code = element.getAttribute('code');
        const displayName = element.getAttribute('displayName');
        const codeSystem = element.getAttribute('codeSystem');
        
        if (displayName) {
          // Determine the class type based on parent element
          let classType = 'General';
          const parentName = element.parentElement?.tagName;
          
          if (parentName?.includes('moa')) classType = 'Mechanism of Action';
          else if (parentName?.includes('pe')) classType = 'Physiologic Effect';
          else if (parentName?.includes('epc')) classType = 'Established Pharmacologic Class';
          else if (parentName?.includes('cs')) classType = 'Chemical Structure';
          
          pharmacologicClasses.push({
            code: code,
            name: displayName,
            type: classType,
            codeSystem: codeSystem
          });
        }
      });
      
      // Also check for activeIngredient elements which might have pharmacologic info
      const ingredientElements = doc.querySelectorAll('activeIngredient');
      ingredientElements.forEach(ingredient => {
        const classCode = ingredient.querySelector('activeMoiety code');
        if (classCode) {
          const displayName = classCode.getAttribute('displayName');
          if (displayName && !pharmacologicClasses.find(c => c.name === displayName)) {
            pharmacologicClasses.push({
              name: displayName,
              type: 'Active Ingredient Class',
              code: classCode.getAttribute('code')
            });
          }
        }
      });
      
      console.log(`Found ${pharmacologicClasses.length} pharmacologic classes`);
      return pharmacologicClasses.length > 0 ? pharmacologicClasses : null;
      
    } catch (error) {
      console.error('Error fetching pharmacologic class:', error);
      return null;
    }
  }

  // Get error details
  getErrorDetails(setId, errorMessage) {
    return {
      setId: setId,
      title: 'Error Loading Medication',
      brandName: 'Unknown',
      genericName: 'Unknown',
      labelerName: 'Unknown',
      sections: {
        error: {
          title: 'Error',
          text: `<p>Unable to load medication details: ${errorMessage}</p>`,
          order: 0
        }
      }
    };
  }

  // Get all drug classes from DailyMed
  async getDrugClasses() {
    try {
      const url = `${this.proxyUrl}/services/v2/drugclasses.json`;
      const data = await this.safeFetch(url);
      if (!data) return [];
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching drug classes:', error);
      return [];
    }
  }

  // Get all RxCUIs
  async getAllRxCuis() {
    try {
      const url = `${this.proxyUrl}/services/v2/rxcuis.json`;
      const data = await this.safeFetch(url);
      if (!data) return [];
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching RxCUIs:', error);
      return [];
    }
  }

  // Get all NDC codes
  async getAllNdcCodes() {
    try {
      const url = `${this.proxyUrl}/services/v2/ndcs.json`;
      const data = await this.safeFetch(url);
      if (!data) return [];
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching NDC codes:', error);
      return [];
    }
  }

  // Download label as PDF
  async downloadLabelPdf(setId) {
    try {
      const url = `${this.baseUrl}/downloadzipfile.cfm?setid=${setId}`;
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      return false;
    }
  }

  // Download label as ZIP
  async downloadLabelZip(setId) {
    try {
      const url = `${this.baseUrl}/downloadzipfile.cfm?setid=${setId}`;
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      return false;
    }
  }

  // Get product concepts for better search
  async getProductConcepts() {
    try {
      const url = `${this.proxyUrl}/services/v2/product_concepts.json`;
      const data = await this.safeFetch(url);
      if (!data) return [];
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching product concepts:', error);
      return [];
    }
  }

  // Get units list
  async getUnits() {
    try {
      const url = `${this.proxyUrl}/services/v2/units.json`;
      const data = await this.safeFetch(url);
      if (!data) return [];
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching units:', error);
      return [];
    }
  }

  // Search by drug class
  async searchByDrugClass(drugClass, limit = 25) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls.json?drug_class=${encodeURIComponent(drugClass)}&pagesize=${limit}`;
      const data = await this.safeFetch(url);
      if (!data) return { results: [], count: 0 };
      
      return this.processMedicationSearchResults(data);
    } catch (error) {
      console.error('Error searching by drug class:', error);
      return { results: [], count: 0 };
    }
  }

  // Search by RxCUI
  async searchByRxCui(rxcui) {
    try {
      const url = `${this.proxyUrl}/services/v2/spls.json?rxcui=${rxcui}`;
      const data = await this.safeFetch(url);
      if (!data) return { results: [], count: 0 };
      
      return this.processMedicationSearchResults(data);
    } catch (error) {
      console.error('Error searching by RxCUI:', error);
      return { results: [], count: 0 };
    }
  }

  // Process search results consistently
  processMedicationSearchResults(data) {
    const results = [];
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(item => {
        results.push({
          setId: item.setid || item.set_id,
          splId: item.splid || item.spl_id,
          title: item.title || `${item.brand_name || ''} ${item.drug_name ? `(${item.drug_name})` : ''}`.trim(),
          brandName: item.brand_name || item.title?.split('(')[0]?.trim() || '',
          genericName: item.drug_name || item.generic_name || '',
          labelerName: item.labeler_name || item.labeler || '',
          marketingStatus: item.marketing_status || 'Active',
          updated: item.updated || item.effective_time,
          dosageForms: item.dosage_forms || [],
          routes: item.routes || [],
          packageNdc: item.package_ndc || ''
        });
      });
    }
    
    return {
      results,
      count: data.metadata?.total_count || results.length
    };
  }
}

// Export singleton instance
const dailyMedService = new DailyMedService();
export default dailyMedService;