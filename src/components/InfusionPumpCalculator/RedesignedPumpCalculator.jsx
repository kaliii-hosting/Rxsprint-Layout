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
  Settings
} from 'lucide-react';
import './RedesignedPumpCalculator.css';
import pumpDatabase from '../../pages/Pump/pump-database.json';
import pumpLogic from '../../pages/Pump/pump-logic.json';

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
          <span className="dose-percentage">{doseSafety.percentage}% of standard</span>
          <span className="standard-dose">
            Standard: {standardDose?.value || 'N/A'} {standardDose?.unit || ''}
          </span>
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
    infusionRate: '' // For manual infusion rate input
  });
  
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [errors, setErrors] = useState({});

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

  // Auto-update dose unit when medication changes
  useEffect(() => {
    if (selectedMedicationData?.standardDose?.unit) {
      const medicationUnit = selectedMedicationData.standardDose.unit;
      setInputs(prev => ({
        ...prev,
        doseUnit: medicationUnit
      }));
    }
  }, [selectedMedicationData]);

  // Calculate dose safety classification
  const getDoseSafety = useCallback(() => {
    if (!inputs.dose || !selectedMedicationData?.standardDose?.value) {
      return { classification: 'unknown', ratio: 0, color: '#6c757d' };
    }

    const prescribedDose = parseFloat(inputs.dose);
    const standardDose = selectedMedicationData.standardDose.value;
    const doseRatio = prescribedDose / standardDose;

    // Based on pump-database.json configuration.doseClassification
    if (doseRatio < 0.8) {
      return {
        classification: 'low',
        label: 'LOW DOSE',
        ratio: doseRatio,
        color: '#856404', // Brown/amber
        percentage: Math.round(doseRatio * 100)
      };
    } else if (doseRatio >= 0.8 && doseRatio <= 1.2) {
      return {
        classification: 'correct',
        label: 'CORRECT DOSE',
        ratio: doseRatio,
        color: '#155724', // Green
        percentage: Math.round(doseRatio * 100)
      };
    } else {
      return {
        classification: 'high',
        label: 'HIGH DOSE',
        ratio: doseRatio,
        color: '#721c24', // Red
        percentage: Math.round(doseRatio * 100)
      };
    }
  }, [inputs.dose, selectedMedicationData]);

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
      // For lyophilized powders, use reconstitution volume
      vialCombination.forEach(item => {
        const reconVolume = item.vial.reconstitutionVolume || item.vial.withdrawVolume || 0;
        totalVolume += item.count * reconVolume;
      });
    } else {
      // For solutions, use the actual vial volume
      vialCombination.forEach(item => {
        totalVolume += item.count * (item.vial.volume || 0);
      });
    }
    
    // Apply rounding rules from pump logic
    if (totalVolume > 10) {
      // Round up to nearest 2.5 or 5 mL
      if (totalVolume <= 50) {
        totalVolume = Math.ceil(totalVolume / 2.5) * 2.5;
      } else {
        totalVolume = Math.ceil(totalVolume / 5) * 5;
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

  // Calculate infusion steps based on medication protocol
  const calculateInfusionSteps = useCallback((totalVolume, totalTimeMinutes, infusionRate) => {
    if (!selectedMedicationData || !totalVolume || !totalTimeMinutes) return [];

    const steps = [];
    const flushVolume = parseFloat(inputs.flushVolume) || 10;
    const remainingVolume = totalVolume - flushVolume;
    const flushDuration = Math.round((flushVolume / infusionRate) * 60);
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
  }, [selectedMedicationData, inputs.patientWeight, inputs.flushVolume, inputs.infusionRate]);

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

    // Calculate infusion rate
    const infusionRate = inputs.infusionRate ? 
      parseFloat(inputs.infusionRate) : 
      calculateInfusionRate(totalVolume, totalMinutes);

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
      infusionRate: ''
    });
    setSelectedMedication(null);
    setResults(null);
    setShowResults(false);
    setErrors({});
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

              {selectedMedicationData && (
                <>
                  {/* Original Infusion Rate */}
                  <div className="setup-item">
                    <label className="section-label">Original Infusion Rate</label>
                    <div className="info-display">
                      <Info size={16} />
                      <span>{selectedMedicationData.infusionRate || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Saline Bag Size */}
                  <div className="setup-item">
                    <label className="section-label">NS Bag Size</label>
                    <div className="info-display">
                      <Package size={16} />
                      <span>{calculateSalineBagSize() || 'Enter weight'} mL</span>
                    </div>
                  </div>

                  {/* Overfill Value */}
                  <div className="setup-item">
                    <label className="section-label">Overfill Value</label>
                    <div className="info-display">
                      <Droplets size={16} />
                      <span>{calculateSalineBagSize() ? getOverfillValue(calculateSalineBagSize()) : '0'} mL</span>
                    </div>
                  </div>

                  {/* Infusion Steps Info */}
                  <div className="setup-item">
                    <label className="section-label">Infusion Steps Protocol</label>
                    <div className="info-display">
                      <Activity size={16} />
                      <span>
                        {selectedMedicationData.infusionSteps?.weightBased ? 
                          'Weight-based steps' : 
                          selectedMedicationData.infusionSteps?.defaultInfusion ? 
                            'Constant rate' : 
                            'Step-wise infusion'}
                      </span>
                    </div>
                  </div>
                </>
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

              {/* Dose Safety Indicator */}
              {selectedMedicationData && inputs.dose && (
                <div className="dose-item dose-safety-section">
                  <label className="section-label">Dose Safety</label>
                  <DoseSafetyIndicator 
                    doseSafety={getDoseSafety()} 
                    standardDose={selectedMedicationData?.standardDose}
                  />
                </div>
              )}

              {/* Total Infusion Time */}
              <div className="dose-item">
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
              <div className="dose-item">
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

              {/* Infusion Rate (Manual Override) */}
              <div className="dose-item">
                <label className="section-label">Infusion Rate (mL/hr) - Optional</label>
                <input
                  type="number"
                  value={inputs.infusionRate}
                  onChange={(e) => handleInputChange('infusionRate', e.target.value)}
                  placeholder="Auto-calculate"
                  className="supply-input"
                />
                <span className="helper-text">Leave blank to auto-calculate</span>
              </div>

              {/* Calculated Values Display */}
              {inputs.dose && inputs.patientWeight && selectedMedicationData && (
                <div className="dose-item calculated-values">
                  <div className="calculated-item">
                    <span className="calc-label">Total Dose:</span>
                    <span className="calc-value">
                      {formatNumber(
                        inputs.doseUnit.includes('/kg') ? 
                          parseFloat(inputs.dose) * parseFloat(inputs.patientWeight) : 
                          parseFloat(inputs.dose)
                      )} {inputs.doseUnit.replace('/kg', '')}
                    </span>
                  </div>
                  <div className="calculated-item">
                    <span className="calc-label">Total Vials:</span>
                    <span className="calc-value">
                      {calculateVialCombination() ? 
                        calculateVialCombination().reduce((sum, item) => sum + item.count, 0) : 
                        '0'} vials
                    </span>
                  </div>
                  <div className="calculated-item">
                    <span className="calc-label">Drug Volume:</span>
                    <span className="calc-value">{calculateDrugVolume()} mL</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Parameters Section */}
        <div className="calculator-section">
          <div className="section-header">
            <Settings size={20} />
            <h3>Additional Parameters</h3>
          </div>
          <div className="section-content">
            <div className="params-grid">
              {/* Prime Volume */}
              <div className="param-item">
                <label className="section-label">Prime Volume (mL)</label>
                <input
                  type="number"
                  value={inputs.primeVolume}
                  onChange={(e) => handleInputChange('primeVolume', e.target.value)}
                  placeholder="10"
                  className="supply-input"
                />
              </div>

              {/* Flush Volume */}
              <div className="param-item">
                <label className="section-label">Flush Volume (mL)</label>
                <input
                  type="number"
                  value={inputs.flushVolume}
                  onChange={(e) => handleInputChange('flushVolume', e.target.value)}
                  placeholder="10"
                  className="supply-input"
                />
              </div>

              {/* Infusion Mode */}
              <div className="param-item infusion-mode">
                <label className="section-label">Infusion Mode</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="infusionMode"
                      value="removeOverfill"
                      checked={inputs.infusionMode === 'removeOverfill'}
                      onChange={(e) => handleInputChange('infusionMode', e.target.value)}
                    />
                    <span className="radio-label">Remove Overfill</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="infusionMode"
                      value="addToEmptyBag"
                      checked={inputs.infusionMode === 'addToEmptyBag'}
                      onChange={(e) => handleInputChange('infusionMode', e.target.value)}
                    />
                    <span className="radio-label">Add to Empty Bag</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="calculator-section action-section">
          <div className="action-buttons">
            <button 
              className="calculate-btn primary"
              onClick={calculatePumpSettings}
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
              </div>

              {/* Vial Breakdown */}
              {results.vialCombination && results.vialCombination.length > 0 && (
                <div className="vial-breakdown">
                  <h4>Vial Breakdown:</h4>
                  <div className="vial-list">
                    {results.vialCombination.map((item, index) => (
                      <div key={index} className="vial-item">
                        <Check size={16} className="check-icon" />
                        <span>{item.count} × {item.vial.strength} {item.vial.unit} vials</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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