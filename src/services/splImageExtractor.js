// SPL Image Extractor Service
// Properly extracts and categorizes images from DailyMed SPL XML
// Maintains section boundaries and parent-child relationships

class SPLImageExtractor {
  constructor() {
    // LOINC codes for different section types
    this.sectionTypes = {
      // Principal Display Panel - Product Gallery Images
      productGallery: [
        '51945-4', // Principal Display Panel
        '51945-0', // Principal Display Panel - Container Label
        '51945-1', // Principal Display Panel - Carton Label
        '51945-2', // Principal Display Panel - Blister
        '51945-3', // Principal Display Panel - Pouch Label
        '51945-6', // Principal Display Panel - Kit
        '51945-7', // Package Label
        '60560-1', // Package/Label Display Panel
        '69719-0', // Display Panel
      ],
      
      // Instructions for Use - Different dosage forms
      instructionsForUse: [
        '42231-1', // Instructions for Use (general)
        '51727-6', // Instructions for Use - Injection/Injectable
        '69718-5', // Instructions for Use - Inhalation/Inhaler
        '69719-3', // Instructions for Use - Intranasal
        '49267-5', // Instructions for Use - Patient
        '59845-8', // Instructions for Use - Professional
        '43685-8', // Instructions for Use - Device
        '77482-3', // Instructions for Use - Additional
        '69762-3', // Instructions for Use - Oral
        '82351-8', // Instructions for Use - Transdermal
        '69784-7', // Instructions for Use - Ophthalmic
        '69785-4', // Instructions for Use - Otic
        '88368-6', // Instructions for Use - Rectal
        '88369-4', // Instructions for Use - Vaginal
        '88370-2', // Instructions for Use - Subcutaneous
        '88371-0', // Instructions for Use - Intramuscular
        '88372-8', // Instructions for Use - Intravenous
      ],
      
      // Medication Guide and Patient Information
      patientLabeling: [
        '42230-3', // Medication Guide
        '34076-0', // Patient Counseling Information
        '59483-4', // Information for Patients
        '60559-3', // Patient Information
        '60561-9', // Patient Package Insert
      ],
      
      // Clinical/Technical sections that may contain images
      clinical: [
        '34090-1', // Clinical Pharmacology
        '34092-7', // Clinical Studies
        '43679-0', // Mechanism of Action
        '43681-6', // Pharmacodynamics
        '43680-8', // Pharmacokinetics
        '49489-8', // Microbiology
      ],
      
      // Product description and appearance
      productDescription: [
        '34089-3', // Description
        '34078-6', // Ingredients and Appearance
        '53411-0', // Product Description
        '34069-5', // How Supplied/Storage and Handling
      ]
    };
  }

  /**
   * Main function to extract and categorize images from SPL XML
   * @param {string} xmlText - The SPL XML content
   * @param {string} setId - The medication set ID
   * @returns {Object} Structured object with categorized images
   */
  extractAndCategorizeImages(xmlText, setId) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    const result = {
      productGallery: [],
      instructionsForUse: {},
      patientLabeling: [],
      clinical: [],
      productDescription: [],
      other: [],
      imageRegistry: {}, // Maps image IDs to their details
      sectionImageMap: {}, // Maps section IDs to their images
      statistics: {
        totalImages: 0,
        totalSections: 0,
        sectionsWithImages: 0
      }
    };

    // Step 1: Build image registry from all observationMedia definitions
    this.buildImageRegistry(doc, setId, result.imageRegistry);
    
    // Step 2: Parse sections and extract images with proper boundaries
    const sections = doc.querySelectorAll('component > section');
    sections.forEach(section => {
      this.processSection(section, setId, result);
    });
    
    // Step 3: Handle special cases for multiple dosage forms
    this.handleMultipleDosageForms(result);
    
    // Step 4: Generate statistics
    this.generateStatistics(result);
    
    return result;
  }

  /**
   * Build a registry of all images defined in the document
   */
  buildImageRegistry(doc, setId, registry) {
    // Find all observationMedia elements (image definitions)
    const observationMediaElements = doc.querySelectorAll('observationMedia');
    
    observationMediaElements.forEach(media => {
      const id = media.getAttribute('ID');
      const value = media.querySelector('value');
      
      if (id && value) {
        const mediaRef = value.getAttribute('value') || value.textContent;
        if (mediaRef) {
          const cleanRef = mediaRef.replace('#', '').replace(/\.(jpg|png|gif)$/i, '');
          registry[id] = {
            id: id,
            ref: cleanRef,
            url: `/api/dailymed-image?name=${encodeURIComponent(cleanRef)}&setid=${setId}`,
            caption: media.querySelector('text')?.textContent || '',
            originalRef: mediaRef,
            usedInSections: [] // Track which sections reference this image
          };
        }
      }
    });
    
    console.log(`Built image registry with ${Object.keys(registry).length} images`);
  }

  /**
   * Process a section and extract its images
   */
  processSection(section, setId, result) {
    // Get section metadata
    const codeElement = section.querySelector('code');
    if (!codeElement) return;
    
    const loincCode = codeElement.getAttribute('code');
    const displayName = codeElement.getAttribute('displayName');
    const sectionId = section.getAttribute('ID') || `section_${loincCode}`;
    
    if (!loincCode) return;
    
    // Get section title
    const title = section.querySelector('title')?.textContent || displayName || 'Untitled Section';
    
    // Determine section type
    const sectionType = this.getSectionType(loincCode);
    
    // Extract images that belong to this section
    const sectionImages = this.extractSectionImages(section, setId, result.imageRegistry);
    
    if (sectionImages.length > 0) {
      result.statistics.sectionsWithImages++;
      
      // Create section data
      const sectionData = {
        sectionId: sectionId,
        loincCode: loincCode,
        title: title,
        displayName: displayName,
        type: sectionType,
        images: sectionImages
      };
      
      // Categorize based on section type
      switch (sectionType) {
        case 'productGallery':
          result.productGallery.push(...sectionImages.map(img => ({
            ...img,
            sectionTitle: title,
            loincCode: loincCode
          })));
          break;
          
        case 'instructionsForUse':
          // Handle multiple IFU sections for different dosage forms
          const dosageForm = this.extractDosageForm(title, section);
          const ifuKey = dosageForm || loincCode;
          
          if (!result.instructionsForUse[ifuKey]) {
            result.instructionsForUse[ifuKey] = {
              title: title,
              loincCode: loincCode,
              dosageForm: dosageForm,
              images: []
            };
          }
          
          result.instructionsForUse[ifuKey].images.push(...sectionImages);
          break;
          
        case 'patientLabeling':
          result.patientLabeling.push(...sectionImages.map(img => ({
            ...img,
            sectionTitle: title,
            loincCode: loincCode
          })));
          break;
          
        case 'clinical':
          result.clinical.push(...sectionImages.map(img => ({
            ...img,
            sectionTitle: title,
            loincCode: loincCode
          })));
          break;
          
        case 'productDescription':
          result.productDescription.push(...sectionImages.map(img => ({
            ...img,
            sectionTitle: title,
            loincCode: loincCode
          })));
          break;
          
        default:
          result.other.push(...sectionImages.map(img => ({
            ...img,
            sectionTitle: title,
            loincCode: loincCode
          })));
      }
      
      // Map section to its images
      result.sectionImageMap[sectionId] = sectionImages;
    }
    
    result.statistics.totalSections++;
  }

  /**
   * Extract images that belong to a specific section
   */
  extractSectionImages(section, setId, imageRegistry) {
    const images = [];
    const processedRefs = new Set();
    
    // Method 1: Find renderMultiMedia elements within the section
    const renderMultiMediaElements = section.querySelectorAll('renderMultiMedia');
    renderMultiMediaElements.forEach(elem => {
      const referencedObject = elem.getAttribute('referencedObject');
      if (referencedObject && !processedRefs.has(referencedObject)) {
        const cleanRef = referencedObject.replace('#', '');
        const caption = elem.querySelector('caption')?.textContent || '';
        
        // Check if this image is in our registry
        const registryImage = imageRegistry[cleanRef];
        
        images.push({
          id: cleanRef,
          ref: cleanRef,
          url: registryImage?.url || `/api/dailymed-image?name=${encodeURIComponent(cleanRef)}&setid=${setId}`,
          caption: caption || registryImage?.caption || '',
          type: 'renderMultiMedia',
          source: 'section'
        });
        
        processedRefs.add(referencedObject);
        
        // Mark this image as used in this section
        if (registryImage) {
          registryImage.usedInSections.push(section.getAttribute('ID') || 'unknown');
        }
      }
    });
    
    // Method 2: Find observationMedia elements within the section text
    const textElement = section.querySelector('text');
    if (textElement) {
      // Look for embedded observationMedia in the text
      const observationMediaInText = textElement.querySelectorAll('observationMedia');
      observationMediaInText.forEach(media => {
        const id = media.getAttribute('ID');
        const value = media.querySelector('value');
        
        if (value && !processedRefs.has(id)) {
          const mediaRef = value.getAttribute('value') || value.textContent;
          if (mediaRef) {
            const cleanRef = mediaRef.replace('#', '').replace(/\.(jpg|png|gif)$/i, '');
            const caption = media.querySelector('text')?.textContent || '';
            
            images.push({
              id: id || cleanRef,
              ref: cleanRef,
              url: `/api/dailymed-image?name=${encodeURIComponent(cleanRef)}&setid=${setId}`,
              caption: caption,
              type: 'observationMedia',
              source: 'text'
            });
            
            processedRefs.add(id || cleanRef);
          }
        }
      });
      
      // Method 3: Find linkHtml references to images
      const linkHtmlElements = textElement.querySelectorAll('linkHtml');
      linkHtmlElements.forEach(elem => {
        const href = elem.getAttribute('href');
        if (href && href.startsWith('#') && !processedRefs.has(href)) {
          const cleanRef = href.replace('#', '');
          
          // Check if this references an image in our registry
          if (imageRegistry[cleanRef]) {
            images.push({
              id: cleanRef,
              ref: cleanRef,
              url: imageRegistry[cleanRef].url,
              caption: elem.textContent || imageRegistry[cleanRef].caption || '',
              type: 'linkHtml',
              source: 'text'
            });
            
            processedRefs.add(href);
            imageRegistry[cleanRef].usedInSections.push(section.getAttribute('ID') || 'unknown');
          }
        }
      });
    }
    
    // Method 4: Check for figure references in tables
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const tableCells = table.querySelectorAll('td, th');
      tableCells.forEach(cell => {
        const cellText = cell.textContent;
        // Look for figure references like "Figure 1", "Fig. 2", etc.
        const figureMatches = cellText.match(/(?:Figure|Fig\.?)\s+(\d+)/gi);
        if (figureMatches) {
          figureMatches.forEach(match => {
            const figureNum = match.match(/\d+/)[0];
            const figureId = `figure${figureNum}`;
            
            if (imageRegistry[figureId] && !processedRefs.has(figureId)) {
              images.push({
                id: figureId,
                ref: figureId,
                url: imageRegistry[figureId].url,
                caption: `Figure ${figureNum}`,
                type: 'figure',
                source: 'table'
              });
              
              processedRefs.add(figureId);
            }
          });
        }
      });
    });
    
    return images;
  }

  /**
   * Determine the section type based on LOINC code
   */
  getSectionType(loincCode) {
    for (const [type, codes] of Object.entries(this.sectionTypes)) {
      if (codes.includes(loincCode)) {
        return type;
      }
    }
    return 'other';
  }

  /**
   * Extract dosage form from section title or content
   */
  extractDosageForm(title, section) {
    // Common dosage form patterns
    const patterns = [
      { pattern: /pen/i, form: 'pen' },
      { pattern: /syringe/i, form: 'syringe' },
      { pattern: /vial/i, form: 'vial' },
      { pattern: /cartridge/i, form: 'cartridge' },
      { pattern: /auto.*injector/i, form: 'autoinjector' },
      { pattern: /inhaler/i, form: 'inhaler' },
      { pattern: /nebulizer/i, form: 'nebulizer' },
      { pattern: /nasal.*spray/i, form: 'nasal_spray' },
      { pattern: /tablet/i, form: 'tablet' },
      { pattern: /capsule/i, form: 'capsule' },
      { pattern: /oral.*solution/i, form: 'oral_solution' },
      { pattern: /injection/i, form: 'injection' },
      { pattern: /infusion/i, form: 'infusion' },
      { pattern: /patch/i, form: 'patch' },
      { pattern: /cream/i, form: 'cream' },
      { pattern: /ointment/i, form: 'ointment' },
      { pattern: /gel/i, form: 'gel' },
      { pattern: /drops/i, form: 'drops' },
      { pattern: /spray/i, form: 'spray' },
      { pattern: /pump/i, form: 'pump' }
    ];
    
    // Check title first
    for (const { pattern, form } of patterns) {
      if (pattern.test(title)) {
        // Also check for dosage strength
        const strengthMatch = title.match(/(\d+\s*(?:mg|mcg|mL|units?)(?:\/\d+\s*mL)?)/i);
        if (strengthMatch) {
          return `${form}_${strengthMatch[1].replace(/\s+/g, '')}`;
        }
        return form;
      }
    }
    
    // Check section content if no match in title
    const textContent = section.querySelector('text')?.textContent || '';
    for (const { pattern, form } of patterns) {
      if (pattern.test(textContent.substring(0, 500))) { // Check first 500 chars
        return form;
      }
    }
    
    return null;
  }

  /**
   * Handle special cases for multiple dosage forms
   */
  handleMultipleDosageForms(result) {
    // If we have multiple IFU sections, try to identify their specific dosage forms
    const ifuKeys = Object.keys(result.instructionsForUse);
    
    if (ifuKeys.length > 1) {
      console.log(`Found ${ifuKeys.length} different Instructions for Use sections`);
      
      // Sort by dosage form for better organization
      const sortedIFU = {};
      const sortedKeys = ifuKeys.sort((a, b) => {
        // Prioritize named dosage forms over LOINC codes
        const aHasForm = !a.startsWith('4') && !a.startsWith('5') && !a.startsWith('6');
        const bHasForm = !b.startsWith('4') && !b.startsWith('5') && !b.startsWith('6');
        
        if (aHasForm && !bHasForm) return -1;
        if (!aHasForm && bHasForm) return 1;
        return a.localeCompare(b);
      });
      
      sortedKeys.forEach(key => {
        sortedIFU[key] = result.instructionsForUse[key];
      });
      
      result.instructionsForUse = sortedIFU;
    }
    
    // Check for orphaned images that might belong to IFU sections
    if (result.other.length > 0) {
      result.other.forEach(image => {
        // Check if image caption or ID suggests it belongs to IFU
        if (/step|figure|diagram|illustration/i.test(image.caption) ||
            /step|fig|diagram/i.test(image.id)) {
          // Try to find the appropriate IFU section
          for (const [key, ifuSection] of Object.entries(result.instructionsForUse)) {
            // Check if the image's section LOINC is close to the IFU LOINC
            if (image.loincCode && ifuSection.loincCode) {
              const imageLoinc = parseInt(image.loincCode.split('-')[0]);
              const ifuLoinc = parseInt(ifuSection.loincCode.split('-')[0]);
              
              // If LOINC codes are within 10 of each other, likely related
              if (Math.abs(imageLoinc - ifuLoinc) <= 10) {
                ifuSection.images.push(image);
                // Remove from other
                const index = result.other.indexOf(image);
                if (index > -1) {
                  result.other.splice(index, 1);
                }
                break;
              }
            }
          }
        }
      });
    }
  }

  /**
   * Generate statistics about the extraction
   */
  generateStatistics(result) {
    result.statistics.totalImages = 
      result.productGallery.length +
      Object.values(result.instructionsForUse).reduce((sum, ifu) => sum + ifu.images.length, 0) +
      result.patientLabeling.length +
      result.clinical.length +
      result.productDescription.length +
      result.other.length;
    
    // Add detailed breakdown
    result.statistics.breakdown = {
      productGallery: result.productGallery.length,
      instructionsForUse: Object.values(result.instructionsForUse).reduce((sum, ifu) => sum + ifu.images.length, 0),
      patientLabeling: result.patientLabeling.length,
      clinical: result.clinical.length,
      productDescription: result.productDescription.length,
      other: result.other.length,
      ifuSections: Object.keys(result.instructionsForUse).length
    };
    
    console.log('Image extraction statistics:', result.statistics);
  }

  /**
   * Utility function to validate image URLs
   */
  async validateImageUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get a summary of the extraction results
   */
  getSummary(result) {
    const summary = {
      totalImages: result.statistics.totalImages,
      categories: {
        'Product Gallery': result.productGallery.length,
        'Instructions for Use': result.statistics.breakdown.instructionsForUse,
        'Patient Labeling': result.patientLabeling.length,
        'Clinical': result.clinical.length,
        'Product Description': result.productDescription.length,
        'Other': result.other.length
      },
      dosageForms: Object.keys(result.instructionsForUse).map(key => {
        const ifu = result.instructionsForUse[key];
        return {
          form: ifu.dosageForm || key,
          title: ifu.title,
          imageCount: ifu.images.length
        };
      })
    };
    
    return summary;
  }
}

// Export singleton instance
const splImageExtractor = new SPLImageExtractor();
export default splImageExtractor;