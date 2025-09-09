// SPL Parser Service for DailyMed Integration
// Handles proper LOINC code mapping and maintains hierarchical relationships

class SPLParser {
  constructor() {
    // Comprehensive LOINC to section mapping based on FDA SPL specification
    this.loincMap = {
      // HIGHLIGHTS - Skip these as they're just summaries
      // '48780-1': { section: 'highlights', title: 'Highlights of Prescribing Information', priority: 999 },
      // '42229-5': { section: 'highlights', title: 'SPL Unclassified Section', priority: 999 },
      
      // BOXED WARNING
      '34066-1': { section: 'boxedWarning', title: 'Boxed Warning', priority: 1 },
      '50741-8': { section: 'boxedWarning', title: 'Boxed Warning', priority: 1 },
      
      // TABLE OF CONTENTS - Skip as it's just navigation
      // '48780-3': { section: 'tableOfContents', title: 'Table of Contents', priority: 999 },
      
      // INDICATIONS AND USAGE
      '34067-9': { section: 'indications', title: 'Indications and Usage', priority: 2 },
      '34067-0': { section: 'indications', title: 'Indications', priority: 2 },
      
      // DOSAGE AND ADMINISTRATION
      '34068-7': { section: 'dosage', title: 'Dosage and Administration', priority: 3 },
      '34068-0': { section: 'dosage', title: 'Dosage and Administration', priority: 3 },
      
      // DOSAGE FORMS AND STRENGTHS
      '43678-2': { section: 'dosageForms', title: 'Dosage Forms and Strengths', priority: 4 },
      '43677-4': { section: 'dosageForms', title: 'Dosage Forms and Strengths', priority: 4 },
      
      // CONTRAINDICATIONS
      '34070-3': { section: 'contraindications', title: 'Contraindications', priority: 5 },
      '34070-0': { section: 'contraindications', title: 'Contraindications', priority: 5 },
      
      // WARNINGS AND PRECAUTIONS
      '43685-7': { section: 'warningsAndPrecautions', title: 'Warnings and Precautions', priority: 6 },
      '34071-1': { section: 'warnings', title: 'Warnings', priority: 6 },
      '42232-9': { section: 'precautions', title: 'Precautions', priority: 6 },
      
      // ADVERSE REACTIONS
      '34084-4': { section: 'adverseReactions', title: 'Adverse Reactions', priority: 7 },
      '34084-0': { section: 'adverseReactions', title: 'Adverse Events', priority: 7 },
      
      // DRUG INTERACTIONS
      '34073-7': { section: 'drugInteractions', title: 'Drug Interactions', priority: 8 },
      '34073-0': { section: 'drugInteractions', title: 'Drug Interactions', priority: 8 },
      
      // USE IN SPECIFIC POPULATIONS
      '43684-0': { section: 'useInSpecificPopulations', title: 'Use in Specific Populations', priority: 9 },
      '42228-7': { section: 'pregnancy', title: 'Pregnancy', priority: 9 },
      '34080-2': { section: 'lactation', title: 'Lactation', priority: 9 },
      '34081-0': { section: 'pediatricUse', title: 'Pediatric Use', priority: 9 },
      '34082-8': { section: 'geriatricUse', title: 'Geriatric Use', priority: 9 },
      
      // OVERDOSAGE
      '34088-5': { section: 'overdosage', title: 'Overdosage', priority: 10 },
      '34088-0': { section: 'overdosage', title: 'Overdosage', priority: 10 },
      
      // DESCRIPTION
      '34089-3': { section: 'description', title: 'Description', priority: 11 },
      '34089-0': { section: 'description', title: 'Description', priority: 11 },
      
      // CLINICAL PHARMACOLOGY
      '34090-1': { section: 'clinicalPharmacology', title: 'Clinical Pharmacology', priority: 12 },
      '43679-0': { section: 'mechanismOfAction', title: 'Mechanism of Action', priority: 12 },
      '43681-6': { section: 'pharmacodynamics', title: 'Pharmacodynamics', priority: 12 },
      '43680-8': { section: 'pharmacokinetics', title: 'Pharmacokinetics', priority: 12 },
      '49489-8': { section: 'microbiology', title: 'Microbiology', priority: 12 },
      
      // NONCLINICAL TOXICOLOGY
      '43685-0': { section: 'nonclinicalToxicology', title: 'Nonclinical Toxicology', priority: 13 },
      '34083-6': { section: 'carcinogenesis', title: 'Carcinogenesis, Mutagenesis, Impairment of Fertility', priority: 13 },
      '43682-4': { section: 'carcinogenesis', title: 'Carcinogenesis, Mutagenesis, Impairment of Fertility', priority: 13 },
      '43684-2': { section: 'animalToxicology', title: 'Animal Toxicology and/or Pharmacology', priority: 13 },
      
      // CLINICAL STUDIES
      '34092-7': { section: 'clinicalStudies', title: 'Clinical Studies', priority: 14 },
      '34077-8': { section: 'clinicalStudies', title: 'Clinical Studies', priority: 14 },
      
      // REFERENCES
      '34093-5': { section: 'references', title: 'References', priority: 15 },
      
      // HOW SUPPLIED/STORAGE AND HANDLING
      '34069-5': { section: 'howSupplied', title: 'How Supplied/Storage and Handling', priority: 16 },
      '44425-7': { section: 'storageAndHandling', title: 'Storage and Handling', priority: 16 },
      '43683-2': { section: 'safeHandlingWarning', title: 'Safe Handling Warning', priority: 16 },
      
      // PATIENT COUNSELING INFORMATION
      '34076-0': { section: 'patientInfo', title: 'Patient Counseling Information', priority: 17 },
      '59483-4': { section: 'informationForPatients', title: 'Information for Patients', priority: 17 },
      
      // MEDICATION GUIDE - Patient labeling sections
      '42230-3': { section: 'medGuide', title: 'Medication Guide', priority: 20 },
      '51945-4': { section: 'medGuide', title: 'Package Label.Principal Display Panel', priority: 20 },
      
      // INSTRUCTIONS FOR USE - Multiple forms and devices
      '42231-1': { section: 'instructionsForUse', title: 'Instructions for Use', priority: 21 },
      '51727-6': { section: 'instructionsForUse', title: 'Instructions for Use - Injection', priority: 21 },
      '69718-5': { section: 'instructionsForUse', title: 'Instructions for Use - Inhalation', priority: 21 },
      '69719-3': { section: 'instructionsForUse', title: 'Instructions for Use - Intranasal', priority: 21 },
      '49267-5': { section: 'instructionsForUse', title: 'Instructions for Use - Patient', priority: 21 },
      '59845-8': { section: 'instructionsForUse', title: 'Instructions for Use - Professional', priority: 21 },
      '43685-8': { section: 'instructionsForUse', title: 'Instructions for Use - Device', priority: 21 },
      '77482-3': { section: 'instructionsForUse', title: 'Instructions for Use - Additional', priority: 21 },
      
      // PRINCIPAL DISPLAY PANEL (Product Images)
      '51945-4': { section: 'principalDisplayPanel', title: 'Principal Display Panel', priority: 22 },
      '51945-0': { section: 'principalDisplayPanel', title: 'Principal Display Panel - Container Label', priority: 22 },
      '51945-1': { section: 'principalDisplayPanel', title: 'Principal Display Panel - Carton Label', priority: 22 },
      '51945-2': { section: 'principalDisplayPanel', title: 'Principal Display Panel - Blister', priority: 22 },
      '51945-3': { section: 'principalDisplayPanel', title: 'Principal Display Panel - Pouch Label', priority: 22 },
      '51945-6': { section: 'principalDisplayPanel', title: 'Principal Display Panel - Kit', priority: 22 },
      '51945-7': { section: 'principalDisplayPanel', title: 'Package Label', priority: 22 },
      
      // RECENT MAJOR CHANGES
      '42231-9': { section: 'recentMajorChanges', title: 'Recent Major Changes', priority: 23 },
      
      // PACKAGE/LABEL DISPLAY PANEL
      '60560-1': { section: 'displayPanel', title: 'Package/Label Display Panel', priority: 24 },
      '69719-0': { section: 'displayPanel', title: 'Display Panel', priority: 24 },
      
      // INGREDIENTS AND APPEARANCE
      '53411-0': { section: 'ingredientsAndAppearance', title: 'Product Description', priority: 25 },
      '34078-6': { section: 'ingredientsAndAppearance', title: 'Ingredients and Appearance', priority: 25 },
      
      // OTC DRUG FACTS
      '50569-6': { section: 'otcPurpose', title: 'Purpose', priority: 26 },
      '50572-0': { section: 'otcActiveIngredient', title: 'Active Ingredient', priority: 26 },
      '55106-9': { section: 'otcActiveIngredient', title: 'Active Ingredients', priority: 26 },
      '50565-1': { section: 'otcKeepOutOfReach', title: 'Keep Out of Reach of Children', priority: 26 },
      '50567-0': { section: 'otcInactiveIngredients', title: 'Inactive Ingredients', priority: 26 },
      '50574-6': { section: 'otcDirections', title: 'Directions', priority: 26 },
      '50573-8': { section: 'otcUses', title: 'Uses', priority: 26 },
      '51724-3': { section: 'otcOtherInformation', title: 'Other Information', priority: 26 },
      '53413-1': { section: 'otcQuestions', title: 'Questions?', priority: 26 }
    };

    // Media type classification
    this.mediaTypes = {
      productImages: ['51945-4', '51945-0', '51945-1', '51945-2', '51945-3', '51945-6', '51945-7', '60560-1'],
      instructionImages: ['42231-1', '51727-6', '69718-5', '69719-3', '49267-5', '59845-8', '43685-8', '77482-3'],
      generalImages: ['34078-6', '53411-0']
    };
  }

  // Parse SPL XML and extract structured data
  parseSPLDocument(xmlText, setId) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    const result = {
      setId: setId,
      sections: {},
      images: [],
      mediaMap: {},
      hierarchy: {}
    };

    // Extract all sections with LOINC codes
    const sections = doc.querySelectorAll('component section');
    
    sections.forEach(section => {
      this.processSection(section, result, setId);
    });

    // Sort sections by priority
    result.sections = this.sortSectionsByPriority(result.sections);
    
    // Build hierarchy
    result.hierarchy = this.buildHierarchy(result.sections);
    
    return result;
  }

  // Process individual section
  processSection(section, result, setId) {
    const codeElement = section.querySelector('code');
    if (!codeElement) return;

    const loincCode = codeElement.getAttribute('code');
    const displayName = codeElement.getAttribute('displayName');
    
    if (!loincCode) return;
    
    // Skip highlights and table of contents sections
    if (loincCode === '48780-1' || loincCode === '42229-5' || loincCode === '48780-3') {
      console.log(`Skipping ${displayName || loincCode} - it's a summary/navigation section`);
      return;
    }

    const mapping = this.loincMap[loincCode];
    if (!mapping) {
      console.warn(`Unmapped LOINC code: ${loincCode} - ${displayName}`);
      return;
    }

    const sectionKey = mapping.section;
    const sectionTitle = section.querySelector('title')?.textContent || mapping.title;
    
    // Extract section content
    const content = this.extractSectionContent(section, setId);
    
    // Extract media references within this section
    const mediaRefs = this.extractMediaReferences(section, setId);
    
    // Create section object
    const sectionData = {
      key: sectionKey,
      loincCode: loincCode,
      title: sectionTitle,
      displayName: displayName,
      content: content,
      media: mediaRefs,
      priority: mapping.priority,
      type: this.getSectionType(loincCode)
    };

    // Handle multiple sections with same key (e.g., multiple Instructions for Use)
    if (result.sections[sectionKey]) {
      // Create numbered variant
      let counter = 2;
      let newKey = `${sectionKey}_${counter}`;
      while (result.sections[newKey]) {
        counter++;
        newKey = `${sectionKey}_${counter}`;
      }
      result.sections[newKey] = sectionData;
    } else {
      result.sections[sectionKey] = sectionData;
    }

    // Add media to global media map
    mediaRefs.forEach(media => {
      if (!result.mediaMap[media.id]) {
        result.mediaMap[media.id] = {
          ...media,
          parentSection: sectionKey,
          parentLoincCode: loincCode
        };
      }
    });
  }

  // Extract section content with proper HTML formatting
  extractSectionContent(section, setId) {
    const textElement = section.querySelector('text');
    if (!textElement) return '';

    let html = this.xmlToHtml(textElement);
    
    // Process embedded images
    html = this.processEmbeddedImages(html, setId);
    
    // Clean up HTML
    html = this.cleanHtml(html);
    
    return html;
  }

  // Extract media references (images) from section
  extractMediaReferences(section, setId) {
    const media = [];
    
    // Find observationMedia elements
    const observationMediaElements = section.querySelectorAll('observationMedia');
    observationMediaElements.forEach(elem => {
      const mediaId = elem.getAttribute('ID') || elem.querySelector('value')?.getAttribute('mediaType');
      const value = elem.querySelector('value');
      
      if (value) {
        const mediaRef = value.getAttribute('value') || value.textContent;
        if (mediaRef) {
          media.push({
            id: mediaId || mediaRef,
            ref: mediaRef.replace('#', ''),
            type: 'observationMedia',
            caption: elem.querySelector('text')?.textContent || ''
          });
        }
      }
    });

    // Find renderMultiMedia elements
    const renderMultiMediaElements = section.querySelectorAll('renderMultiMedia');
    renderMultiMediaElements.forEach(elem => {
      const referencedObject = elem.getAttribute('referencedObject');
      if (referencedObject) {
        const caption = elem.querySelector('caption')?.textContent || '';
        media.push({
          id: referencedObject.replace('#', ''),
          ref: referencedObject.replace('#', ''),
          type: 'renderMultiMedia',
          caption: caption
        });
      }
    });

    // Find linkHtml references
    const linkHtmlElements = section.querySelectorAll('linkHtml');
    linkHtmlElements.forEach(elem => {
      const href = elem.getAttribute('href');
      if (href && href.startsWith('#')) {
        media.push({
          id: href.replace('#', ''),
          ref: href.replace('#', ''),
          type: 'linkHtml',
          caption: elem.textContent || ''
        });
      }
    });

    return media;
  }

  // Convert XML to HTML
  xmlToHtml(xmlElement) {
    let html = '';
    
    xmlElement.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        html += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        switch (tagName) {
          case 'paragraph':
            html += `<p>${this.xmlToHtml(node)}</p>`;
            break;
          case 'list':
            const listType = node.getAttribute('listType') === 'ordered' ? 'ol' : 'ul';
            html += `<${listType}>${this.xmlToHtml(node)}</${listType}>`;
            break;
          case 'item':
            html += `<li>${this.xmlToHtml(node)}</li>`;
            break;
          case 'content':
            const styleCode = node.getAttribute('styleCode');
            if (styleCode === 'bold') {
              html += `<strong>${this.xmlToHtml(node)}</strong>`;
            } else if (styleCode === 'italics') {
              html += `<em>${this.xmlToHtml(node)}</em>`;
            } else if (styleCode === 'underline') {
              html += `<u>${this.xmlToHtml(node)}</u>`;
            } else {
              html += this.xmlToHtml(node);
            }
            break;
          case 'br':
            html += '<br/>';
            break;
          case 'table':
            html += this.processTable(node);
            break;
          case 'rendermultimedia':
            html += this.processRenderMultiMedia(node);
            break;
          case 'observationmedia':
            html += this.processObservationMedia(node);
            break;
          case 'linkhtml':
            const href = node.getAttribute('href');
            html += `<a href="${href}">${this.xmlToHtml(node)}</a>`;
            break;
          default:
            html += this.xmlToHtml(node);
        }
      }
    });
    
    return html;
  }

  // Process table elements
  processTable(tableNode) {
    let html = '<table class="spl-table">';
    
    // Process thead
    const thead = tableNode.querySelector('thead');
    if (thead) {
      html += '<thead>';
      thead.querySelectorAll('tr').forEach(tr => {
        html += '<tr>';
        tr.querySelectorAll('th, td').forEach(cell => {
          const colspan = cell.getAttribute('colspan') || 1;
          const rowspan = cell.getAttribute('rowspan') || 1;
          html += `<th colspan="${colspan}" rowspan="${rowspan}">${this.xmlToHtml(cell)}</th>`;
        });
        html += '</tr>';
      });
      html += '</thead>';
    }
    
    // Process tbody
    const tbody = tableNode.querySelector('tbody');
    if (tbody) {
      html += '<tbody>';
      tbody.querySelectorAll('tr').forEach(tr => {
        html += '<tr>';
        tr.querySelectorAll('td, th').forEach(cell => {
          const colspan = cell.getAttribute('colspan') || 1;
          const rowspan = cell.getAttribute('rowspan') || 1;
          const tagName = cell.tagName.toLowerCase();
          html += `<${tagName} colspan="${colspan}" rowspan="${rowspan}">${this.xmlToHtml(cell)}</${tagName}>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    
    html += '</table>';
    return html;
  }

  // Process renderMultiMedia elements
  processRenderMultiMedia(node) {
    const referencedObject = node.getAttribute('referencedObject');
    const caption = node.querySelector('caption')?.textContent || '';
    
    if (referencedObject) {
      const imageRef = referencedObject.replace('#', '');
      return `<div class="spl-image-container" data-image-ref="${imageRef}">
                <img src="" data-image-id="${imageRef}" alt="${caption}" />
                ${caption ? `<div class="spl-image-caption">${caption}</div>` : ''}
              </div>`;
    }
    
    return '';
  }

  // Process observationMedia elements
  processObservationMedia(node) {
    const value = node.querySelector('value');
    if (!value) return '';
    
    const mediaRef = value.getAttribute('value') || value.textContent;
    const caption = node.querySelector('text')?.textContent || '';
    
    if (mediaRef) {
      const imageRef = mediaRef.replace('#', '');
      return `<div class="spl-image-container" data-image-ref="${imageRef}">
                <img src="" data-image-id="${imageRef}" alt="${caption}" />
                ${caption ? `<div class="spl-image-caption">${caption}</div>` : ''}
              </div>`;
    }
    
    return '';
  }

  // Process embedded images in HTML content
  processEmbeddedImages(html, setId) {
    // Replace image placeholders with actual URLs
    html = html.replace(/data-image-id="([^"]+)"/g, (match, imageId) => {
      const imageUrl = `/api/dailymed-image?name=${encodeURIComponent(imageId)}&setid=${setId}`;
      return `src="${imageUrl}" data-image-id="${imageId}"`;
    });
    
    return html;
  }

  // Clean HTML content
  cleanHtml(html) {
    // Remove empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    // Remove excessive whitespace
    html = html.replace(/\s+/g, ' ');
    
    // Fix broken tags
    html = html.replace(/<(\w+)([^>]*?)(?<!\/)>(?!.*<\/\1>)/g, '<$1$2/>');
    
    return html.trim();
  }

  // Get section type based on LOINC code
  getSectionType(loincCode) {
    if (this.mediaTypes.productImages.includes(loincCode)) {
      return 'product-image';
    } else if (this.mediaTypes.instructionImages.includes(loincCode)) {
      return 'instruction-image';
    } else if (this.mediaTypes.generalImages.includes(loincCode)) {
      return 'general-image';
    } else if (loincCode.startsWith('4223') || loincCode === '42230-3') {
      return 'patient-labeling';
    } else if (loincCode.startsWith('4223') || loincCode === '42231-1' || loincCode.startsWith('697') || loincCode.startsWith('517')) {
      return 'instructions-for-use';
    }
    return 'standard';
  }

  // Sort sections by priority
  sortSectionsByPriority(sections) {
    const sorted = {};
    const entries = Object.entries(sections).sort((a, b) => {
      return (a[1].priority || 999) - (b[1].priority || 999);
    });
    
    entries.forEach(([key, value]) => {
      sorted[key] = value;
    });
    
    return sorted;
  }

  // Build section hierarchy
  buildHierarchy(sections) {
    const hierarchy = {
      main: [],
      patientLabeling: [],
      images: []
    };
    
    Object.entries(sections).forEach(([key, section]) => {
      if (section.type === 'product-image' || section.type === 'general-image') {
        hierarchy.images.push(key);
      } else if (section.type === 'patient-labeling' || section.type === 'instructions-for-use') {
        hierarchy.patientLabeling.push(key);
      } else {
        hierarchy.main.push(key);
      }
    });
    
    return hierarchy;
  }

  // Extract all images with proper categorization
  extractAllImages(xmlText, setId) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    
    const images = {
      product: [],
      instructions: [],
      other: []
    };
    
    // Find all media definitions
    const mediaDefinitions = doc.querySelectorAll('component observationMedia');
    
    mediaDefinitions.forEach(media => {
      const id = media.getAttribute('ID');
      const value = media.querySelector('value');
      
      if (value) {
        const mediaRef = value.getAttribute('value') || value.textContent;
        if (mediaRef) {
          const imageData = {
            id: id || mediaRef,
            ref: mediaRef.replace('.jpg', '').replace('.png', ''),
            url: `/api/dailymed-image?name=${encodeURIComponent(mediaRef)}&setid=${setId}`,
            caption: media.querySelector('text')?.textContent || ''
          };
          
          // Categorize based on parent section
          const parentSection = media.closest('section');
          if (parentSection) {
            const loincCode = parentSection.querySelector('code')?.getAttribute('code');
            
            if (this.mediaTypes.productImages.includes(loincCode)) {
              images.product.push(imageData);
            } else if (this.mediaTypes.instructionImages.includes(loincCode)) {
              images.instructions.push(imageData);
            } else {
              images.other.push(imageData);
            }
          } else {
            images.other.push(imageData);
          }
        }
      }
    });
    
    return images;
  }
}

// Export singleton instance
const splParser = new SPLParser();
export default splParser;