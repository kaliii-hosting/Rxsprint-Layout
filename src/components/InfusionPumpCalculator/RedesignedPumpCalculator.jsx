import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  X
} from 'lucide-react';
import './RedesignedPumpCalculator.css';
import pumpDatabase from '../../pages/Pump/pump-database.json';

// Dose Safety Indicator Component
const DoseSafetyIndicator = ({ doseSafety, standardDose, specialDosingOptions, selectedSpecialDosing, onSpecialDosingChange, patientWeight, actualDose, actualDoseUnit, correctDose }) => {
  const handleSpecialDosingClick = (option) => {
    if (selectedSpecialDosing?.id === option.id) {
      onSpecialDosingChange(null);
    } else {
      onSpecialDosingChange(option);
    }
  };

  return (
    <div className="dose-safety-indicator">
      <div className="dose-safety-cards">
        {/* Low Dose Card */}
        <div className={`dose-safety-card low-dose ${doseSafety.classification === 'low' ? 'active' : ''}`}>
          <div className="dose-card-header">
            <span className="dose-card-title">LOW DOSE</span>
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
        </div>

        {/* Correct Dose Card - ALWAYS SHOWS DATABASE DOSE */}
        <div className={`dose-safety-card correct-dose ${doseSafety.classification === 'correct' ? 'active' : ''}`}>
          <div className="dose-card-header">
            <span className="dose-card-title">CORRECT DOSE</span>
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
        </div>

        {/* High Dose Card */}
        <div className={`dose-safety-card high-dose ${doseSafety.classification === 'high' ? 'active' : ''}`}>
          <div className="dose-card-header">
            <span className="dose-card-title">HIGH DOSE</span>
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
  const [errors, setErrors] = useState({});
  const [doseSafety, setDoseSafety] = useState({ classification: 'unknown', ratio: 0, color: '#6c757d' });
  const [fixedInfusionError, setFixedInfusionError] = useState('');
  const [selectedSpecialDosing, setSelectedSpecialDosing] = useState(null);
  const [showVialCombinations, setShowVialCombinations] = useState(false);
  
  // Custom infusion steps state
  const [customInfusionSteps, setCustomInfusionSteps] = useState([
    { id: 1, rate: '', duration: '', volume: '', description: 'Flush', isFlush: true }
  ]);
  const [customStepsValidation, setCustomStepsValidation] = useState({
    volumeValid: false,
    durationValid: false,
    stepsValid: []
  });

  // Get medications list
  const medications = useMemo(() => {
    return Object.entries(pumpDatabase.medications).map(([key, med]) => ({
      key,
      ...med,
      color: med.brandColor || '#ff5500'
    }));
  }, []);

  // Get selected medication data
  const selectedMedicationData = useMemo(() => {
    return selectedMedication ? pumpDatabase.medications[selectedMedication] : null;
  }, [selectedMedication]);

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

  // Get special dosing options for the selected medication
  const getSpecialDosingOptions = useCallback(() => {
    if (!selectedMedication) return [];
    
    const specialDosingMap = {
      'LUMIZYME': [
        { id: 'standard', label: 'Standard dose: 20 mg/kg every 2 weeks', value: 20, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'weekly-high', label: 'High dose: 40 mg/kg weekly', value: 40, unit: 'mg/kg', frequency: 'weekly' }
      ],
      'CEREZYME': [
        { id: 'low-frequent', label: 'Low dose: 2.5 units/kg 3 times weekly', value: 2.5, unit: 'units/kg', frequency: '3 times weekly' },
        { id: 'standard', label: 'Standard dose: 60 units/kg every 2 weeks', value: 60, unit: 'units/kg', frequency: 'every 2 weeks' },
        { id: 'high', label: 'High dose: up to 120 units/kg every 2 weeks', value: 120, unit: 'units/kg', frequency: 'every 2 weeks' }
      ],
      'FABRAZYME': [
        { id: 'standard', label: 'Standard dose: 1 mg/kg every 2 weeks', value: 1, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'rechallenge', label: 'Rechallenge protocol: 0.5 mg/kg (for IgE-positive/skin-test-positive)', value: 0.5, unit: 'mg/kg', frequency: 'every 2 weeks' }
      ],
      'KANUMA': [
        { id: 'standard', label: 'Standard dose: 1 mg/kg every 2 weeks', value: 1, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'rapid-progression', label: 'Rapidly progressing disease: 3 mg/kg every 2 weeks', value: 3, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'infant-weekly', label: 'Infants <6 months: 1 mg/kg weekly', value: 1, unit: 'mg/kg', frequency: 'weekly', condition: 'age < 6 months' }
      ],
      'NEXVIAZYME': [
        { id: 'adult', label: 'Adults (≥30 kg): 20 mg/kg every 2 weeks', value: 20, unit: 'mg/kg', frequency: 'every 2 weeks', condition: 'weight ≥ 30 kg' },
        { id: 'pediatric', label: 'Pediatric (<30 kg): 40 mg/kg every 2 weeks', value: 40, unit: 'mg/kg', frequency: 'every 2 weeks', condition: 'weight < 30 kg' }
      ],
      'POMBILITI': [
        { id: 'standard', label: 'Standard dose: 20 mg/kg every 2 weeks', value: 20, unit: 'mg/kg', frequency: 'every 2 weeks' },
        { id: 'oral-40-49kg', label: 'Oral dosing (40-49.9 kg): 195 mg (3 capsules)', value: 195, unit: 'mg', frequency: 'as directed', condition: '40-49.9 kg' },
        { id: 'oral-50kg+', label: 'Oral dosing (≥50 kg): 260 mg (4 capsules)', value: 260, unit: 'mg', frequency: 'as directed', condition: '≥50 kg' }
      ],
      'VPRIV': [
        { id: 'standard', label: 'Standard dose: 60 units/kg every 2 weeks', value: 60, unit: 'units/kg', frequency: 'every 2 weeks' },
        { id: 'high', label: 'High dose: up to 120 units/kg every 2 weeks', value: 120, unit: 'units/kg', frequency: 'every 2 weeks' }
      ],
      'ZAVESCA': [
        { id: 'crcl-70+', label: 'CrCl >70: 100 mg three times daily', value: 100, unit: 'mg', frequency: 'TID', condition: 'CrCl >70' },
        { id: 'crcl-50-70', label: 'CrCl 50-70: 100 mg twice daily', value: 100, unit: 'mg', frequency: 'BID', condition: 'CrCl 50-70' },
        { id: 'crcl-30-50', label: 'CrCl 30-50: 100 mg once daily', value: 100, unit: 'mg', frequency: 'daily', condition: 'CrCl 30-50' },
        { id: 'npc-bsa-1.25+', label: 'NPC (BSA ≥1.25): 200 mg TID', value: 200, unit: 'mg', frequency: 'TID', condition: 'BSA ≥1.25' },
        { id: 'npc-bsa-0.88-1.25', label: 'NPC (BSA 0.88-1.25): 200 mg BID', value: 200, unit: 'mg', frequency: 'BID', condition: 'BSA 0.88-1.25' },
        { id: 'npc-bsa-0.73-0.88', label: 'NPC (BSA 0.73-0.88): 100 mg TID', value: 100, unit: 'mg', frequency: 'TID', condition: 'BSA 0.73-0.88' },
        { id: 'npc-bsa-0.47-0.73', label: 'NPC (BSA 0.47-0.73): 100 mg BID', value: 100, unit: 'mg', frequency: 'BID', condition: 'BSA 0.47-0.73' },
        { id: 'npc-bsa-0.47', label: 'NPC (BSA <0.47): 100 mg daily', value: 100, unit: 'mg', frequency: 'daily', condition: 'BSA <0.47' }
      ]
    };
    
    return specialDosingMap[selectedMedication] || [];
  }, [selectedMedication]);

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
    const standardDose = medicationDosing.value;
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
  }, [getDoseSafety, inputs.dose, inputs.doseUnit, selectedMedication, selectedMedicationData, selectedSpecialDosing]);

  // Reset special dosing when medication changes (moved from onChange handler for clarity)
  useEffect(() => {
    setSelectedSpecialDosing(null);
  }, [selectedMedication]);

  // Calculate correct dose based on patient weight and medication standard dose
  const calculateCorrectDose = useCallback(() => {
    if (!selectedMedicationData) return null;
    
    const weight = parseFloat(inputs.patientWeight) || 0;
    const medicationDosing = selectedMedicationData.standardDose;
    
    if (!medicationDosing || !medicationDosing.value) return null;
    
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
      return {
        dose: medicationDosing.maintenanceDose || medicationDosing.escalationSchedule.week14,
        unit: medicationDosing.unit,
        note: 'Maintenance dose'
      };
    }
    
    // Standard dose calculation
    const standardDose = medicationDosing.value;
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
  }, [selectedMedicationData, inputs.patientWeight]);

  // Calculate saline bag size based on patient weight and medication rules
  const calculateSalineBagSize = useCallback(() => {
    if (!selectedMedicationData || !inputs.patientWeight) return null;
    
    const weight = parseFloat(inputs.patientWeight);
    const bagRules = selectedMedicationData.salineBagRules;
    
    if (!bagRules) return null;
    
    if (bagRules.fixed) {
      return bagRules.bagSize;
    }
    
    if (bagRules.weightBased && bagRules.rules) {
      for (const rule of bagRules.rules) {
        if (rule.minWeight !== null && rule.maxWeight !== null) {
          if (weight >= rule.minWeight && weight <= rule.maxWeight) {
            return rule.bagSize;
          }
        } else if (rule.minWeight !== null && rule.maxWeight === null) {
          if (weight >= rule.minWeight) {
            return rule.bagSize;
          }
        } else if (rule.minWeight === null && rule.maxWeight !== null) {
          if (weight <= rule.maxWeight) {
            return rule.bagSize;
          }
        }
      }
    }
    
    return null;
  }, [selectedMedicationData, inputs.patientWeight]);

  // Get overfill value based on bag size
  const getOverfillValue = useCallback((bagSize) => {
    if (!selectedMedicationData) return 0;
    
    const overfillRules = selectedMedicationData.overfillRules;
    if (!overfillRules) return 0;
    
    return overfillRules[bagSize] || 0;
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


  // Calculate vial combination
  // Calculate all possible vial combinations for medications with multiple vial sizes
  const calculateAllVialCombinations = useCallback(() => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) return null;

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
    
    // If both dose frequency and days supply are provided, calculate total for the treatment period
    if (doseFrequency > 0 && daysSupply > 0) {
      const numberOfDoses = Math.ceil(daysSupply / doseFrequency);
      totalDose = singleDose * numberOfDoses;
    }

    const vialSizes = selectedMedicationData.vialSizes;
    if (!vialSizes || vialSizes.length === 0) return null;

    // For single vial size, return simple calculation
    if (vialSizes.length === 1) {
      const vial = vialSizes[0];
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
    const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);

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

    // Strategy 3: Try to get exact dose or minimize waste
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
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) return null;

    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    
    let singleDose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      singleDose = dose * weight;
    } else {
      singleDose = dose;
    }

    const vialSizes = selectedMedicationData.vialSizes;
    if (!vialSizes || vialSizes.length === 0) return null;

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

  // Calculate drug volume
  const calculateDrugVolume = useCallback((forSingleDose = false) => {
    if (!selectedMedicationData) return 0;
    
    // If calculating for single dose, ignore dose frequency and days supply
    let vialCombination;
    if (forSingleDose) {
      // Calculate vial combination for single dose only
      const singleDoseCombination = calculateSingleDoseVialCombination();
      if (!singleDoseCombination) return 0;
      vialCombination = singleDoseCombination;
    } else {
      vialCombination = calculateVialCombination();
      if (!vialCombination) return 0;
    }
    
    let totalVolume = 0;
    
    if (selectedMedicationData.dosageForm === 'lyophilized') {
      // For lyophilized powders, calculate total sterile water needed for reconstitution
      // Drug volume = number of vials × reconstitution volume per vial
      // Note: reconstitution volume is the amount of sterile water to add (e.g., 7.2 mL)
      // This may differ from final volume after mixing (e.g., 7 mL) due to powder displacement
      vialCombination.forEach(item => {
        const reconVolume = item.vial.reconstitutionVolume || 0;
        if (reconVolume === 0) {
          console.warn(`No reconstitution volume found for ${selectedMedicationData.brandName}`);
        }
        totalVolume += item.count * reconVolume;
      });
      // Return exact volume needed for reconstitution (rounded to 0.1 mL for display)
      // Example: POMBILITI - 17 vials × 7.2 mL = 122.4 mL
      const result = Math.round(totalVolume * 10) / 10;
      
      // Debug logging for verification
      if (selectedMedicationData.brandName === 'POMBILITI') {
        console.log('POMBILITI Drug Volume Calculation:', {
          vialCombination: vialCombination.map(item => ({
            strength: item.vial.strength,
            count: item.count,
            reconVolume: item.vial.reconstitutionVolume
          })),
          totalVolume: result
        });
      }
      
      return result;
    } else {
      // For solutions, use the actual vial volume
      vialCombination.forEach(item => {
        totalVolume += item.count * (item.vial.volume || 0);
      });
      
      // Apply rounding rules only for solution medications
      if (totalVolume > 10) {
        // Round up to nearest 2.5 or 5 mL for easier measurement
        if (totalVolume <= 50) {
          totalVolume = Math.ceil(totalVolume / 2.5) * 2.5;
        } else {
          totalVolume = Math.ceil(totalVolume / 5) * 5;
        }
      }
    }
    
    return totalVolume;
  }, [selectedMedicationData, calculateVialCombination, calculateSingleDoseVialCombination]);

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
  const calculatePumpSettings = () => {
    if (!validateInputs()) {
      return;
    }

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
    const drugVolume = calculateDrugVolume(true);
    
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
      // Don't remove drug volume for ELAPRASE
      if (selectedMedication === 'ELAPRASE') {
        volumeToRemove = overfillValue;
      } else {
        volumeToRemove = drugVolume + overfillValue;
      }
      // Round up to nearest 5 mL for easier measurement
      volumeToRemove = Math.ceil(volumeToRemove / 5) * 5;
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

  // Reset calculator
  const resetCalculator = () => {
    setInputs({
      selectedMedication: '',
      patientWeight: '',
      dose: '',
      doseUnit: 'mg/kg',
      doseFrequency: '',
      daysSupply: '',
      totalInfusionTime: '',
      totalInfusionVolume: '',
      infusionRate: '',
      infusionSteps: []
    });
    setExpandedSections({
      medicationSetup: true,
      doseCalculation: false,
      infusionParameters: false,
      results: false
    });
    setResults(null);
    setSelectedMedication(null);
    setShowResults(false);
    setErrors({});
    setCustomInfusionSteps([
      { id: 1, rate: '', duration: '', volume: '', description: 'Flush', isFlush: true }
    ]);
    setCustomStepsValidation({
      volumeValid: false,
      durationValid: false,
      stepsValid: []
    });
    setFixedInfusionError('');
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
              {/* Primary inputs row */}
              <div className="setup-primary-row">
                {/* Medication Selection */}
                <div className="setup-item">
                  <label className="section-label">
                    <FlaskConical size={16} />
                    Select Medication
                  </label>
                  <div className="custom-dropdown">
                    <select
                      value={selectedMedication || ''}
                      onChange={(e) => setSelectedMedication(e.target.value)}
                      className={`supply-dropdown ${errors.medication ? 'error' : ''}`}
                    >
                      <option value="">Choose medication...</option>
                      {medications.map(med => (
                        <option key={med.key} value={med.key}>
                          {med.brandName} - {med.genericName || med.indication}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={20} className="dropdown-icon" />
                  </div>
                  {errors.medication && <span className="error-text">{errors.medication}</span>}
                </div>

                {/* Patient Weight */}
                <div className="setup-item">
                  <label className="section-label">Patient Weight (kg)</label>
                  <input
                    type="number"
                    value={inputs.patientWeight}
                    onChange={(e) => handleInputChange('patientWeight', e.target.value)}
                    placeholder="Enter weight"
                    className={`supply-input ${errors.patientWeight ? 'error' : ''}`}
                    step="0.1"
                  />
                  {errors.patientWeight && <span className="error-text">{errors.patientWeight}</span>}
                </div>
              </div>

              {/* Medication info cards */}
              {selectedMedicationData && (
                <div className="medication-info-cards">
                  {/* Original Infusion Rate */}
                  <div className="medication-info-card">
                    <div className="card-label">Original Infusion Rate</div>
                    <div className="card-value">
                      <Info size={20} />
                      <span>{selectedMedicationData.infusionRate || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Saline Bag Size */}
                  <div className="medication-info-card">
                    <div className="card-label">NS Bag Size</div>
                    <div className="card-value">
                      <Package size={20} />
                      <span>{calculateSalineBagSize() || 'Enter weight'} mL</span>
                    </div>
                  </div>

                  {/* Overfill Value */}
                  <div className="medication-info-card">
                    <div className="card-label">Overfill Value</div>
                    <div className="card-value">
                      <Droplets size={20} />
                      <span>{calculateSalineBagSize() ? getOverfillValue(calculateSalineBagSize()) : '0'} mL</span>
                    </div>
                  </div>

                  {/* Infusion Steps Info */}
                  <div className="medication-info-card">
                    <div className="card-label">Infusion Steps Protocol</div>
                    <div className="card-value">
                      <Activity size={20} />
                      <span>
                        {selectedMedicationData.infusionSteps?.weightBased ? 
                          'Weight-based steps' : 
                          selectedMedicationData.infusionSteps?.defaultInfusion ? 
                            'Constant rate' : 
                            'Step-wise infusion'}
                      </span>
                    </div>
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
              <div className="dose-fields-row">
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
                  <label className="section-label">Dose Safety</label>
                  <DoseSafetyIndicator 
                    doseSafety={doseSafety} 
                    standardDose={selectedMedicationData?.standardDose}
                    specialDosingOptions={getSpecialDosingOptions()}
                    selectedSpecialDosing={selectedSpecialDosing}
                    onSpecialDosingChange={setSelectedSpecialDosing}
                    patientWeight={inputs.patientWeight}
                    actualDose={inputs.doseUnit.includes('/kg') ? 
                      (parseFloat(inputs.dose) || 0).toFixed(2) : 
                      ((parseFloat(inputs.dose) || 0) / (parseFloat(inputs.patientWeight) || 1)).toFixed(2)
                    }
                    actualDoseUnit={inputs.doseUnit.includes('/kg') ? 'mg/kg' : 'mg/kg'}
                    correctDose={calculateCorrectDose()}
                  />
                </div>
              )}

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
              {inputs.dose && inputs.patientWeight && selectedMedicationData && (
                <div className="infusion-params-cards">
                  {/* Total Dose Card - Professional Design */}
                  <div className="dose-card total-dose-calc-card">
                    <label className="section-label">
                      <Calculator size={16} />
                      Total Dose
                    </label>
                    <div className="professional-calc-display">
                      <div className="calc-display-container">
                        <div className="calc-display-value">
                          <span className="calc-value-number">
                            {formatNumber(
                              inputs.doseUnit.includes('/kg') ? 
                                parseFloat(inputs.dose) * parseFloat(inputs.patientWeight) : 
                                parseFloat(inputs.dose)
                            )}
                          </span>
                          <span className="calc-value-unit">
                            {inputs.doseUnit.replace('/kg', '')}
                          </span>
                        </div>
                      </div>
                      {/* Calculation preview */}
                      <div className="calc-display-preview">
                        <Calculator size={14} className="preview-icon" />
                        <span className="preview-value">
                          {inputs.doseUnit.includes('/kg') ? 
                            `${inputs.dose} × ${inputs.patientWeight} kg` : 
                            `Fixed: ${inputs.dose} ${inputs.doseUnit}`}
                        </span>
                      </div>
                    </div>
                    {/* Orange banner with explanation */}
                    <div className="param-banner orange-banner">
                      <Info size={14} />
                      <span className="banner-text">
                        {inputs.doseUnit.includes('/kg') ? 
                          `${inputs.dose} ${inputs.doseUnit} × ${inputs.patientWeight} kg = ${formatNumber(parseFloat(inputs.dose) * parseFloat(inputs.patientWeight))} ${inputs.doseUnit.replace('/kg', '')}` : 
                          `Fixed dose calculation`}
                      </span>
                    </div>
                  </div>

                  {/* Total Vials Card - Professional Design */}
                  <div className="dose-card total-vials-calc-card">
                    <label className="section-label">
                      <Package size={16} />
                      Total Vials Required
                    </label>
                    <div className="professional-calc-display">
                      <div className="calc-display-container">
                        <div className="calc-display-value">
                          <span className="calc-value-number">
                            {(() => {
                              const allCombinations = calculateAllVialCombinations();
                              if (!allCombinations || allCombinations.length === 0) return '0';
                              return allCombinations[0].totalVials;
                            })()}
                          </span>
                          <span className="calc-value-unit">VIALS</span>
                        </div>
                        {(() => {
                          const allCombinations = calculateAllVialCombinations();
                          const hasMultipleOptions = allCombinations && allCombinations.length > 1 && 
                            selectedMedicationData?.vialSizes?.length > 1;
                          
                          if (hasMultipleOptions) {
                            return (
                              <button 
                                className="calc-detail-btn"
                                onClick={() => setShowVialCombinations(true)}
                                type="button"
                              >
                                <Info size={14} />
                                View options
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {/* Vial combination preview */}
                      <div className="calc-display-preview">
                        <Package size={14} className="preview-icon" />
                        <span className="preview-value">
                          {(() => {
                            const allCombinations = calculateAllVialCombinations();
                            if (!allCombinations || allCombinations.length === 0) return 'No vials';
                            
                            const optimalCombo = allCombinations[0];
                            if (inputs.doseFrequency && inputs.daysSupply) {
                              const numberOfDoses = Math.ceil(parseFloat(inputs.daysSupply) / parseFloat(inputs.doseFrequency));
                              return `${numberOfDoses} doses × ${Math.ceil(optimalCombo.actualDose / optimalCombo.totalVials)} vial/dose`;
                            }
                            
                            return optimalCombo.combination.map((item, idx) => 
                              `${idx > 0 ? ' + ' : ''}${item.count}×${item.vial.strength}${item.vial.unit}`
                            ).join('');
                          })()}
                        </span>
                      </div>
                    </div>
                    {/* Orange banner with explanation */}
                    <div className="param-banner orange-banner">
                      <Info size={14} />
                      <span className="banner-text">
                        {(() => {
                          const allCombinations = calculateAllVialCombinations();
                          if (!allCombinations || allCombinations.length === 0) return 'Enter dose to calculate';
                          
                          const optimalCombo = allCombinations[0];
                          if (inputs.doseFrequency && inputs.daysSupply) {
                            const numberOfDoses = Math.ceil(parseFloat(inputs.daysSupply) / parseFloat(inputs.doseFrequency));
                            const prescribedDose = inputs.doseUnit.includes('/kg') ? 
                              parseFloat(inputs.dose) * parseFloat(inputs.patientWeight) : 
                              parseFloat(inputs.dose);
                            const vialsPerDose = Math.ceil(prescribedDose / (optimalCombo.combination[0]?.vial?.strength || 1));
                            const totalVials = allCombinations[0].totalVials;
                            return `${numberOfDoses} doses × ${vialsPerDose} vials/dose = ${totalVials} vials`;
                          }
                          
                          return `Optimal combination: ${optimalCombo.waste} ${inputs.doseUnit.replace('/kg', '')} waste`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Drug Volume Card - Professional Design */}
                  <div className="dose-card drug-volume-calc-card">
                    <label className="section-label">
                      <Droplets size={16} />
                      Drug Volume
                      {inputs.doseFrequency && inputs.daysSupply && (
                        <span className="calc-label-note"> (per dose)</span>
                      )}
                    </label>
                    <div className="professional-calc-display">
                      <div className="calc-display-container">
                        <div className="calc-display-value">
                          <span className="calc-value-number">
                            {calculateDrugVolume(true)}
                          </span>
                          <span className="calc-value-unit">mL</span>
                        </div>
                      </div>
                      {/* Volume calculation preview */}
                      <div className="calc-display-preview">
                        <Droplets size={14} className="preview-icon" />
                        <span className="preview-value">
                          {(() => {
                            if (selectedMedicationData?.dosageForm === 'lyophilized') {
                              const vials = calculateSingleDoseVialCombination();
                              if (vials && vials[0]) {
                                const totalVials = vials.reduce((sum, v) => sum + v.count, 0);
                                return `${totalVials} vial${totalVials > 1 ? 's' : ''} × ${vials[0].vial.reconstitutionVolume} mL`;
                              }
                            }
                            return `Volume: ${calculateDrugVolume(true)}`;
                          })()}
                        </span>
                      </div>
                    </div>
                    {/* Orange banner with explanation */}
                    <div className="param-banner orange-banner">
                      <Info size={14} />
                      <span className="banner-text">
                        {(() => {
                          if (selectedMedicationData?.dosageForm === 'lyophilized') {
                            const vials = calculateSingleDoseVialCombination();
                            if (vials && vials[0]) {
                              return `Reconstituted at ${vials[0].vial.finalConcentration} mg/mL`;
                            }
                          } else if (selectedMedicationData?.dosageForm === 'solution') {
                            const vials = calculateSingleDoseVialCombination();
                            if (vials && vials[0]) {
                              return `Solution concentration: ${vials[0].vial.concentration} mg/mL`;
                            }
                          }
                          return 'Drug volume calculation';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Parameters Divider */}
              <div className="parameters-divider">
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

                {/* NS Bag Size Card (Read-only) */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Package size={20} />
                    <label className="param-card-label">NS Bag Size (mL)</label>
                  </div>
                  <input
                    type="text"
                    value={calculateSalineBagSize() || 'Enter weight'}
                    readOnly
                    className="supply-input"
                    style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                  />
                </div>

                {/* Overfill Value Card (Read-only) */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Plus size={20} />
                    <label className="param-card-label">Overfill Value (mL)</label>
                  </div>
                  <input
                    type="text"
                    value={calculateSalineBagSize() ? getOverfillValue(calculateSalineBagSize()) : '0'}
                    readOnly
                    className="supply-input"
                    style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                  />
                </div>

                {/* Total Time Card (Read-only) */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Clock size={20} />
                    <label className="param-card-label">Total Time</label>
                  </div>
                  <input
                    type="text"
                    value={
                      inputs.totalInfusionTime.hours || inputs.totalInfusionTime.minutes
                        ? `${inputs.totalInfusionTime.hours || '0'}h ${inputs.totalInfusionTime.minutes || '0'}m`
                        : 'Not set'
                    }
                    readOnly
                    className="supply-input"
                    style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                  />
                </div>

                {/* Infusion Rate Card (Read-only) */}
                <div className="param-card">
                  <div className="param-card-icon">
                    <Activity size={20} />
                    <label className="param-card-label">Rate (mL/hr)</label>
                  </div>
                  <input
                    type="text"
                    value={inputs.infusionRate ? `${inputs.infusionRate} mL/hr` : 'Not set'}
                    readOnly
                    className="supply-input"
                    style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Infusion Mode Card - Professional Medical Toggle */}
              <div className="infusion-mode-card">
                <div className="infusion-mode-header">
                  <div className="param-card-icon">
                    <Settings size={20} />
                    <label className="param-card-label">Infusion Preparation Method</label>
                  </div>
                  <div className="infusion-mode-info">
                    <Info size={14} />
                    <span className="mode-info-text">
                      {inputs.infusionMode === 'removeOverfill' ? 
                        'Remove overfill from NS bag before adding drug' : 
                        'Add drug to empty sterile container'}
                    </span>
                  </div>
                </div>
                
                <div className="professional-toggle-container">
                  <div className="toggle-option left">
                    <Package size={18} />
                    <span>Remove Overfill</span>
                  </div>
                  
                  <div className="medical-toggle-switch">
                    <input
                      type="checkbox"
                      id="infusion-mode-toggle"
                      className="toggle-input"
                      checked={inputs.infusionMode === 'addToEmptyBag'}
                      onChange={(e) => handleInputChange('infusionMode', e.target.checked ? 'addToEmptyBag' : 'removeOverfill')}
                    />
                    <label htmlFor="infusion-mode-toggle" className="toggle-label">
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="toggle-option right">
                    <FlaskConical size={18} />
                    <span>Empty Container</span>
                  </div>
                </div>
                
                {/* Dynamic Volume Preview */}
                <div className="infusion-mode-preview">
                  <div className="preview-item">
                    <span className="preview-label">Volume to Remove:</span>
                    <span className="preview-value">
                      {(() => {
                        if (inputs.infusionMode === 'addToEmptyBag') {
                          return '0 mL (Not applicable)';
                        } else {
                          const drugVolume = parseFloat(calculateDrugVolume(true)) || 0;
                          const bagSize = calculateSalineBagSize() || 0;
                          const overfillValue = getOverfillValue(bagSize) || 0;
                          let volumeToRemove = 0;
                          
                          // Match the main calculation logic
                          if (selectedMedication === 'ELAPRASE') {
                            volumeToRemove = overfillValue;
                          } else {
                            volumeToRemove = drugVolume + overfillValue;
                          }
                          
                          // Round up to nearest 5 mL for easier measurement
                          volumeToRemove = Math.ceil(volumeToRemove / 5) * 5;
                          
                          return volumeToRemove > 0 ? `${volumeToRemove} mL` : '0 mL';
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Removed Custom Infusion Steps Toggle - Now controlled by button */}
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
                    <span>Duration: {customStepsValidation.stepDurationTotal} min</span>
                  </div>
                ) : (
                  <div className="validation-indicator invalid">
                    <X size={16} />
                    <span>Duration: {customStepsValidation.stepDurationTotal} min</span>
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
                      <div>✓ Total duration: {customStepsValidation.stepDurationTotal?.toFixed(0)} min = {(parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + (parseInt(inputs.totalInfusionTime.minutes) || 0)} min</div>
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
                <div className="result-card">
                  <div className="result-icon">
                    <Calculator size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">PRESCRIBED DOSE</div>
                    <div className="result-value">{formatNumber(results.prescribedDose)} {results.doseUnit.replace('/kg', '')}</div>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon">
                    <Check size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">ACTUAL DOSE</div>
                    <div className="result-value">{formatNumber(results.actualDose)} {results.doseUnit.replace('/kg', '')}</div>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon">
                    <Package size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">TOTAL VIALS</div>
                    <div className="result-value">{results.totalVials}</div>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon">
                    <Droplets size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">DRUG VOLUME</div>
                    <div className="result-value">{results.drugVolume} mL</div>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon">
                    <FlaskConical size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">SALINE BAG</div>
                    <div className="result-value">{results.bagSize} mL</div>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon">
                    <Minus size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">VOLUME TO REMOVE</div>
                    <div className="result-value volume-remove">{results.volumeToRemove} mL</div>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon">
                    <Activity size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">INFUSION RATE</div>
                    <div className="result-value">{results.infusionRate} mL/hr</div>
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-icon">
                    <Clock size={24} />
                  </div>
                  <div className="result-content">
                    <div className="result-label">TOTAL TIME</div>
                    <div className="result-value">{results.totalTimeFormatted}</div>
                  </div>
                </div>
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
          <div className="action-container-header">
            <h3>
              <Activity size={20} />
              Calculate Infusion Parameters
            </h3>
            <p className="action-container-description">
              Choose your calculation method based on your infusion requirements
            </p>
          </div>
          
          <div className="professional-action-buttons">
            {/* Reset Button */}
            <div className="action-button-wrapper reset-wrapper">
              <button 
                className="professional-action-btn reset-btn"
                onClick={resetCalculator}
                title="Clear all inputs and start over"
              >
                <div className="btn-icon-wrapper">
                  <X size={20} />
                </div>
                <div className="btn-content">
                  <span className="btn-label">Reset Form</span>
                  <span className="btn-description">Clear all inputs</span>
                </div>
              </button>
            </div>
            
            {/* Calculate Fixed Infusion Button */}
            <div className="action-button-wrapper calculate-wrapper">
              <button 
                className={`professional-action-btn calculate-fixed-btn ${theme === 'light' ? 'force-dark-text' : ''}`}
                onClick={() => {
                  if (!canCalculateFixed()) {
                    setFixedInfusionError('Please fill in all required fields including infusion rate');
                    setTimeout(() => setFixedInfusionError(''), 5000);
                  } else {
                    setFixedInfusionError('');
                    calculatePumpSettings();
                  }
                }}
                disabled={!selectedMedicationData || !inputs.patientWeight || !inputs.dose}
                title="Calculate using standard infusion parameters"
              >
                <div className="btn-icon-wrapper icon-primary">
                  <Calculator size={20} />
                </div>
                <div className="btn-content">
                  <span 
                    className="btn-label" 
                    ref={el => {
                      if (el) {
                        el.style.setProperty('color', theme === 'light' ? '#000000' : '#ffffff', 'important');
                      }
                    }}
                    key={`fixed-label-${theme}`}
                  >
                    Fixed Rate Infusion
                  </span>
                  <span 
                    className="btn-description"
                    ref={el => {
                      if (el) {
                        el.style.setProperty('color', theme === 'light' ? '#666666' : '#cccccc', 'important');
                      }
                    }}
                  >
                    Use standard protocol
                  </span>
                </div>
                {!selectedMedicationData || !inputs.patientWeight || !inputs.dose ? (
                  <div className="btn-status disabled">
                    <Info size={14} />
                    <span>Fill required fields</span>
                  </div>
                ) : (
                  <div className="btn-status ready">
                    <Check size={14} />
                    <span>Ready</span>
                  </div>
                )}
              </button>
            </div>
            
            {/* Calculate Custom Infusion Button */}
            <div className="action-button-wrapper calculate-wrapper">
              <button 
                className={`professional-action-btn calculate-custom-btn ${theme === 'light' ? 'force-dark-text' : ''}`}
                onClick={() => {
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
                title="Set up custom infusion steps with variable rates"
              >
                <div className="btn-icon-wrapper icon-primary">
                  <Settings size={20} />
                </div>
                <div className="btn-content">
                  <span 
                    className="btn-label"
                    ref={el => {
                      if (el) {
                        el.style.setProperty('color', theme === 'light' ? '#000000' : '#ffffff', 'important');
                      }
                    }}
                  >
                    Custom Steps Infusion
                  </span>
                  <span 
                    className="btn-description"
                    ref={el => {
                      if (el) {
                        el.style.setProperty('color', theme === 'light' ? '#666666' : '#cccccc', 'important');
                      }
                    }}
                  >
                    Variable rate protocol
                  </span>
                </div>
                {!selectedMedicationData || !inputs.patientWeight || !inputs.dose ? (
                  <div className="btn-status disabled">
                    <Info size={14} />
                    <span>Fill required fields</span>
                  </div>
                ) : inputs.useCustomSteps && !customStepsValidation.isAcceptable ? (
                  <div className="btn-status warning">
                    <AlertCircle size={14} />
                    <span>Fix validation errors</span>
                  </div>
                ) : (
                  <div className="btn-status ready">
                    <Check size={14} />
                    <span>{inputs.useCustomSteps ? 'Calculate' : 'Setup'}</span>
                  </div>
                )}
              </button>
            </div>
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
                      </div>
                      
                      <div className="combinations-list">
                        {allCombinations.filter(combo => combo.isOptimal).map((combo, index) => (
                          <div 
                            key={index} 
                            className="combination-option optimal"
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
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedesignedPumpCalculator;