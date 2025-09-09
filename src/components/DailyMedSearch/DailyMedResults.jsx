import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Package, 
  AlertCircle,
  Download,
  Building,
  Calendar,
  Hash,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMedications } from '../../contexts/MedicationContext';
import DailyMedDetail from './DailyMedDetail';
import './DailyMedResults.css';

const DailyMedResults = ({ results, count, error, currentPage, onPageChange }) => {
  const { theme } = useTheme();
  const { importFromDailyMed } = useMedications();
  const [expandedSections, setExpandedSections] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [selectedDetails, setSelectedDetails] = useState({});
  const [importingMeds, setImportingMeds] = useState({});
  const [medicationImages, setMedicationImages] = useState({});

  // Toggle section expansion
  const toggleSection = (setId, section) => {
    const key = `${setId}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Load medication details
  const loadMedicationDetails = async (setId) => {
    if (!setId || loadingDetails[setId] || selectedDetails[setId]) {
      console.log('Skipping load for setId:', setId, 'loading:', loadingDetails[setId], 'hasDetails:', !!selectedDetails[setId]);
      return;
    }
    
    console.log('Starting to load details for setId:', setId);
    setLoadingDetails(prev => ({ ...prev, [setId]: true }));
    
    try {
      const { default: dailyMedService } = await import('../../services/dailyMedService');
      
      // Load details and images in parallel
      const [details, images] = await Promise.all([
        dailyMedService.getMedicationDetails(setId),
        dailyMedService.getMedicationImages(setId)
      ]);
      
      console.log('Loaded details for setId:', setId, 'sections:', Object.keys(details.sections || {}));
      console.log('Loaded', images.length, 'images for setId:', setId);
      
      setSelectedDetails(prev => ({
        ...prev,
        [setId]: { ...details, images }
      }));
      setMedicationImages(prev => ({
        ...prev,
        [setId]: images
      }));
    } catch (error) {
      console.error('Error loading medication details for setId:', setId, error);
      // Set error state
      setSelectedDetails(prev => ({
        ...prev,
        [setId]: { error: true, sections: {} }
      }));
    } finally {
      setLoadingDetails(prev => ({ ...prev, [setId]: false }));
    }
  };

  // Load details for all results automatically
  useEffect(() => {
    if (results && results.length > 0) {
      console.log('Loading details for', results.length, 'medications');
      results.forEach(medication => {
        if (medication.setId && !selectedDetails[medication.setId] && !loadingDetails[medication.setId]) {
          console.log('Loading details for:', medication.brandName || medication.title, 'setId:', medication.setId);
          loadMedicationDetails(medication.setId);
        }
      });
    }
  }, [results]);

  // Import medication to Firebase
  const handleImportMedication = async (medication, details) => {
    const setId = medication.setId;
    setImportingMeds(prev => ({ ...prev, [setId]: true }));
    
    try {
      const dataToImport = details || medication;
      await importFromDailyMed(dataToImport);
      alert(`Successfully imported ${medication.brandName || medication.title}`);
    } catch (error) {
      console.error('Error importing medication:', error);
      alert('Failed to import medication. Please try again.');
    } finally {
      setImportingMeds(prev => ({ ...prev, [setId]: false }));
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <div className={`dailymed-results error ${theme}`}>
        <div className="error-message">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className={`dailymed-results empty ${theme}`}>
        <div className="empty-state">
          <Package size={48} />
          <h3>No medications found</h3>
          <p>Try searching with different keywords or adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dailymed-results ${theme}`}>
      <div className="results-header">
        <h3 className="results-title">
          Found {count} medication{count !== 1 ? 's' : ''}
        </h3>
      </div>

      <div className="results-list">
        {results.map((medication) => {
          const details = selectedDetails[medication.setId];
          const isLoadingDetails = loadingDetails[medication.setId];
          const isImporting = importingMeds[medication.setId];
          const images = medicationImages[medication.setId] || [];

          return (
            <div key={medication.setId} className="medication-card expanded">
              {/* Card Header */}
              <div className="card-header-info">
                <h4 className="medication-title">
                  {medication.brandName || medication.title}
                </h4>
                {medication.genericName && (
                  <p className="generic-name">{medication.genericName}</p>
                )}
                <div className="card-meta">
                  {medication.labelerName && (
                    <span className="meta-item">
                      <Building size={14} />
                      {medication.labelerName}
                    </span>
                  )}
                  {medication.updated && (
                    <span className="meta-item">
                      <Calendar size={14} />
                      Updated: {formatDate(medication.updated)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="card-actions">
                <button
                  className="import-button"
                  onClick={() => handleImportMedication(medication, details)}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="spinner-small" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Import to My Medications
                    </>
                  )}
                </button>
              </div>

              {/* Product Images Section */}
              <div className="medication-images-section">
                <h5 className="section-header">
                  <ImageIcon size={16} />
                  PRODUCT IMAGES
                </h5>
                <div className="images-grid">
                  {images.length > 0 ? (
                    images.slice(0, 4).map((image, index) => (
                      <div key={index} className="image-container">
                        <img 
                          src={image.url} 
                          alt={image.title || `Product image ${index + 1}`}
                          loading="lazy"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            console.error('Image failed to load:', image.url);
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="no-image-placeholder">Image not available</div>';
                          }}
                        />
                      </div>
                    ))
                  ) : isLoadingDetails ? (
                    // Show loading state
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="image-container">
                        <div className="no-image-placeholder">Loading...</div>
                      </div>
                    ))
                  ) : (
                    // Show no images available
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="image-container">
                        <div className="no-image-placeholder">No image</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Medication Details */}
              {isLoadingDetails ? (
                <div className="loading-details">
                  <div className="spinner" />
                  <p>Loading medication information...</p>
                </div>
              ) : details && !details.error ? (
                <>
                  {/* RxNorm Mappings */}
                  {details.rxNormMappings && details.rxNormMappings.length > 0 && (
                    <div className="rxnorm-section">
                      <h5 className="section-header">
                        <Hash size={16} />
                        RXNORM MAPPINGS
                      </h5>
                      <div className="rxnorm-list">
                        {details.rxNormMappings.slice(0, 3).map((rx, index) => (
                          <div key={index} className="rxnorm-item">
                            <span className="rxnorm-cui">RxCUI: {rx.rxcui}</span>
                            <span className="rxnorm-name">{rx.rxString}</span>
                            <span className="rxnorm-type">{rx.rxTty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pharmacologic Class */}
                  {details.pharmacologicClass && details.pharmacologicClass.length > 0 && (
                    <div className="pharm-class-section">
                      <h5 className="section-header">
                        <AlertCircle size={16} />
                        PHARMACOLOGIC CLASS
                      </h5>
                      <div className="pharm-class-list">
                        {details.pharmacologicClass.map((pc, index) => (
                          <div key={index} className="pharm-class-item">
                            <span className="pharm-class-type">{pc.classType || 'Class'}:</span>
                            <span className="pharm-class-name">{pc.className}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Package Information */}
                  {details.packages && details.packages.length > 0 && (
                    <div className="package-info-section">
                      <h5 className="section-header">
                        <Package size={16} />
                        AVAILABLE PACKAGES
                      </h5>
                      <div className="package-list">
                        {details.packages.map((pkg, index) => (
                          <div key={index} className="package-item">
                            <span className="package-ndc">
                              NDC: {pkg.ndcCode}
                            </span>
                            {pkg.description && (
                              <span className="package-description"> - {pkg.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medication Sections */}
                  <div className="medication-sections">
                    {details.sections && Object.keys(details.sections).map(sectionKey => {
                      const section = details.sections[sectionKey];
                      const isExpanded = expandedSections[`${medication.setId}-${sectionKey}`];
                      
                      return (
                        <div key={sectionKey} className="medication-section">
                          <button
                            className="section-toggle"
                            onClick={() => toggleSection(medication.setId, sectionKey)}
                          >
                            <span className="section-title">
                              <FileText size={16} />
                              {section.title || sectionKey.toUpperCase()}
                            </span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          {isExpanded && (
                            <div className="section-content">
                              <div className="section-text">
                                {section.text || 'No information available'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="medication-sections">
                  {/* Loading message or error */}
                  <div className="medication-section">
                    <div className="section-content">
                      <div className="section-text">
                        {details?.error ? 
                          'Unable to load medication details. Please try again later.' : 
                          'Click to load medication information...'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Set ID */}
              <div className="medication-metadata">
                <span className="metadata-label">Set ID:</span>
                <span className="metadata-value">{medication.setId}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {count > results.length && onPageChange && (
        <div className="pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {Math.ceil(count / results.length)}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= Math.ceil(count / results.length)}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DailyMedResults;