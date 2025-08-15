import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MessageCircle, X, Search, Bot, ChevronRight, 
  Pill, Beaker, Droplet, Clock, Package, 
  Filter, AlertCircle, FileText, Syringe,
  Activity, FlaskConical, TestTube, Heart,
  Sparkles, ChevronLeft, Shield
} from 'lucide-react';
import { useMedications } from '../../contexts/MedicationContext';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import './MedicationChatbot.css';

const MedicationChatbot = () => {
  const location = useLocation();
  const { medications, loading } = useMedications();
  const [haeMedications, setHaeMedications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [medicationType, setMedicationType] = useState('all'); // 'all', 'lyso', 'hae'
  const searchInputRef = useRef(null);
  const widgetRef = useRef(null);

  // Medication fields configuration
  const medicationFields = [
    { key: 'indication', label: 'Indication', icon: Heart, color: '#e91e63' },
    { key: 'genericName', label: 'Generic Name', icon: Pill, color: '#9c27b0' },
    { key: 'dosageForm', label: 'Dosage Form', icon: Package, color: '#673ab7' },
    { key: 'vialSize', label: 'Vial Size', icon: TestTube, color: '#3f51b5' },
    { key: 'reconstitutionSolution', label: 'Reconstitution Solution', icon: Droplet, color: '#2196f3' },
    { key: 'reconstitutionVolume', label: 'Reconstitution Volume', icon: Beaker, color: '#03a9f4' },
    { key: 'dose', label: 'Dose', icon: Syringe, color: '#00bcd4' },
    { key: 'doseFrequency', label: 'Dose Frequency', icon: Clock, color: '#009688' },
    { key: 'infusionRate', label: 'Infusion Rate', icon: Activity, color: '#4caf50' },
    { key: 'normalSalineBag', label: 'Normal Saline Bag', icon: FlaskConical, color: '#8bc34a' },
    { key: 'overfillRule', label: 'Overfill Rule', icon: AlertCircle, color: '#ff9800' },
    { key: 'filter', label: 'Filter', icon: Filter, color: '#ff5722' },
    { key: 'infusionSteps', label: 'Infusion Steps', icon: FileText, color: '#795548' },
    { key: 'notes', label: 'Notes', icon: FileText, color: '#607d8b' },
    { key: 'specialDosing', label: 'Special Dosing', icon: Sparkles, color: '#FF6900' }
  ];

  // HAE medication fields configuration
  const haeMedicationFields = [
    { key: 'brand', label: 'Brand', icon: Shield, color: '#e91e63' },
    { key: 'company', label: 'Company', icon: Package, color: '#9c27b0' },
    { key: 'source', label: 'Source', icon: TestTube, color: '#673ab7' },
    { key: 'moa', label: 'MOA', icon: Activity, color: '#3f51b5' },
    { key: 'adminRoute', label: 'Admin Route', icon: Syringe, color: '#2196f3' },
    { key: 'concentration', label: 'Concentration', icon: Beaker, color: '#03a9f4' },
    { key: 'strength', label: 'Strength', icon: Pill, color: '#00bcd4' },
    { key: 'filter', label: 'Filter', icon: Filter, color: '#009688' },
    { key: 'dosing', label: 'Dosing', icon: Clock, color: '#4caf50' },
    { key: 'maxDose', label: 'Max Dose', icon: AlertCircle, color: '#8bc34a' },
    { key: 'rateAdmin', label: 'Rate Admin', icon: Activity, color: '#ff9800' },
    { key: 'reconAmt', label: 'Recon Amt', icon: Droplet, color: '#ff5722' },
    { key: 'howSupplied', label: 'How Supplied', icon: Package, color: '#795548' },
    { key: 'storage', label: 'Storage', icon: FlaskConical, color: '#607d8b' },
    { key: 'bbw', label: 'BBW', icon: AlertCircle, color: '#f44336' },
    { key: 'pregCategoryLactation', label: 'Preg. Category', icon: Heart, color: '#e91e63' },
    { key: 'se', label: 'Side Effects', icon: AlertCircle, color: '#FF6900' },
    { key: 'extraNotes', label: 'Extra Notes', icon: FileText, color: '#9e9e9e' }
  ];

  // Load HAE medications
  useEffect(() => {
    const loadHaeMedications = async () => {
      try {
        if (!firestore) return;
        
        const haeMedicationsRef = collection(firestore, 'haeMedications');
        const snapshot = await getDocs(haeMedicationsRef);
        
        const haeMedicationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isHae: true
        }));
        
        setHaeMedications(haeMedicationsData);
      } catch (error) {
        console.error('Error loading HAE medications:', error);
        setHaeMedications([]);
      }
    };
    
    loadHaeMedications();
  }, []);

  // Focus search input when widget opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter medications based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      let filtered = [];
      
      if (medicationType === 'all' || medicationType === 'lyso') {
        const lysoFiltered = medications.filter(med => 
          med.brandName?.toLowerCase().includes(query) ||
          med.genericName?.toLowerCase().includes(query) ||
          med.medicationCode?.toLowerCase().includes(query)
        );
        filtered = [...filtered, ...lysoFiltered];
      }
      
      if (medicationType === 'all' || medicationType === 'hae') {
        const haeFiltered = haeMedications.filter(med => 
          med.brand?.toLowerCase().includes(query) ||
          med.drug?.toLowerCase().includes(query) ||
          med.company?.toLowerCase().includes(query)
        );
        filtered = [...filtered, ...haeFiltered];
      }
      
      setFilteredMedications(filtered.slice(0, 5)); // Show max 5 predictions
      setShowPredictions(true);
    } else {
      setFilteredMedications([]);
      setShowPredictions(false);
    }
  }, [searchQuery, medications, haeMedications, medicationType]);

  // Handle clicking outside to close predictions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target)) {
        setShowPredictions(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectMedication = (medication) => {
    setSelectedMedication(medication);
    setSearchQuery(medication.isHae ? (medication.brand || medication.drug) : medication.brandName);
    setShowPredictions(false);
    setSelectedField(null);
  };

  const handleSelectField = (field) => {
    setSelectedField(field);
  };

  const handleBack = () => {
    if (selectedField) {
      setSelectedField(null);
    } else if (selectedMedication) {
      setSelectedMedication(null);
      setSearchQuery('');
    }
  };

  const handleReset = () => {
    setSelectedMedication(null);
    setSelectedField(null);
    setSearchQuery('');
    setShowPredictions(false);
    searchInputRef.current?.focus();
  };

  const formatFieldValue = (value, fieldKey) => {
    if (!value || value === 'N/A' || value === 'Not specified') {
      return <span className="field-value-empty">Not specified</span>;
    }

    // Special formatting for certain fields
    if (fieldKey === 'infusionSteps' || fieldKey === 'notes' || fieldKey === 'specialDosing') {
      return (
        <div className="field-value-multiline">
          {value.split('\n').map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      );
    }

    return <span className="field-value">{value}</span>;
  };

  const getFieldIcon = (fieldKey) => {
    const fields = selectedMedication?.isHae ? haeMedicationFields : medicationFields;
    const field = fields.find(f => f.key === fieldKey);
    const IconComponent = field?.icon || Sparkles;
    return <IconComponent size={20} style={{ color: field?.color || '#666' }} />;
  };

  // Hide the chatbot on the terminal page
  if (location.pathname === '/terminal') {
    return null;
  }

  return (
    <>
      {/* Floating Toggle Button with Animated Robot */}
      <button
        className={`chat-toggle-btn ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open medication assistant"
      >
        <Bot size={28} className="robot-icon" style={{ color: 'white' }} />
      </button>

      {/* Search Widget */}
      <div ref={widgetRef} className={`chat-widget search-mode ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            {selectedMedication && (
              <button onClick={handleBack} className="back-button">
                <ChevronLeft size={20} />
              </button>
            )}
            <Pill size={20} />
            <span>
              {selectedMedication 
                ? (selectedMedication.isHae ? (selectedMedication.brand || selectedMedication.drug) : selectedMedication.brandName)
                : 'Medication Search'}
            </span>
          </div>
          <div className="chat-header-actions">
            {selectedMedication && (
              <button 
                onClick={handleReset}
                className="chat-clear-btn"
                title="New search"
              >
                New Search
              </button>
            )}
            <button 
              onClick={() => setIsOpen(false)}
              className="chat-close-btn"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="chat-content">
          {/* Medication Type Toggle */}
          {!selectedMedication && (
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setMedicationType('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: medicationType === 'all' ? '#4caf50' : '#f5f5f5',
                  color: medicationType === 'all' ? 'white' : '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                All Medications
              </button>
              <button
                onClick={() => setMedicationType('lyso')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: medicationType === 'lyso' ? '#2196f3' : '#f5f5f5',
                  color: medicationType === 'lyso' ? 'white' : '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Lysosomal
              </button>
              <button
                onClick={() => setMedicationType('hae')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: medicationType === 'hae' ? '#9c27b0' : '#f5f5f5',
                  color: medicationType === 'hae' ? 'white' : '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                HAE
              </button>
            </div>
          )}
          
          {/* Search Bar */}
          {!selectedField && (
            <div className="search-section">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" style={{ left: '18px' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="medication-search-input"
                  placeholder="Search medication by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={selectedMedication !== null}
                  style={{ paddingLeft: '60px' }}
                />
                {searchQuery && !selectedMedication && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search Predictions */}
              {showPredictions && filteredMedications.length > 0 && !selectedMedication && (
                <div className="search-predictions">
                  {filteredMedications.map((med) => (
                    <button
                      key={med.id}
                      className="prediction-item"
                      onClick={() => handleSelectMedication(med)}
                    >
                      <div className="prediction-content">
                        <div className="prediction-name">
                          {med.isHae ? (med.brand || med.drug) : med.brandName}
                          {med.isHae && <span className="hae-badge" style={{ marginLeft: '8px', fontSize: '11px', background: '#4caf50', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>HAE</span>}
                        </div>
                        <div className="prediction-details">
                          {med.isHae ? (
                            <>
                              <span className="prediction-generic">{med.drug}</span>
                              {med.company && (
                                <span className="prediction-code">{med.company}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="prediction-generic">{med.genericName}</span>
                              {med.medicationCode && (
                                <span className="prediction-code">{med.medicationCode}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} className="prediction-arrow" />
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {showPredictions && searchQuery && filteredMedications.length === 0 && !selectedMedication && (
                <div className="no-results">
                  <AlertCircle size={20} />
                  <span>No medications found for "{searchQuery}"</span>
                </div>
              )}
            </div>
          )}

          {/* Field Selection Grid */}
          {selectedMedication && !selectedField && (
            <div className="field-selection">
              <div className="selection-header">
                <h3>Select Information to View</h3>
                <p className="medication-subtitle">
                  {selectedMedication.isHae ? (
                    `${selectedMedication.drug || 'N/A'} • ${selectedMedication.company || 'N/A'}`
                  ) : (
                    `${selectedMedication.genericName} • ${selectedMedication.dosageForm}`
                  )}
                </p>
              </div>
              <div className="field-buttons-grid">
                {(selectedMedication.isHae ? haeMedicationFields : medicationFields).map((field) => {
                  const IconComponent = field.icon;
                  const hasValue = selectedMedication[field.key] && 
                                 selectedMedication[field.key] !== 'N/A';
                  
                  return (
                    <button
                      key={field.key}
                      className={`field-button ${!hasValue ? 'empty' : ''}`}
                      onClick={() => handleSelectField(field)}
                      style={{
                        '--field-color': field.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'white',
                        border: '2px solid #e0e0e0'
                      }}
                    >
                      <IconComponent size={20} className="field-icon" style={{ color: field.color }} />
                      <span className="field-label">{field.label}</span>
                      {!hasValue && <span className="empty-badge">N/A</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Field Value Display */}
          {selectedMedication && selectedField && (
            <div className="field-value-display">
              <div className="value-header">
                <div className="value-header-icon">
                  {getFieldIcon(selectedField.key)}
                </div>
                <div className="value-header-text">
                  <h3>{selectedField.label}</h3>
                  <p>{selectedMedication.isHae ? (selectedMedication.brand || selectedMedication.drug) : selectedMedication.brandName}</p>
                </div>
              </div>
              
              <div className="value-content">
                {formatFieldValue(selectedMedication[selectedField.key], selectedField.key)}
              </div>

              {/* Additional context for certain fields */}
              {selectedField.key === 'dose' && selectedMedication.doseFrequency && (
                <div className="additional-info">
                  <strong>Frequency:</strong> {selectedMedication.doseFrequency}
                </div>
              )}
              
              {selectedField.key === 'reconstitutionSolution' && selectedMedication.reconstitutionVolume && (
                <div className="additional-info">
                  <strong>Volume:</strong> {selectedMedication.reconstitutionVolume}
                </div>
              )}

              {selectedField.key === 'infusionRate' && selectedMedication.normalSalineBag && (
                <div className="additional-info">
                  <strong>NS Bag:</strong> {selectedMedication.normalSalineBag}
                </div>
              )}

              <button 
                className="back-to-fields-btn"
                onClick={() => setSelectedField(null)}
              >
                <ChevronLeft size={16} />
                Back to fields
              </button>
            </div>
          )}

          {/* Welcome State */}
          {!searchQuery && !selectedMedication && (
            <div className="welcome-state">
              <div className="welcome-icon">
                <Bot size={48} />
              </div>
              <h3>Quick Medication Lookup</h3>
              <p>Search for any medication to view detailed information about dosing, reconstitution, infusion, and more.</p>
              
              {(medications.length > 0 || haeMedications.length > 0) && (
                <div className="popular-medications">
                  <h4>Popular Medications</h4>
                  <div className="popular-grid">
                    {(() => {
                      let popularMeds = [];
                      if (medicationType === 'all') {
                        popularMeds = [...medications.slice(0, 3), ...haeMedications.slice(0, 3)];
                      } else if (medicationType === 'lyso') {
                        popularMeds = medications.slice(0, 6);
                      } else if (medicationType === 'hae') {
                        popularMeds = haeMedications.slice(0, 6);
                      }
                      
                      return popularMeds.map((med) => (
                        <button
                          key={med.id}
                          className="popular-item"
                          onClick={() => {
                            setSearchQuery(med.isHae ? (med.brand || med.drug) : med.brandName);
                            handleSelectMedication(med);
                          }}
                          style={{ position: 'relative' }}
                        >
                          {med.isHae ? (med.brand || med.drug) : med.brandName}
                          {med.isHae && (
                            <span style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              fontSize: '9px',
                              background: '#4caf50',
                              color: 'white',
                              padding: '1px 4px',
                              borderRadius: '3px'
                            }}>
                              HAE
                            </span>
                          )}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MedicationChatbot;