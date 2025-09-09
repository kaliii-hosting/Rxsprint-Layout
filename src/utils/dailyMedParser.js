// DailyMed Parser Utility
// Parses and formats DailyMed API responses for display

class DailyMedParser {
  // Parse XML response using DOMParser
  parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Failed to parse XML response');
    }
    
    return xmlDoc;
  }

  // Extract medication sections from structured data
  extractSections(data) {
    const sections = {};
    
    // Priority order for sections
    const prioritySections = [
      'boxedWarning',
      'indications',
      'dosage',
      'contraindications',
      'warnings',
      'precautions',
      'adverseReactions',
      'drugInteractions',
      'overdosage'
    ];

    // Extract priority sections first
    prioritySections.forEach(key => {
      if (data.sections && data.sections[key]) {
        sections[key] = this.formatSection(data.sections[key]);
      }
    });

    // Add remaining sections
    if (data.sections) {
      Object.keys(data.sections).forEach(key => {
        if (!sections[key]) {
          sections[key] = this.formatSection(data.sections[key]);
        }
      });
    }

    return sections;
  }

  // Format a section for display
  formatSection(section) {
    if (!section) return null;

    return {
      title: this.formatSectionTitle(section.title),
      content: this.formatContent(section.text || section.content),
      subsections: section.subsections ? 
        section.subsections.map(sub => this.formatSection(sub)) : []
    };
  }

  // Format section titles for better readability
  formatSectionTitle(title) {
    if (!title) return '';
    
    // Convert to title case and clean up
    return title
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .replace(/And/g, 'and')
      .replace(/Or/g, 'or')
      .replace(/In/g, 'in')
      .replace(/Of/g, 'of')
      .replace(/The/g, 'the')
      .replace(/^\w/, char => char.toUpperCase());
  }

  // Format content for display
  formatContent(content) {
    if (!content) return '';

    // Remove excessive whitespace
    let formatted = content.replace(/\s+/g, ' ').trim();
    
    // Convert bullet points
    formatted = formatted.replace(/•/g, '\n• ');
    formatted = formatted.replace(/·/g, '\n• ');
    
    // Format numbered lists
    formatted = formatted.replace(/(\d+)\./g, '\n$1.');
    
    // Clean up multiple newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted.trim();
  }

  // Convert DailyMed data to medication format for Firebase
  convertToMedicationFormat(dailyMedData) {
    if (!dailyMedData) return null;

    const medication = {
      // Basic Information
      brandName: dailyMedData.brandName || '',
      genericName: dailyMedData.genericName || '',
      manufacturer: dailyMedData.labelerName || '',
      setId: dailyMedData.setId || '',
      splId: dailyMedData.splId || '',
      
      // Product Information
      dosageForm: this.extractDosageForm(dailyMedData),
      strength: this.extractStrength(dailyMedData),
      route: this.extractRoute(dailyMedData),
      
      // Clinical Information
      indications: dailyMedData.sections?.indications?.text || '',
      dosageInstructions: dailyMedData.sections?.dosage?.text || '',
      warnings: dailyMedData.sections?.warnings?.text || '',
      contraindications: dailyMedData.sections?.contraindications?.text || '',
      adverseReactions: dailyMedData.sections?.adverseReactions?.text || '',
      drugInteractions: dailyMedData.sections?.drugInteractions?.text || '',
      
      // Storage and Handling
      storage: dailyMedData.sections?.storage?.text || '',
      howSupplied: dailyMedData.sections?.howSupplied?.text || '',
      
      // NDC Codes
      ndcCodes: this.extractNDCCodes(dailyMedData),
      
      // Additional Information
      description: dailyMedData.sections?.description?.text || '',
      clinicalPharmacology: dailyMedData.sections?.clinicalPharmacology?.text || '',
      patientInfo: dailyMedData.sections?.patientInfo?.text || '',
      
      // Metadata
      effectiveDate: dailyMedData.effectiveTime || new Date().toISOString(),
      version: dailyMedData.version || '1',
      source: 'DailyMed',
      importedAt: new Date().toISOString()
    };

    // Add boxed warning if present
    if (dailyMedData.sections?.boxedWarning) {
      medication.boxedWarning = dailyMedData.sections.boxedWarning.text;
      medication.hasBoxedWarning = true;
    }

    return medication;
  }

  // Extract dosage form from products
  extractDosageForm(data) {
    if (data.products && data.products.length > 0) {
      const forms = [...new Set(data.products.map(p => p.dosageForm).filter(Boolean))];
      return forms.join(', ');
    }
    if (data.dosageForms && data.dosageForms.length > 0) {
      return [...new Set(data.dosageForms)].join(', ');
    }
    return '';
  }

  // Extract strength information
  extractStrength(data) {
    if (data.products && data.products.length > 0) {
      const strengths = [];
      data.products.forEach(product => {
        if (product.ingredients) {
          product.ingredients.forEach(ing => {
            if (ing.strength) {
              strengths.push(ing.strength);
            }
          });
        }
      });
      return [...new Set(strengths)].join(', ');
    }
    return '';
  }

  // Extract route of administration
  extractRoute(data) {
    if (data.products && data.products.length > 0) {
      const routes = [...new Set(data.products.map(p => p.route).filter(Boolean))];
      return routes.join(', ');
    }
    if (data.routes && data.routes.length > 0) {
      return [...new Set(data.routes)].join(', ');
    }
    return '';
  }

  // Extract NDC codes
  extractNDCCodes(data) {
    const codes = [];
    
    if (data.packages) {
      data.packages.forEach(pkg => {
        if (pkg.ndcCode) {
          codes.push({
            code: pkg.ndcCode,
            description: pkg.description || '',
            marketingStart: pkg.marketingStartDate || '',
            marketingEnd: pkg.marketingEndDate || ''
          });
        }
      });
    }
    
    return codes;
  }

  // Format dosage instructions for display
  formatDosageInstructions(text) {
    if (!text) return [];
    
    const instructions = [];
    const lines = text.split(/\n|\. /);
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 10) {
        // Check if it's a dosage instruction
        if (trimmed.match(/\d+\s*(mg|ml|mcg|g|tablet|capsule|dose)/i) ||
            trimmed.match(/(once|twice|three times|four times|daily|weekly|monthly)/i) ||
            trimmed.match(/(take|administer|inject|apply|use)/i)) {
          instructions.push(trimmed);
        }
      }
    });
    
    return instructions;
  }

  // Parse warnings into categories
  parseWarnings(warningsText) {
    if (!warningsText) return {};
    
    const categories = {
      blackBox: [],
      contraindications: [],
      precautions: [],
      pregnancy: [],
      pediatric: [],
      geriatric: [],
      general: []
    };
    
    const lines = warningsText.split(/\n/);
    let currentCategory = 'general';
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      
      // Detect category changes
      if (lower.includes('black box') || lower.includes('boxed warning')) {
        currentCategory = 'blackBox';
      } else if (lower.includes('contraindication')) {
        currentCategory = 'contraindications';
      } else if (lower.includes('precaution')) {
        currentCategory = 'precautions';
      } else if (lower.includes('pregnancy')) {
        currentCategory = 'pregnancy';
      } else if (lower.includes('pediatric') || lower.includes('children')) {
        currentCategory = 'pediatric';
      } else if (lower.includes('geriatric') || lower.includes('elderly')) {
        currentCategory = 'geriatric';
      }
      
      // Add line to current category if not empty
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 10) {
        categories[currentCategory].push(trimmed);
      }
    });
    
    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });
    
    return categories;
  }

  // Format drug interactions for display
  formatDrugInteractions(interactionsText) {
    if (!interactionsText) return [];
    
    const interactions = [];
    const sections = interactionsText.split(/\n\n/);
    
    sections.forEach(section => {
      const lines = section.split(/\n/);
      const firstLine = lines[0].trim();
      
      // Look for drug names in the first line
      if (firstLine && !firstLine.startsWith('•') && firstLine.length > 5) {
        interactions.push({
          drug: firstLine,
          description: lines.slice(1).join(' ').trim()
        });
      }
    });
    
    return interactions;
  }

  // Extract key highlights from medication data
  extractHighlights(data) {
    const highlights = [];
    
    // Check for boxed warning
    if (data.sections?.boxedWarning) {
      highlights.push({
        type: 'warning',
        title: 'Black Box Warning',
        content: this.formatContent(data.sections.boxedWarning.text).substring(0, 200) + '...'
      });
    }
    
    // Extract key indications
    if (data.sections?.indications) {
      const indicationsText = this.formatContent(data.sections.indications.text);
      const firstSentence = indicationsText.split('.')[0];
      if (firstSentence) {
        highlights.push({
          type: 'info',
          title: 'Primary Indication',
          content: firstSentence + '.'
        });
      }
    }
    
    // Extract dosage form and strength
    if (data.products && data.products.length > 0) {
      const product = data.products[0];
      highlights.push({
        type: 'dosage',
        title: 'Dosage Form',
        content: `${product.dosageForm || 'N/A'} - ${product.route || 'N/A'}`
      });
    }
    
    return highlights;
  }
}

// Export singleton instance
export default new DailyMedParser();