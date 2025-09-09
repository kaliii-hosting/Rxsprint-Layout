import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Info, 
  Pill, 
  Heart, 
  AlertCircle,
  FileText,
  Shield,
  Users,
  Package,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import dailyMedParser from '../../utils/dailyMedParser';
import './DailyMedDetail.css';

const DailyMedDetail = ({ medication }) => {
  const { theme } = useTheme();
  const [expandedSections, setExpandedSections] = useState({
    indications: true,
    dosage: false,
    warnings: false,
    contraindications: false,
    adverseReactions: false,
    drugInteractions: false,
    description: false,
    clinicalPharmacology: false,
    howSupplied: false,
    storage: false,
    patientInfo: false
  });

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
      storage: <Package size={16} />,
      patientInfo: <Info size={16} />,
      boxedWarning: <AlertTriangle size={16} />
    };
    return icons[key] || <FileText size={16} />;
  };

  // Format section title
  const formatSectionTitle = (key) => {
    const titles = {
      indications: 'Indications and Usage',
      dosage: 'Dosage and Administration',
      warnings: 'Warnings and Precautions',
      contraindications: 'Contraindications',
      adverseReactions: 'Adverse Reactions',
      drugInteractions: 'Drug Interactions',
      description: 'Description',
      clinicalPharmacology: 'Clinical Pharmacology',
      howSupplied: 'How Supplied',
      storage: 'Storage and Handling',
      patientInfo: 'Patient Information',
      boxedWarning: 'Boxed Warning',
      overdosage: 'Overdosage'
    };
    return titles[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Check if section has content
  const hasContent = (section) => {
    return section && (section.text || section.content);
  };

  // Get highlights
  const highlights = dailyMedParser.extractHighlights(medication);

  return (
    <div className={`dailymed-detail ${theme}`}>
      {/* Boxed Warning - Always show at top if present */}
      {medication.sections?.boxedWarning && (
        <div className="boxed-warning">
          <div className="warning-header">
            <AlertTriangle size={20} />
            <h4>Black Box Warning</h4>
          </div>
          <div className="warning-content">
            {dailyMedParser.formatContent(medication.sections.boxedWarning.text)}
          </div>
        </div>
      )}

      {/* Key Highlights */}
      {highlights.length > 0 && (
        <div className="highlights-section">
          <h4 className="highlights-title">Key Information</h4>
          <div className="highlights-grid">
            {highlights.map((highlight, index) => (
              <div key={index} className={`highlight-card ${highlight.type}`}>
                <h5>{highlight.title}</h5>
                <p>{highlight.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Information */}
      {medication.products && medication.products.length > 0 && (
        <div className="products-section">
          <h4 className="section-header">Product Information</h4>
          <div className="products-grid">
            {medication.products.map((product, index) => (
              <div key={index} className="product-card">
                <div className="product-info">
                  <span className="product-label">Form:</span>
                  <span>{product.dosageForm || 'N/A'}</span>
                </div>
                <div className="product-info">
                  <span className="product-label">Route:</span>
                  <span>{product.route || 'N/A'}</span>
                </div>
                {product.ingredients && product.ingredients.length > 0 && (
                  <div className="product-ingredients">
                    <span className="product-label">Active Ingredients:</span>
                    <ul>
                      {product.ingredients.map((ing, idx) => (
                        <li key={idx}>
                          {ing.name} {ing.strength && `- ${ing.strength}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medication Images */}
      {medication.images && medication.images.length > 0 && (
        <div className="images-section">
          <h4 className="section-header">
            <ImageIcon size={16} />
            Product Images
          </h4>
          <div className="images-grid">
            {medication.images.map((image, index) => (
              <div key={index} className="image-container">
                <img 
                  src={image.url} 
                  alt={image.title || `Product image ${index + 1}`}
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="no-image-placeholder">Image not available</div>';
                  }}
                />
                {image.title && <p className="image-caption">{image.title}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Sections */}
      <div className="detail-sections">
        {medication.sections && Object.keys(medication.sections).map(sectionKey => {
          const section = medication.sections[sectionKey];
          if (!hasContent(section) || sectionKey === 'boxedWarning') return null;

          const isExpanded = expandedSections[sectionKey];

          return (
            <div key={sectionKey} className="detail-section">
              <button
                className="section-toggle"
                onClick={() => toggleSection(sectionKey)}
                aria-expanded={isExpanded}
              >
                <span className="section-toggle-left">
                  {getSectionIcon(sectionKey)}
                  <span className="section-title">
                    {formatSectionTitle(sectionKey)}
                  </span>
                </span>
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>

              {isExpanded && (
                <div className="section-content">
                  <div className="section-text">
                    {dailyMedParser.formatContent(section.text || section.content)}
                  </div>

                  {/* Special formatting for certain sections */}
                  {sectionKey === 'dosage' && (
                    <div className="dosage-instructions">
                      {dailyMedParser.formatDosageInstructions(section.text).map((instruction, idx) => (
                        <div key={idx} className="dosage-item">
                          <Pill size={14} />
                          <span>{instruction}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sectionKey === 'drugInteractions' && (
                    <div className="interactions-list">
                      {dailyMedParser.formatDrugInteractions(section.text).map((interaction, idx) => (
                        <div key={idx} className="interaction-item">
                          <h5>{interaction.drug}</h5>
                          <p>{interaction.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* NDC Codes */}
      {medication.packages && medication.packages.length > 0 && (
        <div className="ndc-section">
          <h4 className="section-header">NDC Codes</h4>
          <div className="ndc-list">
            {medication.packages.map((pkg, index) => (
              <div key={index} className="ndc-item">
                <span className="ndc-code">{pkg.ndcCode}</span>
                {pkg.description && (
                  <span className="ndc-description">{pkg.description}</span>
                )}
                {pkg.marketingStartDate && (
                  <span className="ndc-date">
                    Since: {new Date(pkg.marketingStartDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="metadata-section">
        <div className="metadata-item">
          <span className="metadata-label">Set ID:</span>
          <span className="metadata-value">{medication.setId}</span>
        </div>
        {medication.version && (
          <div className="metadata-item">
            <span className="metadata-label">Version:</span>
            <span className="metadata-value">{medication.version}</span>
          </div>
        )}
        {medication.effectiveTime && (
          <div className="metadata-item">
            <span className="metadata-label">Effective Date:</span>
            <span className="metadata-value">
              {new Date(medication.effectiveTime).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyMedDetail;