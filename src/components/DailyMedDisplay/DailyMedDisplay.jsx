import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  Package,
  Image as ImageIcon,
  Plus,
  Minus,
  Info,
  BookOpen,
  Link2,
  Rss,
  Database,
  Activity,
  Users,
  FlaskConical,
  FileCode,
  Printer
} from 'lucide-react';
import './DailyMedDisplay.css';

const DailyMedDisplay = ({ medication, details, onClose }) => {
  const [activeTab, setActiveTab] = useState('html');
  const [expandedSections, setExpandedSections] = useState({});
  const [showAllSections, setShowAllSections] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [expandedIFU, setExpandedIFU] = useState({});

  // Initialize expanded sections
  useEffect(() => {
    if (details?.sections) {
      const initialExpanded = {};
      // Collapse all sections by default, except warnings
      Object.keys(details.sections).forEach(key => {
        initialExpanded[key] = key === 'boxedWarning';
      });
      setExpandedSections(initialExpanded);
    }
  }, [details]);

  // Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Toggle IFU expansion
  const toggleIFU = (ifuKey) => {
    setExpandedIFU(prev => ({
      ...prev,
      [ifuKey]: !prev[ifuKey]
    }));
  };

  // Format section title with proper numbering
  const formatSectionTitle = (key, section) => {
    const sectionNumbers = {
      indications: '1',
      dosage: '2',
      dosageForms: '3',
      contraindications: '4',
      warningsAndPrecautions: '5',
      adverseReactions: '6',
      drugInteractions: '7',
      useInSpecificPopulations: '8',
      pregnancy: '8.1',
      lactation: '8.2',
      pediatricUse: '8.4',
      geriatricUse: '8.5',
      overdosage: '10',
      description: '11',
      clinicalPharmacology: '12',
      mechanismOfAction: '12.1',
      pharmacodynamics: '12.2',
      pharmacokinetics: '12.3',
      nonclinicalToxicology: '13',
      clinicalStudies: '14',
      references: '15',
      howSupplied: '16',
      patientInfo: '17'
    };

    const number = sectionNumbers[key];
    const title = section.title || key.replace(/([A-Z])/g, ' $1').trim();
    
    return number ? `${number} ${title.toUpperCase()}` : title.toUpperCase();
  };

  // Get package photos
  const packagePhotos = details?.productGalleryImages || details?.images?.filter(img => 
    img.imageType === 'package' || img.isPackageImage
  ) || [];

  // Get IFU sections
  const ifuSections = details?.instructionSections || [];

  // Exclude certain sections from display
  const excludedSections = ['highlights', 'tableOfContents', 'fullPrescribingInfo'];

  // Get ordered sections
  const getOrderedSections = () => {
    if (!details?.sections) return [];
    
    return Object.entries(details.sections)
      .filter(([key]) => !excludedSections.includes(key))
      .sort((a, b) => {
        const orderA = a[1].order || 999;
        const orderB = b[1].order || 999;
        return orderA - orderB;
      });
  };

  const orderedSections = getOrderedSections();

  return (
    <div className="dailymed-display">
      {/* Header */}
      <div className="dm-header">
        <div className="dm-header-content">
          <h1 className="dm-title">
            LABEL: {medication?.brandName || medication?.title}
          </h1>
          <button className="dm-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="dm-ndc-info">
          {medication?.packageNdc && (
            <>
              <strong>NDC Code(s):</strong> {medication.packageNdc}
              {details?.packages && details.packages.length > 0 && (
                <>, {details.packages.map(p => p.ndcCode).join(', ')}</>
              )}
            </>
          )}
        </div>
        {medication?.labelerName && (
          <div className="dm-packager">
            <strong>Packager:</strong> {medication.labelerName}
          </div>
        )}
      </div>

      <div className="dm-content-wrapper">
        {/* Left Sidebar */}
        <div className="dm-sidebar">
          {/* Package Photos */}
          {packagePhotos.length > 0 && (
            <div className="dm-sidebar-section">
              <h3 className="dm-sidebar-title">VIEW PACKAGE PHOTOS</h3>
              <div className="dm-package-photos">
                {packagePhotos.slice(0, 2).map((photo, index) => (
                  <div 
                    key={index} 
                    className="dm-photo-thumb"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img 
                      src={photo.url} 
                      alt={`Package ${index + 1}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span className="dm-photo-expand">+</span>
                  </div>
                ))}
              </div>
              <button className="dm-view-more-btn">
                <Plus size={12} /> VIEW MORE
              </button>
            </div>
          )}

          {/* Safety Section */}
          <div className="dm-sidebar-section dm-safety">
            <h3 className="dm-sidebar-title">SAFETY</h3>
            <ul className="dm-sidebar-links">
              {details?.sections?.boxedWarning && (
                <li>
                  <a href="#boxed-warning" onClick={(e) => {
                    e.preventDefault();
                    toggleSection('boxedWarning');
                  }}>
                    Boxed Warnings
                  </a>
                </li>
              )}
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Report Adverse Events
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  FDA Safety Recalls
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Presence in Breast Milk
                </a>
              </li>
            </ul>
          </div>

          {/* Related Resources */}
          <div className="dm-sidebar-section">
            <h3 className="dm-sidebar-title">RELATED RESOURCES</h3>
            <ul className="dm-sidebar-links">
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Medline Plus
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Clinical Trials
                </a>
              </li>
              <li className="dm-expandable">
                <Plus size={12} /> PubMed
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Biochemical Data Summary
                </a>
              </li>
            </ul>
          </div>

          {/* More Info */}
          <div className="dm-sidebar-section">
            <h3 className="dm-sidebar-title">MORE INFO FOR THIS DRUG</h3>
            <ul className="dm-sidebar-links">
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  View Labeling Archives
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  RxNorm
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Get Label RSS Feed
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  View NDC Code(s) <span className="dm-new">NEW!</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="dm-main-content">
          {/* Drug Label Information Header */}
          <div className="dm-label-header">
            <h2>DRUG LABEL INFORMATION</h2>
            <div className="dm-updated">
              Updated {details?.updated || new Date().toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
            {details?.disclaimer && (
              <div className="dm-disclaimer">
                If you are a consumer or patient please visit <a href="#">this version</a>.
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="dm-nav-tabs">
            <button 
              className={`dm-nav-tab ${activeTab === 'pdf' ? 'active' : ''}`}
              onClick={() => setActiveTab('pdf')}
            >
              DOWNLOAD DRUG LABEL INFO: PDF
            </button>
            <button 
              className={`dm-nav-tab ${activeTab === 'xml' ? 'active' : ''}`}
              onClick={() => setActiveTab('xml')}
            >
              XML
            </button>
            <button 
              className={`dm-nav-tab ${activeTab === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              MEDICATION GUIDE
            </button>
            <button 
              className={`dm-nav-tab ${activeTab === 'html' ? 'active' : ''}`}
              onClick={() => setActiveTab('html')}
            >
              HTML
            </button>
            <button 
              className={`dm-nav-tab dm-official`}
              onClick={() => window.open(`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${medication?.setId}`, '_blank')}
            >
              OFFICIAL LABEL (PRINTER FRIENDLY)
            </button>
          </div>

          {/* View All Sections Link */}
          <div className="dm-view-all">
            <button 
              className="dm-view-all-btn"
              onClick={() => setShowAllSections(!showAllSections)}
            >
              {showAllSections ? 'HIDE' : 'VIEW ALL SECTIONS'}
            </button>
          </div>

          {/* Sections Content */}
          <div className="dm-sections">
            {/* Boxed Warning if exists */}
            {details?.sections?.boxedWarning && (
              <div className="dm-section dm-boxed-warning">
                <h3 
                  className="dm-section-header"
                  onClick={() => toggleSection('boxedWarning')}
                >
                  <span className="dm-section-icon">
                    {expandedSections.boxedWarning ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                  <AlertTriangle size={16} className="dm-warning-icon" />
                  BOXED WARNING
                  <span className="dm-what-is-this">(WHAT IS THIS?)</span>
                </h3>
                {expandedSections.boxedWarning && (
                  <div className="dm-section-content dm-warning-content"
                    dangerouslySetInnerHTML={{ __html: details.sections.boxedWarning.text }}
                  />
                )}
              </div>
            )}

            {/* Regular Sections */}
            {orderedSections.map(([key, section]) => {
              if (key === 'boxedWarning') return null;
              
              const isIFUSection = key.includes('instructionsForUse');
              const shouldShow = showAllSections || expandedSections[key];
              
              return (
                <div key={key} className={`dm-section ${isIFUSection ? 'dm-ifu-section' : ''}`}>
                  <h3 
                    className="dm-section-header"
                    onClick={() => toggleSection(key)}
                  >
                    <span className="dm-section-icon">
                      {expandedSections[key] ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                    {formatSectionTitle(key, section)}
                  </h3>
                  
                  {expandedSections[key] && (
                    <div className="dm-section-content">
                      {/* Special handling for Instructions for Use */}
                      {isIFUSection && ifuSections.length > 0 ? (
                        <div className="dm-ifu-list">
                          {ifuSections.map((ifu, index) => (
                            <div key={index} className="dm-ifu-item">
                              <h4 
                                className="dm-ifu-header"
                                onClick={() => toggleIFU(`ifu_${index}`)}
                              >
                                <span className="dm-ifu-icon">
                                  {expandedIFU[`ifu_${index}`] ? <Minus size={14} /> : <Plus size={14} />}
                                </span>
                                {ifu.title}
                              </h4>
                              {expandedIFU[`ifu_${index}`] && (
                                <div 
                                  className="dm-ifu-content"
                                  dangerouslySetInnerHTML={{ __html: ifu.content }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: section.text }} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Package/Carton Sections */}
            {details?.sections?.principalDisplayPanel && (
              <div className="dm-section">
                <h3 
                  className="dm-section-header"
                  onClick={() => toggleSection('principalDisplayPanel')}
                >
                  <span className="dm-section-icon">
                    {expandedSections.principalDisplayPanel ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                  PRINCIPAL DISPLAY PANEL
                </h3>
                {expandedSections.principalDisplayPanel && (
                  <div 
                    className="dm-section-content"
                    dangerouslySetInnerHTML={{ __html: details.sections.principalDisplayPanel.text }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyMedDisplay;