import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { 
  Calculator, 
  ChevronDown, 
  Info, 
  AlertCircle,
  Clock,
  Droplets,
  Package,
  Activity,
  FileText,
  Check,
  Pill,
  FlaskConical,
  Settings,
  Plus,
  Minus,
  X,
  RotateCcw,
  ChevronUp,
  Search,
  Star,
  Shield,
  Sliders,
  User,
  Calendar,
  Gauge,
  Layers
} from 'lucide-react';
import './RedesignedPumpCalculator.css';
import pumpDatabase from '../../pages/Pump/pump-database.json';

// MegaMenu Portal Component
const MegaMenuPortal = ({ children, isOpen }) => {
  if (!isOpen) return null;
  
  return ReactDOM.createPortal(
    <div className="mega-menu-portal">
      {children}
    </div>,
    document.body
  );
};

// Dose Safety Indicator Component
const DoseSafetyIndicator = ({ doseSafety, standardDose, specialDosingOptions, selectedSpecialDosing, onSpecialDosingChange, patientWeight, actualDose, actualDoseUnit, correctDose }) => {
  const [showLowExplanation, setShowLowExplanation] = useState(false);
  const [showCorrectExplanation, setShowCorrectExplanation] = useState(false);
  const [showHighExplanation, setShowHighExplanation] = useState(false);
  
  const handleSpecialDosingClick = (option) => {
    if (selectedSpecialDosing?.id === option.id) {
      onSpecialDosingChange(null);
    } else {
      onSpecialDosingChange(option);
    }
  };
  
  // Check if weight and dose are populated
  const isDisabled = !patientWeight || parseFloat(patientWeight) <= 0 || 
                     !actualDose || parseFloat(actualDose) <= 0;
  
  // Calculate dose per weight
  const calculateDosePerWeight = () => {
    if (!actualDose || !patientWeight || parseFloat(patientWeight) <= 0) return null;
    
    const dose = parseFloat(actualDose);
    const weight = parseFloat(patientWeight);
    
    // If already in per kg format, return as is
    if (actualDoseUnit.includes('/kg')) {
      return { value: dose.toFixed(2), unit: actualDoseUnit };
    }
    
    // Convert to per kg format
    const dosePerKg = dose / weight;
    const baseUnit = actualDoseUnit.replace('/kg', '');
    return { value: dosePerKg.toFixed(2), unit: `${baseUnit}/kg` };
  };
  
  const dosePerWeight = calculateDosePerWeight();

  return (
    <div className={`dose-safety-indicator ${isDisabled ? 'disabled' : ''}`}>
      {/* Current Dose Rate Card */}
      {dosePerWeight && (
        <div className="prescribed-dose-display">
          <div className="prescribed-dose-card">
            <div className="prescribed-dose-header">
              <Pill size={18} />
              <span className="prescribed-dose-title">CURRENT DOSE RATE</span>
            </div>
            <div className="prescribed-dose-content">
              <div className="prescribed-dose-value">
                <span className="dose-number">{dosePerWeight.value}</span>
                <span className="dose-unit">{dosePerWeight.unit}</span>
              </div>
              <div className="prescribed-dose-status">
                <span className={`status-indicator ${doseSafety.classification}`}>
                  {doseSafety.classification === 'low' ? 'Below Standard' :
                   doseSafety.classification === 'correct' ? 'Within Range' :
                   doseSafety.classification === 'high' ? 'Above Standard' : 'Enter Dose'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="dose-safety-cards">
        {/* Low Dose Card */}
        <div className={`dose-safety-card low-dose ${doseSafety.classification === 'low' ? 'active' : ''}`}>
          <div className="dose-card-header">
            <span className="dose-card-title">LOW DOSE</span>
            <button 
              className="explanation-toggle"
              onClick={() => setShowLowExplanation(!showLowExplanation)}
              type="button"
              aria-label="Toggle explanation"
              tabIndex={-1}
            >
              {showLowExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {doseSafety.classification === 'low' && (
              <span className="active-indicator">●</span>
            )}
          </div>
          <div className="dose-card-content">
            {doseSafety.classification === 'low' && actualDose && actualDoseUnit ? (
              <>
                <div className="dose-main-value">{actualDose} {actualDoseUnit}</div>
                <div className="dose-sub-text">Current dose</div>
              </>
            ) : standardDose?.range ? (
              <>
                <div className="dose-main-value">
                  &lt; {parseFloat(standardDose.range.min)} {standardDose.unit}
                </div>
              </>
            ) : (
              <>
                <div className="dose-threshold">&lt; 80%</div>
                <div className="dose-sub-text">of standard</div>
              </>
            )}
          </div>
          {showLowExplanation && (
            <div className="card-explanation">
              <p>Activates when the prescribed dose falls below 80% of the standard dose or below the minimum acceptable range.</p>
            </div>
          )}
        </div>

        {/* Correct Dose Card - ALWAYS SHOWS DATABASE DOSE */}
        <div className={`dose-safety-card correct-dose ${doseSafety.classification === 'correct' ? 'active' : ''}`}>
          <div className="dose-card-header">
            <span className="dose-card-title">CORRECT DOSE</span>
            <button 
              className="explanation-toggle"
              onClick={() => setShowCorrectExplanation(!showCorrectExplanation)}
              type="button"
              aria-label="Toggle explanation"
              tabIndex={-1}
            >
              {showCorrectExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {doseSafety.classification === 'correct' && (
              <span className="active-indicator">●</span>
            )}
          </div>
          <div className="dose-card-content">
            {/* ALWAYS show the database dose, never the user input */}
            {correctDose ? (
              <>
                <div className="dose-main-value">
                  {parseFloat(correctDose.dose)} {correctDose.unit}
                </div>
                {correctDose.totalDose && (
                  <div className="dose-sub-text">
                    Total: {Math.round(parseFloat(correctDose.totalDose))} {correctDose.totalUnit}
                  </div>
                )}
                {correctDose.note && (
                  <div className="dose-sub-text">{correctDose.note}</div>
                )}
              </>
            ) : standardDose ? (
              <>
                <div className="dose-main-value">
                  {parseFloat(standardDose.value)} {standardDose.unit}
                </div>
                <div className="dose-sub-text">Standard dose</div>
              </>
            ) : (
              <>
                <div className="dose-threshold">No dose data</div>
                <div className="dose-sub-text">Select medication</div>
              </>
            )}
          </div>
          {showCorrectExplanation && (
            <div className="card-explanation">
              <p>Always displays the standard database dose and activates when prescriptions fall within the safe 80-120% range.</p>
            </div>
          )}
        </div>

        {/* High Dose Card */}
        <div className={`dose-safety-card high-dose ${doseSafety.classification === 'high' ? 'active' : ''}`}>
          <div className="dose-card-header">
            <span className="dose-card-title">HIGH DOSE</span>
            <button 
              className="explanation-toggle"
              onClick={() => setShowHighExplanation(!showHighExplanation)}
              type="button"
              aria-label="Toggle explanation"
              tabIndex={-1}
            >
              {showHighExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {doseSafety.classification === 'high' && (
              <span className="active-indicator">●</span>
            )}
          </div>
          <div className="dose-card-content">
            {doseSafety.classification === 'high' && actualDose && actualDoseUnit ? (
              <>
                <div className="dose-main-value">{actualDose} {actualDoseUnit}</div>
                <div className="dose-sub-text">Current dose</div>
              </>
            ) : standardDose?.range ? (
              <>
                <div className="dose-main-value">
                  &gt; {parseFloat(standardDose.range.max)} {standardDose.unit}
                </div>
              </>
            ) : (
              <>
                <div className="dose-threshold">&gt; 120%</div>
                <div className="dose-sub-text">of standard</div>
              </>
            )}
          </div>
          {showHighExplanation && (
            <div className="card-explanation">
              <p>Triggers when doses exceed 120% of standard or maximum limits.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Special Dosing Options */}
      {specialDosingOptions.length > 0 && doseSafety.classification !== 'unknown' && (
        <div className="special-dosing-section">
          <div className="special-dosing-header">
            <div className="special-dosing-title">SPECIAL DOSING OPTIONS</div>
            <div className="special-dosing-subtitle">Select to compare against special dosing protocols</div>
          </div>
          <div className="special-dosing-cards">
            {specialDosingOptions.map((option) => {
              // Check if option has a condition that needs to be met
              let isApplicable = true;
              if (option.condition) {
                if (option.condition.includes('weight') && patientWeight) {
                  const weight = parseFloat(patientWeight);
                  if (option.condition.includes('≥')) {
                    const threshold = parseFloat(option.condition.match(/≥\s*(\d+)/)[1]);
                    isApplicable = weight >= threshold;
                  } else if (option.condition.includes('<')) {
                    const threshold = parseFloat(option.condition.match(/<\s*(\d+)/)[1]);
                    isApplicable = weight < threshold;
                  } else if (option.condition.includes('-')) {
                    const range = option.condition.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/);
                    if (range) {
                      isApplicable = weight >= parseFloat(range[1]) && weight <= parseFloat(range[2]);
                    }
                  }
                }
              }
              
              return (
                <button
                  key={option.id} 
                  className={`special-dosing-button ${selectedSpecialDosing?.id === option.id ? 'selected' : ''} ${!isApplicable ? 'disabled' : ''}`}
                  onClick={() => isApplicable && handleSpecialDosingClick(option)}
                  disabled={!isApplicable}
                  type="button"
                  title={!isApplicable ? `Not applicable: ${option.condition}` : ''}
                  tabIndex={-1}
                >
                  <div className="dosing-button-content">
                    <div className="dosing-button-left">
                      <div className="dosing-value">
                        <span className="dose-number">{option.value}</span>
                        <span className="dose-unit">{option.unit}</span>
                        <span className="dose-frequency">{option.frequency}</span>
                      </div>
                      <div className="dosing-details">
                        <div className="dosing-label">{option.label}</div>
                        {option.condition && (
                          <div className="dosing-condition">{option.condition}</div>
                        )}
                      </div>
                    </div>
                    <div className="dosing-button-right">
                      <div className="selection-indicator">
                        {selectedSpecialDosing?.id === option.id ? (
                          <Check size={20} />
                        ) : (
                          <div className="empty-circle" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Vial Calculator Component with Real-time Updates
const CustomVialCalculator = ({ 
  customVialCounts, 
  setCustomVialCounts,
  selectedMedicationData, 
  inputs, 
  formatNumber 
}) => {
  // Local state for immediate updates
  const [localCounts, setLocalCounts] = useState(customVialCounts);
  const [calculationResults, setCalculationResults] = useState({
    totalVials: 0,
    daysCovered: 0,
    waste: 0,
    wastePercentage: 0,
    hasWaste: false
  });

  // Calculate function
  const performCalculations = (counts) => {
    const totalVials = Object.values(counts).reduce((sum, count) => sum + parseInt(count) || 0, 0);
    
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight || totalVials === 0) {
      return {
        totalVials,
        daysCovered: 0,
        waste: 0,
        wastePercentage: 0,
        hasWaste: false
      };
    }

    // Calculate total drug available
    let totalDrugAvailable = 0;
    Object.entries(counts).forEach(([vialId, count]) => {
      const vialCount = parseInt(count) || 0;
      if (vialCount > 0) {
        const vialSize = selectedMedicationData.vialSizes?.find(v => 
          `${v.strength}-${v.unit}` === vialId
        );
        if (vialSize && vialSize.strength) {
          totalDrugAvailable += parseFloat(vialSize.strength) * vialCount;
        }
      }
    });

    // Calculate single dose
    const weight = parseFloat(inputs.patientWeight) || 0;
    const dose = parseFloat(inputs.dose) || 0;
    const doseFrequency = parseFloat(inputs.doseFrequency) || 1;
    const daysSupply = parseFloat(inputs.daysSupply) || 1;
    
    let singleDose = dose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    }

    const dailyDose = singleDose * doseFrequency;
    const totalDrugNeeded = dailyDose * daysSupply;
    
    const daysCovered = dailyDose > 0 ? Math.floor(totalDrugAvailable / dailyDose) : 0;
    const waste = Math.max(0, totalDrugAvailable - totalDrugNeeded);
    const wastePercentage = totalDrugAvailable > 0 ? (waste / totalDrugAvailable) * 100 : 0;

    return {
      totalVials,
      daysCovered,
      waste: Math.round(waste * 100) / 100,
      wastePercentage: Math.round(wastePercentage * 10) / 10,
      hasWaste: waste > 0
    };
  };

  // Update calculations whenever counts change
  useEffect(() => {
    const results = performCalculations(localCounts);
    setCalculationResults(results);
  }, [localCounts, inputs.dose, inputs.patientWeight, inputs.doseUnit, inputs.doseFrequency, inputs.daysSupply, selectedMedicationData]);

  // Handle count changes
  const handleCountChange = (vialId, newCount) => {
    const updatedCounts = { ...localCounts, [vialId]: newCount };
    setLocalCounts(updatedCounts);
    setCustomVialCounts(updatedCounts);
  };

  return (
    <div className="custom-vial-calculator">
      {/* Vial Selection Grid */}
      <div className="custom-vial-selection">
        {selectedMedicationData?.vialSizes?.map((vial) => {
          const vialId = `${vial.strength}-${vial.unit}`;
          const count = localCounts[vialId] || 0;
          
          return (
            <div key={vialId} className="custom-vial-row">
              <div className="vial-info">
                <span className="vial-strength">{vial.strength} {vial.unit}</span>
                {vial.volume && <span className="vial-volume">{vial.volume} mL</span>}
              </div>
              <div className="vial-controls">
                <button
                  type="button"
                  className="vial-count-btn minus"
                  onClick={() => handleCountChange(vialId, Math.max(0, count - 1))}
                  disabled={count === 0}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 0 && value <= 999) {
                      handleCountChange(vialId, value);
                    }
                  }}
                  className="vial-count-input"
                  min="0"
                  max="999"
                />
                <button
                  type="button"
                  className="vial-count-btn plus"
                  onClick={() => handleCountChange(vialId, Math.min(999, count + 1))}
                  disabled={count >= 999}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Calculation Results */}
      <div className="custom-calculation-results">
        <div className="result-fields">
          <div className="result-field">
            <label>Total Vials</label>
            <div className="result-value">{calculationResults.totalVials}</div>
          </div>
          <div className="result-field">
            <label>Days Covered</label>
            <div className="result-value">
              {(!inputs.dose || !inputs.patientWeight) ? (
                <span className="placeholder">Enter dose</span>
              ) : (
                calculationResults.daysCovered
              )}
            </div>
          </div>
          <div className="result-field">
            <label>Medication Waste</label>
            <div className="result-value">
              {(!inputs.dose || !inputs.patientWeight) ? (
                <span className="placeholder">Enter dose</span>
              ) : calculationResults.hasWaste ? (
                <span className="waste-amount">
                  {formatNumber(calculationResults.waste)} {inputs.doseUnit.replace('/kg', '')} ({calculationResults.wastePercentage}%)
                </span>
              ) : (
                <span className="no-waste">No waste</span>
              )}
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {inputs.dose && inputs.patientWeight && (
          <div className="status-messages">
            {calculationResults.hasWaste && calculationResults.wastePercentage > 20 && (
              <div className="status-message warning">
                <AlertCircle size={14} />
                <span>High waste percentage - consider different vial combination</span>
              </div>
            )}
            {inputs.daysSupply && calculationResults.daysCovered < parseInt(inputs.daysSupply) && (
              <div className="status-message error">
                <AlertCircle size={14} />
                <span>Need {parseInt(inputs.daysSupply) - calculationResults.daysCovered} more days of coverage</span>
              </div>
            )}
            {inputs.daysSupply && calculationResults.daysCovered >= parseInt(inputs.daysSupply) && !calculationResults.hasWaste && (
              <div className="status-message success">
                <Check size={14} />
                <span>Optimal combination - covers required days with no waste</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RedesignedPumpCalculator = () => {
  // Theme detection
  const [theme, setTheme] = useState('light');
  
  useEffect(() => {
    // Get initial theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme);
    
    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme') || 'light');
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);
  
  // Core state
  const [inputs, setInputs] = useState({
    patientWeight: '',
    dose: '',
    doseUnit: 'mg/kg',
    doseFrequency: '', // New field - how often dose is administered in days
    daysSupply: '', // New field - total days of treatment
    totalInfusionVolume: '',
    primeVolume: '10',
    flushVolume: '10',
    totalInfusionTime: { hours: '', minutes: '' },
    infusionMode: 'removeOverfill', // 'removeOverfill' or 'addToEmptyBag'
    infusionRate: '', // For manual infusion rate input
    useCustomSteps: false // Toggle for custom infusion steps
  });
  
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isFixedRateCalculation, setIsFixedRateCalculation] = useState(false);
  const [errors, setErrors] = useState({});
  const [doseSafety, setDoseSafety] = useState({ classification: 'unknown', ratio: 0, color: '#6c757d' });
  const [fixedInfusionError, setFixedInfusionError] = useState('');
  const [selectedSpecialDosing, setSelectedSpecialDosing] = useState(null);
  const [showVialCombinations, setShowVialCombinations] = useState(false);
  const [volumeCalculationMethod, setVolumeCalculationMethod] = useState('withdrawn'); // 'withdrawn' or 'reconstitution'
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [showVialSizeDropdown, setShowVialSizeDropdown] = useState(false);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const [medicationSearchTerm, setMedicationSearchTerm] = useState('');
  const [focusedMedicationIndex, setFocusedMedicationIndex] = useState(0);
  const [showVialInputModal, setShowVialInputModal] = useState(false);
  const [userVialInputs, setUserVialInputs] = useState({});
  
  // Custom infusion steps state
  const [customInfusionSteps, setCustomInfusionSteps] = useState([
    { id: 1, rate: '', duration: '', volume: '', description: 'Flush', isFlush: true }
  ]);
  const [customStepsValidation, setCustomStepsValidation] = useState({
    volumeValid: false,
    durationValid: false,
    stepsValid: []
  });
  const [expandedSections, setExpandedSections] = useState({
    medicationSetup: true,
    doseCalculation: false,
    infusionParameters: false,
    results: false
  });
  const [selectedVialSize, setSelectedVialSize] = useState(null);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [megaMenuSearch, setMegaMenuSearch] = useState('');
  const megaMenuRef = useRef(null);
  const vialDropdownRef = useRef(null);
  const megaMenuButtonRef = useRef(null);
  const medicationDropdownRef = useRef(null);

  // Get special dosing options for a medication - moved here to be available for medications list
  const getSpecialDosingOptions = (medicationKey = null) => {
    const medKey = medicationKey || selectedMedication;
    if (!medKey) return [];
    
    const specialDosingMap = {
      'LUMIZYME': [
        { id: 'standard', label: 'Standard dose: 20 mg/kg every 2 weeks', value: 20, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'weekly-high', label: 'High dose: 40 mg/kg weekly', value: 40, unit: 'mg/kg', frequency: 'weekly' }
      ],
      'CEREZYME': [
        { id: 'low-frequent', label: 'Low dose: 2.5 units/kg 3 times weekly', value: 2.5, unit: 'units/kg', frequency: '3 times weekly' },
        { id: 'standard', label: 'Standard dose: 60 units/kg every 2 weeks', value: 60, unit: 'units/kg', frequency: 'every 2 weeks' }
      ],
      'ELAPRASE': [
        { id: 'standard', label: 'Standard dose: 0.5 mg/kg weekly', value: 0.5, unit: 'mg/kg', frequency: 'weekly' },
        { id: 'high-severe', label: 'Severe cases: 1 mg/kg weekly', value: 1, unit: 'mg/kg', frequency: 'weekly' }
      ],
      'NEXVIAZYME': [
        { id: 'standard', label: 'Standard dose: 20 mg/kg every 2 weeks', value: 20, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'eopd', label: 'EOPD dose: 40 mg/kg every 2 weeks', value: 40, unit: 'mg/kg', frequency: 'every 2 weeks' }
      ],
      'POMBILITI': [
        { id: 'standard', label: 'Standard dose: 20 mg/kg every 2 weeks', value: 20, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'eopd', label: 'EOPD dose: 40 mg/kg every 2 weeks', value: 40, unit: 'mg/kg', frequency: 'every 2 weeks' }
      ]
    };
    
    return specialDosingMap[medKey] || [];
  };

  // Get medications list
  const medications = useMemo(() => {
    return Object.entries(pumpDatabase.medications).map(([key, med]) => ({
      key,
      ...med,
      color: med.brandColor || '#ff5500',
      hasMultipleVials: med.vialSizes && med.vialSizes.length > 1,
      hasSpecialDosing: getSpecialDosingOptions(key).length > 0
    }));
  }, []);

  // Get selected medication data
  const selectedMedicationData = useMemo(() => {
    return selectedMedication ? pumpDatabase.medications[selectedMedication] : null;
  }, [selectedMedication]);

  // Filter medications based on search term for custom dropdown
  const filteredMedicationsDropdown = useMemo(() => {
    if (!medicationSearchTerm) return medications;
    
    const searchLower = medicationSearchTerm.toLowerCase();
    return medications.filter(med => 
      med.brandName.toLowerCase().includes(searchLower) ||
      (med.genericName && med.genericName.toLowerCase().includes(searchLower)) ||
      (med.indication && med.indication.toLowerCase().includes(searchLower))
    );
  }, [medications, medicationSearchTerm]);

  // Filter medications based on search
  const filteredMedications = useMemo(() => {
    if (!megaMenuSearch) return medications;
    
    const searchLower = megaMenuSearch.toLowerCase();
    return medications.filter(med => 
      med.brandName.toLowerCase().includes(searchLower) ||
      (med.genericName && med.genericName.toLowerCase().includes(searchLower)) ||
      (med.indication && med.indication.toLowerCase().includes(searchLower))
    );
  }, [medications, megaMenuSearch]);

  // Close mega menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target) &&
          megaMenuButtonRef.current && !megaMenuButtonRef.current.contains(event.target)) {
        setMegaMenuOpen(false);
      }
    };

    if (megaMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        document.body.style.overflow = '';
      };
    }
  }, [megaMenuOpen]);

  // Close vial dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vialDropdownRef.current && !vialDropdownRef.current.contains(event.target)) {
        setShowVialSizeDropdown(false);
      }
    };

    if (showVialSizeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showVialSizeDropdown]);

  // Close medication dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (medicationDropdownRef.current && !medicationDropdownRef.current.contains(event.target)) {
        setShowMedicationDropdown(false);
      }
    };

    if (showMedicationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showMedicationDropdown]);

  // Get available dose units based on selected medication
  const availableDoseUnits = useMemo(() => {
    if (!selectedMedicationData?.standardDose?.unit) {
      return ['mg/kg', 'mg'];
    }

    const medicationUnit = selectedMedicationData.standardDose.unit;
    
    if (medicationUnit.includes('/kg')) {
      const baseUnit = medicationUnit.replace('/kg', '');
      return [medicationUnit, baseUnit];
    }
    
    return [medicationUnit, `${medicationUnit}/kg`];
  }, [selectedMedicationData]);


  // Calculate dose safety classification
  const getDoseSafety = useCallback(() => {
    if (!selectedMedicationData || !selectedMedicationData.standardDose) {
      return { classification: 'unknown', ratio: 0, color: '#6c757d' };
    }

    // If no dose is entered, default to showing correct dose info
    if (!inputs.dose) {
      return { classification: 'correct', ratio: 1, color: '#155724' };
    }

    const prescribedDose = parseFloat(inputs.dose);
    if (isNaN(prescribedDose) || prescribedDose <= 0) {
      return { classification: 'unknown', ratio: 0, color: '#6c757d' };
    }

    const medicationDosing = selectedMedicationData.standardDose;
    const weight = parseFloat(inputs.patientWeight) || 0;
    
    // If special dosing is selected, use that for comparison
    if (selectedSpecialDosing) {
      let comparisonDose = selectedSpecialDosing.value;
      let prescribedDoseNormalized = prescribedDose;
      
      // Normalize doses for comparison
      if (selectedSpecialDosing.unit.includes('/kg') && !inputs.doseUnit.includes('/kg') && weight > 0) {
        prescribedDoseNormalized = prescribedDose / weight;
      } else if (!selectedSpecialDosing.unit.includes('/kg') && inputs.doseUnit.includes('/kg') && weight > 0) {
        prescribedDoseNormalized = prescribedDose * weight;
      }
      
      const doseRatio = prescribedDoseNormalized / comparisonDose;
      
      if (Math.abs(doseRatio - 1) < 0.05) { // Within 5% of special dose
        return {
          classification: 'correct',
          label: 'MATCHES SPECIAL DOSING',
          ratio: doseRatio,
          color: '#155724',
          percentage: Math.round(doseRatio * 100),
          rangeInfo: `Matches selected: ${selectedSpecialDosing.label}`
        };
      } else if (doseRatio < 0.8) {
        return {
          classification: 'low',
          label: 'BELOW SPECIAL DOSE',
          ratio: doseRatio,
          color: '#856404',
          percentage: Math.round(doseRatio * 100),
          rangeInfo: `Below selected: ${selectedSpecialDosing.label}`
        };
      } else if (doseRatio > 1.2) {
        return {
          classification: 'high',
          label: 'ABOVE SPECIAL DOSE',
          ratio: doseRatio,
          color: '#721c24',
          percentage: Math.round(doseRatio * 100),
          rangeInfo: `Above selected: ${selectedSpecialDosing.label}`
        };
      } else {
        return {
          classification: 'correct',
          label: 'NEAR SPECIAL DOSE',
          ratio: doseRatio,
          color: '#155724',
          percentage: Math.round(doseRatio * 100),
          rangeInfo: `Close to selected: ${selectedSpecialDosing.label}`
        };
      }
    }
    
    // Convert prescribed dose to match medication standard dose unit for comparison
    let normalizedPrescribedDose = prescribedDose;
    let normalizedStandardDose = medicationDosing.value;
    
    // If medication uses mg/kg but user entered mg, convert to mg/kg
    if (medicationDosing.unit.includes('/kg') && !inputs.doseUnit.includes('/kg') && weight > 0) {
      normalizedPrescribedDose = prescribedDose / weight;
    }
    // If medication uses mg but user entered mg/kg, convert to mg
    else if (!medicationDosing.unit.includes('/kg') && inputs.doseUnit.includes('/kg') && weight > 0) {
      normalizedPrescribedDose = prescribedDose * weight;
    }
    
    // Handle medications with escalation schedules (e.g., XENPOZYME)
    if (medicationDosing.escalationSchedule) {
      const validDoses = Object.values(medicationDosing.escalationSchedule);
      const maintenanceDose = medicationDosing.maintenanceDose || validDoses[validDoses.length - 1];
      
      // Check if prescribed dose matches any escalation dose
      const matchedDose = validDoses.find(dose => Math.abs(dose - normalizedPrescribedDose) < 0.01);
      if (matchedDose) {
        const weekKey = Object.keys(medicationDosing.escalationSchedule).find(
          key => medicationDosing.escalationSchedule[key] === matchedDose
        );
        return {
          classification: 'correct',
          label: 'ESCALATION DOSE',
          ratio: normalizedPrescribedDose / maintenanceDose,
          color: '#155724', // Green
          percentage: Math.round((normalizedPrescribedDose / maintenanceDose) * 100),
          rangeInfo: `Valid escalation dose for ${weekKey.replace('week', 'Week ')}`
        };
      }
      
      // Check against maintenance dose
      const doseRatio = normalizedPrescribedDose / maintenanceDose;
      if (doseRatio >= 0.8 && doseRatio <= 1.2) {
        return {
          classification: 'correct',
          label: 'MAINTENANCE DOSE',
          ratio: doseRatio,
          color: '#155724', // Green
          percentage: Math.round(doseRatio * 100),
          rangeInfo: `Standard maintenance dose`
        };
      }
    }
    
    // Get the standard dose value
    const standardDose = medicationDosing.value || medicationDosing.maintenanceDose;
    const doseRange = medicationDosing.range;
    
    // Check if dose is within defined range (if range exists)
    if (doseRange) {
      const minDose = doseRange.min;
      const maxDose = doseRange.max;
      
      if (normalizedPrescribedDose < minDose) {
        return {
          classification: 'low',
          label: 'BELOW MINIMUM',
          ratio: normalizedPrescribedDose / minDose,
          color: '#856404', // Brown/amber
          percentage: Math.round((normalizedPrescribedDose / standardDose) * 100),
          rangeInfo: `Below minimum dose of ${minDose} ${medicationDosing.unit}`
        };
      } else if (normalizedPrescribedDose > maxDose) {
        return {
          classification: 'high',
          label: 'EXCEEDS MAXIMUM',
          ratio: normalizedPrescribedDose / maxDose,
          color: '#721c24', // Red
          percentage: Math.round((normalizedPrescribedDose / standardDose) * 100),
          rangeInfo: `Exceeds maximum dose of ${maxDose} ${medicationDosing.unit}`
        };
      }
    }
    
    // Standard dose comparison (if no range or within range)
    if (standardDose) {
      const doseRatio = normalizedPrescribedDose / standardDose;
      
      // For medications with different dosing options (e.g., KANUMA with rapid progression)
      if (medicationDosing.rapidProgression && Math.abs(normalizedPrescribedDose - medicationDosing.rapidProgression) < 0.01) {
        return {
          classification: 'correct',
          label: 'RAPID PROGRESSION',
          ratio: doseRatio,
          color: '#155724', // Green
          percentage: Math.round(doseRatio * 100),
          rangeInfo: 'Appropriate for rapidly progressing disease'
        };
      }
      
      // For medications with pediatric doses (e.g., NEXVIAZYME)
      if (medicationDosing.pediatricDose && inputs.patientWeight && parseFloat(inputs.patientWeight) < 30) {
        const pediatricRatio = normalizedPrescribedDose / medicationDosing.pediatricDose;
        if (pediatricRatio >= 0.8 && pediatricRatio <= 1.2) {
          return {
            classification: 'correct',
            label: 'PEDIATRIC DOSE',
            ratio: pediatricRatio,
            color: '#155724', // Green
            percentage: Math.round(pediatricRatio * 100),
            rangeInfo: `Appropriate pediatric dose (${medicationDosing.pediatricDose} ${medicationDosing.unit})`
          };
        }
      }
      
      // For medications with weekly options (e.g., LUMIZYME)
      if (medicationDosing.weeklyOption) {
        const weeklyDoseMatch = medicationDosing.weeklyOption.match(/(\d+(\.\d+)?)/);
        if (weeklyDoseMatch) {
          const weeklyDose = parseFloat(weeklyDoseMatch[1]);
          if (Math.abs(normalizedPrescribedDose - weeklyDose) < 0.01) {
            return {
              classification: 'correct',
              label: 'WEEKLY DOSE',
              ratio: normalizedPrescribedDose / standardDose,
              color: '#155724', // Green
              percentage: Math.round((normalizedPrescribedDose / standardDose) * 100),
              rangeInfo: medicationDosing.weeklyOption
            };
          }
        }
      }

      // Based on pump-database.json configuration.doseClassification
      if (doseRatio < 0.8) {
        return {
          classification: 'low',
          label: 'LOW DOSE',
          ratio: doseRatio,
          color: '#856404', // Brown/amber
          percentage: Math.round(doseRatio * 100),
          rangeInfo: doseRange ? `Acceptable range: ${doseRange.min}-${doseRange.max} ${medicationDosing.unit}` : `Below standard dose of ${standardDose} ${medicationDosing.unit}`
        };
      } else if (doseRatio >= 0.8 && doseRatio <= 1.2) {
        return {
          classification: 'correct',
          label: 'STANDARD DOSE',
          ratio: doseRatio,
          color: '#155724', // Green
          percentage: Math.round(doseRatio * 100),
          rangeInfo: doseRange ? `Within standard range (${doseRange.min}-${doseRange.max} ${medicationDosing.unit})` : `Standard dose: ${standardDose} ${medicationDosing.unit}`
        };
      } else if (doseRatio > 1.2) {
        // Check if it's within allowed range despite being > 120% of standard
        if (doseRange && normalizedPrescribedDose <= doseRange.max) {
          return {
            classification: 'correct',
            label: 'WITHIN RANGE',
            ratio: doseRatio,
            color: '#155724', // Green
            percentage: Math.round(doseRatio * 100),
            rangeInfo: `Higher than standard but within allowed range (${doseRange.min}-${doseRange.max} ${medicationDosing.unit})`
          };
        }
        
        return {
          classification: 'high',
          label: 'HIGH DOSE',
          ratio: doseRatio,
          color: '#721c24', // Red
          percentage: Math.round(doseRatio * 100),
          rangeInfo: doseRange ? `Above standard dose; Range: ${doseRange.min}-${doseRange.max} ${medicationDosing.unit}` : `Above standard dose of ${standardDose} ${medicationDosing.unit}`
        };
      }
    }
    
    return { classification: 'unknown', ratio: 0, color: '#6c757d' };
  }, [inputs.dose, inputs.doseUnit, inputs.patientWeight, selectedMedicationData, selectedSpecialDosing]);

  // Auto-update dose unit when medication changes
  useEffect(() => {
    if (selectedMedicationData?.standardDose?.unit) {
      const medicationUnit = selectedMedicationData.standardDose.unit;
      let defaultUnit = medicationUnit;
      
      // Set default units based on medication type
      if (medicationUnit === 'mg/kg' || medicationUnit === 'mg') {
        defaultUnit = 'mg';
      } else if (medicationUnit === 'units/kg' || medicationUnit === 'units') {
        defaultUnit = 'units';
      }
      
      setInputs(prev => ({
        ...prev,
        doseUnit: defaultUnit
      }));
    }
  }, [selectedMedicationData]);

  // Update dose safety when inputs change
  useEffect(() => {
    const safety = getDoseSafety();
    setDoseSafety(safety);
    // Debug logging
    if (inputs.dose && selectedMedicationData) {
      console.log('Dose Safety Update:', {
        medication: selectedMedication,
        prescribedDose: inputs.dose,
        prescribedDoseUnit: inputs.doseUnit,
        patientWeight: inputs.patientWeight,
        standardDose: selectedMedicationData.standardDose?.value,
        standardDoseUnit: selectedMedicationData.standardDose?.unit,
        classification: safety.classification,
        label: safety.label,
        percentage: safety.percentage
      });
    }
  }, [getDoseSafety, inputs.dose, inputs.doseUnit, inputs.patientWeight, selectedMedication, selectedMedicationData, selectedSpecialDosing]);

  // Reset special dosing when medication changes (moved from onChange handler for clarity)
  useEffect(() => {
    setSelectedSpecialDosing(null);
  }, [selectedMedication]);

  // Calculate correct dose based on patient weight and medication standard dose
  const calculateCorrectDose = useCallback(() => {
    if (!selectedMedicationData) return null;
    
    // If special dosing is selected, use that as the correct dose
    if (selectedSpecialDosing) {
      return {
        dose: selectedSpecialDosing.value,
        unit: selectedSpecialDosing.unit,
        note: selectedSpecialDosing.label
      };
    }
    
    const weight = parseFloat(inputs.patientWeight) || 0;
    const medicationDosing = selectedMedicationData.standardDose;
    
    if (!medicationDosing || (!medicationDosing.value && !medicationDosing.maintenanceDose)) return null;
    
    // For pediatric patients with special dosing
    if (medicationDosing.pediatricDose && weight < 30) {
      return {
        dose: medicationDosing.pediatricDose,
        unit: medicationDosing.unit,
        note: 'Pediatric dose'
      };
    }
    
    // For medications with escalation schedules
    if (medicationDosing.escalationSchedule) {
      // For XENPOZYME, explicitly show 3 mg/kg
      if (selectedMedicationData.brandName === 'XENPOZYME') {
        return {
          dose: medicationDosing.maintenanceDose || 3.0,
          unit: 'mg/kg',
          note: 'Maintenance dose',
          weightAdjustment: medicationDosing.weightAdjustment || null
        };
      }
      return {
        dose: medicationDosing.maintenanceDose || medicationDosing.escalationSchedule.week14,
        unit: medicationDosing.unit,
        note: 'Maintenance dose'
      };
    }
    
    // Standard dose calculation
    const standardDose = medicationDosing.value || medicationDosing.maintenanceDose;
    if (medicationDosing.unit.includes('/kg')) {
      // For weight-based dosing, always show the per kg dose
      // Only calculate total if weight is provided
      return {
        dose: standardDose,
        unit: medicationDosing.unit,
        totalDose: weight > 0 ? (standardDose * weight) : null,
        totalUnit: weight > 0 ? medicationDosing.unit.replace('/kg', '') : null
      };
    } else {
      // For fixed dosing, just show the dose
      return {
        dose: standardDose,
        unit: medicationDosing.unit
      };
    }
  }, [selectedMedicationData, inputs.patientWeight, selectedSpecialDosing]);

  // Calculate saline bag size based on patient weight and medication rules
  const calculateSalineBagSize = useCallback(() => {
    if (!selectedMedicationData) return null;
    
    // Skip saline bag calculation for oral medications
    if (selectedMedicationData.dosageForm === 'oral') return null;
    
    // Return null if no patient weight or invalid weight
    if (!inputs.patientWeight || parseFloat(inputs.patientWeight) <= 0) return null;
    
    const weight = parseFloat(inputs.patientWeight);
    const bagRules = selectedMedicationData.salineBagRules;
    
    if (!bagRules) {
      console.warn(`No saline bag rules for ${selectedMedicationData.brandName}`);
      return null;
    }
    
    if (bagRules.fixed) {
      return bagRules.bagSize;
    }
    
    if (bagRules.weightBased && bagRules.rules) {
      // Sort rules by minWeight to ensure we check them in order
      const sortedRules = [...bagRules.rules].sort((a, b) => {
        const aMin = a.minWeight || 0;
        const bMin = b.minWeight || 0;
        return aMin - bMin;
      });
      
      for (const rule of sortedRules) {
        if (rule.minWeight !== null && rule.maxWeight !== null) {
          // Check if weight falls within the range (inclusive)
          if (weight >= rule.minWeight && weight <= rule.maxWeight) {
            return rule.bagSize;
          }
        } else if (rule.minWeight !== null && rule.maxWeight === null) {
          // For open-ended upper ranges
          if (weight >= rule.minWeight) {
            return rule.bagSize;
          }
        } else if (rule.minWeight === null && rule.maxWeight !== null) {
          // For open-ended lower ranges
          if (weight <= rule.maxWeight) {
            return rule.bagSize;
          }
        }
      }
    }
    
    // Handle weight and dose based rules (e.g., KANUMA, NEXVIAZYME)
    if (bagRules.weightAndDoseBased && bagRules.rules) {
      const dose = parseFloat(inputs.dose) || 1; // Default to 1 mg/kg if not set
      
      // Handle NEXVIAZYME special case with dose-specific ranges
      if (Array.isArray(bagRules.rules)) {
        for (const doseRule of bagRules.rules) {
          if (doseRule.dose) {
            // Check if this is the correct dose rule
            const targetDose = parseFloat(doseRule.dose.replace('mg/kg', ''));
            if (Math.abs(dose - targetDose) < 0.1 && doseRule.weightRanges) {
              // Find the appropriate weight range
              for (const range of doseRule.weightRanges) {
                if (weight >= range.minWeight && weight <= range.maxWeight) {
                  return range.bagSize;
                }
              }
            }
          } else {
            // Handle KANUMA-style rules
            if (weight >= doseRule.minWeight && weight <= doseRule.maxWeight) {
              // Check if medication has rapid progression dose (3 mg/kg)
              if (selectedMedicationData.standardDose?.rapidProgression && dose >= 3) {
                return doseRule.dose3mg || doseRule.dose1mg;
              }
              return doseRule.dose1mg;
            }
          }
        }
      }
    }
    
    // Handle weight or condition based rules (e.g., NAGLAZYME)
    if (bagRules.weightOrConditionBased && bagRules.rules) {
      for (const rule of bagRules.rules) {
        if (rule.condition === 'weight <20kg or fluid overload') {
          if (weight < 20) {
            return rule.bagSize;
          }
        } else if (rule.condition === 'standard') {
          // Default to standard for weights >= 20kg
          if (weight >= 20) {
            return rule.bagSize;
          }
        }
      }
    }
    
    // Handle volume based rules (e.g., CEREZYME)
    if (bagRules.volumeBased && bagRules.defaultVolume) {
      // Extract numeric values from default volume string
      const match = bagRules.defaultVolume.match(/(\d+)-(\d+)/);
      if (match) {
        // Return the middle value of the range
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        return Math.round((min + max) / 2);
      }
      // If it's a single value
      const singleMatch = bagRules.defaultVolume.match(/(\d+)/);
      if (singleMatch) {
        return parseInt(singleMatch[1]);
      }
    }
    
    // Handle age based pediatric rules (e.g., ELELYSO)
    if (bagRules.ageBasedPediatric && bagRules.rules) {
      // For now, use pediatric rules if weight < 50kg (approximation)
      const isPediatric = weight < 50;
      for (const rule of bagRules.rules) {
        if (isPediatric && rule.type === 'pediatric') {
          // Return the middle of the range
          if (Array.isArray(rule.bagSize)) {
            return Math.round((rule.bagSize[0] + rule.bagSize[1]) / 2);
          }
          return rule.bagSize;
        } else if (!isPediatric && rule.type === 'adult') {
          // Return the middle of the range
          if (Array.isArray(rule.bagSize)) {
            return Math.round((rule.bagSize[0] + rule.bagSize[1]) / 2);
          }
          return rule.bagSize;
        }
      }
    }
    
    return null;
  }, [selectedMedicationData, inputs.patientWeight, inputs.dose]);

  // Get overfill value based on bag size
  const getOverfillValue = useCallback((bagSize) => {
    if (!selectedMedicationData) return 0;
    
    // Skip overfill for oral medications
    if (selectedMedicationData.dosageForm === 'oral') return 0;
    
    // Return 0 if no bag size or invalid bag size
    if (!bagSize || bagSize <= 0) return 0;
    
    // Convert bagSize to string to ensure consistent key lookup
    const bagSizeStr = String(bagSize);
    
    const overfillRules = selectedMedicationData.overfillRules;
    if (!overfillRules) {
      // Use default overfill rules if medication doesn't have specific rules
      const defaultOverfillRules = pumpDatabase.configuration?.overfillRules || {};
      if (defaultOverfillRules[bagSizeStr] !== undefined) {
        return defaultOverfillRules[bagSizeStr];
      }
      return 0;
    }
    
    // Check if there's a direct match in medication-specific rules
    if (overfillRules[bagSizeStr] !== undefined) {
      return overfillRules[bagSizeStr];
    }
    
    // For missing bag sizes, use the default overfill rules from configuration
    const defaultOverfillRules = pumpDatabase.configuration?.overfillRules || {
      "50": 5,
      "100": 7,
      "150": 25,
      "200": 28,  // Added 200 mL
      "250": 30,
      "300": 35,
      "500": 40,
      "600": 45,
      "700": 50,
      "800": 55,
      "900": 58,
      "1000": 60
    };
    
    // Check default rules
    if (defaultOverfillRules[bagSizeStr] !== undefined) {
      return defaultOverfillRules[bagSizeStr];
    }
    
    // If no exact match found, try to interpolate or use closest value
    const numericBagSize = parseInt(bagSizeStr);
    const availableSizes = Object.keys(defaultOverfillRules).map(k => parseInt(k)).sort((a, b) => a - b);
    
    // Find the closest bag size
    let closestSize = availableSizes[0];
    let minDiff = Math.abs(numericBagSize - closestSize);
    
    for (const size of availableSizes) {
      const diff = Math.abs(numericBagSize - size);
      if (diff < minDiff) {
        minDiff = diff;
        closestSize = size;
      }
    }
    
    // Return overfill for closest size
    return defaultOverfillRules[String(closestSize)] || 0;
  }, [selectedMedicationData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Clear fixed infusion error when infusion rate is entered
    if (field === 'infusionRate' && value) {
      setFixedInfusionError('');
    }
  };

  // Handle time input changes
  const handleTimeChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      totalInfusionTime: {
        ...prev.totalInfusionTime,
        [field]: value
      }
    }));
  };

  // Add custom infusion step
  const addCustomStep = () => {
    const newId = Math.max(...customInfusionSteps.map(s => s.id)) + 1;
    setCustomInfusionSteps(prev => {
      // Update the previous last step to not be flush anymore
      const updatedSteps = prev.map((step, index) => {
        if (index === prev.length - 1) {
          return { ...step, isFlush: false };
        }
        return step;
      });
      
      // Add new step which will be the flush step
      return [...updatedSteps, {
        id: newId,
        rate: '',
        duration: '',
        volume: '',
        description: 'Flush',
        isFlush: true
      }];
    });
  };

  // Remove custom infusion step
  const removeCustomStep = (id) => {
    if (customInfusionSteps.length > 1) {
      setCustomInfusionSteps(prev => {
        const filtered = prev.filter(step => step.id !== id);
        // Ensure the last step is marked as flush
        return filtered.map((step, index) => {
          if (index === filtered.length - 1) {
            return { ...step, isFlush: true, description: 'Flush' };
          }
          return { ...step, isFlush: false };
        });
      });
    }
  };

  // Update custom infusion step with automatic calculations
  const updateCustomStep = (id, field, value) => {
    setCustomInfusionSteps(prev => prev.map((step, index) => {
      if (step.id === id) {
        const isUntilComplete = index === prev.length - 2 && prev.length > 1;
        const isFlush = index === prev.length - 1;
        
        // For "Until complete" step, only allow rate updates
        if (isUntilComplete && (field === 'volume' || field === 'duration')) {
          return step;
        }
        
        // Update the field
        const updatedStep = { ...step, [field]: value };
        
        // Auto-calculate derived fields
        if (!isUntilComplete && value) {
          const rate = parseFloat(field === 'rate' ? value : updatedStep.rate) || 0;
          
          if (isFlush) {
            // For flush step, behave like regular steps
            if (field === 'volume' && rate > 0) {
              // Calculate duration from volume
              const volume = parseFloat(value) || 0;
              updatedStep.duration = ((volume / rate) * 60).toFixed(1);
            } else if (field === 'duration' && rate > 0) {
              // Calculate volume from duration
              const duration = parseFloat(value) || 0;
              updatedStep.volume = ((rate * duration) / 60).toFixed(1);
            } else if (field === 'rate') {
              // Recalculate based on what's already filled
              if (updatedStep.volume && rate > 0) {
                const volume = parseFloat(updatedStep.volume) || 0;
                updatedStep.duration = ((volume / rate) * 60).toFixed(1);
              } else if (updatedStep.duration && rate > 0) {
                const duration = parseFloat(updatedStep.duration) || 0;
                updatedStep.volume = ((rate * duration) / 60).toFixed(1);
              }
            }
          } else {
            // For regular steps
            if (field === 'volume' && rate > 0) {
              // Calculate duration from volume
              const volume = parseFloat(value) || 0;
              updatedStep.duration = ((volume / rate) * 60).toFixed(1);
            } else if (field === 'duration' && rate > 0) {
              // Calculate volume from duration
              const duration = parseFloat(value) || 0;
              updatedStep.volume = ((rate * duration) / 60).toFixed(1);
            } else if (field === 'rate') {
              // Recalculate based on what's already filled
              if (updatedStep.volume && rate > 0) {
                const volume = parseFloat(updatedStep.volume) || 0;
                updatedStep.duration = ((volume / rate) * 60).toFixed(1);
              } else if (updatedStep.duration && rate > 0) {
                const duration = parseFloat(updatedStep.duration) || 0;
                updatedStep.volume = ((rate * duration) / 60).toFixed(1);
              }
            }
          }
        }
        
        return updatedStep;
      }
      return step;
    }));
  };

  // Validate custom infusion steps
  const validateCustomSteps = useCallback(() => {
    if (!inputs.useCustomSteps || customInfusionSteps.length === 0) {
      return { volumeValid: true, durationValid: true, stepsValid: [] };
    }

    const totalVolume = parseFloat(inputs.totalInfusionVolume) || 0;
    const totalMinutes = (parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + 
                        (parseInt(inputs.totalInfusionTime.minutes) || 0);

    let stepVolumeTotal = 0;
    let stepDurationTotal = 0;
    const stepsValidation = [];

    // First pass: Calculate "Until complete" step volume
    let untilCompleteVolume = 0;
    if (customInfusionSteps.length > 1) {
      const otherStepsVolume = customInfusionSteps
        .filter((_, i) => i !== customInfusionSteps.length - 2)
        .reduce((sum, s) => sum + (parseFloat(s.volume) || 0), 0);
      untilCompleteVolume = Math.max(0, totalVolume - otherStepsVolume);
    }

    // Second pass: Validate each step
    customInfusionSteps.forEach((step, index) => {
      const isLastStep = index === customInfusionSteps.length - 1;
      const isUntilComplete = index === customInfusionSteps.length - 2 && customInfusionSteps.length > 1;
      
      const rate = parseFloat(step.rate) || 0;
      let volume = 0;
      let duration = 0;
      
      duration = parseFloat(step.duration) || 0;
      let calculatedVolume = 0;
      let calculatedDuration = 0;

      if (isUntilComplete) {
        // "Until complete" step - special validation
        volume = untilCompleteVolume;
        duration = rate > 0 ? (volume / rate) * 60 : 0;
        calculatedVolume = volume;
        calculatedDuration = duration;
      } else if (isLastStep) {
        // Flush step - auto-calculated duration
        volume = parseFloat(step.volume) || 0;
        duration = parseFloat(step.duration) || 0;
        calculatedVolume = volume;
        calculatedDuration = rate > 0 && volume > 0 ? (volume / rate) * 60 : duration;
      } else {
        // Regular step - strict formula validation
        volume = parseFloat(step.volume) || 0;
        duration = parseFloat(step.duration) || 0;
        
        // For regular steps, always calculate expected volume from rate and duration
        calculatedVolume = rate > 0 && duration > 0 ? (rate * duration) / 60 : 0;
        calculatedDuration = rate > 0 && volume > 0 ? (volume / rate) * 60 : duration;
      }

      stepVolumeTotal += volume;
      stepDurationTotal += duration;

      // Validation for this step
      let isValid = false;
      let errorMessage = '';
      let actualVolumeMatch = true;
      
      if (isUntilComplete) {
        // Until complete step - only needs rate > 0
        isValid = rate > 0 && volume > 0;
        errorMessage = !rate ? 'Rate required' : 
                      !volume ? 'Volume calculated as 0 - check other steps' : '';
      } else if (isLastStep) {
        // Flush step - needs rate and volume AND must follow formula
        const expectedVolume = rate > 0 && duration > 0 ? (rate * duration) / 60 : 0;
        actualVolumeMatch = Math.abs(expectedVolume - volume) < 0.1;
        
        isValid = rate > 0 && volume > 0 && duration > 0 && actualVolumeMatch;
        
        if (!rate) {
          errorMessage = 'Rate required';
        } else if (!volume) {
          errorMessage = 'Volume required';
        } else if (!duration) {
          errorMessage = 'Duration required';
        } else if (!actualVolumeMatch) {
          errorMessage = `Volume must equal (Rate × Duration) ÷ 60. Expected: ${expectedVolume.toFixed(1)} mL`;
        }
      } else {
        // Regular step - strict validation with formula
        const expectedVolume = rate > 0 && duration > 0 ? (rate * duration) / 60 : 0;
        actualVolumeMatch = Math.abs(expectedVolume - volume) < 0.1;
        
        isValid = rate > 0 && duration > 0 && volume > 0 && actualVolumeMatch;
        
        if (!rate) {
          errorMessage = 'Rate required';
        } else if (!duration) {
          errorMessage = 'Duration required';
        } else if (!volume) {
          errorMessage = 'Volume required';
        } else if (!actualVolumeMatch) {
          errorMessage = `Volume must equal (Rate × Duration) ÷ 60. Expected: ${expectedVolume.toFixed(1)} mL`;
        }
      }
      
      const stepValid = {
        id: step.id,
        volumeValid: volume > 0,
        durationValid: duration > 0,
        rateValid: rate > 0,
        volumeMatch: isUntilComplete || isLastStep ? true : actualVolumeMatch,
        durationMatch: true,
        isValid,
        calculatedVolume,
        calculatedDuration,
        actualVolume: volume,
        actualDuration: duration,
        isUntilComplete,
        isFlush: isLastStep,
        isRegular: !isUntilComplete && !isLastStep,
        errorMessage
      };
      
      stepsValidation.push(stepValid);
    });

    // Validate totals
    const volumeValid = Math.abs(stepVolumeTotal - totalVolume) < 0.1;
    const durationValid = Math.abs(stepDurationTotal - totalMinutes) < 1;
    const isAcceptable = volumeValid && durationValid && stepsValidation.every(step => step.isValid);

    return {
      volumeValid,
      durationValid,
      stepsValid: stepsValidation,
      stepVolumeTotal,
      stepDurationTotal,
      isAcceptable,
      totalVolumeError: !volumeValid ? `Total: ${stepVolumeTotal.toFixed(1)} mL (Expected: ${totalVolume} mL)` : '',
      totalDurationError: !durationValid ? `Total: ${stepDurationTotal.toFixed(0)} min (Expected: ${totalMinutes} min)` : ''
    };
  }, [inputs.useCustomSteps, inputs.totalInfusionVolume, inputs.totalInfusionTime, customInfusionSteps]);

  // Update validation when custom steps change
  useEffect(() => {
    if (inputs.useCustomSteps) {
      const validation = validateCustomSteps();
      setCustomStepsValidation(validation);
    }
  }, [inputs.useCustomSteps, customInfusionSteps, inputs.totalInfusionVolume, inputs.totalInfusionTime, validateCustomSteps]);


  // Calculate days coverage for custom vial combination
  const calculateCustomDaysCoverage = (customCounts) => {
    console.log('calculateCustomDaysCoverage called with:', {
      customCounts,
      selectedMedicationData: selectedMedicationData?.brandName,
      vialSizes: selectedMedicationData?.vialSizes,
      inputs: {
        dose: inputs.dose,
        patientWeight: inputs.patientWeight,
        doseUnit: inputs.doseUnit,
        doseFrequency: inputs.doseFrequency,
        daysSupply: inputs.daysSupply
      }
    });

    // Basic validation
    if (!selectedMedicationData || !customCounts) {
      console.log('Missing data for days coverage calculation');
      return 0;
    }

    // Return 0 if no dose or weight entered yet
    if (!inputs.dose || !inputs.patientWeight) {
      console.log('Missing dose or patient weight');
      return 0;
    }
    
    const weight = parseFloat(inputs.patientWeight) || 0;
    const dose = parseFloat(inputs.dose) || 0;
    const doseFrequency = parseFloat(inputs.doseFrequency) || 1;
    
    // Ensure we have valid numbers
    if (weight <= 0 || dose <= 0) {
      return 0;
    }
    
    // Calculate single dose
    let singleDose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    } else {
      singleDose = dose;
    }
    
    // Calculate total drug available from custom vial counts
    let totalDrugAvailable = 0;
    
    // Ensure we have vial sizes
    if (!selectedMedicationData.vialSizes || !Array.isArray(selectedMedicationData.vialSizes)) {
      return 0;
    }
    
    // Calculate total drug from selected vials
    Object.entries(customCounts).forEach(([vialId, count]) => {
      const vialCount = parseInt(count) || 0;
      if (vialCount > 0) {
        // Find matching vial
        const vialSize = selectedMedicationData.vialSizes.find(v => 
          `${v.strength}-${v.unit}` === vialId
        );
        
        if (vialSize && vialSize.strength) {
          const vialStrength = parseFloat(vialSize.strength);
          if (!isNaN(vialStrength)) {
            totalDrugAvailable += vialStrength * vialCount;
          }
        }
      }
    });
    
    // If no drug available, return 0
    if (totalDrugAvailable <= 0) {
      return 0;
    }
    
    // Calculate how many days this covers
    const dailyDose = singleDose * doseFrequency;
    
    if (dailyDose <= 0) {
      return 0;
    }
    
    const daysCovered = Math.floor(totalDrugAvailable / dailyDose);
    
    console.log('Days coverage calculation:', {
      totalDrugAvailable,
      dailyDose,
      daysCovered,
      customCounts
    });
    
    return isNaN(daysCovered) ? 0 : daysCovered;
  };

  // Calculate waste for custom vial combination
  const calculateCustomWaste = (customCounts) => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight || !customCounts) {
      return { waste: 0, wastePercentage: 0, hasWaste: false };
    }
    
    const weight = parseFloat(inputs.patientWeight) || 0;
    const dose = parseFloat(inputs.dose) || 0;
    const doseFrequency = parseFloat(inputs.doseFrequency) || 1;
    const daysSupply = parseFloat(inputs.daysSupply) || 1;
    
    if (weight <= 0 || dose <= 0) {
      return { waste: 0, wastePercentage: 0, hasWaste: false };
    }
    
    let singleDose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    } else {
      singleDose = dose;
    }
    
    // Calculate total drug needed
    const totalDrugNeeded = singleDose * doseFrequency * daysSupply;
    
    // Calculate total drug available from custom vial counts
    let totalDrugAvailable = 0;
    
    // Calculate total drug from selected vials - check all possible ID formats
    Object.entries(customCounts).forEach(([vialId, count]) => {
      const vialCount = parseInt(count) || 0;
      if (vialCount > 0 && selectedMedicationData.vialSizes) {
        // Find matching vial by checking different ID formats
        const vialSize = selectedMedicationData.vialSizes.find(v => {
          // Check exact match
          if (`${v.strength}-${v.unit}` === vialId) return true;
          // Check with spaces
          if (`${v.strength} ${v.unit}` === vialId) return true;
          // Check numeric strength match
          if (v.strength && v.unit && `${parseFloat(v.strength)}-${v.unit}` === vialId) return true;
          return false;
        });
        
        if (vialSize && vialSize.strength) {
          const vialStrength = parseFloat(vialSize.strength);
          if (!isNaN(vialStrength)) {
            totalDrugAvailable += vialStrength * vialCount;
          }
        }
      }
    });
    
    // Calculate waste
    const waste = totalDrugAvailable - totalDrugNeeded;
    const wastePercentage = totalDrugAvailable > 0 ? (waste / totalDrugAvailable) * 100 : 0;
    
    return {
      waste: Math.max(0, waste),
      wastePercentage: Math.max(0, wastePercentage),
      hasWaste: waste > 0,
      totalDrugAvailable,
      totalDrugNeeded
    };
  };

  // Calculate vial combination
  // Calculate all possible vial combinations for medications with multiple vial sizes
  const calculateAllVialCombinations = useCallback(() => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) return null;
    
    // Filter out non-injectable forms (capsules, tablets)
    const injectableVials = selectedMedicationData.vialSizes?.filter(vial => 
      !vial.form || (vial.form !== 'capsule' && vial.form !== 'tablet')
    );
    
    if (!injectableVials || injectableVials.length === 0) {
      console.error(`No injectable vials found for ${selectedMedicationData.brandName}`);
      return null;
    }

    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    const doseFrequency = parseFloat(inputs.doseFrequency);
    const daysSupply = parseFloat(inputs.daysSupply);
    
    let singleDose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    } else {
      singleDose = dose;
    }

    // Calculate total dose needed
    let totalDose = singleDose;
    
    // Always use days supply if provided
    if (daysSupply > 0) {
      if (doseFrequency > 0) {
        const numberOfDoses = Math.ceil(daysSupply / doseFrequency);
        totalDose = singleDose * numberOfDoses;
      } else {
        // If no frequency specified, assume daily dosing
        totalDose = singleDose * daysSupply;
      }
    }

    // For single vial size, return simple calculation
    if (injectableVials.length === 1) {
      const vial = injectableVials[0];
      const vialCount = Math.ceil(totalDose / vial.strength);
      return [{
        combination: [{ vial, count: vialCount }],
        totalVials: vialCount,
        actualDose: vialCount * vial.strength,
        waste: (vialCount * vial.strength) - totalDose,
        isOptimal: true
      }];
    }

    // For multiple vial sizes, calculate different combinations
    const combinations = [];
    const sortedVials = [...injectableVials].sort((a, b) => b.strength - a.strength);

    // Strategy 1: Use larger vials first (minimize vial count)
    const largeVialsFirst = [];
    let remainingDose = totalDose;
    
    for (const vial of sortedVials) {
      const vialCount = Math.floor(remainingDose / vial.strength);
      if (vialCount > 0) {
        largeVialsFirst.push({ vial, count: vialCount });
        remainingDose -= vialCount * vial.strength;
      }
    }
    
    if (remainingDose > 0.01) {
      const smallestVial = sortedVials[sortedVials.length - 1];
      const existingSmallest = largeVialsFirst.find(c => c.vial === smallestVial);
      if (existingSmallest) {
        existingSmallest.count += 1;
      } else {
        largeVialsFirst.push({ vial: smallestVial, count: 1 });
      }
    }

    // Calculate metrics for large vials first strategy
    let totalVialsLarge = 0;
    let actualDoseLarge = 0;
    largeVialsFirst.forEach(item => {
      totalVialsLarge += item.count;
      actualDoseLarge += item.count * item.vial.strength;
    });

    combinations.push({
      combination: largeVialsFirst,
      totalVials: totalVialsLarge,
      actualDose: actualDoseLarge,
      waste: actualDoseLarge - totalDose,
      strategy: 'Minimize vial count',
      isOptimal: true
    });

    // Strategy 2: Use smaller vials to minimize waste
    const smallVialsFirst = [];
    const smallestVial = sortedVials[sortedVials.length - 1];
    const largestVial = sortedVials[0];
    
    // Calculate how many small vials would be needed
    const smallVialsOnly = Math.ceil(totalDose / smallestVial.strength);
    
    // If using only small vials is reasonable (not too many)
    if (smallVialsOnly <= 10) {
      combinations.push({
        combination: [{ vial: smallestVial, count: smallVialsOnly }],
        totalVials: smallVialsOnly,
        actualDose: smallVialsOnly * smallestVial.strength,
        waste: (smallVialsOnly * smallestVial.strength) - totalDose,
        strategy: 'Small vials only',
        isOptimal: false
      });
    }

    // Strategy 3: Balanced approach - Mix of large and small vials
    if (sortedVials.length >= 2) {
      const balancedCombo = [];
      let remainingForBalance = totalDose;
      
      // Use large vials but leave room for at least one small vial
      const largeVial = sortedVials[0];
      const smallVial = sortedVials[sortedVials.length - 1];
      const maxLargeVials = Math.floor((totalDose - smallVial.strength) / largeVial.strength);
      
      if (maxLargeVials > 0) {
        balancedCombo.push({ vial: largeVial, count: maxLargeVials });
        remainingForBalance -= maxLargeVials * largeVial.strength;
      }
      
      // Fill remainder with smaller vials
      for (let i = 1; i < sortedVials.length; i++) {
        const vial = sortedVials[i];
        const count = Math.floor(remainingForBalance / vial.strength);
        if (count > 0) {
          balancedCombo.push({ vial, count });
          remainingForBalance -= count * vial.strength;
        }
      }
      
      // Add one more of smallest if needed
      if (remainingForBalance > 0.01) {
        const existing = balancedCombo.find(c => c.vial === smallVial);
        if (existing) {
          existing.count += 1;
        } else {
          balancedCombo.push({ vial: smallVial, count: 1 });
        }
      }
      
      let totalVialsBalance = 0;
      let actualDoseBalance = 0;
      balancedCombo.forEach(item => {
        totalVialsBalance += item.count;
        actualDoseBalance += item.count * item.vial.strength;
      });
      
      combinations.push({
        combination: balancedCombo,
        totalVials: totalVialsBalance,
        actualDose: actualDoseBalance,
        waste: actualDoseBalance - totalDose,
        strategy: 'Balanced mix',
        isOptimal: false
      });
    }
    
    // Strategy 4: Try to get exact dose or minimize waste
    // This is more complex - try different combinations
    if (sortedVials.length === 2) {
      const [large, small] = sortedVials;
      
      // Try different numbers of large vials
      for (let largeCount = 0; largeCount <= Math.ceil(totalDose / large.strength); largeCount++) {
        const remainingAfterLarge = totalDose - (largeCount * large.strength);
        
        if (remainingAfterLarge <= 0 && largeCount > 0) {
          // We've exceeded the dose with just large vials
          combinations.push({
            combination: [{ vial: large, count: largeCount }],
            totalVials: largeCount,
            actualDose: largeCount * large.strength,
            waste: (largeCount * large.strength) - totalDose,
            strategy: 'Large vials only',
            isOptimal: false
          });
          break;
        } else if (remainingAfterLarge > 0) {
          // Need some small vials too
          const smallCount = Math.ceil(remainingAfterLarge / small.strength);
          const combo = [];
          if (largeCount > 0) combo.push({ vial: large, count: largeCount });
          combo.push({ vial: small, count: smallCount });
          
          const totalVialsMixed = largeCount + smallCount;
          const actualDoseMixed = (largeCount * large.strength) + (smallCount * small.strength);
          
          combinations.push({
            combination: combo,
            totalVials: totalVialsMixed,
            actualDose: actualDoseMixed,
            waste: actualDoseMixed - totalDose,
            strategy: largeCount > 0 ? 'Mixed sizes' : 'Small vials only',
            isOptimal: false
          });
        }
      }
    }

    // Remove duplicates and sort by waste (least waste first), then by vial count
    const uniqueCombinations = combinations.filter((combo, index, self) => 
      index === self.findIndex(c => 
        c.totalVials === combo.totalVials && 
        c.actualDose === combo.actualDose
      )
    );

    return uniqueCombinations.sort((a, b) => {
      // First sort by waste
      if (a.waste !== b.waste) return a.waste - b.waste;
      // Then by total vials
      return a.totalVials - b.totalVials;
    });
  }, [selectedMedicationData, inputs.dose, inputs.patientWeight, inputs.doseUnit, inputs.doseFrequency, inputs.daysSupply]);

  // Calculate vial combination for a single dose (ignoring dose frequency and days supply)
  const calculateSingleDoseVialCombination = useCallback(() => {
    if (!selectedMedicationData) {
      console.warn('No medication selected for vial combination calculation');
      return null;
    }
    
    if (!inputs.dose || parseFloat(inputs.dose) <= 0) {
      console.warn('Invalid or missing dose for vial combination calculation');
      return null;
    }
    
    if (!inputs.patientWeight || parseFloat(inputs.patientWeight) <= 0) {
      console.warn('Invalid or missing patient weight for vial combination calculation');
      return null;
    }

    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    
    let singleDose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    } else {
      singleDose = dose;
    }

    const vialSizes = selectedMedicationData.vialSizes;
    if (!vialSizes || vialSizes.length === 0) {
      console.warn(`No vial sizes available for ${selectedMedicationData.brandName}`);
      return null;
    }

    // For single vial size, return simple calculation
    if (vialSizes.length === 1) {
      const vial = vialSizes[0];
      const vialCount = Math.ceil(singleDose / vial.strength);
      return [{ vial, count: vialCount }];
    }

    // For multiple vial sizes, use the optimal combination for single dose
    const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);
    const combination = [];
    let remainingDose = singleDose;
    
    for (const vial of sortedVials) {
      const vialCount = Math.floor(remainingDose / vial.strength);
      if (vialCount > 0) {
        combination.push({ vial, count: vialCount });
        remainingDose -= vialCount * vial.strength;
      }
    }
    
    if (remainingDose > 0.01) {
      const smallestVial = sortedVials[sortedVials.length - 1];
      const existingSmallest = combination.find(c => c.vial === smallestVial);
      if (existingSmallest) {
        existingSmallest.count += 1;
      } else {
        combination.push({ vial: smallestVial, count: 1 });
      }
    }

    return combination;
  }, [selectedMedicationData, inputs.dose, inputs.patientWeight, inputs.doseUnit]);

  // Keep the original function for backward compatibility
  const calculateVialCombination = useCallback(() => {
    const allCombinations = calculateAllVialCombinations();
    if (!allCombinations || allCombinations.length === 0) return null;
    
    // Return the optimal combination (first one after sorting)
    return allCombinations[0].combination;
  }, [calculateAllVialCombinations]);

  // Calculate days coverage based on user vial inputs
  const calculateDaysCoverageFromVials = useCallback((vialInputs) => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) return 0;
    
    // Calculate single dose
    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    let singleDose;
    
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    } else {
      singleDose = dose;
    }
    
    // Calculate total medication from user's vial inputs
    let totalMedication = 0;
    Object.entries(vialInputs).forEach(([vialKey, count]) => {
      if (count > 0) {
        const [strength] = vialKey.split('_');
        totalMedication += parseFloat(strength) * count;
      }
    });
    
    // Get the optimal vial combination to understand the required medication per supply period
    const allCombinations = calculateAllVialCombinations();
    if (!allCombinations || allCombinations.length === 0) {
      return {
        totalMedication,
        numberOfDoses: 0,
        daysCoverage: 0,
        singleDose
      };
    }
    
    const optimalCombo = allCombinations[0];
    const optimalTotalMedication = optimalCombo.actualDose;
    const daysSupply = parseFloat(inputs.daysSupply) || 28; // Default to 28 days if not specified
    
    // Calculate proportional days coverage
    // If optimal medication covers daysSupply, then user's medication covers proportionally
    const daysCoverage = (totalMedication / optimalTotalMedication) * daysSupply;
    
    // Calculate number of doses based on dose frequency
    const doseFrequency = parseFloat(inputs.doseFrequency) || 14; // Default to bi-weekly if not specified
    const numberOfDoses = Math.floor(daysCoverage / doseFrequency);
    
    return {
      totalMedication,
      numberOfDoses,
      daysCoverage,
      singleDose
    };
  }, [selectedMedicationData, inputs.dose, inputs.patientWeight, inputs.doseUnit, inputs.doseFrequency, inputs.daysSupply, calculateAllVialCombinations]);

  // Calculate drug volume
  // calculationMethod: 'withdrawn' = actual drug volume to be withdrawn from vial
  //                    'reconstitution' = sterile water volume needed to reconstitute
  const calculateDrugVolume = useCallback((forSingleDose = false, calculationMethod = 'withdrawn') => {
    if (!selectedMedicationData) {
      console.warn('No medication data available for drug volume calculation');
      return 0;
    }
    
    // Skip drug volume calculation for oral medications
    if (selectedMedicationData.dosageForm === 'oral') return 0;
    
    // Validate required inputs
    if (!inputs.dose || parseFloat(inputs.dose) <= 0 || !inputs.patientWeight || parseFloat(inputs.patientWeight) <= 0) {
      console.warn('Missing or invalid dose/weight for drug volume calculation');
      return 0;
    }
    
    // If calculating for single dose, ignore dose frequency and days supply
    let vialCombination;
    if (forSingleDose) {
      // Calculate vial combination for single dose only
      const singleDoseCombination = calculateSingleDoseVialCombination();
      if (!singleDoseCombination) {
        console.warn('Failed to calculate single dose vial combination');
        return 0;
      }
      vialCombination = singleDoseCombination;
    } else {
      vialCombination = calculateVialCombination();
      if (!vialCombination) {
        console.warn('Failed to calculate vial combination');
        return 0;
      }
    }
    
    let totalVolume = 0;
    
    if (selectedMedicationData.dosageForm === 'lyophilized') {
      // For lyophilized powders, use the most accurate volume available
      vialCombination.forEach(item => {
        // Skip non-injectable forms (like capsules)
        if (item.vial.form === 'capsule' || item.vial.form === 'tablet') {
          console.log(`Skipping non-injectable form: ${item.vial.form}`);
          return;
        }
        
        let vialVolume = 0;
        
        if (calculationMethod === 'reconstitution') {
          // Use reconstitution volume (sterile water volume)
          if (item.vial.reconstitutionVolume) {
            vialVolume = item.vial.reconstitutionVolume;
          } else {
            // Fallback to other volumes if reconstitution volume not available
            vialVolume = item.vial.withdrawVolume || item.vial.volume || 0;
          }
        } else {
          // Default to 'withdrawn' method
          // Priority order for volume calculation:
          // 1. withdrawVolume - actual drawable volume after reconstitution
          // 2. volume - final volume after reconstitution 
          // 3. reconstitutionVolume - volume of diluent added
          if (item.vial.withdrawVolume) {
            // Most accurate - actual volume that can be withdrawn
            vialVolume = item.vial.withdrawVolume;
          } else if (item.vial.volume) {
            // Final volume after reconstitution (includes drug + diluent)
            vialVolume = item.vial.volume;
          } else if (item.vial.reconstitutionVolume) {
            // Volume of diluent added (less accurate due to displacement)
            vialVolume = item.vial.reconstitutionVolume;
          }
        }
        
        if (vialVolume === 0) {
          console.warn(`No volume data found for ${selectedMedicationData.brandName}`, {
            vial: item.vial,
            calculationMethod,
            medicationData: selectedMedicationData
          });
          // Use a default volume if none is found
          if (item.vial.strength && item.vial.concentration) {
            vialVolume = item.vial.strength / item.vial.concentration;
            console.log(`Calculated volume from strength/concentration: ${vialVolume} mL`);
          } else {
            // If still no volume, check if this is a known medication with specific volumes
            const knownVolumes = {
              'CEREZYME': { 400: 10.0, 200: 5.0 },
              'ELELYSO': { 200: 5.0 },
              'FABRAZYME': { 35: 7.0, 5: 1.0 },
              'LUMIZYME': { 50: 10.0 },
              'NEXVIAZYME': { 100: 10.0 },
              'POMBILITI': { 105: 7.0 },
              'VPRIV': { 400: 4.0 },
              'XENPOZYME': { 20: 5.0, 4: 1.0 }
            };
            
            if (knownVolumes[selectedMedicationData.brandName] && 
                knownVolumes[selectedMedicationData.brandName][item.vial.strength]) {
              vialVolume = knownVolumes[selectedMedicationData.brandName][item.vial.strength];
              console.log(`Using known volume for ${selectedMedicationData.brandName}: ${vialVolume} mL`);
            }
          }
        }
        
        totalVolume += item.count * vialVolume;
      });
      
      // Check if medication has special pooling requirements
      if (selectedMedicationData.poolingInstructions) {
        // Some medications require pooling multiple vials which affects total volume
        const totalVialCount = vialCombination.reduce((sum, item) => sum + item.count, 0);
        if (selectedMedicationData.poolingInstructions.minVialsForPooling && 
            totalVialCount >= selectedMedicationData.poolingInstructions.minVialsForPooling) {
          // Apply pooling factor if specified
          if (selectedMedicationData.poolingInstructions.volumeFactor) {
            totalVolume = totalVolume * selectedMedicationData.poolingInstructions.volumeFactor;
          }
        }
      }
      
      // Round to 0.1 mL for precise measurement
      return Math.round(totalVolume * 10) / 10;
    } else {
      // For solutions, calculate based on actual vial volumes
      vialCombination.forEach(item => {
        totalVolume += item.count * (item.vial.volume || 0);
      });
      
      // For solutions, return exact volume to 0.1 mL precision
      // No artificial rounding as exact volumes are clinically important
      return Math.round(totalVolume * 10) / 10;
    }
  }, [selectedMedicationData, calculateVialCombination, calculateSingleDoseVialCombination]);
  
  // Calculate drug removal volume
  const calculateDrugRemovalVolume = useCallback(() => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) return 0;
    
    // Skip removal volume for oral medications
    if (selectedMedicationData.dosageForm === 'oral') return 0;
    
    // Only calculate removal volume when in removeOverfill mode
    if (inputs.infusionMode !== 'removeOverfill') return 0;
    
    // IMPORTANT: Drug removal volume should always use the withdrawn volume,
    // not the reconstitution volume, even when in sterile water mode
    const drugVol = calculateDrugVolume(true, 'withdrawn');
    const bagSize = calculateSalineBagSize();
    
    if (!bagSize) return 0;
    
    const overfill = getOverfillValue(bagSize);
    let volumeToRemove = 0;
    
    // Check for ELAPRASE exception from pump-logic.json
    if (selectedMedication === 'ELAPRASE') {
      // ELAPRASE exception: removeDrugVolume = false, DO NOT remove anything
      volumeToRemove = 0;
      return volumeToRemove;
    }
    
    // Check for VPRIV special rule
    if (selectedMedication === 'VPRIV') {
      // VPRIV: DO NOT remove drug volume or overfill
      volumeToRemove = 0;
      return volumeToRemove;
    }
    
    // NAGLAZYME has special rules based on bag size
    if (selectedMedication === 'NAGLAZYME') {
      if (bagSize === 100) {
        // Do not remove overfill for 100ml bag
        volumeToRemove = 0;
      } else if (bagSize === 250) {
        // Remove drug volume + 30 mL overfill for 250 mL bag
        volumeToRemove = drugVol + 30;
      } else {
        // Standard removal for other bag sizes
        volumeToRemove = drugVol + overfill;
      }
    } else {
      // Check for any other special removal rules
      const specialRule = selectedMedicationData.overfillRules?.specialRule || 
                         selectedMedicationData.salineBagRules?.specialInstructions;
      
      if (specialRule?.includes('DO NOT remove')) {
        volumeToRemove = 0;
      } else {
        // Standard removal: drug volume + overfill volume
        volumeToRemove = drugVol + overfill;
      }
    }
    
    // Round up to nearest 5 mL for easier measurement (per pump-logic.json)
    if (volumeToRemove > 0) {
      volumeToRemove = Math.ceil(volumeToRemove / 5) * 5;
    }
    
    return volumeToRemove;
  }, [selectedMedicationData, inputs.dose, inputs.patientWeight, inputs.infusionMode, 
      calculateDrugVolume, calculateSalineBagSize, getOverfillValue, selectedMedication]);

  // Calculate infusion rate
  const calculateInfusionRate = useCallback((totalVolume, totalTimeMinutes) => {
    if (!totalVolume || !totalTimeMinutes) return 0;
    
    // Base calculation: infusionRate (mL/hr) = totalInfusionVolume ÷ totalTime (min) × 60
    const rate = (totalVolume / totalTimeMinutes) * 60;
    
    // Round DOWN to nearest whole number for safety
    return Math.floor(rate);
  }, []);

  // Calculate infusion steps based on medication protocol or custom steps
  const calculateInfusionSteps = useCallback((totalVolume, totalTimeMinutes, infusionRate) => {
    if (!selectedMedicationData || !totalVolume || !totalTimeMinutes) return [];

    const steps = [];
    const flushVolume = parseFloat(inputs.flushVolume) || 10;
    const flushDuration = Math.round((flushVolume / infusionRate) * 60);

    // If using custom steps, return them as-is
    if (inputs.useCustomSteps && customInfusionSteps.length > 0) {
      customInfusionSteps.forEach((customStep, index) => {
        if (customStep.volume && customStep.duration && customStep.rate) {
          steps.push({
            step: index + 1,
            rate: parseFloat(customStep.rate),
            duration: parseFloat(customStep.duration),
            volume: parseFloat(customStep.volume),
            description: customStep.description || `Step ${index + 1}`
          });
        }
      });

      // Add flush step for custom steps
      steps.push({
        step: steps.length + 1,
        rate: infusionRate,
        duration: flushDuration,
        volume: flushVolume,
        description: 'Flush',
        isFlush: true
      });

      return steps;
    }

    // Original logic for non-custom steps
    const remainingVolume = totalVolume - flushVolume;
    const remainingTime = totalTimeMinutes - flushDuration;

    // If manual infusion rate is provided, force calculate simple steps
    const hasManualRate = inputs.infusionRate && parseFloat(inputs.infusionRate) > 0;
    
    if (hasManualRate) {
      // Force calculate with the provided rate
      steps.push({
        step: 1,
        rate: infusionRate,
        duration: remainingTime,
        volume: remainingVolume,
        description: 'Infusion at specified rate'
      });
    } else {
      // Use medication protocol
      const infusionSteps = selectedMedicationData.infusionSteps;
    
    if (!infusionSteps) {
      // No protocol defined - simple single step + flush
      steps.push({
        step: 1,
        rate: infusionRate,
        duration: remainingTime,
        volume: remainingVolume,
        description: 'Main Infusion'
      });
    } else if (infusionSteps.weightBased && infusionSteps.steps) {
      // Weight-based protocol steps
      const weight = parseFloat(inputs.patientWeight);
      let protocolSteps = [];
      
      // Find matching weight range
      for (const [range, rangeSteps] of Object.entries(infusionSteps.steps)) {
        if (range.includes('≤') && weight <= parseFloat(range.match(/\d+/)[0])) {
          protocolSteps = rangeSteps;
          break;
        } else if (range.includes('>') && weight > parseFloat(range.match(/\d+/)[0])) {
          protocolSteps = rangeSteps;
          break;
        }
      }

      if (protocolSteps.length > 0) {
        let volumeUsed = 0;
        let timeUsed = 0;

        protocolSteps.forEach((step, index) => {
          if (step.duration === 'remainder') {
            // Last non-flush step uses remaining volume and time
            const stepVolume = remainingVolume - volumeUsed;
            const stepDuration = remainingTime - timeUsed;
            const stepRate = step.rate || Math.round((stepVolume / stepDuration) * 60);
            
            steps.push({
              step: index + 1,
              rate: stepRate,
              duration: stepDuration,
              volume: Math.round(stepVolume * 10) / 10,
              description: step.description || `Step ${index + 1}`
            });
          } else {
            // Fixed duration step
            const stepDuration = step.duration;
            const stepRate = step.rate || infusionRate;
            const stepVolume = (stepRate * stepDuration) / 60;
            
            steps.push({
              step: index + 1,
              rate: stepRate,
              duration: stepDuration,
              volume: Math.round(stepVolume * 10) / 10,
              description: step.description || `Step ${index + 1}`
            });
            
            volumeUsed += stepVolume;
            timeUsed += stepDuration;
          }
        });
      } else {
        // No matching protocol - use constant rate
        steps.push({
          step: 1,
          rate: infusionRate,
          duration: remainingTime,
          volume: remainingVolume,
          description: 'Main Infusion'
        });
      }
    } else if (infusionSteps.steps && Array.isArray(infusionSteps.steps)) {
      // Non-weight-based protocol steps
      let volumeUsed = 0;
      let timeUsed = 0;

      infusionSteps.steps.forEach((step, index) => {
        if (step.duration === 'remainder') {
          const stepVolume = remainingVolume - volumeUsed;
          const stepDuration = remainingTime - timeUsed;
          const stepRate = step.rate || Math.round((stepVolume / stepDuration) * 60);
          
          steps.push({
            step: index + 1,
            rate: stepRate,
            duration: stepDuration,
            volume: Math.round(stepVolume * 10) / 10,
            description: step.description || `Step ${index + 1}`
          });
        } else {
          const stepDuration = step.duration;
          const stepRate = step.rate || infusionRate;
          const stepVolume = (stepRate * stepDuration) / 60;
          
          steps.push({
            step: index + 1,
            rate: stepRate,
            duration: stepDuration,
            volume: Math.round(stepVolume * 10) / 10,
            description: step.description || `Step ${index + 1}`
          });
          
          volumeUsed += stepVolume;
          timeUsed += stepDuration;
        }
      });
    } else if (infusionSteps.defaultInfusion) {
      // Simple constant rate infusion
      steps.push({
        step: 1,
        rate: infusionRate,
        duration: remainingTime,
        volume: remainingVolume,
        description: infusionSteps.defaultInfusion.method || 'Constant Rate'
      });
    } else {
      // No specific protocol - use constant rate
      steps.push({
        step: 1,
        rate: infusionRate,
        duration: remainingTime,
        volume: remainingVolume,
        description: 'Main Infusion'
      });
    }
    } // Close the else block for manual rate check

    // Always add flush step as the last step
    steps.push({
      step: steps.length + 1,
      rate: infusionRate,
      duration: flushDuration,
      volume: flushVolume,
      description: 'Flush',
      isFlush: true
    });

    // Validate that volumes and times add up correctly
    const totalStepVolume = steps.reduce((sum, step) => sum + step.volume, 0);
    const totalStepTime = steps.reduce((sum, step) => sum + step.duration, 0);
    
    // If there's a small discrepancy due to rounding, adjust the last non-flush step
    if (Math.abs(totalStepVolume - totalVolume) > 0.1 || Math.abs(totalStepTime - totalTimeMinutes) > 1) {
      const lastMainStep = steps[steps.length - 2];
      if (lastMainStep) {
        lastMainStep.volume = Math.round((lastMainStep.volume + (totalVolume - totalStepVolume)) * 10) / 10;
        lastMainStep.duration = lastMainStep.duration + (totalTimeMinutes - totalStepTime);
      }
    }

    return steps;
  }, [selectedMedicationData, inputs.patientWeight, inputs.flushVolume, inputs.infusionRate, inputs.useCustomSteps, customInfusionSteps]);

  // Check if calculator can be run
  const canCalculate = () => {
    return !!(
      selectedMedication &&
      inputs.patientWeight &&
      parseFloat(inputs.patientWeight) > 0 &&
      inputs.dose &&
      parseFloat(inputs.dose) > 0 &&
      inputs.totalInfusionVolume &&
      parseFloat(inputs.totalInfusionVolume) > 0 &&
      ((parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + (parseInt(inputs.totalInfusionTime.minutes) || 0)) > 0
    );
  };

  const canCalculateFixed = () => {
    return canCalculate() && inputs.infusionRate && parseFloat(inputs.infusionRate) > 0;
  };

  const canCalculateCustom = () => {
    return canCalculate();
  };

  // Validate inputs
  const validateInputs = () => {
    const newErrors = {};

    if (!selectedMedication) {
      newErrors.medication = 'Please select a medication';
    }

    if (!inputs.patientWeight || parseFloat(inputs.patientWeight) <= 0) {
      newErrors.patientWeight = 'Please enter a valid patient weight';
    }

    if (!inputs.dose || parseFloat(inputs.dose) <= 0) {
      newErrors.dose = 'Please enter a valid dose';
    }

    if (!inputs.totalInfusionVolume || parseFloat(inputs.totalInfusionVolume) <= 0) {
      newErrors.totalInfusionVolume = 'Please enter a valid infusion volume';
    }

    const totalMinutes = (parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + 
                        (parseInt(inputs.totalInfusionTime.minutes) || 0);
    if (totalMinutes <= 0) {
      newErrors.totalInfusionTime = 'Please enter a valid infusion time';
    } else if (totalMinutes > 1440) { // More than 24 hours
      newErrors.totalInfusionTime = 'Infusion time cannot exceed 24 hours';
    } else if (parseInt(inputs.totalInfusionTime.minutes) > 59) {
      newErrors.totalInfusionTime = 'Minutes cannot exceed 59';
    }

    // Validate infusion rate is mandatory
    if (!inputs.infusionRate || parseFloat(inputs.infusionRate) <= 0) {
      newErrors.infusionRate = 'Please enter a valid infusion rate';
    }

    // Validate custom steps if enabled
    if (inputs.useCustomSteps) {
      const validation = validateCustomSteps();
      if (!validation.isAcceptable) {
        if (!validation.volumeValid) {
          newErrors.customSteps = validation.totalVolumeError || 'Total volume of custom steps must equal total infusion volume';
        } else if (!validation.durationValid) {
          newErrors.customSteps = validation.totalDurationError || 'Total duration of custom steps must equal total infusion time';
        } else if (validation.stepsValid.some(step => !step.isValid)) {
          newErrors.customSteps = 'All custom steps must have valid rate, duration, and volume that match the formula';
        } else {
          newErrors.customSteps = 'Custom steps validation failed';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Calculate pump settings
  const calculatePumpSettings = (isFixedRate = false) => {
    if (!validateInputs()) {
      return;
    }
    
    // Set the calculation type
    setIsFixedRateCalculation(isFixedRate);

    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    const totalVolume = parseFloat(inputs.totalInfusionVolume);
    const primeVolume = parseFloat(inputs.primeVolume) || 10;
    const flushVolume = parseFloat(inputs.flushVolume) || 10;
    const totalMinutes = (parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + 
                        (parseInt(inputs.totalInfusionTime.minutes) || 0);

    // Calculate prescribed dose
    let prescribedDose;
    if (inputs.doseUnit.includes('/kg')) {
      prescribedDose = dose * weight;
    } else {
      prescribedDose = dose;
    }

    // Get vial combination and calculate drug volume
    const vialCombination = calculateVialCombination();
    // Drug volume should always be calculated for single dose only, not total doses
    // NOTE: For pump settings, we always use withdrawn volume regardless of UI toggle
    const drugVolume = calculateDrugVolume(true, 'withdrawn');
    
    // Calculate total vials and actual dose
    let totalVials = 0;
    let actualDose = 0;
    
    if (vialCombination) {
      vialCombination.forEach(item => {
        totalVials += item.count;
        actualDose += item.count * item.vial.strength;
      });
    }

    // Get saline bag size and overfill
    const bagSize = calculateSalineBagSize() || totalVolume;
    const overfillValue = getOverfillValue(bagSize);

    // Calculate volumes based on infusion mode
    let volumeToRemove = 0;
    let salineVolume = 0;
    let finalVolume = totalVolume;

    if (inputs.infusionMode === 'removeOverfill') {
      // Use the centralized calculateDrugRemovalVolume function
      volumeToRemove = calculateDrugRemovalVolume();
      salineVolume = bagSize;
      finalVolume = bagSize; // Total infusion volume remains the original bag size
    } else {
      // Add to empty bag mode
      salineVolume = totalVolume - drugVolume;
      finalVolume = totalVolume;
    }

    // Use manual infusion rate
    const infusionRate = parseFloat(inputs.infusionRate);

    // Calculate infusion steps
    const infusionSteps = calculateInfusionSteps(totalVolume, totalMinutes, infusionRate);

    // Calculate concentration
    const concentration = actualDose / finalVolume;

    // Format total time
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalTimeFormatted = `${hours}h ${minutes}min`;

    setResults({
      prescribedDose,
      actualDose,
      doseUnit: inputs.doseUnit,
      totalVials,
      vialCombination,
      drugVolume,
      salineVolume,
      volumeToRemove,
      bagSize,
      overfillValue,
      finalVolume,
      concentration,
      primeVolume,
      flushVolume,
      infusionRate,
      infusionSteps,
      totalTimeMinutes: totalMinutes,
      totalTimeFormatted
    });

    setShowResults(true);
  };

  // Handle calculate button click
  const handleCalculate = () => {
    // Validate required fields
    if (!selectedMedicationData || !inputs.patientWeight || !inputs.dose) {
      alert('Please fill in all required fields: Medication, Patient Weight, and Prescribed Dose');
      return;
    }

    // Set expanded sections to show results
    setExpandedSections(prev => ({
      ...prev,
      results: true
    }));

    // The calculation logic is already triggered by the useEffect hooks
    // when all required inputs are filled
  };



  // Helper function to calculate using auto mode logic for custom vials
  const calculateCustomVialMetrics = (customCounts) => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) {
      return { totalDrug: 0, daysCovered: 0, waste: 0, wastePercentage: 0, hasWaste: false };
    }

    // Use the same dose calculation logic as auto mode
    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    const doseFrequency = parseFloat(inputs.doseFrequency) || 1;
    const daysSupply = parseFloat(inputs.daysSupply) || 1;
    
    let singleDose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    } else {
      singleDose = dose;
    }

    // Calculate total dose needed using auto mode logic
    const totalDoseNeeded = singleDose * doseFrequency * daysSupply;

    // Calculate total drug available from custom vials
    let totalDrugAvailable = 0;
    Object.entries(customCounts).forEach(([vialId, count]) => {
      const vialCount = parseInt(count) || 0;
      if (vialCount > 0 && selectedMedicationData?.vialSizes) {
        // Filter out non-injectable forms (same as auto mode)
        const vial = selectedMedicationData.vialSizes.find(v => 
          `${v.strength}-${v.unit}` === vialId && 
          (!v.form || (v.form !== 'capsule' && v.form !== 'tablet'))
        );
        if (vial && vial.strength) {
          totalDrugAvailable += parseFloat(vial.strength) * vialCount;
        }
      }
    });

    // Calculate days covered using auto mode logic
    const dailyDose = singleDose * doseFrequency;
    const daysCovered = dailyDose > 0 ? Math.floor(totalDrugAvailable / dailyDose) : 0;

    // Calculate waste using auto mode logic
    const waste = Math.max(0, totalDrugAvailable - totalDoseNeeded);
    const wastePercentage = totalDrugAvailable > 0 ? (waste / totalDrugAvailable) * 100 : 0;

    return {
      totalDrug: totalDrugAvailable,
      daysCovered,
      waste: Math.round(waste * 100) / 100,
      wastePercentage: Math.round(wastePercentage * 10) / 10,
      hasWaste: waste > 0
    };
  };


  // Handle keyboard navigation for medication dropdown
  const handleMedicationKeyDown = (e) => {
    if (!showMedicationDropdown) return;

    const medications = filteredMedicationsDropdown;
    const maxIndex = medications.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedMedicationIndex(prev => Math.min(prev + 1, maxIndex));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedMedicationIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (medications[focusedMedicationIndex]) {
          const med = medications[focusedMedicationIndex];
          setSelectedMedication(med.key);
          handleInputChange('selectedMedication', med.key);
          setShowMedicationDropdown(false);
          setMedicationSearchTerm('');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowMedicationDropdown(false);
        setMedicationSearchTerm('');
        break;
      default:
        // Don't prevent default for other keys - let the input handle normal typing
        break;
    }
  };

  // Reset focused index when search term changes
  useEffect(() => {
    setFocusedMedicationIndex(0);
  }, [medicationSearchTerm]);

  // Scroll focused item into view
  useEffect(() => {
    if (showMedicationDropdown) {
      const focusedElement = document.querySelector('.medication-option.focused');
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedMedicationIndex, showMedicationDropdown]);

  // Reset calculator
  const resetCalculator = () => {
    // Reset all input fields
    setInputs({
      selectedMedication: '',
      patientWeight: '',
      dose: '',
      doseUnit: 'mg/kg',
      doseFrequency: '',
      vialSize: '',
      bagVolume: '',
      flushVolume: '',
      overfillVolume: '', 
      totalInfusionVolume: '',
      totalInfusionTime: { hours: '', minutes: '' },
      infusionMode: 'removeOverfill',
      infusionRate: '',
      useCustomSteps: false
    });
    
    // Reset sections
    setExpandedSections({
      medicationSetup: true,
      doseCalculation: false,
      infusionParameters: false,
      results: false
    });
    
    // Reset medication selection
    setSelectedMedication(null);
    
    // Reset calculation results
    setResults(null);
    setShowResults(false);
    setIsFixedRateCalculation(false);
    
    // Reset errors
    setErrors({});
    
    // Reset dose safety
    setDoseSafety({ classification: 'unknown', ratio: 0, color: '#6c757d' });
    
    // Reset custom infusion steps
    setCustomInfusionSteps([
      { id: 1, rate: '', duration: '', volume: '', description: 'Flush', isFlush: true }
    ]);
    setCustomStepsValidation({
      volumeValid: false,
      durationValid: false,
      stepsValid: []
    });
    
    // Reset other states
    setFixedInfusionError('');
    setSelectedVialSize(null);
    setSelectedSpecialDosing(null);
    setShowVialCombinations(false);
    setVolumeCalculationMethod('withdrawn');
    setVialCombinationMode('auto');
    updateCustomVialCounts({});
    setShowCustomInput(false);
  };

  // Format number
  const formatNumber = (num, decimals = 1) => {
    return Number(num).toFixed(decimals);
  };


  return (
    <div className="pump-calculator-container">
      <div className="pump-calculator-full-width">
        {/* Medication Setup Section */}
        <div className="calculator-section">
          <div className="section-header">
            <Pill size={20} />
            <h3>Medication Setup</h3>
          </div>
          <div className="section-content">
            <div className="setup-grid">
              {/* Medication Selection - Dropdown Menu Design */}
              <div className="medication-selection-full">
                <label className="section-label">
                  <FlaskConical size={16} />
                  Select Medication
                </label>
                <div className={`medication-dropdown-wrapper ${showMedicationDropdown ? 'dropdown-open' : ''}`} ref={medicationDropdownRef}>
                  <div 
                    className={`medication-custom-dropdown ${errors.medication ? 'error' : ''} ${showMedicationDropdown ? 'open' : ''}`}
                    onClick={() => setShowMedicationDropdown(!showMedicationDropdown)}
                    onKeyDown={handleMedicationKeyDown}
                    tabIndex={0}
                  >
                    <div className="medication-dropdown-display">
                      {selectedMedication ? (
                        <span>
                          {pumpDatabase.medications[selectedMedication].brandName} - {pumpDatabase.medications[selectedMedication].genericName || pumpDatabase.medications[selectedMedication].indication}
                        </span>
                      ) : (
                        <span className="placeholder">Choose medication...</span>
                      )}
                    </div>
                    <ChevronDown size={20} className={`dropdown-chevron ${showMedicationDropdown ? 'open' : ''}`} />
                  </div>
                  
                  {showMedicationDropdown && (
                    <div className="medication-dropdown-menu">
                      <div className="medication-search-wrapper">
                        <Search size={16} />
                        <input
                          type="text"
                          placeholder="Search medications..."
                          value={medicationSearchTerm}
                          onChange={(e) => setMedicationSearchTerm(e.target.value)}
                          className="medication-search-input"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={handleMedicationKeyDown}
                          autoFocus
                        />
                      </div>
                      <div className="medication-options-list">
                        {filteredMedicationsDropdown.map((med, index) => (
                          <div
                            key={med.key}
                            className={`medication-option ${selectedMedication === med.key ? 'selected' : ''} ${index === focusedMedicationIndex ? 'focused' : ''}`}
                            onClick={() => {
                              setSelectedMedication(med.key);
                              handleInputChange('selectedMedication', med.key);
                              setShowMedicationDropdown(false);
                              setMedicationSearchTerm('');
                            }}
                            onMouseEnter={() => setFocusedMedicationIndex(index)}
                          >
                            <div className="medication-option-content">
                              <span className="medication-option-name">
                                {med.brandName} - {med.genericName || med.indication}
                              </span>
                              <div className="medication-option-tags">
                                {med.hasMultipleVials && (
                                  <span className="medication-tag vial-tag">Multiple Vials</span>
                                )}
                                {med.hasSpecialDosing && (
                                  <span className="medication-tag dosing-tag">Special Dosing</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.medication && <span className="error-text">{errors.medication}</span>}
              </div>
              
              {/* Xenpozyme Weight Adjustment Notice */}
              {selectedMedication === 'XENPOZYME' && (selectedMedicationData?.standardDose?.weightAdjustment || inputs.patientWeight) && (
                <div className="xenpozyme-weight-notice">
                  <div className="weight-adjustment-header">
                    <Settings size={16} />
                    <span>Weight Adjustment for XENPOZYME</span>
                  </div>
                  <div className="weight-adjustment-content">
                    {parseFloat(inputs.patientWeight) > 0 && (
                      <div className="weight-status">
                        <span className="weight-label">Patient Weight:</span>
                        <span className="weight-value">{inputs.patientWeight} kg</span>
                        <span className="weight-rule">
                          {parseFloat(inputs.patientWeight) < 30 
                            ? '→ Use Actual Body Weight' 
                            : '→ Use Adjusted Body Weight'}
                        </span>
                      </div>
                    )}
                    <div className="weight-adjustment-rules">
                      <div className="rule-item">
                        <span className="rule-condition">If weight &lt; 30 kg:</span>
                        <span className="rule-action">Use actual body weight</span>
                      </div>
                      <div className="rule-item">
                        <span className="rule-condition">If weight ≥ 30 kg:</span>
                        <span className="rule-action">Use adjusted body weight</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Medication info cards - Using param-card design */}
              {selectedMedicationData && (
                <div className="additional-params-cards">
                  {/* Standard Dose */}
                  <div className="param-card">
                    <div className="param-card-icon">
                      <Activity size={20} />
                      <label className="param-card-label">Standard Dose</label>
                    </div>
                    <input
                      type="text"
                      value={(() => {
                        const dose = selectedMedicationData.standardDose;
                        if (!dose) return 'N/A';
                        // For medications with maintenance dose (like XENPOZYME)
                        if (dose.maintenanceDose) return `${dose.maintenanceDose} ${dose.unit || ''}`;
                        // For medications with standard value
                        if (dose.value) return `${dose.value} ${dose.unit || ''}`;
                        return 'N/A';
                      })()}
                      readOnly
                      className="supply-input"
                      style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                      title={selectedMedicationData.standardDose ? 
                        (selectedMedicationData.standardDose.frequency || 'Standard dose') : 
                        'No dose data'}
                    />
                  </div>

                  {/* Vial Size */}
                  <div className="param-card vial-size-card">
                    <div className="param-card-icon">
                      <FlaskConical size={20} />
                      <label className="param-card-label">
                        Vial Size
                        {selectedMedicationData.vialSizes?.length > 1 && (
                          <span className="vial-count-badge">{selectedMedicationData.vialSizes.length}</span>
                        )}
                      </label>
                    </div>
                    <div className="vial-size-input-wrapper" ref={vialDropdownRef}>
                      <input
                        type="text"
                        value={(() => {
                          if (selectedVialSize) {
                            return `${selectedVialSize.strength} ${selectedVialSize.unit}${selectedVialSize.volume ? ` (${selectedVialSize.volume} mL)` : ''}`;
                          } else if (selectedMedicationData.vialSizes?.length === 1) {
                            const vial = selectedMedicationData.vialSizes[0];
                            return `${vial.strength} ${vial.unit}${vial.volume ? ` (${vial.volume} mL)` : ''}`;
                          } else if (selectedMedicationData.vialSizes?.length > 1) {
                            return `Select from ${selectedMedicationData.vialSizes.length} sizes`;
                          }
                          return 'N/A';
                        })()}
                        readOnly
                        className={`supply-input ${selectedMedicationData.vialSizes?.length > 1 ? 'has-dropdown' : ''}`}
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)', 
                          cursor: selectedMedicationData.vialSizes?.length > 1 ? 'pointer' : 'not-allowed',
                          paddingRight: selectedMedicationData.vialSizes?.length > 1 ? '40px' : '12px'
                        }}
                        onClick={() => {
                          if (selectedMedicationData.vialSizes?.length > 1) {
                            setShowVialSizeDropdown(!showVialSizeDropdown);
                          }
                        }}
                        title={(() => {
                          if (selectedMedicationData.vialSizes?.length > 1) {
                            return 'Click to select vial size';
                          } else if (selectedMedicationData.vialSizes?.length === 1) {
                            const vial = selectedMedicationData.vialSizes[0];
                            return `${vial.strength} ${vial.unit}${vial.volume ? ` - Volume: ${vial.volume} mL` : ''}`;
                          }
                          return 'No vial data';
                        })()}
                      />
                      {selectedMedicationData.vialSizes?.length > 1 && (
                        <div 
                          className={`vial-dropdown-arrow ${showVialSizeDropdown ? 'open' : ''}`}
                          onClick={() => setShowVialSizeDropdown(!showVialSizeDropdown)}
                        >
                          <ChevronDown size={16} />
                        </div>
                      )}
                      {showVialSizeDropdown && selectedMedicationData.vialSizes?.length > 1 && (
                        <div className="vial-size-dropdown">
                          {selectedMedicationData.vialSizes.map((vial, index) => (
                            <div 
                              key={index} 
                              className={`vial-option ${selectedVialSize?.strength === vial.strength ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedVialSize(vial);
                                handleInputChange('vialSize', vial);
                                setShowVialSizeDropdown(false);
                              }}
                            >
                              <div className="vial-option-content">
                                <span className="vial-strength">{vial.strength} {vial.unit}</span>
                                {vial.volume && (
                                  <span className="vial-volume">Volume: {vial.volume} mL</span>
                                )}
                              </div>
                              {selectedVialSize?.strength === vial.strength && (
                                <Check size={16} className="vial-selected-icon" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overfill Value */}
                  <div className="param-card">
                    <div className="param-card-icon">
                      <Droplets size={20} />
                      <label className="param-card-label">Overfill Value (mL)</label>
                    </div>
                    <input
                      type="text"
                      value={(() => {
                        const bagSize = calculateSalineBagSize();
                        if (!bagSize) return 'N/A';
                        const overfill = getOverfillValue(bagSize);
                        return `${overfill} mL`;
                      })()}
                      readOnly
                      className="supply-input"
                      style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                      title={(() => {
                        if (!calculateSalineBagSize()) return 'No overfill';
                        
                        const bagSize = calculateSalineBagSize();
                        const overfillRule = selectedMedicationData?.overfillRules?.specialRule;
                        
                        if (overfillRule) {
                          return overfillRule;
                        }
                        
                        return `Standard overfill for ${bagSize} mL bag`;
                      })()}
                    />
                  </div>

                  {/* Saline/D5W Bag Size */}
                  <div className="param-card">
                    <div className="param-card-icon">
                      <Package size={20} />
                      <label className="param-card-label">
                        {selectedMedicationData?.salineBagRules?.specialInstructions?.includes('D5W') ? 'D5W' : 'NS'} Bag Size (mL)
                      </label>
                    </div>
                    <input
                      type="text"
                      value={(() => {
                        const bagSize = calculateSalineBagSize();
                        return bagSize ? `${bagSize} mL` : 'N/A';
                      })()}
                      readOnly
                      className="supply-input"
                      style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                      title={(() => {
                        if (!calculateSalineBagSize()) return 'Enter weight';
                        
                        const weight = parseFloat(inputs.patientWeight);
                        const rules = selectedMedicationData?.salineBagRules;
                        
                        if (rules?.fixed) {
                          return `Fixed ${rules.bagSize} mL for all weights`;
                        }
                        
                        if (rules?.weightBased && rules.rules) {
                          const matchedRule = rules.rules.find(rule => 
                            weight >= rule.minWeight && 
                            (rule.maxWeight === null || weight <= rule.maxWeight)
                          );
                          if (matchedRule?.description) {
                            return matchedRule.description;
                          }
                        }
                        
                        return `${calculateSalineBagSize()} mL bag`;
                      })()}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dose Calculation Section */}
        <div className="calculator-section">
          <div className="section-header">
            <Calculator size={20} />
            <h3>Dose Calculation</h3>
          </div>
          <div className="section-content">
            <div className="dose-grid">
              {/* All dose fields in one row - professional design matching infusion parameters */}
              <div className="dose-fields-row all-in-one-row">
                {/* Prescribed Dose - Professional Design */}
                <div className="dose-card prescribed-dose-card">
                  <label className="section-label">
                    <Pill size={16} />
                    Prescribed Dose
                  </label>
                  <div className="professional-dose-input">
                    <div className="dose-input-container">
                      <div className="dose-input-field">
                        <input
                          type="number"
                          value={inputs.dose}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 99999)) {
                              handleInputChange('dose', value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleInputChange('dose', '');
                            }
                          }}
                          placeholder="0"
                          className={`dose-value-input ${errors.dose ? 'error' : ''}`}
                          min="0"
                          max="99999"
                          step="0.1"
                        />
                        <div className="dose-unit-selector">
                          <select
                            value={inputs.doseUnit}
                            onChange={(e) => handleInputChange('doseUnit', e.target.value)}
                            className="dose-unit-dropdown"
                            tabIndex="-1"
                          >
                            {availableDoseUnits.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="unit-dropdown-icon" />
                        </div>
                      </div>
                    </div>
                    {/* Dose display preview */}
                    <div className="dose-display-preview">
                      <Pill size={14} className="preview-icon" />
                      <span className="preview-value">
                        {inputs.dose ? `${inputs.dose} ${inputs.doseUnit}` : 'Not set'}
                      </span>
                    </div>
                  </div>
                  {errors.dose && <span className="error-text">{errors.dose}</span>}
                </div>

                {/* Patient Weight - Moved from medication section */}
                <div className="dose-card patient-weight-card">
                  <label className="section-label">
                    <User size={16} />
                    Patient Weight
                  </label>
                  <div className="professional-dose-input">
                    <div className="dose-input-container">
                      <div className="dose-input-field">
                        <input
                          type="number"
                          value={inputs.patientWeight}
                          onChange={(e) => handleInputChange('patientWeight', e.target.value)}
                          placeholder="0"
                          className={`dose-value-input ${errors.patientWeight ? 'error' : ''}`}
                          step="0.1"
                          min="0"
                          max="999"
                        />
                        <span className="dose-unit">kg</span>
                      </div>
                    </div>
                    {/* Weight display preview */}
                    <div className="dose-display-preview">
                      <User size={14} className="preview-icon" />
                      <span className="preview-value">
                        {inputs.patientWeight ? `${inputs.patientWeight} kg` : 'Not entered'}
                      </span>
                    </div>
                  </div>
                  {errors.patientWeight && <span className="error-text">{errors.patientWeight}</span>}
                </div>

                {/* Dose Frequency - Professional Design */}
                <div className="dose-card dose-frequency-card">
                  <label className="section-label">
                    <Clock size={16} />
                    Dose Frequency
                  </label>
                  <div className="professional-frequency-input">
                    <div className="frequency-input-container">
                      <div className="frequency-input-field">
                        <input
                          type="number"
                          value={inputs.doseFrequency}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 999)) {
                              handleInputChange('doseFrequency', value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleInputChange('doseFrequency', '');
                            }
                          }}
                          placeholder="0"
                          className={`frequency-value-input ${errors.doseFrequency ? 'error' : ''}`}
                          min="0"
                          max="999"
                          step="1"
                        />
                        <span className="frequency-unit">DAYS</span>
                      </div>
                    </div>
                    {/* Frequency display preview */}
                    <div className="frequency-display-preview">
                      <Clock size={14} className="preview-icon" />
                      <span className="preview-value">
                        {inputs.doseFrequency ? `Every ${inputs.doseFrequency} day${inputs.doseFrequency === '1' ? '' : 's'}` : 'Not specified'}
                      </span>
                    </div>
                  </div>
                  {errors.doseFrequency && <span className="error-text">{errors.doseFrequency}</span>}
                </div>

                {/* Days Supply - Professional Design */}
                <div className="dose-card days-supply-card">
                  <label className="section-label">
                    <Package size={16} />
                    Days Supply
                  </label>
                  <div className="professional-days-input">
                    <div className="days-input-container">
                      <div className="days-input-field">
                        <input
                          type="number"
                          value={inputs.daysSupply}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 999)) {
                              handleInputChange('daysSupply', value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleInputChange('daysSupply', '');
                            }
                          }}
                          placeholder="0"
                          className={`days-value-input ${errors.daysSupply ? 'error' : ''}`}
                          min="0"
                          max="999"
                          step="1"
                        />
                        <span className="days-unit">DAYS</span>
                      </div>
                    </div>
                    {/* Days supply display preview */}
                    <div className="days-display-preview">
                      <Package size={14} className="preview-icon" />
                      <span className="preview-value">
                        {inputs.daysSupply ? `${inputs.daysSupply} day${inputs.daysSupply === '1' ? '' : 's'} supply` : 'Not specified'}
                      </span>
                    </div>
                  </div>
                  {errors.daysSupply && <span className="error-text">{errors.daysSupply}</span>}
                </div>
              </div>

              {/* Dose Safety Indicator */}
              {selectedMedicationData && (
                <div className="dose-item dose-safety-section">
                  <label className="section-label">
                    <Shield size={16} />
                    Dose Safety
                  </label>
                  <DoseSafetyIndicator 
                    key={`${selectedMedication}-${selectedSpecialDosing?.id || 'none'}-${inputs.dose}-${inputs.doseUnit}`}
                    doseSafety={doseSafety} 
                    standardDose={selectedMedicationData?.standardDose}
                    specialDosingOptions={getSpecialDosingOptions()}
                    selectedSpecialDosing={selectedSpecialDosing}
                    onSpecialDosingChange={setSelectedSpecialDosing}
                    patientWeight={inputs.patientWeight}
                    actualDose={(parseFloat(inputs.dose) || 0).toFixed(2)}
                    actualDoseUnit={inputs.doseUnit}
                    correctDose={calculateCorrectDose()}
                  />
                </div>
              )}

              {/* Infusion Parameters Section Header */}
              <div className="parameters-divider">
                <Activity size={18} />
                <h4>Infusion Parameters</h4>
              </div>

              {/* Infusion Parameters Cards */}
              <div className="infusion-params-cards">
                {/* Total Infusion Time - Professional Design */}
                <div className="dose-card time-input-card">
                  <label className="section-label">
                    <Clock size={16} />
                    Total Infusion Time
                  </label>
                  <div className="professional-time-input">
                    <div className="time-input-container">
                      <div className="time-input-field">
                        <input
                          type="number"
                          value={inputs.totalInfusionTime.hours}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 99)) {
                              handleTimeChange('hours', value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleTimeChange('hours', '0');
                            }
                          }}
                          placeholder="00"
                          className={`time-value-input ${errors.totalInfusionTime ? 'error' : ''}`}
                          min="0"
                          max="99"
                          maxLength="2"
                        />
                        <span className="time-unit">HR</span>
                      </div>
                      <div className="time-separator">
                        <span className="separator-dot"></span>
                        <span className="separator-dot"></span>
                      </div>
                      <div className="time-input-field">
                        <input
                          type="number"
                          value={inputs.totalInfusionTime.minutes}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                              handleTimeChange('minutes', value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleTimeChange('minutes', '0');
                            }
                          }}
                          placeholder="00"
                          className={`time-value-input ${errors.totalInfusionTime ? 'error' : ''}`}
                          min="0"
                          max="59"
                          maxLength="2"
                        />
                        <span className="time-unit">MIN</span>
                      </div>
                    </div>
                    {/* Time display preview */}
                    <div className="time-display-preview">
                      <span className="preview-label">Total:</span>
                      <span className="preview-value">
                        {(parseInt(inputs.totalInfusionTime.hours) || 0).toString().padStart(2, '0')}:
                        {(parseInt(inputs.totalInfusionTime.minutes) || 0).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  {errors.totalInfusionTime && <span className="error-text">{errors.totalInfusionTime}</span>}
                </div>

                {/* Total Infusion Volume - Professional Design */}
                <div className="dose-card volume-input-card">
                  <label className="section-label">
                    <Droplets size={16} />
                    Total Infusion Volume
                  </label>
                  <div className="professional-volume-input">
                    <div className="volume-input-container">
                      <div className="volume-input-field">
                        <input
                          type="number"
                          value={inputs.totalInfusionVolume}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 9999)) {
                              handleInputChange('totalInfusionVolume', value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleInputChange('totalInfusionVolume', '');
                            }
                          }}
                          placeholder="0"
                          className={`volume-value-input ${errors.totalInfusionVolume ? 'error' : ''}`}
                          min="0"
                          max="9999"
                          step="0.1"
                        />
                        <span className="volume-unit">mL</span>
                      </div>
                    </div>
                    {/* Volume display with icon */}
                    <div className="volume-display-preview">
                      <Droplets size={14} className="preview-icon" />
                      <span className="preview-value">
                        {inputs.totalInfusionVolume || '0'} mL
                      </span>
                    </div>
                  </div>
                  {errors.totalInfusionVolume && <span className="error-text">{errors.totalInfusionVolume}</span>}
                </div>

                {/* Infusion Rate - Professional Design */}
                <div className="dose-card rate-input-card">
                  <label className="section-label">
                    <Activity size={16} />
                    Infusion Rate <span className="required-asterisk">*</span>
                  </label>
                  <div className="professional-rate-input">
                    <div className="rate-input-container">
                      <div className="rate-input-field">
                        <input
                          type="number"
                          value={inputs.infusionRate}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                              handleInputChange('infusionRate', value);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              handleInputChange('infusionRate', '');
                            }
                          }}
                          placeholder="0"
                          className={`rate-value-input ${errors.infusionRate ? 'error' : ''}`}
                          min="0"
                          max="999"
                          step="0.1"
                        />
                        <span className="rate-unit">mL/hr</span>
                      </div>
                    </div>
                    {/* Rate display with calculation hint */}
                    <div className="rate-display-preview">
                      <Activity size={14} className="preview-icon" />
                      <span className="preview-value">
                        {inputs.infusionRate ? `${inputs.infusionRate} mL/hr` : 'Not set'}
                      </span>
                    </div>
                  </div>
                  {errors.infusionRate && <span className="error-text">{errors.infusionRate}</span>}
                </div>
              </div>

              {/* Calculated Values Cards - Professional Design */}
              {inputs.dose && inputs.patientWeight && selectedMedicationData && selectedMedicationData.dosageForm !== 'oral' && (
                <div className="infusion-params-cards">
                  {/* Total Vials Card - Professional Design */}
                  <div className="dose-card total-vials-calc-card">
                    <label className="section-label">
                      <Package size={16} />
                      Total Vials Required
                    </label>
                    <div className="professional-volume-input">
                      <div className="volume-input-container">
                        <div className="volume-input-field">
                          <div className="calc-value-display">
                            <span className="calc-value-number">
                              {(() => {
                                const allCombinations = calculateAllVialCombinations();
                                if (!allCombinations || allCombinations.length === 0) return '0';
                                return allCombinations[0].totalVials;
                              })()}
                            </span>
                            <span className="volume-unit">VIALS</span>
                          </div>
                          {/* Days Coverage Indicator */}
                          {inputs.daysSupply && (
                            <div className="days-coverage-inline">
                              <Clock size={11} />
                              <span>{inputs.daysSupply} days</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Vial combination preview */}
                      <div className="volume-display-preview">
                        <Package size={14} className="preview-icon" />
                        <span className="preview-value">
                          {(() => {
                            const allCombinations = calculateAllVialCombinations();
                            if (!allCombinations || allCombinations.length === 0) return 'No vials';
                            
                            const optimalCombo = allCombinations[0];
                            
                            // Show individual vial counts
                            return optimalCombo.combination.map((item, idx) => (
                              <span key={idx} className="vial-count-item">
                                {idx > 0 ? ' + ' : ''}
                                {item.count} × {item.vial.strength}{item.vial.unit}
                              </span>
                            )).reduce((acc, curr) => [...acc, curr], []);
                          })()}
                        </span>
                      </div>
                      {/* Calculate Days Coverage Button - Professional Design */}
                      <button
                        type="button"
                        className="professional-action-btn calculate-days-coverage-btn"
                        onClick={() => setShowVialInputModal(true)}
                        disabled={!selectedMedicationData || !inputs.dose || !inputs.patientWeight}
                      >
                        <div className="btn-icon-wrapper">
                          <Calendar size={20} />
                        </div>
                        <div className="btn-content">
                          <span className="btn-label">Calculate Days Coverage</span>
                          <span className="btn-description">Calculate supply duration from vials</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Drug Volume Card - Professional Design with Toggle */}
                  <div className="dose-card drug-volume-calc-card">
                    <div className="section-label-with-toggle">
                      <label className="section-label">
                        <Droplets size={16} />
                        Drug Volume
                      </label>
                      {/* Volume Calculation Method Toggle */}
                      {selectedMedicationData?.dosageForm === 'lyophilized' && (
                        <div className="volume-method-toggle">
                          <button
                            className={`toggle-option ${volumeCalculationMethod === 'withdrawn' ? 'active' : ''}`}
                            onClick={() => setVolumeCalculationMethod('withdrawn')}
                            type="button"
                            title="Drug Volume Removed from Vial"
                          >
                            <FlaskConical size={12} />
                            <span>Removed from Vial</span>
                          </button>
                          <button
                            className={`toggle-option ${volumeCalculationMethod === 'reconstitution' ? 'active' : ''}`}
                            onClick={() => setVolumeCalculationMethod('reconstitution')}
                            type="button"
                            title="Sterile Water Volume to Reconstitute Vial"
                          >
                            <Droplets size={12} />
                            <span>Sterile Water</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="professional-volume-input">
                      <div className="volume-input-container">
                        <div className="volume-input-field">
                          <div className="calc-value-display">
                            <span className="calc-value-number">
                              {calculateDrugVolume(true, volumeCalculationMethod)}
                            </span>
                            <span className="volume-unit">mL</span>
                          </div>
                        </div>
                      </div>
                      {/* Volume display with calculation details */}
                      <div className="volume-display-preview">
                        <Droplets size={14} className="preview-icon" />
                        <span className="preview-value">
                          {(() => {
                            if (selectedMedicationData?.dosageForm === 'lyophilized') {
                              const vials = calculateSingleDoseVialCombination();
                              if (vials && vials[0]) {
                                const totalVials = vials.reduce((sum, v) => sum + v.count, 0);
                                const volumeType = volumeCalculationMethod === 'withdrawn' ? 
                                  (vials[0].vial.withdrawVolume || vials[0].vial.volume || vials[0].vial.reconstitutionVolume) :
                                  vials[0].vial.reconstitutionVolume;
                                if (volumeCalculationMethod === 'withdrawn') {
                                  return `${totalVials} × ${volumeType} mL`;
                                } else {
                                  return `${totalVials} × ${volumeType} mL sterile water`;
                                }
                              }
                            } else if (selectedMedicationData?.dosageForm === 'solution') {
                              const vials = calculateSingleDoseVialCombination();
                              if (vials && vials[0] && vials[0].vial.concentration) {
                                return `Solution: ${vials[0].vial.concentration} mg/mL`;
                              }
                            }
                            return `${calculateDrugVolume(true, volumeCalculationMethod)} mL`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Drug Removal Volume Card - Professional Design */}
                  <div className="dose-card drug-removal-calc-card">
                    <label className="section-label">
                      <Minus size={16} />
                      Drug Removal Volume
                    </label>
                    <div className="professional-volume-input">
                      <div className="volume-input-container">
                        <div className="volume-input-field">
                          <div className="calc-value-display">
                            <span className="calc-value-number">
                              {calculateDrugRemovalVolume()}
                            </span>
                            <span className="volume-unit">mL</span>
                          </div>
                        </div>
                      </div>
                      {/* Volume removal preview */}
                      <div className="volume-display-preview">
                        <Minus size={14} className="preview-icon" />
                        <span className="preview-value">
                          {(() => {
                            if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) return 'Enter required fields';
                            if (selectedMedicationData.dosageForm === 'oral') return 'N/A for oral';
                            if (inputs.infusionMode !== 'removeOverfill') return 'Overfill mode only';
                            
                            // Always use withdrawn volume for removal calculation
                            const drugVol = calculateDrugVolume(true, 'withdrawn');
                            const bagSize = calculateSalineBagSize();
                            if (!bagSize) return '0 mL';
                            
                            const overfill = getOverfillValue(bagSize);
                            const removalVol = calculateDrugRemovalVolume();
                            
                            // Check specific medication rules
                            if (selectedMedication === 'ELAPRASE' || selectedMedication === 'VPRIV') {
                              return `DO NOT remove`;
                            } else if (selectedMedication === 'NAGLAZYME') {
                              if (bagSize === 100) {
                                return `No removal for 100 mL`;
                              } else if (bagSize === 250) {
                                return `${drugVol} + 30 mL = ${removalVol} mL`;
                              }
                            }
                            return `${drugVol} + ${overfill} mL = ${removalVol} mL`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Parameters Divider */}
              {selectedMedicationData && selectedMedicationData.dosageForm !== 'oral' && (
                <>
                  <div className="parameters-divider">
                    <Settings size={18} />
                    <h4>Additional Parameters</h4>
                  </div>

                  {/* Additional Parameters Cards */}
                  <div className="additional-params-cards">
                {/* Prime Volume Card */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Droplets size={20} />
                    <label className="param-card-label">Prime Volume (mL)</label>
                  </div>
                  <input
                    type="number"
                    value={inputs.primeVolume}
                    onChange={(e) => handleInputChange('primeVolume', e.target.value)}
                    placeholder="10"
                    className="supply-input"
                  />
                </div>

                {/* Flush Volume Card */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Droplets size={20} />
                    <label className="param-card-label">Flush Volume (mL)</label>
                  </div>
                  <input
                    type="number"
                    value={inputs.flushVolume}
                    onChange={(e) => handleInputChange('flushVolume', e.target.value)}
                    placeholder="10"
                    className="supply-input"
                  />
                </div>

                {/* Remove Overfill Toggle */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Package size={20} />
                    <label className="param-card-label">Infusion Mode</label>
                  </div>
                  <div className="supply-input toggle-field">
                    <div className="toggle-field-content">
                      <span className="toggle-field-label">
                        {inputs.infusionMode === 'removeOverfill' ? 
                          `Remove Overfill from ${selectedMedicationData?.salineBagRules?.specialInstructions?.includes('D5W') ? 'D5W' : 'NS'} Bag` : 
                          `Add to Empty ${selectedMedicationData?.salineBagRules?.specialInstructions?.includes('D5W') ? 'D5W' : 'NS'} Bag`}
                      </span>
                      <div className="infusion-mode-toggle">
                        <input
                          type="checkbox"
                          id="infusion-mode-toggle-switch"
                          className="infusion-toggle-input"
                          checked={inputs.infusionMode === 'addToEmptyBag'}
                          onChange={(e) => handleInputChange('infusionMode', e.target.checked ? 'addToEmptyBag' : 'removeOverfill')}
                        />
                        <label htmlFor="infusion-mode-toggle-switch" className="infusion-toggle-label">
                          <span className="infusion-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overfill Value Card (Read-only) */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Plus size={20} />
                    <label className="param-card-label">Overfill Value (mL)</label>
                  </div>
                  <input
                    type="text"
                    value={(() => {
                      const bagSize = calculateSalineBagSize();
                      if (!bagSize) return 'N/A';
                      return getOverfillValue(bagSize);
                    })()}
                    readOnly
                    className="supply-input"
                    style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                  />
                </div>



                {/* Drug Volume Card - Always shown, greyed out when required fields missing */}
                <div className={`param-card ${(!selectedMedicationData || !inputs.dose || !inputs.patientWeight) ? 'disabled' : ''}`}>
                  <div className="param-card-icon">
                    <Droplets size={20} />
                    <label className="param-card-label">Drug Volume (mL)</label>
                  </div>
                  <input
                    type="text"
                    value={
                      (selectedMedicationData && inputs.dose && inputs.patientWeight && results) ? 
                        `${results.drugVolume} mL` : 
                        (selectedMedicationData && inputs.dose && inputs.patientWeight) ?
                          `${calculateDrugVolume(true, volumeCalculationMethod)} mL` :
                          '-- mL'
                    }
                    readOnly
                    className="supply-input"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      cursor: 'not-allowed',
                      opacity: (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) ? 0.5 : 1
                    }}
                  />
                </div>

                {/* Volume to Remove Card - Always shown, greyed out when required fields missing */}
                <div className={`param-card ${(!selectedMedicationData || !inputs.dose || !inputs.patientWeight) ? 'disabled' : ''}`}>
                  <div className="param-card-icon">
                    <Minus size={20} />
                    <label className="param-card-label">Volume to Remove (mL)</label>
                  </div>
                  <input
                    type="text"
                    value={
                      (selectedMedicationData && inputs.dose && inputs.patientWeight && results) ? 
                        `${results.volumeToRemove} mL` : 
                        (selectedMedicationData && inputs.dose && inputs.patientWeight) ?
                          `${calculateDrugRemovalVolume()} mL` :
                          '-- mL'
                    }
                    readOnly
                    className="supply-input volume-remove"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      cursor: 'not-allowed',
                      opacity: (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) ? 0.5 : 1
                    }}
                  />
                </div>
              </div>


              {/* Removed Custom Infusion Steps Toggle - Now controlled by button */}
                </>
              )}
            </div>
          </div>
        </div>


        {/* Custom Infusion Steps Section */}
        {inputs.useCustomSteps && (
          <div className="calculator-section">
            <div className="section-header">
              <Activity size={20} />
              <h3>Custom Infusion Steps</h3>
              <button 
                className="close-section-btn"
                onClick={() => handleInputChange('useCustomSteps', false)}
                title="Close custom infusion steps"
              >
                <X size={20} />
              </button>
              <div className="custom-steps-validation">
                {customStepsValidation.volumeValid ? (
                  <div className="validation-indicator valid">
                    <Check size={16} />
                    <span>Volume: {customStepsValidation.stepVolumeTotal?.toFixed(1)} mL</span>
                  </div>
                ) : (
                  <div className="validation-indicator invalid">
                    <X size={16} />
                    <span>Volume: {customStepsValidation.stepVolumeTotal?.toFixed(1)} mL</span>
                  </div>
                )}
                {customStepsValidation.durationValid ? (
                  <div className="validation-indicator valid">
                    <Check size={16} />
                    <span>Duration: {(() => {
                      const totalMins = customStepsValidation.stepDurationTotal || 0;
                      const hours = Math.floor(totalMins / 60);
                      const mins = Math.round(totalMins % 60);
                      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                    })()}</span>
                  </div>
                ) : (
                  <div className="validation-indicator invalid">
                    <X size={16} />
                    <span>Duration: {(() => {
                      const totalMins = customStepsValidation.stepDurationTotal || 0;
                      const hours = Math.floor(totalMins / 60);
                      const mins = Math.round(totalMins % 60);
                      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                    })()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="section-content">
              <div className="custom-steps-container">
                {customInfusionSteps.map((step, index) => {
                  const stepValidation = customStepsValidation.stepsValid.find(v => v.id === step.id) || {};
                  const isValid = stepValidation.isValid;
                  const isUntilComplete = stepValidation.isUntilComplete;
                  const isFlush = stepValidation.isFlush;
                  
                  return (
                    <div key={step.id} className={`custom-step-row ${isValid && customStepsValidation.isAcceptable ? 'valid' : 'invalid'}`}>
                      <div className="step-number">
                        {isUntilComplete ? (
                          <span title="Until infusion is complete">⏱️</span>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="step-inputs">
                        {/* Show formula reminder for regular and flush steps */}
                        {(stepValidation.isRegular || isFlush) && (
                          <div className="step-formula-reminder">
                            Formula: Volume = (Rate × Duration) ÷ 60
                          </div>
                        )}
                        <div className="step-input-group">
                          <label>Rate (mL/hr)</label>
                          <input
                            type="number"
                            value={step.rate}
                            onChange={(e) => updateCustomStep(step.id, 'rate', e.target.value)}
                            placeholder="0"
                            className={`supply-input ${!stepValidation.rateValid ? 'error' : ''}`}
                          />
                        </div>
                        <div className="step-input-group">
                          <label>
                            Duration (min) 
                            {isUntilComplete && <Info size={14} title="Automatically calculated based on volume and rate" />}
                          </label>
                          {isUntilComplete ? (
                            <div className={`calculated-value-display`} title="Automatically calculated">
                              {stepValidation.calculatedDuration?.toFixed(1) || '0'}
                            </div>
                          ) : (
                            <input
                              type="number"
                              value={step.duration}
                              onChange={(e) => updateCustomStep(step.id, 'duration', e.target.value)}
                              placeholder="0"
                              className={`supply-input ${!stepValidation.durationValid || !stepValidation.durationMatch ? 'error' : ''}`}
                            />
                          )}
                        </div>
                        <div className="step-input-group">
                          <label>
                            Volume (mL)
                            {isUntilComplete && <Info size={14} title="Automatically calculated as remaining volume" />}
                          </label>
                          {isUntilComplete ? (
                            <div className="calculated-value-display" title="Automatically calculated">
                              {stepValidation.calculatedVolume?.toFixed(1) || '0'}
                            </div>
                          ) : (
                            <input
                              type="number"
                              value={step.volume}
                              onChange={(e) => updateCustomStep(step.id, 'volume', e.target.value)}
                              placeholder="0"
                              className={`supply-input ${!stepValidation.volumeValid || !stepValidation.volumeMatch ? 'error' : ''}`}
                            />
                          )}
                        </div>
                      </div>
                      <div className="step-actions">
                        {isValid ? (
                          <div className="step-valid-indicator" title="Step is valid">
                            <Check size={20} className="valid-icon" />
                          </div>
                        ) : (
                          <div className="step-invalid-indicator" title={stepValidation.errorMessage || 'Step is invalid'}>
                            <X size={20} className="invalid-icon" />
                          </div>
                        )}
                        <button
                          className="remove-step-btn"
                          onClick={() => removeCustomStep(step.id)}
                          disabled={customInfusionSteps.length === 1}
                          title="Remove step"
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                      {!isValid && (
                        <div className="step-error-message">
                          <AlertCircle size={14} />
                          <span>{stepValidation.errorMessage || 'Invalid step'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="add-step-btn" onClick={addCustomStep}>
                  <Plus size={16} />
                  Add Infusion Step
                </button>
              </div>
              {errors.customSteps && (
                <div className="custom-steps-error">
                  <AlertCircle size={16} />
                  <span>{errors.customSteps}</span>
                </div>
              )}
              
              {/* Validation Results */}
              {customStepsValidation.stepsValid.length > 0 && (
                customStepsValidation.isAcceptable ? (
                  <div className="validation-results-section acceptable">
                    <div className="validation-results-header">
                      <Check size={20} className="validation-check" />
                      <h4>Validation Passed</h4>
                    </div>
                    <div className="validation-method">
                      <div>✓ All steps are valid</div>
                      <div>✓ Total volume: {customStepsValidation.stepVolumeTotal?.toFixed(1)} mL = {inputs.totalInfusionVolume} mL</div>
                      <div>✓ Total duration: {(() => {
                        const totalMins = customStepsValidation.stepDurationTotal || 0;
                        const hours = Math.floor(totalMins / 60);
                        const mins = Math.round(totalMins % 60);
                        const expectedTotalMins = (parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + (parseInt(inputs.totalInfusionTime.minutes) || 0);
                        const expectedHours = Math.floor(expectedTotalMins / 60);
                        const expectedMins = Math.round(expectedTotalMins % 60);
                        const actualDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                        const expectedDisplay = expectedHours > 0 ? `${expectedHours}h ${expectedMins}m` : `${expectedMins}m`;
                        return `${actualDisplay} = ${expectedDisplay}`;
                      })()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="validation-results-section unacceptable">
                    <div className="validation-results-header">
                      <X size={20} className="validation-x" />
                      <h4>Validation Failed</h4>
                    </div>
                    <div className="validation-method">
                      {!customStepsValidation.volumeValid && (
                        <div>✗ {customStepsValidation.totalVolumeError}</div>
                      )}
                      {!customStepsValidation.durationValid && (
                        <div>✗ {customStepsValidation.totalDurationError}</div>
                      )}
                      {customStepsValidation.stepsValid.some(s => !s.isValid) && (
                        <div>✗ Some steps have errors (see red indicators)</div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}



        {/* Results Section */}
        {showResults && results && (
          <div className="calculator-section results-section">
            <div className="section-header">
              <FileText size={20} />
              <h3>Calculation Results</h3>
            </div>
            <div className="section-content">
              {/* Key Results Grid */}
              <div className="results-grid">
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <Calculator size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">CURRENT DOSE RATE</div>
                      <div className="result-value">
                        {(() => {
                          const weight = parseFloat(inputs.patientWeight);
                          const dose = parseFloat(inputs.dose);
                          if (inputs.doseUnit.includes('/kg')) {
                            // Already in per kg format
                            return `${formatNumber(dose)} ${inputs.doseUnit}`;
                          } else {
                            // Convert to per kg
                            return `${formatNumber(dose / weight)} ${inputs.doseUnit}/kg`;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <Check size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">ACTUAL DOSE</div>
                      <div className="result-value">{formatNumber(results.actualDose)} {results.doseUnit.replace('/kg', '')}</div>
                    </div>
                  </div>
                )}
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <Package size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">TOTAL VIALS</div>
                      <div className="result-value">{results.totalVials}</div>
                    </div>
                  </div>
                )}
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <Droplets size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">DRUG VOLUME</div>
                      <div className="result-value">{results.drugVolume} mL</div>
                    </div>
                  </div>
                )}
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <FlaskConical size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">SALINE BAG</div>
                      <div className="result-value">{results.bagSize} mL</div>
                    </div>
                  </div>
                )}
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <Minus size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">VOLUME TO REMOVE</div>
                      <div className="result-value volume-remove">{results.volumeToRemove} mL</div>
                    </div>
                  </div>
                )}
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <Activity size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">INFUSION RATE</div>
                      <div className="result-value">{results.infusionRate} mL/hr</div>
                    </div>
                  </div>
                )}
                {!isFixedRateCalculation && (
                  <div className="result-card">
                    <div className="result-icon">
                      <Clock size={24} />
                    </div>
                    <div className="result-content">
                      <div className="result-label">TOTAL TIME</div>
                      <div className="result-value">{results.totalTimeFormatted}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Infusion Plan */}
              <div className="infusion-plan-section">
                <h4>
                  <Activity size={16} />
                  Detailed Infusion Plan
                  {inputs.infusionRate && parseFloat(inputs.infusionRate) > 0 && (
                    <span className="manual-rate-indicator">
                      (Using Manual Rate: {inputs.infusionRate} mL/hr)
                    </span>
                  )}
                </h4>
                
                <div className="infusion-table">
                  <div className="table-header">
                    <div className="header-step">Step</div>
                    <div className="header-rate">Rate (mL/hr)</div>
                    <div className="header-duration">Duration</div>
                    <div className="header-volume">Volume (mL)</div>
                    <div className="header-description">Description</div>
                  </div>
                  
                  <div className="table-body">
                    {results.infusionSteps.map((step, index) => (
                      <div key={index} className={`table-row ${step.isFlush ? 'flush-step' : ''}`}>
                        <div className="cell-step">Step {step.step}</div>
                        <div className="cell-rate">{step.rate}</div>
                        <div className="cell-duration">{step.duration} min</div>
                        <div className="cell-volume">{step.volume}</div>
                        <div className="cell-description">{step.description}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total Summary */}
                  <div className="infusion-summary">
                    <div className="summary-row">
                      <div className="summary-label">Total Volume:</div>
                      <div className="summary-value">
                        {results.infusionSteps.reduce((sum, step) => sum + parseFloat(step.volume || 0), 0).toFixed(1)} mL
                      </div>
                    </div>
                    <div className="summary-row">
                      <div className="summary-label">Total Infusion Time:</div>
                      <div className="summary-value">
                        {(() => {
                          const totalMinutes = results.infusionSteps.reduce((sum, step) => sum + parseInt(step.duration || 0), 0);
                          const hours = Math.floor(totalMinutes / 60);
                          const minutes = totalMinutes % 60;
                          return `${hours}h ${minutes}min (${totalMinutes} min)`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Action Buttons Container */}
        <div className="professional-action-container">
          <div className="professional-action-buttons">
            {/* Reset Button - Same Size as Calculate Buttons */}
            <button 
              className="copy-note-btn reset-btn"
              onClick={resetCalculator}
              title="Clear all inputs and start over"
            >
              <X size={16} />
              Reset Form
            </button>
            
            {/* Calculate Fixed Rate Button - Copy Button Design */}
            <button 
              className="copy-note-btn calculate-fixed-btn"
              onClick={() => {
                  if (!selectedMedicationData || !inputs.patientWeight || !inputs.dose) {
                    setFixedInfusionError('Please select medication, enter patient weight, and prescribed dose first');
                    setTimeout(() => setFixedInfusionError(''), 5000);
                    return;
                  }
                  if (!canCalculateFixed()) {
                    setFixedInfusionError('Please fill in all required fields including infusion rate');
                    setTimeout(() => setFixedInfusionError(''), 5000);
                  } else {
                    setFixedInfusionError('');
                    calculatePumpSettings(true);
                  }
                }}
                disabled={!selectedMedicationData || !inputs.patientWeight || !inputs.dose}
                title={!selectedMedicationData || !inputs.patientWeight || !inputs.dose ? 
                  "Please select medication, enter patient weight, and prescribed dose first" : 
                  "Calculate using standard infusion parameters"}
              >
                <Activity size={16} />
                Calculate Fixed Rate
              </button>
            
            {/* Calculate Custom Rate Button - Copy Button Design */}
            <button 
              className="copy-note-btn calculate-custom-btn"
              onClick={() => {
                  if (!selectedMedicationData || !inputs.patientWeight || !inputs.dose) {
                    alert('Please select medication, enter patient weight, and prescribed dose first');
                    return;
                  }
                  if (!inputs.useCustomSteps) {
                    handleInputChange('useCustomSteps', true);
                    setExpandedSections(prev => ({
                      ...prev,
                      infusionParameters: true
                    }));
                  } else if (canCalculateCustom() && customStepsValidation.isAcceptable) {
                    calculatePumpSettings();
                  }
                }}
                disabled={!selectedMedicationData || !inputs.patientWeight || !inputs.dose}
                title={!selectedMedicationData || !inputs.patientWeight || !inputs.dose ? 
                  "Please select medication, enter patient weight, and prescribed dose first" : 
                  "Set up custom infusion steps with variable rates"}
              >
                <Layers size={16} />
                Calculate Custom Rate
              </button>
          </div>
          
          {/* Error Message Display */}
          {fixedInfusionError && (
            <div className="action-error-message">
              <AlertCircle size={16} />
              <span>{fixedInfusionError}</span>
            </div>
          )}
        </div>

        {/* Vial Combinations Modal */}
        {showVialCombinations && (
          <div className="vial-combinations-modal">
            <div className="modal-backdrop" onClick={() => setShowVialCombinations(false)} />
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <Package size={20} />
                  Recommended Vial Combination
                </h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowVialCombinations(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                {(() => {
                  const allCombinations = calculateAllVialCombinations();
                  if (!allCombinations || allCombinations.length === 0) return null;
                  
                  const prescribedDose = inputs.doseUnit.includes('/kg') ? 
                    parseFloat(inputs.dose) * parseFloat(inputs.patientWeight) : 
                    parseFloat(inputs.dose);
                  
                  return (
                    <>
                      <div className="prescribed-dose-info">
                        <strong>Prescribed Dose:</strong> {formatNumber(prescribedDose)} {inputs.doseUnit.replace('/kg', '')}
                        {inputs.daysSupply && (
                          <>
                            <span className="separator">•</span>
                            <strong>Supply for:</strong> {inputs.daysSupply} days
                          </>
                        )}
                      </div>
                      
                      <div className="combinations-list">
                        {allCombinations.map((combo, index) => (
                          <div 
                            key={index} 
                            className={`combination-option ${combo.isOptimal ? 'optimal' : ''} ${selectedCombination?.index === index ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedCombination({
                                type: 'predefined',
                                index: index,
                                combination: combo,
                                totalVials: combo.totalVials
                              });
                            }}
                          >
                            <div className="combination-header">
                              <div className="combination-title">
                                {combo.isOptimal && <span className="optimal-badge">RECOMMENDED</span>}
                                <span className="strategy-label">{combo.strategy}</span>
                              </div>
                              <div className="combination-metrics">
                                <span className="total-vials">{combo.totalVials} vials total</span>
                                <span className="separator">•</span>
                                <span className="waste">Waste: {formatNumber(combo.waste)} {inputs.doseUnit.replace('/kg', '')}</span>
                              </div>
                            </div>
                            
                            <div className="vial-breakdown">
                              {combo.combination.map((item, idx) => (
                                <div key={idx} className="vial-item">
                                  <span className="vial-count">{item.count}</span>
                                  <span className="vial-multiplier">×</span>
                                  <span className="vial-details">
                                    {item.vial.strength} {item.vial.unit} vial
                                    {item.vial.volume && ` (${item.vial.volume} mL)`}
                                  </span>
                                </div>
                              ))}
                            </div>
                            
                            <div className="combination-summary">
                              <div className="summary-item">
                                <span className="summary-label">Actual dose:</span>
                                <span className="summary-value">{formatNumber(combo.actualDose)} {inputs.doseUnit.replace('/kg', '')}</span>
                              </div>
                              <div className="summary-item">
                                <span className="summary-label">Accuracy:</span>
                                <span className="summary-value">{((combo.actualDose / prescribedDose) * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="modal-footer-info">
                        <Info size={16} />
                        <span>This combination minimizes drug waste while using the fewest vials.</span>
                      </div>
                      
                      {/* Custom Vial Input Section */}
                      <div className="custom-vial-section">
                        <button 
                          className="custom-vial-toggle"
                          onClick={() => {
                            setShowCustomInput(!showCustomInput);
                            if (!showCustomInput && Object.keys(customVialCounts).length === 0) {
                              // Initialize custom counts with available vial sizes
                              const initialCounts = {};
                              selectedMedicationData.vialSizes.forEach(vial => {
                                initialCounts[`${vial.strength}-${vial.unit}`] = 0;
                              });
                              updateCustomVialCounts(initialCounts);
                            }
                          }}
                        >
                          <Settings size={16} />
                          Custom Vial Combination
                          <ChevronDown className={`toggle-arrow ${showCustomInput ? 'open' : ''}`} size={16} />
                        </button>
                        
                        {showCustomInput && (
                          <div className="custom-vial-inputs">
                            <h4>Enter custom vial quantities:</h4>
                            <div className="custom-vial-grid">
                              {selectedMedicationData.vialSizes.map((vial) => {
                                const vialId = `${vial.strength}-${vial.unit}`;
                                return (
                                  <div key={vialId} className="custom-vial-input-group">
                                    <label>
                                      {vial.strength} {vial.unit}
                                      {vial.volume && ` (${vial.volume} mL)`}
                                    </label>
                                    <div className="custom-vial-input-wrapper">
                                      <button 
                                        className="vial-count-btn minus"
                                        onClick={() => {
                                          const current = customVialCounts[vialId] || 0;
                                          if (current > 0) {
                                            const newCounts = {
                                              ...customVialCounts,
                                              [vialId]: current - 1
                                            };
                                            updateCustomVialCounts(newCounts);
                                          }
                                        }}
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        value={customVialCounts[vialId] || 0}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 0;
                                          if (value >= 0 && value <= 999) {
                                            const newCounts = {
                                              ...customVialCounts,
                                              [vialId]: value
                                            };
                                            updateCustomVialCounts(newCounts);
                                          }
                                        }}
                                        className="custom-vial-count"
                                        min="0"
                                        max="999"
                                      />
                                      <button 
                                        className="vial-count-btn plus"
                                        onClick={() => {
                                          const current = customVialCounts[vialId] || 0;
                                          if (current < 999) {
                                            const newCounts = {
                                              ...customVialCounts,
                                              [vialId]: current + 1
                                            };
                                            updateCustomVialCounts(newCounts);
                                          }
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Custom Combination Summary */}
                            {(() => {
                              const totalCustomVials = Object.values(customVialCounts).reduce((sum, count) => sum + count, 0);
                              const daysCovered = customCalculationResults.daysCovered;
                              
                              if (totalCustomVials > 0) {
                                return (
                                  <div className="custom-combination-summary" key={forceUpdateKey}>
                                    <div className="summary-row">
                                      <span className="summary-label">Total vials:</span>
                                      <span className="summary-value">{totalCustomVials}</span>
                                    </div>
                                    <div className="summary-row">
                                      <span className="summary-label">Days coverage:</span>
                                      <span className="summary-value highlight">
                                        {daysCovered} days
                                        {inputs.daysSupply && (
                                          <span className={`coverage-indicator ${daysCovered >= parseInt(inputs.daysSupply) ? 'sufficient' : 'insufficient'}`}>
                                            {daysCovered >= parseInt(inputs.daysSupply) ? ' ✓' : ` (Need ${parseInt(inputs.daysSupply) - daysCovered} more days)`}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <button 
                                      className="apply-custom-btn"
                                      onClick={() => {
                                        setSelectedCombination({
                                          type: 'custom',
                                          vials: customVialCounts,
                                          totalVials: totalCustomVials,
                                          daysCovered: daysCovered
                                        });
                                        setShowVialCombinations(false);
                                      }}
                                    >
                                      Apply Custom Combination
                                    </button>
                                  </div>
                                );
                              }
                              
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Vial Input Modal for Days Coverage Calculation */}
        {showVialInputModal && (
          <div className="vial-combinations-modal">
            <div className="modal-backdrop" onClick={() => setShowVialInputModal(false)} />
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <Calculator size={20} />
                  Calculate Days Coverage from Vials
                </h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowVialInputModal(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="vial-input-instructions">
                  <Info size={16} />
                  <span>Enter the number of vials you have for each available size</span>
                </div>

                {selectedMedicationData && (
                  <>
                    <div className="medication-info-header">
                      <strong>{selectedMedicationData.brandName}</strong>
                      <span className="separator">•</span>
                      <span>Single dose: {(() => {
                        const weight = parseFloat(inputs.patientWeight);
                        const dose = parseFloat(inputs.dose);
                        const singleDose = inputs.doseUnit.includes('/kg') ? dose * weight : dose;
                        return `${formatNumber(singleDose)} ${inputs.doseUnit.replace('/kg', '')}`;
                      })()}</span>
                    </div>

                    <div className="vial-input-list">
                      {selectedMedicationData.vialSizes
                        ?.filter(vial => !vial.form || (vial.form !== 'capsule' && vial.form !== 'tablet'))
                        .map((vial, index) => {
                          const vialKey = `${vial.strength}_${vial.unit}_${index}`;
                          return (
                            <div key={vialKey} className="vial-input-row">
                              <div className="vial-info">
                                <span className="vial-strength">{vial.strength} {vial.unit}</span>
                                {vial.volume && <span className="vial-volume">({vial.volume} mL)</span>}
                              </div>
                              <div className="vial-input-controls">
                                <button
                                  type="button"
                                  className="vial-adjust-btn"
                                  onClick={() => {
                                    const currentCount = userVialInputs[vialKey] || 0;
                                    if (currentCount > 0) {
                                      setUserVialInputs({
                                        ...userVialInputs,
                                        [vialKey]: currentCount - 1
                                      });
                                    }
                                  }}
                                  disabled={(userVialInputs[vialKey] || 0) === 0}
                                >
                                  <Minus size={16} />
                                </button>
                                <input
                                  type="number"
                                  className="vial-count-input"
                                  value={userVialInputs[vialKey] || 0}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    setUserVialInputs({
                                      ...userVialInputs,
                                      [vialKey]: Math.max(0, value)
                                    });
                                  }}
                                  min="0"
                                />
                                <button
                                  type="button"
                                  className="vial-adjust-btn"
                                  onClick={() => {
                                    const currentCount = userVialInputs[vialKey] || 0;
                                    setUserVialInputs({
                                      ...userVialInputs,
                                      [vialKey]: currentCount + 1
                                    });
                                  }}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Calculate and display days coverage */}
                    {(() => {
                      const coverage = calculateDaysCoverageFromVials(userVialInputs);
                      const totalVials = Object.values(userVialInputs).reduce((sum, count) => sum + count, 0);
                      
                      if (totalVials > 0) {
                        return (
                          <div className="coverage-results">
                            <div className="coverage-summary">
                              <div className="summary-row">
                                <span className="summary-label">Total medication:</span>
                                <span className="summary-value">
                                  {formatNumber(coverage.totalMedication)} {inputs.doseUnit.replace('/kg', '')}
                                </span>
                              </div>
                              <div className="summary-row">
                                <span className="summary-label">Number of doses:</span>
                                <span className="summary-value">{coverage.numberOfDoses}</span>
                              </div>
                              <div className="summary-row highlight">
                                <span className="summary-label">Days coverage:</span>
                                <span className="summary-value">
                                  {formatNumber(coverage.daysCoverage)} days
                                  {inputs.daysSupply && (
                                    <span className={`coverage-indicator ${coverage.daysCoverage >= parseInt(inputs.daysSupply) ? 'sufficient' : 'insufficient'}`}>
                                      {coverage.daysCoverage >= parseInt(inputs.daysSupply) 
                                        ? ' ✓ Meets required supply' 
                                        : ` (${formatNumber(parseInt(inputs.daysSupply) - coverage.daysCoverage)} days short)`
                                      }
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}

                    <div className="modal-actions">
                      <button
                        type="button"
                        className="reset-vials-btn"
                        onClick={() => setUserVialInputs({})}
                      >
                        <RotateCcw size={16} />
                        Reset All
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedesignedPumpCalculator;