import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Package,
  AlertCircle,
  FileText,
  ArrowBigLeft,
  Loader,
  Plus,
  Paperclip
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import dailyMedService from '../../services/dailyMedService';
import { 
  organizeImagesBySection, 
  filterImagesForView, 
  getInstructionImagesForDosageForm,
  getImageSummary 
} from '../../utils/splImageHelper';
import { processInstructionImages } from '../../utils/dailyMedImageProcessor';
import './Counsel.css';

const Counsel = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [medicationDetails, setMedicationDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedDosageForm, setSelectedDosageForm] = useState(0);
  const [deviceMode, setDeviceMode] = useState('desktop'); // For responsive toolbar
  const [processedSections, setProcessedSections] = useState({}); // Cache for processed instruction sections
  
  const searchInputRef = useRef(null);
  
  // Detect device mode for responsive toolbar
  useEffect(() => {
    const updateDeviceMode = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceMode('mobile');
      } else if (width < 1024) {
        setDeviceMode('tablet');
      } else {
        setDeviceMode('desktop');
      }
    };
    
    updateDeviceMode();
    window.addEventListener('resize', updateDeviceMode);
    return () => window.removeEventListener('resize', updateDeviceMode);
  }, []);


  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Perform medication search
  const performSearch = async (query) => {
    if (!query || query.trim().length < 3) return;

    setIsSearching(true);
    setSelectedMedication(null);
    setMedicationDetails(null);

    try {
      const results = await dailyMedService.searchMedications(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message.includes('HTML instead of JSON') 
        ? 'Search service temporarily unavailable. Please try again later.'
        : error.message.includes('Network error')
        ? 'Unable to connect to search service. Please check your internet connection.'
        : 'Search failed. Please try again.';
      
      // Set error state (you may want to add an error state)
      setSearchResults({ 
        results: [], 
        count: 0, 
        error: errorMessage 
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Group search results by dosage form
  const groupResultsByDosageForm = (results) => {
    const grouped = {};
    
    results.forEach(med => {
      // Extract dosage form from the title or details
      let dosageForm = extractDosageForm(med.title);
      
      // If no form found, try to extract from generic name or use 'Other'
      if (!dosageForm && med.genericName) {
        dosageForm = extractDosageForm(med.genericName);
      }
      
      if (!dosageForm) {
        dosageForm = 'Other';
      }
      
      if (!grouped[dosageForm]) {
        grouped[dosageForm] = {
          form: dosageForm,
          medications: [],
          thumbnail: null
        };
      }
      
      grouped[dosageForm].medications.push(med);
    });

    return grouped;
  };

  // Extract dosage form from medication title
  const extractDosageForm = (title) => {
    const forms = [
      'TABLET', 'CAPSULE', 'SOLUTION', 'INJECTION', 'CREAM', 
      'OINTMENT', 'GEL', 'LOTION', 'SUSPENSION', 'SYRUP',
      'POWDER', 'PATCH', 'DROPS', 'SPRAY', 'INHALER', 'PEN',
      'IMPLANT', 'SUPPOSITORY', 'FOAM', 'FILM', 'LOZENGE',
      'GRANULES', 'AEROSOL', 'EMULSION', 'PASTE', 'SHAMPOO'
    ];
    
    const upperTitle = title ? title.toUpperCase() : '';
    return forms.find(form => upperTitle.includes(form)) || null;
  };

  // Load medication details
  const loadMedicationDetails = async (medication) => {
    setLoadingDetails(true);
    setSelectedMedication(medication);
    setSelectedDosageForm(0);
    
    try {
      const details = await dailyMedService.getMedicationDetails(medication.setId);
      
      // Organize images by section using the new helper
      const organizedImages = organizeImagesBySection(details);
      details.organizedImages = organizedImages;
      
      // Get image summary for display
      const imageSummary = getImageSummary(organizedImages);
      if (imageSummary) {
        console.log('Image Summary:', imageSummary);
        details.imageSummary = imageSummary;
      }
      
      // Process all Instructions for Use sections (may have multiple)
      const instructionSections = [];
      const patientLabelingSections = [];
      
      if (details?.sections) {
        Object.entries(details.sections).forEach(([key, section]) => {
          // Check for Instructions for Use sections (including numbered variants)
          if (key.startsWith('instructionsForUse') || 
              section.type === 'instructions-for-use' ||
              (section.loincCode && ['42231-1', '51727-6', '69718-5', '69719-3', '49267-5', '59845-8', '43685-8', '77482-3'].includes(section.loincCode))) {
            instructionSections.push({
              key: key,
              title: section.title || 'Instructions for Use',
              content: section.text,
              loincCode: section.loincCode,
              media: section.media || []
            });
          }
          
          // Check for patient labeling sections
          if (section.type === 'patient-labeling' || 
              section.loincCode === '42230-3' ||
              key === 'medGuide') {
            patientLabelingSections.push({
              key: key,
              title: section.title || 'Medication Guide',
              content: section.text,
              loincCode: section.loincCode
            });
          }
        });
      }
      
      // Store instruction sections for easy access
      if (instructionSections.length > 0) {
        details.instructionSections = instructionSections;
        console.log(`Found ${instructionSections.length} Instructions for Use sections`);
        console.log('📸 Available images for Instructions processing:', details?.images?.length || 0);
        console.log('📸 Available media images for Instructions processing:', details?.mediaImages?.length || 0);
        
        if (details?.images && details.images.length > 0) {
          console.log('🔍 Image names available:', details.images.map(img => img.name || img));
        }
        
        // Pre-process instruction sections asynchronously
        const processedSectionData = {};
        for (const instructionSection of instructionSections) {
          try {
            const processedHTML = await processInstructionImages(
              instructionSection.content,
              medication.setId,
              details?.images || details?.mediaImages || []
            );
            processedSectionData[instructionSection.key] = processedHTML;
          } catch (error) {
            console.error(`Error processing instructions for section ${instructionSection.key}:`, error);
            processedSectionData[instructionSection.key] = instructionSection.content; // Fallback to original
          }
        }
        setProcessedSections(processedSectionData);
      }
      
      if (patientLabelingSections.length > 0) {
        details.patientLabelingSections = patientLabelingSections;
        console.log(`Found ${patientLabelingSections.length} Patient Labeling sections`);
      }
      
      setMedicationDetails(details);
      
      // Also process any other instruction-related sections
      const otherProcessedSections = {};
      if (details?.sections) {
        for (const [key, section] of Object.entries(details.sections)) {
          if (key.toLowerCase().includes('instruction') && !key.startsWith('instructionsForUse')) {
            try {
              const processedHTML = await processInstructionImages(
                section.text,
                medication.setId,
                details?.images || details?.mediaImages || []
              );
              otherProcessedSections[key] = processedHTML;
            } catch (error) {
              console.error(`Error processing instructions for section ${key}:`, error);
              otherProcessedSections[key] = section.text; // Fallback to original
            }
          }
        }
      }
      
      // Update processed sections with both instruction sections and other sections
      setProcessedSections(prev => ({ ...prev, ...otherProcessedSections }));
      
      // Initialize sections - expand first few like DailyMed
      const sections = {};
      if (details?.sections) {
        const sectionKeys = Object.keys(details.sections);
        sectionKeys.forEach((key) => {
          // Collapse all sections by default
          sections[key] = false;
        });
      }
      setExpandedSections(sections);
    } catch (error) {
      console.error('Error loading medication details:', error);
      setMedicationDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Extract different dosage forms from instructions HTML
  const extractDosageFormsFromInstructions = (html) => {
    const forms = [];
    
    // Common dosage form patterns
    const patterns = [
      { regex: /INSTRUCTIONS FOR USE.*?(?:Single-Dose Pen|Pen)/gi, name: 'Pen' },
      { regex: /INSTRUCTIONS FOR USE.*?(?:Prefilled Syringe|Syringe)/gi, name: 'Prefilled Syringe' },
      { regex: /INSTRUCTIONS FOR USE.*?(?:Vial)/gi, name: 'Vial' },
      { regex: /INSTRUCTIONS FOR USE.*?(?:Cartridge)/gi, name: 'Cartridge' },
      { regex: /INSTRUCTIONS FOR USE.*?(?:Auto-injector|Autoinjector)/gi, name: 'Auto-injector' }
    ];
    
    // Check if HTML contains multiple instruction sections
    const instructionSections = html.split(/(<h[23][^>]*>.*?INSTRUCTIONS FOR USE.*?<\/h[23]>)/gi);
    
    if (instructionSections.length > 2) {
      // Multiple instruction sections found
      for (let i = 1; i < instructionSections.length; i += 2) {
        if (i + 1 < instructionSections.length) {
          const header = instructionSections[i];
          const content = instructionSections[i + 1];
          
          // Try to identify the dosage form from the header
          let formName = 'Instructions';
          for (const pattern of patterns) {
            if (pattern.regex.test(header)) {
              formName = pattern.name;
              break;
            }
          }
          
          // Extract any dosage amount from the header
          const dosageMatch = header.match(/(\d+\s*mg\/\d+\.?\d*\s*m[Ll])/g);
          if (dosageMatch) {
            formName += ` (${dosageMatch[0]})`;
          }
          
          forms.push({
            name: formName,
            content: header + content
          });
        }
      }
    }
    
    return forms;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      }
      return;
    }
  };


  // Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  
  // Open official label (printer friendly) in new tab
  const openOfficialLabel = (setId) => {
    const pdfUrl = `https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=${setId}&type=display`;
    window.open(pdfUrl, '_blank');
  };
  
  // Download official label as PDF
  const downloadOfficialLabelPDF = (setId, brandName) => {
    const pdfUrl = `https://dailymed.nlm.nih.gov/dailymed/downloadpdffile.cfm?setId=${setId}`;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${brandName || 'medication'}_label.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Open DailyMed page in new tab
  const openDailyMedPage = (setId) => {
    const url = `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setId}`;
    window.open(url, '_blank');
  };


  // Format section title - proper DailyMed format without highlights
  const formatSectionTitle = (key, section) => {
    // Special handling for Instructions for Use sections
    if (key.startsWith('instructionsForUse')) {
      // Try to extract dosage form and strength from the section content
      let dosageInfo = '';
      
      if (section?.text) {
        // Look for dosage form patterns in the section text
        const dosageFormMatch = section.text.match(/(?:pen|syringe|vial|injection|solution|tablet|capsule|patch|inhaler|spray|cream|ointment|gel)/i);
        const dosageForm = dosageFormMatch ? dosageFormMatch[0].toUpperCase() : '';
        
        // Look for strength patterns (e.g., 100mg, 50mg/ml, etc.)
        const strengthPatterns = [
          /(\d+(?:\.\d+)?\s*mg(?:\/\d+(?:\.\d+)?\s*m[Ll])?)/,
          /(\d+(?:\.\d+)?\s*mcg)/,
          /(\d+(?:\.\d+)?\s*units?(?:\/\d+(?:\.\d+)?\s*m[Ll])?)/i,
          /(\d+(?:\.\d+)?\s*%)/
        ];
        
        let strength = '';
        for (const pattern of strengthPatterns) {
          const match = section.text.match(pattern);
          if (match) {
            strength = match[1];
            break;
          }
        }
        
        // Combine dosage form and strength
        if (dosageForm || strength) {
          dosageInfo = `${dosageForm} ${strength}`.trim();
          if (dosageInfo) {
            return `Instructions for Use - ${dosageInfo}`;
          }
        }
      }
      
      // If we can't extract specific info, check for section number
      const sectionNumber = key.match(/\d+$/);
      if (sectionNumber) {
        return `Instructions for Use ${sectionNumber[0]}`;
      }
      
      return 'Instructions for Use';
    }
    const sectionMap = {
      // Primary sections (no highlights - it's just a summary)
      boxedWarning: 'BOXED WARNING',
      indications: 'INDICATIONS AND USAGE',
      dosage: 'DOSAGE AND ADMINISTRATION',
      dosageForms: 'DOSAGE FORMS AND STRENGTHS',
      contraindications: 'CONTRAINDICATIONS',
      warnings: 'WARNINGS',
      warningsAndPrecautions: 'WARNINGS AND PRECAUTIONS',
      adverseReactions: 'ADVERSE REACTIONS',
      drugInteractions: 'DRUG INTERACTIONS',
      useInSpecificPopulations: 'USE IN SPECIFIC POPULATIONS',
      pregnancy: 'Pregnancy',
      lactation: 'Lactation',
      femalesAndMalesOfReproductivePotential: 'Females and Males of Reproductive Potential',
      pediatricUse: 'Pediatric Use',
      geriatricUse: 'Geriatric Use',
      hepaticImpairment: 'Hepatic Impairment',
      renalImpairment: 'Renal Impairment',
      overdosage: 'OVERDOSAGE',
      description: 'DESCRIPTION',
      clinicalPharmacology: 'CLINICAL PHARMACOLOGY',
      mechanismOfAction: 'Mechanism of Action',
      pharmacodynamics: 'Pharmacodynamics',
      pharmacokinetics: 'Pharmacokinetics',
      microbiology: 'Microbiology',
      nonclinicalToxicology: 'NONCLINICAL TOXICOLOGY',
      carcinogenesisMutagenesisImpairmentOfFertility: 'Carcinogenesis, Mutagenesis, Impairment of Fertility',
      animalToxicology: 'Animal Toxicology and/or Pharmacology',
      clinicalStudies: 'CLINICAL STUDIES',
      references: 'REFERENCES',
      howSupplied: 'HOW SUPPLIED/STORAGE AND HANDLING',
      storage: 'Storage and Handling',
      patientInfo: 'PATIENT COUNSELING INFORMATION',
      patientCounselingInformation: 'PATIENT COUNSELING INFORMATION',
      medGuide: 'MEDICATION GUIDE',
      instructionsForUse: 'INSTRUCTIONS FOR USE',
      principalDisplayPanel: 'PRINCIPAL DISPLAY PANEL',
      packaging: 'PACKAGING',
      ingredientsAndAppearance: 'INGREDIENTS AND APPEARANCE',
      patientPackageInsert: 'PATIENT PACKAGE INSERT',
      fullPrescribingInfo: 'FULL PRESCRIBING INFORMATION',
      
      // OTC sections
      otcPurpose: 'PURPOSE',
      otcActiveIngredient: 'ACTIVE INGREDIENT(S)',
      otcUses: 'USES',
      otcWarnings: 'WARNINGS',
      otcDirections: 'DIRECTIONS',
      otcOtherInformation: 'OTHER INFORMATION',
      otcInactiveIngredients: 'INACTIVE INGREDIENTS',
      otcQuestions: 'QUESTIONS?',
      otcDoNotUse: 'DO NOT USE',
      otcAskDoctor: 'ASK A DOCTOR BEFORE USE',
      otcAskDoctorOrPharmacist: 'ASK A DOCTOR OR PHARMACIST BEFORE USE',
      otcWhenUsing: 'WHEN USING THIS PRODUCT',
      otcStopUse: 'STOP USE AND ASK A DOCTOR IF',
      otcKeepOutOfReachOfChildren: 'KEEP OUT OF REACH OF CHILDREN'
    };
    
    return sectionMap[key] || key.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
  };

  // Exclude sections that are not needed for patient counseling
  const excludedSections = [
    'highlights', 
    'tableOfContents', 
    'recentMajorChanges', 
    'fullPrescribingInfo',
    // All principal display panel variations
    'principalDisplayPanel',
    'principalDisplayPanel2',
    'principalDisplayPanel3',
    'principalDisplayPanel4',
    'principalDisplayPanel5',
    'principalDisplayPanel6',
    'principalDisplayPanel7',
    'principalDisplayPanel8',
    'principalDisplayPanel9',
    'principalDisplayPanel10',
    // All carcinogenesis related sections
    'carcinogenesisMutagenesisImpairmentOfFertility',
    'carcinogenesis',
    'mutagenesis',
    'impairmentOfFertility',
    'animalToxicology',
    'nonclinicalToxicology',
    // Other excluded sections
    'pharmacokinetics',
    'pharmacodynamics',
    'references',
    'clinicalStudies',
    'mechanismOfAction',
    'microbiology',
    'nonclinicalToxicology',
    'animalToxicology'
  ];
  
  // All sections to display (filtering out excluded sections)
  const allowedSections = null; // null means show all except excluded
  
  // Section display order matching proper DailyMed structure (without excluded sections)
  const sectionOrder = [
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
    'howSupplied',
    'patientInfo',
    'medGuide',
    'instructionsForUse',
    'instructionsForUse2',
    'instructionsForUse3',
    'instructionsForUse4',
    'ingredientsAndAppearance',
    'pregnancy',
    'lactation',
    'femalesAndMalesOfReproductivePotential',
    'pediatricUse',
    'geriatricUse',
    'hepaticImpairment',
    'renalImpairment',
    'storage',
    'patientCounselingInformation',
    'packaging',
    'patientPackageInsert',
    'otcPurpose',
    'otcActiveIngredient',
    'otcUses',
    'otcWarnings',
    'otcDirections',
    'otcOtherInformation',
    'otcInactiveIngredients',
    'otcQuestions',
    'otcDoNotUse',
    'otcAskDoctor',
    'otcAskDoctorOrPharmacist',
    'otcWhenUsing',
    'otcStopUse',
    'otcKeepOutOfReachOfChildren'
  ];

  // Sort sections by predefined order and filter if needed
  const getSortedSections = () => {
    if (!medicationDetails?.sections) return [];
    
    let sections = Object.entries(medicationDetails.sections);
    
    // Filter out excluded sections - check both exact match and pattern matching
    sections = sections.filter(([key]) => {
      // Check exact match
      if (excludedSections.includes(key)) return false;
      
      // Check if key contains any excluded patterns
      const keyLower = key.toLowerCase();
      
      // Filter out all principal display panel variations
      if (keyLower.includes('principaldisplaypanel') || 
          keyLower.includes('principal_display_panel') ||
          keyLower.includes('display_panel') ||
          keyLower.includes('displaypanel')) {
        return false;
      }
      
      // Filter out carcinogenesis sections
      if (keyLower.includes('carcinogenesis') || 
          keyLower.includes('mutagenesis') ||
          keyLower.includes('impairmentoffertility') ||
          keyLower.includes('nonclinicaltoxicology') ||
          keyLower.includes('animaltoxicology')) {
        return false;
      }
      
      return true;
    });
    
    // Show all sections - no exclusions to match DailyMed exactly
    
    // Additional filter if allowedSections is defined
    if (allowedSections) {
      sections = sections.filter(([key]) => allowedSections.includes(key));
    }
      
    return sections.sort((a, b) => {
      const indexA = sectionOrder.indexOf(a[0]);
      const indexB = sectionOrder.indexOf(b[0]);
      
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
  };

  return (
    <div className={`counsel-page ${theme}`}>
      {/* Board-style Toolbar with integrated search */}
      <div className={`board-toolbar board-toolbar-${deviceMode}`}>
        {/* Title */}
        <div className="toolbar-title">
          <h1 className="page-title">Patient Counseling</h1>
        </div>
        
        {/* Search Bar */}
        <div className="toolbar-search">
          <div className="counsel-input">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M11.5 6C11.3949 6.00006 11.2925 5.96705 11.2073 5.90565C11.1221 5.84425 11.0583 5.75758 11.0251 5.65792L10.7623 4.86908C10.6623 4.57101 10.4288 4.33629 10.13 4.23693L9.34102 3.97354C9.24166 3.94019 9.1553 3.87649 9.09411 3.79142C9.03292 3.70635 9 3.60421 9 3.49943C9 3.39465 9.03292 3.29252 9.09411 3.20745C9.1553 3.12238 9.24166 3.05867 9.34102 3.02532L10.13 2.76193C10.4282 2.66191 10.663 2.42852 10.7623 2.12979L11.0258 1.34094C11.0591 1.24161 11.1229 1.15526 11.2079 1.09409C11.293 1.03291 11.3952 1 11.5 1C11.6048 1 11.707 1.03291 11.7921 1.09409C11.8771 1.15526 11.9409 1.24161 11.9742 1.34094L12.2377 2.12979C12.2868 2.27697 12.3695 2.4107 12.4792 2.52041C12.589 2.63013 12.7227 2.71281 12.87 2.76193L13.659 3.02532C13.7583 3.05867 13.8447 3.12238 13.9059 3.20745C13.9671 3.29252 14 3.39465 14 3.49943C14 3.60421 13.9671 3.70635 13.9059 3.79142C13.8447 3.87649 13.7583 3.94019 13.659 3.97354L12.87 4.23693C12.5718 4.33696 12.337 4.57034 12.2377 4.86908L11.9742 5.65792C11.9411 5.75747 11.8774 5.84406 11.7923 5.90545C11.7072 5.96684 11.6049 5.99992 11.5 6Z" fill="currentColor"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M6 13C5.85133 13.0001 5.7069 12.9504 5.58969 12.859C5.47247 12.7675 5.38921 12.6395 5.35313 12.4952L5.12388 11.5745C4.91418 10.7391 4.26198 10.0868 3.42674 9.87703L2.50619 9.64774C2.36169 9.61194 2.23333 9.52878 2.14159 9.41151C2.04985 9.29425 2 9.14964 2 9.00075C2 8.85185 2.04985 8.70724 2.14159 8.58998C2.23333 8.47272 2.36169 8.38955 2.50619 8.35376L3.42674 8.12446C4.26198 7.91473 4.91418 7.2624 5.12388 6.427L5.35313 5.50629C5.38892 5.36176 5.47207 5.23338 5.58931 5.14162C5.70655 5.04986 5.85113 5 6 5C6.14887 5 6.29345 5.04986 6.41069 5.14162C6.52793 5.23338 6.61108 5.36176 6.64687 5.50629L6.87612 6.427C6.97865 6.83721 7.19071 7.21184 7.48965 7.51082C7.78858 7.80981 8.16313 8.02192 8.57326 8.12446L9.49381 8.35376C9.63831 8.38955 9.76667 8.47272 9.85841 8.58998C9.95015 8.70724 10 8.85185 10 9.00075C10 9.14964 9.95015 9.29425 9.85841 9.41151C9.76667 9.52878 9.63831 9.61194 9.49381 9.64774L8.57326 9.87703C8.16313 9.97957 7.78858 10.1917 7.48965 10.4907C7.19071 10.7897 6.97865 11.1643 6.87612 11.5745L6.64687 12.4952C6.61079 12.6395 6.52753 12.7675 6.41031 12.859C6.2931 12.9504 6.14867 13.0001 6 13Z" fill="currentColor"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M13.5005 23C13.3376 23 13.1791 22.9469 13.049 22.8487C12.9189 22.7505 12.8243 22.6127 12.7795 22.456L11.9665 19.61C11.7915 18.9971 11.4631 18.4389 11.0124 17.9882C10.5616 17.5374 10.0035 17.209 9.39054 17.034L6.54454 16.221C6.38795 16.1761 6.25021 16.0815 6.15216 15.9514C6.05411 15.8214 6.00108 15.6629 6.00108 15.5C6.00108 15.3371 6.05411 15.1786 6.15216 15.0486C6.25021 14.9185 6.38795 14.8239 6.54454 14.779L9.39054 13.966C10.0035 13.791 10.5616 13.4626 11.0124 13.0118C11.4631 12.5611 11.7915 12.0029 11.9665 11.39L12.7795 8.544C12.8244 8.38741 12.919 8.24967 13.0491 8.15162C13.1792 8.05357 13.3376 8.00054 13.5005 8.00054C13.6634 8.00054 13.8219 8.05357 13.952 8.15162C14.0821 8.24967 14.1767 8.38741 14.2215 8.544L15.0345 11.39C15.2096 12.0029 15.538 12.5611 15.9887 13.0118C16.4394 13.4626 16.9976 13.791 17.6105 13.966L20.4565 14.779C20.6131 14.8239 20.7509 14.9185 20.8489 15.0486C20.947 15.1786 21 15.3371 21 15.5C21 15.6629 20.947 15.8214 20.8489 15.9514C20.7509 16.0815 20.6131 16.1761 20.4565 16.221L17.6105 17.034C16.9976 17.209 16.4394 17.5374 15.9887 17.9882C15.538 18.4389 15.2096 18.9971 15.0345 19.61L14.2215 22.456C14.1768 22.6127 14.0822 22.7505 13.9521 22.8487C13.822 22.9469 13.6635 23 13.5005 23Z" fill="currentColor"/>
          </svg>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search by drug name or NDC"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="counsel-search-input"
          />
          
          
          {isSearching && (
            <div className="search-loader">
              <Loader size={18} className="spinning" />
            </div>
          )}

          </div>
        </div>
        
        {/* Actions Section */}
        {selectedMedication && (
          <div className="toolbar-section actions">
            <button 
              className="tool-button"
              onClick={() => {
                setSelectedMedication(null);
                setMedicationDetails(null);
              }}
              title="Back to Search Results"
            >
              <ArrowBigLeft size={deviceMode === 'mobile' ? 18 : 20} />
            </button>
            
            <button 
              className="tool-button"
              onClick={() => openOfficialLabel(selectedMedication.setId)}
              title="View Official Label"
            >
              <Paperclip size={deviceMode === 'mobile' ? 18 : 20} />
            </button>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="counsel-content">
        {/* Search Results - DailyMed Style */}
        {searchResults && !selectedMedication && (
          <div className="search-results-container">
            {searchResults.error ? (
              <div className="error-state">
                <AlertCircle size={48} />
                <p>{searchResults.error}</p>
                <button 
                  className="retry-button"
                  onClick={() => searchQuery && performSearch(searchQuery)}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="results-list">
                {searchResults.results && searchResults.results.map((med, idx) => (
                <div key={idx} className="med-result-item">
                  <div className="med-image-container">
                    {med.imageUrl ? (
                      <img 
                        src={med.imageUrl} 
                        alt={med.brandName || med.title}
                        className="med-package-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="med-image-placeholder" style={{display: med.imageUrl ? 'none' : 'flex'}}>
                      <Package size={40} color="#666" />
                    </div>
                  </div>
                  <div className="med-details">
                    <h3 className="med-title">
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          loadMedicationDetails(med);
                        }}
                      >
                        {med.brandName || med.title}
                      </a>
                    </h3>
                    {med.genericName && (
                      <p className="med-generic">{med.genericName}</p>
                    )}
                    {med.ndcCodes && med.ndcCodes.length > 0 && (
                      <div className="ndc-info">
                        <strong>NDC Code(s):</strong> {med.ndcCodes.slice(0, 3).join(', ')}
                        {med.ndcCodes.length > 3 && (
                          <span>, <a href="#" onClick={(e) => {
                            e.preventDefault();
                            loadMedicationDetails(med);
                          }}>view more</a></span>
                        )}
                      </div>
                    )}
                    <p className="med-packager">
                      <strong>Packager:</strong> {med.labelerName || 'Not specified'}
                    </p>
                    <button 
                      className="view-more-btn"
                      onClick={() => loadMedicationDetails(med)}
                    >
                      <span>VIEW MORE</span>
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        )}

        {/* Medication Details */}
        {selectedMedication && (
          <div className="medication-details">
            <div className="details-header">
              <div className="header-content">
                <div className="medication-info">
                  <h2>{selectedMedication.brandName || selectedMedication.title}</h2>
                  <p className="generic-name">{selectedMedication.genericName}</p>
                  <p className="labeler">{selectedMedication.labelerName}</p>
                </div>
              </div>
            </div>

            {loadingDetails ? (
              <div className="loading-state">
                <Loader size={32} className="spinning" />
                <p>Loading medication information...</p>
              </div>
            ) : medicationDetails ? (
              <div className="sections-container">
                {getSortedSections().length > 0 ? (
                  getSortedSections().map(([key, section]) => {
                    // Skip empty sections
                    if (!section || !section.text || section.text.trim() === '') return null;
                    
                    return (
                      <div key={key} className="section-item">
                        <div 
                          className="section-header"
                          onClick={() => toggleSection(key)}
                        >
                          <div className="section-title-wrapper">
                            <div className="section-icon">
                              {expandedSections[key] ? '-' : '+'}
                            </div>
                            <h3>{formatSectionTitle(key, section)}</h3>
                          </div>
                        </div>
                        
                        {expandedSections[key] && (
                          <div className="section-content">
                            {key === 'instructionsForUse' || key.startsWith('instructionsForUse') ? (
                              <div className="instructions-container">
                                {/* Check if there are multiple dosage forms */}
                                {section.dosageForms && section.dosageForms.length > 0 ? (
                                  <div className="dosage-forms-tabs">
                                    <div className="dosage-form-buttons">
                                      {section.dosageForms.map((form, idx) => (
                                        <button
                                          key={idx}
                                          className={`dosage-form-btn ${selectedDosageForm === idx ? 'active' : ''}`}
                                          onClick={() => setSelectedDosageForm(idx)}
                                        >
                                          {form.name}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="dosage-form-content">
                                      {section.dosageForms[selectedDosageForm] && (
                                        <div 
                                          className="section-text instructions-text with-images"
                                          dangerouslySetInnerHTML={{ 
                                            __html: processedSections[key] || section.dosageForms[selectedDosageForm].content
                                          }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    className="section-text instructions-text with-images"
                                    dangerouslySetInnerHTML={{ 
                                      __html: processedSections[key] || section.text
                                    }}
                                  />
                                )}
                              </div>
                            ) : key.toLowerCase().includes('instruction') ? (
                              <div 
                                className="section-text instructions-text with-images"
                                dangerouslySetInnerHTML={{ 
                                  __html: processedSections[key] || section.text
                                }}
                              />
                            ) : (
                              <div 
                                className="section-text"
                                dangerouslySetInnerHTML={{ __html: section.text }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="error-state">
                    <AlertCircle size={48} />
                    <p>No detailed information available for this medication</p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                      Try searching for a different formulation or visit the official DailyMed website.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="error-state">
                <AlertCircle size={48} />
                <p>Unable to load medication information</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Counsel;