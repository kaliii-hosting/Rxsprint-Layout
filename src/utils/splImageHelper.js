// SPL Image Helper Utilities
// Helper functions for displaying categorized SPL images in UI components

/**
 * Process medication details and organize images by section
 * @param {Object} medicationDetails - The medication details from DailyMed
 * @returns {Object} Organized image data for display
 */
export function organizeImagesBySection(medicationDetails) {
  if (!medicationDetails) return null;
  
  const organized = {
    productGallery: [],
    instructionsForUse: {},
    patientLabeling: [],
    clinical: [],
    other: []
  };
  
  // Use categorized images if available (from new extractor)
  if (medicationDetails.categorizedImages) {
    return {
      productGallery: medicationDetails.categorizedImages.productGallery || [],
      instructionsForUse: medicationDetails.categorizedImages.instructionsForUse || {},
      patientLabeling: medicationDetails.categorizedImages.patientLabeling || [],
      clinical: medicationDetails.categorizedImages.clinical || [],
      other: medicationDetails.categorizedImages.other || []
    };
  }
  
  // Fallback: Process images from sections
  if (medicationDetails.sections) {
    Object.entries(medicationDetails.sections).forEach(([key, section]) => {
      // Check if section has media/images
      if (section.media && section.media.length > 0) {
        const sectionImages = section.media.map(media => ({
          ...media,
          sectionKey: key,
          sectionTitle: section.title
        }));
        
        // Categorize based on section key or type
        if (key.includes('principalDisplayPanel') || section.type === 'product-image') {
          organized.productGallery.push(...sectionImages);
        } else if (key.includes('instructionsForUse') || section.type === 'instructions-for-use') {
          const dosageForm = extractDosageFormFromTitle(section.title);
          const ifuKey = dosageForm || key;
          if (!organized.instructionsForUse[ifuKey]) {
            organized.instructionsForUse[ifuKey] = {
              title: section.title,
              images: []
            };
          }
          organized.instructionsForUse[ifuKey].images.push(...sectionImages);
        } else if (key === 'medGuide' || section.type === 'patient-labeling') {
          organized.patientLabeling.push(...sectionImages);
        } else if (['clinicalPharmacology', 'clinicalStudies', 'mechanismOfAction'].includes(key)) {
          organized.clinical.push(...sectionImages);
        } else {
          organized.other.push(...sectionImages);
        }
      }
    });
  }
  
  // Fallback: Use legacy images array
  if (medicationDetails.images && medicationDetails.images.length > 0) {
    medicationDetails.images.forEach(image => {
      // Try to categorize based on image properties
      if (image.isPackageImage || image.imageType === 'package') {
        organized.productGallery.push(image);
      } else if (image.isInstructionImage || image.imageType === 'instruction') {
        // Put all instruction images in a default IFU section
        if (!organized.instructionsForUse.default) {
          organized.instructionsForUse.default = {
            title: 'Instructions for Use',
            images: []
          };
        }
        organized.instructionsForUse.default.images.push(image);
      } else {
        organized.other.push(image);
      }
    });
  }
  
  return organized;
}

/**
 * Extract dosage form from section title
 */
function extractDosageFormFromTitle(title) {
  if (!title) return null;
  
  const patterns = [
    { pattern: /(\d+\s*mg\/\d+\.?\d*\s*mL)\s+pen/i, extract: (m) => `pen_${m[1].replace(/\s+/g, '')}` },
    { pattern: /(\d+\s*mg)\s+pen/i, extract: (m) => `pen_${m[1].replace(/\s+/g, '')}` },
    { pattern: /pen/i, extract: () => 'pen' },
    { pattern: /prefilled\s+syringe/i, extract: () => 'prefilled_syringe' },
    { pattern: /syringe/i, extract: () => 'syringe' },
    { pattern: /vial/i, extract: () => 'vial' },
    { pattern: /auto.*injector/i, extract: () => 'autoinjector' },
    { pattern: /inhaler/i, extract: () => 'inhaler' },
    { pattern: /nasal\s+spray/i, extract: () => 'nasal_spray' },
    { pattern: /injection/i, extract: () => 'injection' }
  ];
  
  for (const { pattern, extract } of patterns) {
    const match = title.match(pattern);
    if (match) {
      return extract(match);
    }
  }
  
  return null;
}

/**
 * Create display-ready image object with fallback URLs
 */
export function createImageObject(imageData, setId) {
  const baseUrl = 'https://dailymed.nlm.nih.gov/dailymed/image.cfm';
  
  // Generate multiple fallback URLs with different parameters
  const fallbacks = [];
  const imageName = imageData.ref || imageData.id;
  
  // Try different URL formats - DailyMed API doesn't need file extensions
  const cleanName = imageName.replace(/\.(jpg|jpeg|png|gif)$/i, '');
  fallbacks.push(`${baseUrl}?name=${encodeURIComponent(cleanName)}&setid=${setId}`);
  fallbacks.push(`${baseUrl}?setid=${setId}&name=${encodeURIComponent(cleanName)}`);
  
  return {
    id: imageData.id,
    url: imageData.url || fallbacks[0],
    fallbacks: fallbacks,
    caption: imageData.caption || '',
    type: imageData.type || 'unknown',
    sectionTitle: imageData.sectionTitle || '',
    loincCode: imageData.loincCode || ''
  };
}

