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
const DoseSafetyIndicator = ({ doseSafety, standardDose }) => {
  return (
    <div className="dose-safety-indicator">
      <div className="dose-safety-title">DOSE SAFETY</div>
      <div className="dose-safety-bar">
        <div className={`dose-zone low-dose ${doseSafety.classification === 'low' ? 'active' : ''}`}>
          <span className="zone-label">LOW DOSE</span>
        </div>
        <div className={`dose-zone correct-dose ${doseSafety.classification === 'correct' ? 'active' : ''}`}>
          <span className="zone-label">CORRECT DOSE</span>
        </div>
        <div className={`dose-zone high-dose ${doseSafety.classification === 'high' ? 'active' : ''}`}>
          <span className="zone-label">HIGH DOSE</span>
        </div>
      </div>
      {doseSafety.classification !== 'unknown' && (
        <div className="dose-safety-info">
          <div className="dose-info-row">
            <span className="dose-percentage">{doseSafety.percentage}% of standard</span>
            <span className="standard-dose">
              Standard: {standardDose?.value || 'N/A'} {standardDose?.unit || ''}
              {standardDose?.range && (
                <span className="dose-range"> (Range: {standardDose.range.min}-{standardDose.range.max})</span>
              )}
            </span>
          </div>
          {doseSafety.label && doseSafety.label !== doseSafety.classification.toUpperCase() + ' DOSE' && (
            <div className="dose-status-label">{doseSafety.label}</div>
          )}
          {doseSafety.rangeInfo && (
            <div className="dose-range-info">{doseSafety.rangeInfo}</div>
          )}
        </div>
      )}
    </div>
  );
};

const RedesignedPumpCalculator = () => {
  // Core state
  const [inputs, setInputs] = useState({
    patientWeight: '',
    dose: '',
    doseUnit: 'mg/kg',
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

  // Calculate dose safety classification
  const getDoseSafety = useCallback(() => {
    if (!inputs.dose || !selectedMedicationData || !selectedMedicationData.standardDose) {
      return { classification: 'unknown', ratio: 0, color: '#6c757d' };
    }

    const prescribedDose = parseFloat(inputs.dose);
    if (isNaN(prescribedDose) || prescribedDose <= 0) {
      return { classification: 'unknown', ratio: 0, color: '#6c757d' };
    }

    const medicationDosing = selectedMedicationData.standardDose;
    const weight = parseFloat(inputs.patientWeight) || 0;
    
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
  }, [inputs.dose, inputs.doseUnit, inputs.patientWeight, selectedMedicationData]);

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
  }, [getDoseSafety, inputs.dose, inputs.doseUnit, selectedMedication, selectedMedicationData]);

  // Calculate correct dose based on patient weight and medication standard dose
  const calculateCorrectDose = useCallback(() => {
    if (!selectedMedicationData || !inputs.patientWeight) return null;
    
    const weight = parseFloat(inputs.patientWeight);
    const medicationDosing = selectedMedicationData.standardDose;
    
    if (!medicationDosing) return null;
    
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
      return {
        dose: standardDose,
        unit: medicationDosing.unit,
        totalDose: standardDose * weight,
        totalUnit: medicationDosing.unit.replace('/kg', '')
      };
    } else {
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

  // Update custom infusion step
  const updateCustomStep = (id, field, value) => {
    setCustomInfusionSteps(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  // Validate custom infusion steps
  const validateCustomSteps = useCallback(() => {
    if (!inputs.useCustomSteps || customInfusionSteps.length === 0) {
      return { volumeValid: true, durationValid: true, stepsValid: [] };
    }

    // Check if only 2 steps exist (until infusion complete + flush)
    if (customInfusionSteps.length === 2) {
      return {
        volumeValid: false,
        durationValid: false,
        stepsValid: [],
        stepVolumeTotal: 0,
        stepDurationTotal: 0,
        hasRemainderStep: false,
        hasFlushStep: false,
        validationMethod: 'none',
        isAcceptable: false,
        tooFewSteps: true
      };
    }

    const totalVolume = parseFloat(inputs.totalInfusionVolume) || 0;
    const totalMinutes = (parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + 
                        (parseInt(inputs.totalInfusionTime.minutes) || 0);
    const flushVolume = parseFloat(inputs.flushVolume) || 10;

    // Calculate totals from custom steps
    let stepVolumeTotal = 0;
    let stepDurationTotal = 0;
    let hasRemainderStep = false;
    let hasFlushStep = false;
    const stepsValidation = [];

    customInfusionSteps.forEach((step, index) => {
      const isLastStep = index === customInfusionSteps.length - 1;
      const isSecondToLast = index === customInfusionSteps.length - 2;
      
      let volume = 0;
      let duration = 0;
      const rate = parseFloat(step.rate) || 0;

      // Handle different duration types
      if (isSecondToLast && customInfusionSteps.length > 1) {
        // Second to last step - use manual volume, auto-calculate duration
        volume = parseFloat(step.volume) || 0;
        const otherStepsDuration = customInfusionSteps
          .filter((s, i) => i !== index)
          .reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
        duration = totalMinutes - otherStepsDuration;
        hasRemainderStep = true;
      } else if (isLastStep && step.isFlush) {
        // Last step is flush - use manual volume, calculate duration
        volume = parseFloat(step.volume) || 0;
        duration = rate > 0 ? (volume / rate) * 60 : 0;
        hasFlushStep = true;
      } else {
        // All other steps - manual volume and duration
        volume = parseFloat(step.volume) || 0;
        duration = parseFloat(step.duration) || 0;
      }

      stepVolumeTotal += volume;
      stepDurationTotal += duration;

      // Validate individual step
      const stepValid = {
        id: step.id,
        volumeValid: volume > 0,
        durationValid: duration > 0 || (isSecondToLast && customInfusionSteps.length > 1) || (isLastStep && step.isFlush),
        rateValid: rate > 0,
        rateMatchesVolume: Math.abs((rate * duration / 60) - volume) < 0.1, // Allow small rounding difference
        calculatedVolume: volume,
        calculatedDuration: duration
      };
      
      stepsValidation.push(stepValid);
    });

    // Validate totals
    const volumeValid = Math.abs(stepVolumeTotal - totalVolume) < 0.1; // Allow small rounding difference
    const durationValid = Math.abs(stepDurationTotal - totalMinutes) < 1; // Allow 1 minute difference

    // Determine validation method and overall validity
    let validationMethod = 'none';
    let isAcceptable = false;
    
    if (hasRemainderStep) {
      // If has remainder step, volume validation is primary
      validationMethod = 'volume';
      isAcceptable = volumeValid;
    } else if (volumeValid && durationValid) {
      // Both match - best case
      validationMethod = 'both';
      isAcceptable = true;
    } else if (volumeValid) {
      // Only volume matches
      validationMethod = 'volume';
      isAcceptable = true;
    } else if (durationValid) {
      // Only duration matches
      validationMethod = 'duration';
      isAcceptable = true;
    }

    return {
      volumeValid,
      durationValid,
      stepsValid: stepsValidation,
      stepVolumeTotal,
      stepDurationTotal,
      hasRemainderStep,
      hasFlushStep,
      validationMethod,
      isAcceptable
    };
  }, [inputs.useCustomSteps, inputs.totalInfusionVolume, inputs.totalInfusionTime, inputs.flushVolume, customInfusionSteps]);

  // Update validation when custom steps change
  useEffect(() => {
    if (inputs.useCustomSteps) {
      const validation = validateCustomSteps();
      setCustomStepsValidation(validation);
    }
  }, [inputs.useCustomSteps, customInfusionSteps, inputs.totalInfusionVolume, inputs.totalInfusionTime, validateCustomSteps]);


  // Calculate vial combination
  const calculateVialCombination = useCallback(() => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) return null;

    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    
    let totalDose;
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      totalDose = dose * weight;
    } else {
      totalDose = dose;
    }

    const vialSizes = selectedMedicationData.vialSizes;
    if (!vialSizes || vialSizes.length === 0) return null;

    // For medications with multiple vial sizes, optimize combination
    if (vialSizes.length > 1) {
      const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);
      const combination = [];
      let remainingDose = totalDose;

      for (const vial of sortedVials) {
        const vialCount = Math.floor(remainingDose / vial.strength);
        if (vialCount > 0) {
          combination.push({ vial, count: vialCount });
          remainingDose -= vialCount * vial.strength;
        }
      }

      // Handle remaining dose
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
    } else {
      // Single vial size
      const vial = vialSizes[0];
      const vialCount = Math.ceil(totalDose / vial.strength);
      return [{ vial, count: vialCount }];
    }
  }, [selectedMedicationData, inputs.dose, inputs.patientWeight, inputs.doseUnit]);

  // Calculate drug volume
  const calculateDrugVolume = useCallback(() => {
    if (!selectedMedicationData || !calculateVialCombination()) return 0;
    
    const vialCombination = calculateVialCombination();
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
  }, [selectedMedicationData, calculateVialCombination]);

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
      ((parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + (parseInt(inputs.totalInfusionTime.minutes) || 0)) > 0 &&
      inputs.infusionRate &&
      parseFloat(inputs.infusionRate) > 0
    );
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
    }

    // Validate infusion rate is mandatory
    if (!inputs.infusionRate || parseFloat(inputs.infusionRate) <= 0) {
      newErrors.infusionRate = 'Please enter a valid infusion rate';
    }

    // Validate custom steps if enabled
    if (inputs.useCustomSteps) {
      const validation = validateCustomSteps();
      if (validation.tooFewSteps) {
        newErrors.customSteps = 'At least 3 infusion steps are required (minimum 1 standard step + until infusion complete + flush)';
      } else if (!validation.volumeValid) {
        newErrors.customSteps = 'Total volume of custom steps must equal total infusion volume';
      } else if (!validation.durationValid) {
        newErrors.customSteps = 'Total duration of custom steps must equal total infusion time';
      } else {
        // Check if any individual step is invalid
        const hasInvalidStep = validation.stepsValid.some(step => 
          !step.volumeValid || !step.durationValid || !step.rateValid || !step.rateMatchesVolume
        );
        if (hasInvalidStep) {
          newErrors.customSteps = 'All custom steps must have valid rate, duration, and volume';
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
    const drugVolume = calculateDrugVolume();
    
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

  // Reset calculator
  const resetCalculator = () => {
    setInputs({
      patientWeight: '',
      dose: '',
      doseUnit: 'mg/kg',
      totalInfusionVolume: '',
      primeVolume: '10',
      flushVolume: '10',
      totalInfusionTime: { hours: '', minutes: '' },
      infusionMode: 'removeOverfill',
      infusionRate: '',
      useCustomSteps: false
    });
    setSelectedMedication(null);
    setResults(null);
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
              {/* Dose input row - prescribed and correct dose side by side */}
              <div className="dose-input-row">
                {/* Prescribed Dose */}
                <div className="dose-item">
                  <label className="section-label">Prescribed Dose</label>
                  <div className="dose-input-group">
                    <input
                      type="number"
                      value={inputs.dose}
                      onChange={(e) => handleInputChange('dose', e.target.value)}
                      placeholder="Enter dose"
                      className={`supply-input ${errors.dose ? 'error' : ''}`}
                      step="0.01"
                    />
                    <div className="custom-dropdown dose-unit-dropdown">
                      <select
                        value={inputs.doseUnit}
                        onChange={(e) => handleInputChange('doseUnit', e.target.value)}
                        className="supply-dropdown"
                      >
                        {availableDoseUnits.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                      <ChevronDown size={20} className="dropdown-icon" />
                    </div>
                  </div>
                  {errors.dose && <span className="error-text">{errors.dose}</span>}
                </div>

                {/* Correct Dose Display */}
                <div className="dose-item correct-dose-display">
                  <label className="section-label">Correct Dose for Patient</label>
                  <div className="correct-dose-info">
                    {selectedMedicationData && inputs.patientWeight ? (
                      (() => {
                        const correctDose = calculateCorrectDose();
                        if (!correctDose) return <span className="no-data">N/A</span>;
                        
                        return (
                          <>
                            <div className="correct-dose-value">
                              <span className="dose-number">{correctDose.dose}</span>
                              <span className="dose-unit">{correctDose.unit}</span>
                            </div>
                            {correctDose.totalDose && (
                              <div className="total-dose-value">
                                <span className="total-label">Total:</span>
                                <span className="total-number">{formatNumber(correctDose.totalDose)}</span>
                                <span className="total-unit">{correctDose.totalUnit}</span>
                              </div>
                            )}
                            {correctDose.note && (
                              <span className="dose-note">{correctDose.note}</span>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <span className="no-data">Select medication and enter patient weight</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dose Safety Indicator */}
              {selectedMedicationData && inputs.dose && (
                <div className="dose-item dose-safety-section">
                  <label className="section-label">Dose Safety</label>
                  <DoseSafetyIndicator 
                    doseSafety={doseSafety} 
                    standardDose={selectedMedicationData?.standardDose}
                  />
                </div>
              )}

              {/* Infusion Parameters Cards */}
              <div className="infusion-params-cards">
                {/* Total Infusion Time */}
                <div className="dose-card">
                  <label className="section-label">
                    <Clock size={16} />
                    Total Infusion Time
                  </label>
                  <div className="time-input-row">
                    <div className="time-input-group">
                      <input
                        type="number"
                        value={inputs.totalInfusionTime.hours}
                        onChange={(e) => handleTimeChange('hours', e.target.value)}
                        placeholder="0"
                        className={`supply-input ${errors.totalInfusionTime ? 'error' : ''}`}
                        min="0"
                        max="24"
                      />
                      <span className="time-label">hours</span>
                    </div>
                    <div className="time-input-group">
                      <input
                        type="number"
                        value={inputs.totalInfusionTime.minutes}
                        onChange={(e) => handleTimeChange('minutes', e.target.value)}
                        placeholder="0"
                        className={`supply-input ${errors.totalInfusionTime ? 'error' : ''}`}
                        min="0"
                        max="59"
                      />
                      <span className="time-label">minutes</span>
                    </div>
                  </div>
                  {errors.totalInfusionTime && <span className="error-text">{errors.totalInfusionTime}</span>}
                </div>

                {/* Total Infusion Volume */}
                <div className="dose-card">
                  <label className="section-label">Total Infusion Volume (mL)</label>
                  <input
                    type="number"
                    value={inputs.totalInfusionVolume}
                    onChange={(e) => handleInputChange('totalInfusionVolume', e.target.value)}
                    placeholder="Enter volume"
                    className={`supply-input ${errors.totalInfusionVolume ? 'error' : ''}`}
                  />
                  {errors.totalInfusionVolume && <span className="error-text">{errors.totalInfusionVolume}</span>}
                </div>

                {/* Infusion Rate (Mandatory) */}
                <div className="dose-card">
                  <label className="section-label">Infusion Rate (mL/hr) *</label>
                  <input
                    type="number"
                    value={inputs.infusionRate}
                    onChange={(e) => handleInputChange('infusionRate', e.target.value)}
                    placeholder="Enter rate"
                    className={`supply-input ${errors.infusionRate ? 'error' : ''}`}
                  />
                  {errors.infusionRate && <span className="error-text">{errors.infusionRate}</span>}
                </div>
              </div>

              {/* Calculated Values Cards */}
              {inputs.dose && inputs.patientWeight && selectedMedicationData && (
                <div className="calculated-values-cards">
                  <div className="calc-card">
                    <div className="calc-card-label">Total Dose</div>
                    <div className="calc-card-value">
                      {formatNumber(
                        inputs.doseUnit.includes('/kg') ? 
                          parseFloat(inputs.dose) * parseFloat(inputs.patientWeight) : 
                          parseFloat(inputs.dose)
                      )} {inputs.doseUnit.replace('/kg', '')}
                    </div>
                  </div>
                  <div className="calc-card">
                    <div className="calc-card-label">Total Vials</div>
                    <div className="calc-card-value">
                      {calculateVialCombination() ? 
                        calculateVialCombination().reduce((sum, item) => sum + item.count, 0) : 
                        '0'} vials
                    </div>
                  </div>
                  <div className="calc-card">
                    <div className="calc-card-label">Drug Volume</div>
                    <div className="calc-card-value">
                      {calculateDrugVolume()} mL
                      {selectedMedicationData?.dosageForm === 'lyophilized' && (
                        <div className="calc-card-detail">
                          {(() => {
                            const vials = calculateVialCombination();
                            if (vials && vials[0]) {
                              return `(${vials.reduce((sum, v) => sum + v.count, 0)} × ${vials[0].vial.reconstitutionVolume} mL)`;
                            }
                            return '';
                          })()}
                        </div>
                      )}
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

              {/* Infusion Mode Card */}
              <div className="infusion-mode-card">
                <div className="param-card-icon">
                  <Settings size={20} />
                  <label className="param-card-label">Infusion Mode</label>
                </div>
                <div className="infusion-mode-options">
                  <div 
                    className={`mode-option ${inputs.infusionMode === 'removeOverfill' ? 'active' : ''}`}
                    onClick={() => handleInputChange('infusionMode', 'removeOverfill')}
                  >
                    <div className="mode-option-icon">🧪</div>
                    <div className="mode-option-label">Remove Overfill</div>
                  </div>
                  <div 
                    className={`mode-option ${inputs.infusionMode === 'addToEmptyBag' ? 'active' : ''}`}
                    onClick={() => handleInputChange('infusionMode', 'addToEmptyBag')}
                  >
                    <div className="mode-option-icon">💉</div>
                    <div className="mode-option-label">Add to Empty Bag</div>
                  </div>
                </div>
              </div>

              {/* Custom Infusion Steps Toggle Button */}
              <div className="dose-item custom-steps-toggle">
                <button
                  className={`custom-steps-button ${inputs.useCustomSteps ? 'active' : ''}`}
                  onClick={() => handleInputChange('useCustomSteps', !inputs.useCustomSteps)}
                >
                  <Activity size={18} />
                  {inputs.useCustomSteps ? 'Custom Infusion Steps Active' : 'Use Custom Infusion Steps'}
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Custom Infusion Steps Section */}
        {inputs.useCustomSteps && (
          <div className="calculator-section">
            <div className="section-header">
              <Activity size={20} />
              <h3>Custom Infusion Steps</h3>
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
                  const isStepValid = stepValidation.volumeValid && stepValidation.durationValid && 
                                     stepValidation.rateValid && stepValidation.rateMatchesVolume;
                  
                  return (
                    <div key={step.id} className={`custom-step-row ${isStepValid ? 'valid' : ''} ${customStepsValidation.isAcceptable ? 'validation-passed' : ''}`}>
                      <div className="step-number">{index + 1}</div>
                      <div className="step-inputs">
                        <div className="step-input-group">
                          <label>Rate (mL/hr)</label>
                          <input
                            type="number"
                            value={step.rate}
                            onChange={(e) => updateCustomStep(step.id, 'rate', e.target.value)}
                            placeholder="0"
                            className="supply-input"
                          />
                        </div>
                        <div className="step-input-group">
                          <label>Duration (min)</label>
                          {index === customInfusionSteps.length - 2 && customInfusionSteps.length > 1 ? (
                            // Second to last step - always "until infusion complete"
                            <div className="until-infusion-complete-label">
                              Until infusion complete
                            </div>
                          ) : index === customInfusionSteps.length - 1 ? (
                            // Last step - always "Flush"
                            <div className="flush-label">
                              Flush
                            </div>
                          ) : (
                            // All other steps - allow manual duration input
                            <input
                              type="number"
                              value={step.duration}
                              onChange={(e) => updateCustomStep(step.id, 'duration', e.target.value)}
                              placeholder="0"
                              className="supply-input"
                            />
                          )}
                        </div>
                        <div className="step-input-group">
                          <label>Volume (mL)</label>
                          {(
                            <input
                              type="number"
                              value={step.volume}
                              onChange={(e) => updateCustomStep(step.id, 'volume', e.target.value)}
                              placeholder="0"
                              className="supply-input"
                            />
                          )}
                        </div>
                      </div>
                      <div className="step-actions">
                        {isStepValid ? (
                          <div className="step-valid-indicator">
                            <Check size={20} className="valid-icon" />
                          </div>
                        ) : (
                          <div className="step-invalid-indicator">
                            <X size={20} className="invalid-icon" />
                          </div>
                        )}
                        <button
                          className="remove-step-btn"
                          onClick={() => removeCustomStep(step.id)}
                          disabled={customInfusionSteps.length === 1}
                        >
                          <Minus size={16} />
                        </button>
                      </div>
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
              {customStepsValidation.isAcceptable ? (
                <div className="validation-results-section acceptable">
                  <div className="validation-results-header">
                    <Check size={20} className="validation-check" />
                    <h4>Results Acceptable</h4>
                  </div>
                  <div className="validation-method">
                    {customStepsValidation.validationMethod === 'both' && (
                      <span>Validated by: Volume and Duration match</span>
                    )}
                    {customStepsValidation.validationMethod === 'volume' && (
                      <span>Validated by: Volume match ({customStepsValidation.stepVolumeTotal?.toFixed(1)} mL = {inputs.totalInfusionVolume} mL)</span>
                    )}
                    {customStepsValidation.validationMethod === 'duration' && (
                      <span>Validated by: Duration match ({customStepsValidation.stepDurationTotal} min = {(parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + (parseInt(inputs.totalInfusionTime.minutes) || 0)} min)</span>
                    )}
                  </div>
                </div>
              ) : (customStepsValidation.stepsValid.length > 0 || customStepsValidation.tooFewSteps) && (
                <div className="validation-results-section unacceptable">
                  <div className="validation-results-header">
                    <X size={20} className="validation-x" />
                    <h4>Results Unacceptable</h4>
                  </div>
                  <div className="validation-method">
                    {customStepsValidation.tooFewSteps ? (
                      <span>At least 3 infusion steps are required. Currently only {customInfusionSteps.length} steps defined.</span>
                    ) : (
                      <span>
                        Volume: {customStepsValidation.stepVolumeTotal?.toFixed(1)} mL 
                        {customStepsValidation.volumeValid ? ' ✓' : ` (Expected: ${inputs.totalInfusionVolume} mL)`}
                        {' | '}
                        Duration: {customStepsValidation.stepDurationTotal} min
                        {customStepsValidation.durationValid ? ' ✓' : ` (Expected: ${(parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + (parseInt(inputs.totalInfusionTime.minutes) || 0)} min)`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Action Buttons */}
        <div className="calculator-section action-section">
          <div className="action-buttons">
            <button 
              className="calculate-btn primary"
              onClick={calculatePumpSettings}
              disabled={!canCalculate()}
            >
              <Calculator size={16} />
              Calculate Pump Settings
            </button>
            <button 
              className="reset-btn"
              onClick={resetCalculator}
            >
              Reset All
            </button>
          </div>
        </div>

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
                  <div className="result-label">PRESCRIBED DOSE</div>
                  <div className="result-value">{formatNumber(results.prescribedDose)} {results.doseUnit.replace('/kg', '')}</div>
                </div>
                <div className="result-card">
                  <div className="result-label">ACTUAL DOSE</div>
                  <div className="result-value">{formatNumber(results.actualDose)} {results.doseUnit.replace('/kg', '')}</div>
                </div>
                <div className="result-card">
                  <div className="result-label">TOTAL VIALS</div>
                  <div className="result-value">{results.totalVials}</div>
                </div>
                <div className="result-card">
                  <div className="result-label">DRUG VOLUME</div>
                  <div className="result-value">{results.drugVolume} mL</div>
                </div>
                <div className="result-card">
                  <div className="result-label">SALINE BAG</div>
                  <div className="result-value">{results.bagSize} mL</div>
                </div>
                <div className="result-card">
                  <div className="result-label">VOLUME TO REMOVE</div>
                  <div className="result-value volume-remove">{results.volumeToRemove} mL</div>
                </div>
                <div className="result-card">
                  <div className="result-label">INFUSION RATE</div>
                  <div className="result-value">{results.infusionRate} mL/hr</div>
                </div>
                <div className="result-card">
                  <div className="result-label">TOTAL TIME</div>
                  <div className="result-value">{results.totalTimeFormatted}</div>
                </div>
                {/* Vial Breakdown as Result Card */}
                {results.vialCombination && results.vialCombination.length > 0 && (
                  <div className="result-card vial-breakdown-card">
                    <div className="result-label">VIAL BREAKDOWN</div>
                    <div className="vial-breakdown-content">
                      {results.vialCombination.map((item, index) => (
                        <div key={index} className="vial-breakdown-item">
                          <span className="vial-count">{item.count}</span>
                          <span className="vial-multiplier">×</span>
                          <span className="vial-strength">{item.vial.strength} {item.vial.unit}</span>
                        </div>
                      ))}
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
      </div>
    </div>
  );
};

export default RedesignedPumpCalculator;