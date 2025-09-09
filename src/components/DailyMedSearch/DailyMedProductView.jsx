import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Download,
  Printer,
  Share2,
  AlertTriangle,
  Info,
  Pill,
  Heart,
  AlertCircle,
  FileText,
  Shield,
  Users,
  Package,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Hash
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ImageGallery from './ImageGallery';
import './DailyMedClone.css';

const DailyMedProductView = ({ medication, onBack, onImport }) => {
  const { theme } = useTheme();
  const [details, setDetails] = useState(null);
  const [images, setImages] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({});

  // Load complete medication details
  useEffect(() => {
    loadCompleteDetails();
  }, [medication.setId]);

  const loadCompleteDetails = async () => {
    setLoadingDetails(true);
    try {
      const { default: dailyMedService } = await import('../../services/dailyMedService');
      
      // Load details and images in parallel
      const [medicationDetails, medicationImages] = await Promise.all([
        dailyMedService.getMedicationDetails(medication.setId),
        dailyMedService.getMedicationImages(medication.setId)
      ]);
      
      setDetails(medicationDetails);
      setImages(medicationImages || []);
      
      // Auto-expand important sections
      if (medicationDetails?.sections) {
        const autoExpand = {};
        Object.keys(medicationDetails.sections).forEach(key => {
          if (['indications', 'dosage', 'warnings'].includes(key)) {
            autoExpand[key] = true;
          }
        });
        setExpandedSections(autoExpand);
      }
    } catch (error) {
      console.error('Error loading medication details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Get section icon
  const getSectionIcon = (key) => {
    const icons = {
      indications: <Heart size={16} />,
      dosage: <Pill size={16} />,
      warnings: <AlertTriangle size={16} />,
      contraindications: <Shield size={16} />,
      adverseReactions: <AlertCircle size={16} />,
      drugInteractions: <Users size={16} />,
      description: <FileText size={16} />,
      clinicalPharmacology: <Info size={16} />,
      howSupplied: <Package size={16} />,
      boxedWarning: <AlertTriangle size={16} />
    };
    return icons[key] || <FileText size={16} />;
  };

  // Format section title
  const formatSectionTitle = (key, title) => {
    const titles = {
      // Core sections
      boxedWarning: 'BOXED WARNING',
      indications: 'INDICATIONS AND USAGE',
      dosage: 'DOSAGE AND ADMINISTRATION',
      contraindications: 'CONTRAINDICATIONS',
      warnings: 'WARNINGS AND PRECAUTIONS',
      warningsAndPrecautions: 'WARNINGS AND PRECAUTIONS',
      adverseReactions: 'ADVERSE REACTIONS',
      drugInteractions: 'DRUG INTERACTIONS',
      overdosage: 'OVERDOSAGE',
      
      // Product information
      description: 'DESCRIPTION',
      clinicalPharmacology: 'CLINICAL PHARMACOLOGY',
      nonclinicalToxicology: 'NONCLINICAL TOXICOLOGY',
      clinicalStudies: 'CLINICAL STUDIES',
      references: 'REFERENCES',
      howSupplied: 'HOW SUPPLIED/STORAGE AND HANDLING',
      storage: 'STORAGE AND HANDLING',
      patientInfo: 'PATIENT COUNSELING INFORMATION',
      precautions: 'PRECAUTIONS',
      recentChanges: 'RECENT MAJOR CHANGES',
      
      // Special populations
      pediatricUse: 'PEDIATRIC USE',
      geriatricUse: 'GERIATRIC USE',
      pregnancy: 'PREGNANCY',
      labor: 'LABOR AND DELIVERY',
      nursingMothers: 'NURSING MOTHERS',
      renalImpairment: 'RENAL IMPAIRMENT',
      hepaticImpairment: 'HEPATIC IMPAIRMENT',
      carcinogenesis: 'CARCINOGENESIS, MUTAGENESIS, IMPAIRMENT OF FERTILITY',
      
      // Instructions and guidance
      instructions: 'INSTRUCTIONS FOR USE',
      administrationInstructions: 'ADMINISTRATION INSTRUCTIONS',
      patientInstructions: 'PATIENT INSTRUCTIONS',
      mechanismOfAction: 'MECHANISM OF ACTION',
      pharmacokinetics: 'PHARMACOKINETICS',
      pharmacodynamics: 'PHARMACODYNAMICS',
      pregnancyLactation: 'PREGNANCY AND LACTATION',
      medGuide: 'MEDICATION GUIDE',
      
      // Package information
      package: 'PACKAGE INFORMATION',
      packageInsert: 'PACKAGE INSERT',
      ingredientTable: 'INGREDIENT TABLE',
      packageLabel: 'PACKAGE LABEL',
      productLabel: 'PRODUCT LABEL',
      
      // Other
      unclassified: 'OTHER INFORMATION',
      other: 'ADDITIONAL INFORMATION'
    };
    return title || titles[key] || key.toUpperCase().replace(/([A-Z])/g, ' $1').trim();
  };

  // Handle import
  const handleImport = async () => {
    try {
      await onImport(details || medication);
      alert(`Successfully imported ${medication.brandName || medication.title}`);
    } catch (error) {
      console.error('Error importing medication:', error);
      alert('Failed to import medication. Please try again.');
    }
  };

  return (
    <div className="dailymed-clone">
      {/* DailyMed Header */}
      <div className="dm-header">
        <h1>DailyMed</h1>
        <div className="subtitle">U.S. National Library of Medicine</div>
      </div>

      {/* Product View */}
      <div className="dm-product-view">
        {/* Product Header */}
        <div className="dm-product-header">
          <button onClick={onBack} className="dm-back-button">
            <ArrowLeft size={16} />
            Back to Search Results
          </button>
          
          <div className="dm-action-buttons">
            <button className="dm-action-btn" onClick={handleImport}>
              <Download size={14} />
              Import
            </button>
            <button 
              className="dm-action-btn" 
              onClick={() => {
                if (medication?.setId) {
                  dailyMedService.downloadLabelPdf(medication.setId);
                }
              }}
              title="Download Label as PDF"
            >
              <FileText size={14} />
              PDF
            </button>
            <button className="dm-action-btn">
              <Printer size={14} />
              Print
            </button>
            <button className="dm-action-btn">
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>

        {/* Product Title Section */}
        <div className="dm-product-title-section">
          <h1 className="dm-product-main-title">
            <span className="dm-product-brand">
              {medication.brandName || medication.title}
            </span>
            {medication.genericName && (
              <span className="dm-product-generic"> ({medication.genericName})</span>
            )}
          </h1>
          <p className="dm-product-labeler">[{medication.labelerName}]</p>
        </div>

        {/* Navigation Tabs */}
        <div className="dm-tabs">
          <button 
            className={`dm-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`dm-tab ${activeTab === 'sections' ? 'active' : ''}`}
            onClick={() => setActiveTab('sections')}
          >
            Label Information
          </button>
          <button 
            className={`dm-tab ${activeTab === 'packaging' ? 'active' : ''}`}
            onClick={() => setActiveTab('packaging')}
          >
            Packaging
          </button>
          <button 
            className={`dm-tab ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            Images
          </button>
        </div>

        {/* Tab Content */}
        {loadingDetails ? (
          <div className="dm-loading">
            <div className="dm-spinner" />
            <p>Loading medication information...</p>
          </div>
        ) : (
          <div className="dm-tab-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Boxed Warning if present */}
                {details?.sections?.boxedWarning && (
                  <div className="dm-boxed-warning">
                    <div className="dm-boxed-warning-header">
                      <AlertTriangle size={16} />
                      <h3 className="dm-boxed-warning-title">BOXED WARNING</h3>
                    </div>
                    <div className="dm-boxed-warning-content">
                      {details.sections.boxedWarning.text}
                    </div>
                  </div>
                )}

                {/* Information Grid */}
                <div className="dm-info-grid">
                  <div className="dm-info-card">
                    <div className="dm-info-card-header">Product Information</div>
                    <div className="dm-info-card-body">
                      <dl>
                        <dt>Generic Name:</dt>
                        <dd>{medication.genericName || 'N/A'}</dd>
                        
                        <dt>Brand Name:</dt>
                        <dd>{medication.brandName || 'N/A'}</dd>
                        
                        <dt>Dosage Form:</dt>
                        <dd>{details?.dosageForms?.join(', ') || medication.dosageForms?.join(', ') || 'N/A'}</dd>
                        
                        <dt>Route:</dt>
                        <dd>{details?.routes?.join(', ') || medication.routes?.join(', ') || 'N/A'}</dd>
                        
                        <dt>Marketing Status:</dt>
                        <dd>{medication.marketingStatus || 'Active'}</dd>
                      </dl>
                    </div>
                  </div>

                  <div className="dm-info-card">
                    <div className="dm-info-card-header">Label Information</div>
                    <div className="dm-info-card-body">
                      <dl>
                        <dt>Labeler:</dt>
                        <dd>{medication.labelerName}</dd>
                        
                        <dt>Set ID:</dt>
                        <dd>{medication.setId}</dd>
                        
                        <dt>Version:</dt>
                        <dd>{details?.version || medication.splId || 'N/A'}</dd>
                        
                        <dt>Effective Date:</dt>
                        <dd>{details?.effectiveTime || medication.updated || 'N/A'}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                {/* RxNorm Mappings */}
                {details?.rxNormMappings && details.rxNormMappings.length > 0 && (
                  <div className="dm-info-grid">
                    <div className="dm-info-card full-width">
                      <div className="dm-info-card-header">RxNorm Mappings</div>
                      <div className="dm-info-card-body">
                        <table className="dm-rxnorm-table">
                          <thead>
                            <tr>
                              <th>RxCUI</th>
                              <th>Name</th>
                              <th>Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.rxNormMappings.map((rx, index) => (
                              <tr key={index}>
                                <td>{rx.rxcui}</td>
                                <td>{rx.rxString}</td>
                                <td>{rx.rxTty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pharmacologic Class */}
                {details?.pharmacologicClass && details.pharmacologicClass.length > 0 && (
                  <div className="dm-info-grid">
                    <div className="dm-info-card full-width">
                      <div className="dm-info-card-header">Pharmacologic Class</div>
                      <div className="dm-info-card-body">
                        <dl>
                          {details.pharmacologicClass.map((pc, index) => (
                            <div key={index} className="dm-pharm-class-item">
                              <dt>{pc.classType || 'Class'}:</dt>
                              <dd>{pc.className}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  </div>
                )}

              {/* Primary Image */}
              {images.length > 0 && (
                <div className="overview-images">
                  <h3>Product Images</h3>
                  <div className="image-gallery-preview">
                    {images.slice(0, 4).map((image, index) => (
                      <div 
                        key={index} 
                        className="gallery-thumb"
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setActiveTab('images');
                        }}
                      >
                        <img 
                          src={image.url} 
                          alt={image.title}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="no-image-thumb">No Image</div>';
                          }}
                        />
                      </div>
                    ))}
                    {images.length > 4 && (
                      <button 
                        className="view-all-images"
                        onClick={() => setActiveTab('images')}
                      >
                        View All ({images.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
              </>
            )}

            {/* Label Sections Tab */}
            {activeTab === 'sections' && (
              <>
                {details?.sections && Object.keys(details.sections)
                  .sort((a, b) => {
                    const sectionA = details.sections[a];
                    const sectionB = details.sections[b];
                    return (sectionA.order || 0) - (sectionB.order || 0);
                  })
                  .map(sectionKey => {
                    const section = details.sections[sectionKey];
                    const isExpanded = expandedSections[sectionKey];
                    
                    return (
                    <div key={sectionKey} className="dm-label-section">
                      <div
                        className="dm-section-header"
                        onClick={() => toggleSection(sectionKey)}
                      >
                        <div className="dm-section-title-container">
                          <span className="dm-section-icon">
                            {getSectionIcon(sectionKey)}
                          </span>
                          <h3 className="dm-section-title">
                            {formatSectionTitle(sectionKey, section.title)}
                          </h3>
                        </div>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      
                      {isExpanded && (
                        <div className="dm-section-content">
                          <div 
                            className="dm-section-text"
                            dangerouslySetInnerHTML={{ 
                              __html: section.text 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {(!details?.sections || Object.keys(details.sections).length === 0) && (
                  <div className="dm-empty">
                    <div className="dm-empty-icon">
                      <FileText size={48} />
                    </div>
                    <h3>No label sections available</h3>
                    <p>Label information could not be loaded for this medication.</p>
                  </div>
                )}
              </>
            )}

            {/* Packaging Tab */}
            {activeTab === 'packaging' && (
              <>
                <h3>NDC Codes and Package Information</h3>
                
                {details?.packages && details.packages.length > 0 ? (
                  <table className="dm-table">
                    <thead>
                      <tr>
                        <th>NDC Code</th>
                        <th>Package Description</th>
                        <th>Marketing Start Date</th>
                        <th>Marketing End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.packages.map((pkg, index) => (
                        <tr key={index}>
                          <td>
                            <span className="dm-ndc-code">
                              {pkg.ndcCode || pkg.ndc}
                            </span>
                          </td>
                          <td>{pkg.description || 'N/A'}</td>
                          <td>{pkg.marketingStartDate || 'N/A'}</td>
                          <td>{pkg.marketingEndDate || 'Active'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="dm-empty">
                    <div className="dm-empty-icon">
                      <Package size={48} />
                    </div>
                    <h3>No packaging information available</h3>
                    <p>Package details could not be loaded for this medication.</p>
                  </div>
                )}

              {/* Products Information */}
              {details?.products && details.products.length > 0 && (
                <div className="products-section">
                  <h3>Product Formulations</h3>
                  <div className="products-grid">
                    {details.products.map((product, index) => (
                      <div key={index} className="product-card">
                        <h4>Product {index + 1}</h4>
                        <dl>
                          <dt>Dosage Form:</dt>
                          <dd>{product.dosageForm || 'N/A'}</dd>
                          
                          <dt>Route:</dt>
                          <dd>{product.route || 'N/A'}</dd>
                          
                          <dt>Strength:</dt>
                          <dd>{product.strength || 'N/A'}</dd>
                          
                          {product.ingredients && product.ingredients.length > 0 && (
                            <>
                              <dt>Active Ingredients:</dt>
                              <dd>
                                {product.ingredients.map((ing, idx) => (
                                  <div key={idx}>
                                    {ing.name} {ing.strength && `(${ing.strength})`}
                                  </div>
                                ))}
                              </dd>
                            </>
                          )}
                        </dl>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <>
                {images.length > 0 ? (
                  <div className="dm-images-section">
                    {/* Group images by category for better organization like DailyMed */}
                    {Object.entries(
                      images.reduce((groups, image) => {
                        const category = image.category || 'Product';
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(image);
                        return groups;
                      }, {})
                    )
                    .sort(([catA], [catB]) => {
                      // Prioritize instructional content like DailyMed
                      const priority = {
                        'Instructions for Use': 1,
                        'Step by Step': 2,
                        'Figures': 3,
                        'Diagrams': 4,
                        'Usage Guide': 5,
                        'Instructions': 6,
                        'Carton': 7,
                        'Label': 8,
                        'Package': 9,
                        'Product': 10
                      };
                      return (priority[catA] || 99) - (priority[catB] || 99);
                    })
                    .map(([category, categoryImages]) => (
                      <div key={category} className="dm-image-category-section">
                        <h4 className="dm-image-category-title">{category}</h4>
                        <div className="dm-images-grid">
                          {categoryImages.map((image, index) => (
                            <div key={index} className="dm-image-card">
                              <div className="dm-image-category">{image.category}</div>
                              <img 
                                src={image.url} 
                                alt={image.title}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = '<div class="dm-empty-icon"><div>Image not available</div></div>';
                                }}
                              />
                              <div className="dm-image-title">{image.title}</div>
                              {image.isInstructional && (
                                <div className="dm-instruction-badge">Instructions</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dm-empty">
                    <div className="dm-empty-icon">
                      <ImageIcon size={48} />
                    </div>
                    <h3>No images available</h3>
                    <p>Product images could not be loaded for this medication.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dm-footer">
        <p>Set ID: {medication.setId} | This information is provided by the U.S. National Library of Medicine</p>
      </div>
    </div>
  );
};

export default DailyMedProductView;