/**
 * Filter images to show only those appropriate for a specific view
 */
export function filterImagesForView(images, viewType) {
  if (!images) return [];
  
  switch (viewType) {
    case 'gallery':
      // Only show product gallery images
      return images.productGallery || [];
      
    case 'instructions':
      // Only show instruction images
      return images.instructionsForUse || {};
      
    case 'patient':
      // Show patient labeling images
      return images.patientLabeling || [];
      
    case 'clinical':
      // Show clinical/technical images
      return images.clinical || [];
      
    default:
      return [];
  }
}

/**
 * Get instruction images for a specific dosage form
 */
export function getInstructionImagesForDosageForm(images, dosageForm) {
  if (!images || !images.instructionsForUse) return [];
  
  // Try exact match first
  if (images.instructionsForUse[dosageForm]) {
    return images.instructionsForUse[dosageForm].images || [];
  }
  
  // Try partial match
  const matchingKey = Object.keys(images.instructionsForUse).find(key => 
    key.toLowerCase().includes(dosageForm.toLowerCase()) ||
    dosageForm.toLowerCase().includes(key.toLowerCase())
  );
  
  if (matchingKey) {
    return images.instructionsForUse[matchingKey].images || [];
  }
  
  // Return first available if no match
  const firstKey = Object.keys(images.instructionsForUse)[0];
  return firstKey ? images.instructionsForUse[firstKey].images || [] : [];
}

/**
 * Check if an image belongs to Instructions for Use section
 */
export function isInstructionImage(image, loincCodes) {
  const instructionLoincCodes = loincCodes || [
    '42231-1', '51727-6', '69718-5', '69719-3', 
    '49267-5', '59845-8', '43685-8', '77482-3'
  ];
  
  // Check by LOINC code
  if (image.loincCode && instructionLoincCodes.includes(image.loincCode)) {
    return true;
  }
  
  // Check by section key
  if (image.sectionKey && image.sectionKey.includes('instructionsForUse')) {
    return true;
  }
  
  // Check by type
  if (image.type === 'instruction' || image.type === 'instructions-for-use') {
    return true;
  }
  
  // Check by caption/ID patterns
  if (image.caption || image.id) {
    const instructionPatterns = /step|figure|diagram|illustration|procedure/i;
    return instructionPatterns.test(image.caption) || instructionPatterns.test(image.id);
  }
  
  return false;
}

/**
 * Group images by their step number (for instruction images)
 */
export function groupInstructionImagesByStep(images) {
  const grouped = {};
  
  images.forEach(image => {
    // Try to extract step number from caption or ID
    const stepMatch = (image.caption || image.id || '').match(/step\s*(\d+)/i);
    
    if (stepMatch) {
      const stepNum = parseInt(stepMatch[1]);
      if (!grouped[stepNum]) {
        grouped[stepNum] = [];
      }
      grouped[stepNum].push(image);
    } else {
      // Put non-step images in a 'general' group
      if (!grouped.general) {
        grouped.general = [];
      }
      grouped.general.push(image);
    }
  });
  
  return grouped;
}

/**
 * Create a summary of available images
 */
export function getImageSummary(organizedImages) {
  if (!organizedImages) return null;
  
  const summary = {
    totalImages: 0,
    categories: []
  };
  
  // Count product gallery
  if (organizedImages.productGallery && organizedImages.productGallery.length > 0) {
    summary.categories.push({
      name: 'Product Gallery',
      count: organizedImages.productGallery.length,
      icon: '📦'
    });
    summary.totalImages += organizedImages.productGallery.length;
  }
  
  // Count instruction images
  if (organizedImages.instructionsForUse) {
    const ifuCount = Object.values(organizedImages.instructionsForUse).reduce(
      (sum, ifu) => sum + (ifu.images ? ifu.images.length : 0), 0
    );
    if (ifuCount > 0) {
      summary.categories.push({
        name: 'Instructions for Use',
        count: ifuCount,
        icon: '📋',
        subcategories: Object.entries(organizedImages.instructionsForUse).map(([key, ifu]) => ({
          name: ifu.title || key,
          count: ifu.images ? ifu.images.length : 0
        }))
      });
      summary.totalImages += ifuCount;
    }
  }
  
  // Count patient labeling
  if (organizedImages.patientLabeling && organizedImages.patientLabeling.length > 0) {
    summary.categories.push({
      name: 'Patient Labeling',
      count: organizedImages.patientLabeling.length,
      icon: '👤'
    });
    summary.totalImages += organizedImages.patientLabeling.length;
  }
  
  // Count clinical images
  if (organizedImages.clinical && organizedImages.clinical.length > 0) {
    summary.categories.push({
      name: 'Clinical',
      count: organizedImages.clinical.length,
      icon: '🔬'
    });
    summary.totalImages += organizedImages.clinical.length;
  }
  
  // Count other images
  if (organizedImages.other && organizedImages.other.length > 0) {
    summary.categories.push({
      name: 'Other',
      count: organizedImages.other.length,
      icon: '🖼️'
    });
    summary.totalImages += organizedImages.other.length;
  }
  
  return summary;
}

export default {
  organizeImagesBySection,
  createImageObject,
  filterImagesForView,
  getInstructionImagesForDosageForm,
  isInstructionImage,
  groupInstructionImagesByStep,
  getImageSummary
};