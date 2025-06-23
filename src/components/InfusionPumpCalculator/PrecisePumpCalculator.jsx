import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Calculator, 
  Beaker, 
  ChevronDown, 
  Check, 
  Activity, 
  Info, 
  AlertCircle,
  Clock,
  Droplets,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import './InfusionPumpCalculator.css';
import pumpDatabase from '../../pages/Pump/pump-database.json';
import pumpLogic from '../../pages/Pump/pump-logic.json';
import DoseSafetyIndicator from '../DoseOdometer/DoseSafetyIndicator';

const PrecisePumpCalculator = () => {
  // Core state - exact fields requested
  const [inputs, setInputs] = useState({
    patientWeight: '',
    dose: '',
    doseUnit: 'mg/kg',
    primeVolume: 10,
    flushVolume: 10,
    totalInfusionVolume: '',
    totalInfusionTime: { hours: '', minutes: '' }, // Optional
    customInfusionRate: '' // Optional
  });
  
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [errors, setErrors] = useState({});
  const [doseValidation, setDoseValidation] = useState(null); // 'low', 'correct', 'high'

  const medications = useMemo(() => {
    return Object.entries(pumpDatabase.medications).map(([key, med]) => ({
      key,
      ...med,
      color: med.brandColor || '#ff5500'
    }));
  }, []);

  const selectedMedicationData = useMemo(() => {
    return selectedMedication ? pumpDatabase.medications[selectedMedication] : null;
  }, [selectedMedication]);

  // Get available dose units based on selected medication
  const availableDoseUnits = useMemo(() => {
    if (!selectedMedicationData?.standardDose?.unit) {
      // Default units when no medication is selected
      return ['mg/kg', 'mg'];
    }

    const medicationUnit = selectedMedicationData.standardDose.unit;
    
    // For weight-based units (e.g., mg/kg, units/kg), also provide absolute units
    if (medicationUnit.includes('/kg')) {
      const baseUnit = medicationUnit.replace('/kg', '');
      return [medicationUnit, baseUnit];
    }
    
    // For absolute units (e.g., mg), also provide weight-based option
    return [medicationUnit, `${medicationUnit}/kg`];
  }, [selectedMedicationData]);

  // Auto-update dose unit when medication changes
  useEffect(() => {
    if (selectedMedicationData?.standardDose?.unit) {
      const medicationUnit = selectedMedicationData.standardDose.unit;
      
      // Set the dose unit to the medication's standard unit
      setInputs(prev => ({
        ...prev,
        doseUnit: medicationUnit
      }));
    }
  }, [selectedMedicationData]);

  // Validate dose against medication protocol
  const validateDose = useCallback(() => {
    if (!selectedMedicationData || !inputs.dose || !inputs.patientWeight) {
      return null;
    }

    const dose = parseFloat(inputs.dose);
    const weight = parseFloat(inputs.patientWeight);
    const standardDose = selectedMedicationData.standardDose;

    if (!standardDose) return null;

    let expectedDose;
    let actualDosePerKg;

    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      actualDosePerKg = dose;
      expectedDose = standardDose.value;
    } else if (inputs.doseUnit === 'mg' || inputs.doseUnit === 'units') {
      actualDosePerKg = dose / weight;
      expectedDose = standardDose.value;
    } else {
      return null;
    }

    // Allow 10% variance for "correct" classification
    const variance = 0.1;
    const lowerBound = expectedDose * (1 - variance);
    const upperBound = expectedDose * (1 + variance);

    if (actualDosePerKg >= lowerBound && actualDosePerKg <= upperBound) {
      return 'correct';
    } else if (actualDosePerKg < lowerBound) {
      return 'low';
    } else {
      return 'high';
    }
  }, [selectedMedicationData, inputs.dose, inputs.patientWeight, inputs.doseUnit]);

  // Calculate optimal vial combination
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

    // Sort vials by strength (largest first) for optimal combination
    const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);
    
    let remainingDose = totalDose;
    let vialCombination = [];
    let totalDrugVolume = 0;

    // Use largest vials first to minimize total number of vials
    for (const vial of sortedVials) {
      const vialsNeeded = Math.floor(remainingDose / vial.strength);
      if (vialsNeeded > 0) {
        vialCombination.push({
          ...vial,
          vialsUsed: vialsNeeded,
          totalStrength: vialsNeeded * vial.strength
        });

        // Calculate volume based on vial type
        if (vial.reconstitutionVolume) {
          // Lyophilized powder
          totalDrugVolume += vialsNeeded * vial.reconstitutionVolume;
        } else {
          // Sterile solution
          totalDrugVolume += vialsNeeded * vial.volume;
        }
        
        remainingDose -= vialsNeeded * vial.strength;
      }
    }

    // Handle remaining dose with smallest available vial if needed
    if (remainingDose > 0.01) { // Small tolerance for floating point
      const smallestVial = sortedVials[sortedVials.length - 1];
      const existingEntry = vialCombination.find(v => v.strength === smallestVial.strength);
      
      if (existingEntry) {
        existingEntry.vialsUsed += 1;
        existingEntry.totalStrength += smallestVial.strength;
      } else {
        vialCombination.push({
          ...smallestVial,
          vialsUsed: 1,
          totalStrength: smallestVial.strength
        });
      }

      if (smallestVial.reconstitutionVolume) {
        totalDrugVolume += smallestVial.reconstitutionVolume;
      } else {
        totalDrugVolume += smallestVial.volume;
      }
    }

    return {
      vialCombination,
      totalDrugVolume,
      totalVialsUsed: vialCombination.reduce((sum, v) => sum + v.vialsUsed, 0),
      totalDoseAchieved: vialCombination.reduce((sum, v) => sum + v.totalStrength, 0)
    };
  }, [selectedMedicationData, inputs.dose, inputs.patientWeight, inputs.doseUnit]);

  // Calculate overfill volume based on bag size and medication rules
  const calculateOverfillVolume = useCallback(() => {
    if (!selectedMedicationData || !inputs.totalInfusionVolume) return 0;

    const totalVolume = parseFloat(inputs.totalInfusionVolume);
    
    // Check medication-specific overfill rules first
    const medicationOverfillRules = selectedMedicationData.overfillRules;
    if (medicationOverfillRules && medicationOverfillRules[totalVolume.toString()]) {
      return medicationOverfillRules[totalVolume.toString()];
    }

    // Fall back to standard overfill rules from pump logic
    const standardOverfillRules = pumpLogic.pumpCalculationLogic.bagSelectionAndOverfill.standardOverfillVolumes;
    if (standardOverfillRules[totalVolume.toString()]) {
      return standardOverfillRules[totalVolume.toString()].overfillRemoval;
    }

    // Default overfill based on common bag sizes
    if (totalVolume <= 50) return 5;
    if (totalVolume <= 100) return 7;
    if (totalVolume <= 150) return 25;
    if (totalVolume <= 250) return 30;
    if (totalVolume <= 500) return 40;
    if (totalVolume <= 1000) return 60;
    
    return 0;
  }, [selectedMedicationData, inputs.totalInfusionVolume]);

  // Calculate infusion parameters with dynamic mode switching
  const calculateInfusionParameters = useCallback(() => {
    if (!selectedMedicationData || !inputs.totalInfusionVolume) return null;

    const vialData = calculateVialCombination();
    if (!vialData) return null;

    const totalVolume = parseFloat(inputs.totalInfusionVolume);
    const drugVolume = vialData.totalDrugVolume;
    const primeVolume = parseInt(inputs.primeVolume) || 10;
    const overfillVolume = calculateOverfillVolume();

    // Determine infusion mode based on medication information
    let removeVolume = 0;
    let addVolume = 0;
    let infusionMode = '';

    // Check if medication has specific mode preferences
    const medicationPreferences = selectedMedicationData.infusionModePreferences;
    const hasOverfillRules = selectedMedicationData.overfillRules && 
                            selectedMedicationData.overfillRules[totalVolume.toString()];

    // Special case for medications like ELAPRASE that don't remove drug volume
    const exceptions = pumpLogic.pumpCalculationLogic.bagSelectionAndOverfill.exceptions;
    const isException = exceptions[selectedMedication] && !exceptions[selectedMedication].removeDrugVolume;

    if (hasOverfillRules || overfillVolume > 0) {
      // Remove overfill mode - preferred when overfill rules exist
      if (isException) {
        // For exceptions like ELAPRASE, only remove overfill, not drug volume
        removeVolume = overfillVolume;
      } else {
        // Standard: remove drug volume + overfill volume
        removeVolume = drugVolume + overfillVolume;
      }
      infusionMode = 'Remove Overfill';
    } else {
      // Add to empty bag mode - when no overfill rules
      addVolume = drugVolume;
      infusionMode = 'Add to Empty Bag';
    }

    // Calculate infusion rate and time
    let infusionRate = null;
    let totalTime = null;

    if (inputs.customInfusionRate) {
      infusionRate = parseFloat(inputs.customInfusionRate);
      const timeInMinutes = totalVolume / infusionRate * 60;
      totalTime = {
        hours: Math.floor(timeInMinutes / 60),
        minutes: Math.round(timeInMinutes % 60)
      };
    } else if (inputs.totalInfusionTime.hours || inputs.totalInfusionTime.minutes) {
      const timeInMinutes = (parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + 
                           (parseInt(inputs.totalInfusionTime.minutes) || 0);
      if (timeInMinutes > 0) {
        infusionRate = Math.floor(totalVolume / timeInMinutes * 60); // Round down for safety
        totalTime = inputs.totalInfusionTime;
      }
    }

    return {
      ...vialData,
      removeVolume,
      addVolume,
      overfillVolume,
      infusionMode,
      infusionRate,
      totalTime,
      primeVolume,
      drugVolume,
      isException
    };
  }, [selectedMedication, selectedMedicationData, inputs, calculateVialCombination, calculateOverfillVolume]);

  // Generate infusion steps based on medication protocol with proper calculations
  const generateInfusionSteps = useCallback(() => {
    if (!selectedMedicationData?.infusionSteps || !inputs.patientWeight || !inputs.totalInfusionVolume) return [];

    const weight = parseFloat(inputs.patientWeight);
    const totalVolume = parseFloat(inputs.totalInfusionVolume);
    const infusionSteps = selectedMedicationData.infusionSteps;
    
    let weightCategory;
    if (infusionSteps.weightBased) {
      weightCategory = weight <= 20 ? '≤20kg' : '>20kg';
    }

    const protocolSteps = infusionSteps.steps[weightCategory] || infusionSteps.steps;
    if (!protocolSteps || !Array.isArray(protocolSteps)) return [];

    // Get infusion parameters for rate calculation
    const infusionParams = calculateInfusionParameters();
    const calculatedRate = infusionParams?.infusionRate;

    // Use calculated rate if available, otherwise use protocol rates
    const flushVolume = parseInt(inputs.flushVolume) || 10; // User-defined flush volume
    const availableVolume = totalVolume - flushVolume;

    let stepsWithCalculations = [];
    let totalTimeUsed = 0;
    let totalVolumeUsed = 0;

    // Process each protocol step
    for (let i = 0; i < protocolSteps.length; i++) {
      const step = protocolSteps[i];
      let stepVolume;
      let stepDuration;
      let stepRate = step.rate;

      if (step.duration === 'remainder' || i === protocolSteps.length - 1) {
        // Last medication step gets remaining volume (excluding flush)
        stepVolume = Math.max(0, availableVolume - totalVolumeUsed);
        
        if (calculatedRate && stepRate) {
          // Use protocol rate but adjust duration for remaining volume
          stepDuration = Math.round(stepVolume / stepRate * 60);
        } else if (calculatedRate) {
          // Use calculated rate for consistent infusion
          stepRate = calculatedRate;
          stepDuration = Math.round(stepVolume / stepRate * 60);
        } else {
          // Fallback to protocol values
          stepDuration = Math.round(stepVolume / stepRate * 60);
        }
      } else {
        // Fixed duration steps
        stepDuration = step.duration;
        stepVolume = Math.round((stepRate * (stepDuration / 60)) * 10) / 10;
      }

      stepsWithCalculations.push({
        ...step,
        stepVolume,
        stepDuration,
        stepNumber: i + 1,
        rate: stepRate
      });

      totalTimeUsed += stepDuration;
      totalVolumeUsed += stepVolume;
    }

    // Add flush step with same rate as final medication step
    const finalMedicationStep = stepsWithCalculations[stepsWithCalculations.length - 1];
    const flushRate = finalMedicationStep?.rate || calculatedRate || 50; // Default rate if none available
    const flushDuration = Math.round(flushVolume / flushRate * 60);

    stepsWithCalculations.push({
      rate: flushRate,
      stepVolume: flushVolume,
      stepDuration: flushDuration,
      description: 'Flush',
      stepNumber: stepsWithCalculations.length + 1,
      rateUnit: 'ml/hr'
    });

    // Calculate total time including flush
    const totalCalculatedTime = totalTimeUsed + flushDuration;

    // Add summary information
    stepsWithCalculations.totalTime = {
      hours: Math.floor(totalCalculatedTime / 60),
      minutes: totalCalculatedTime % 60
    };
    stepsWithCalculations.totalVolume = totalVolume;
    stepsWithCalculations.medicationVolume = totalVolumeUsed;
    stepsWithCalculations.flushVolume = flushVolume;

    return stepsWithCalculations;
  }, [selectedMedicationData, inputs.patientWeight, inputs.totalInfusionVolume, calculateInfusionParameters]);

  // Update dose validation when inputs change
  useEffect(() => {
    setDoseValidation(validateDose());
  }, [validateDose]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTimeChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      totalInfusionTime: {
        ...prev.totalInfusionTime,
        [field]: value
      }
    }));
  };

  // Validation
  const validateInputs = () => {
    const newErrors = {};
    
    if (!inputs.patientWeight || parseFloat(inputs.patientWeight) <= 0) {
      newErrors.patientWeight = 'Patient weight is required';
    }
    
    if (!selectedMedication) {
      newErrors.medication = 'Please select a medication';
    }
    
    if (!inputs.dose || parseFloat(inputs.dose) <= 0) {
      newErrors.dose = 'Dose is required';
    }

    if (!inputs.totalInfusionVolume || parseFloat(inputs.totalInfusionVolume) <= 0) {
      newErrors.totalInfusionVolume = 'Total infusion volume is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Main calculation function
  const performCalculation = () => {
    if (!validateInputs()) return;

    const infusionParams = calculateInfusionParameters();
    const infusionSteps = generateInfusionSteps();
    
    if (!infusionParams) {
      setErrors({ general: 'Unable to calculate infusion parameters' });
      return;
    }

    // Calculate dose per kg
    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.dose);
    let dosePerKg;
    
    if (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') {
      dosePerKg = dose;
    } else {
      dosePerKg = dose / weight;
    }

    const results = {
      // Input summary
      patientWeight: weight,
      prescribedDose: dose,
      doseUnit: inputs.doseUnit,
      dosePerKg: Math.round(dosePerKg * 100) / 100,
      totalInfusionVolume: parseFloat(inputs.totalInfusionVolume),
      primeVolume: inputs.primeVolume,
      
      // Medication info
      drugStrength: selectedMedicationData.vialSizes?.[0]?.strength || 0,
      drugStrengthUnit: selectedMedicationData.vialSizes?.[0]?.unit || 'mg',
      
      // Dose validation
      doseValidation,
      
      // Vial calculations
      vialCombination: infusionParams.vialCombination,
      totalVialsUsed: infusionParams.totalVialsUsed,
      drugVolume: infusionParams.drugVolume,
      
      // Infusion parameters
      removeVolume: infusionParams.removeVolume,
      addVolume: infusionParams.addVolume,
      overfillVolume: infusionParams.overfillVolume,
      infusionMode: infusionParams.infusionMode,
      infusionRate: infusionParams.infusionRate,
      totalTime: infusionParams.totalTime || infusionSteps.totalTime,
      isException: infusionParams.isException,
      
      // Infusion steps
      infusionSteps
    };

    setResults(results);
    setShowResults(true);
    setErrors({});
  };

  // Reset function
  const resetCalculator = () => {
    setInputs({
      patientWeight: '',
      dose: '',
      doseUnit: selectedMedicationData?.standardDose?.unit || 'mg/kg',
      primeVolume: 10,
      flushVolume: 10,
      totalInfusionVolume: '',
      totalInfusionTime: { hours: '', minutes: '' },
      customInfusionRate: ''
    });
    setSelectedMedication(null);
    setResults(null);
    setShowResults(false);
    setErrors({});
    setDoseValidation(null);
  };

  // Dose validation icon
  const DoseValidationIcon = () => {
    switch (doseValidation) {
      case 'correct':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'low':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'high':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="supplies-page">
      <div className="supplies-content">
        <div className="supplies-dashboard">
          
          {/* Medication Selection Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Medication Selection</h3>
              <Beaker size={20} />
            </div>
            <div className="card-body">
              <div className="medication-grid">
                {medications.map((med) => (
                  <div
                    key={med.key}
                    className={`medication-tile ${selectedMedication === med.key ? 'selected' : ''}`}
                    onClick={() => setSelectedMedication(med.key)}
                    style={{ '--medication-color': med.color }}
                  >
                    <div className="medication-icon" style={{ backgroundColor: med.color }}>
                      <Beaker />
                    </div>
                    <div className="medication-name">{med.brandName}</div>
                    {selectedMedication === med.key && (
                      <Check className="check-icon" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Input Parameters Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Calculation Parameters</h3>
              <Calculator size={20} />
            </div>
            <div className="card-body">
              <div className="input-grid">
                <div className="input-group">
                  <label>Patient Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.patientWeight}
                    onChange={(e) => handleInputChange('patientWeight', e.target.value)}
                    placeholder="Enter weight"
                    className="supply-input"
                  />
                  {errors.patientWeight && <span className="error-text">{errors.patientWeight}</span>}
                </div>

                <div className="input-group">
                  <label>
                    Dose *
                    <DoseValidationIcon />
                    {doseValidation === 'low' && <span className="validation-text low">Below Standard</span>}
                    {doseValidation === 'high' && <span className="validation-text high">Above Standard</span>}
                    {doseValidation === 'correct' && <span className="validation-text correct">Correct</span>}
                  </label>
                  <div className="dose-input-group">
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.dose}
                      onChange={(e) => handleInputChange('dose', e.target.value)}
                      placeholder="Enter dose"
                      className="supply-input"
                    />
                    <div className="custom-dropdown">
                      <select
                        value={inputs.doseUnit}
                        onChange={(e) => handleInputChange('doseUnit', e.target.value)}
                        className="supply-dropdown"
                      >
                        {availableDoseUnits.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                      <ChevronDown className="dropdown-icon" size={16} />
                    </div>
                  </div>
                  {errors.dose && <span className="error-text">{errors.dose}</span>}
                </div>

                <div className="input-group">
                  <label>Prime Volume (mL)</label>
                  <input
                    type="number"
                    value={inputs.primeVolume}
                    onChange={(e) => handleInputChange('primeVolume', parseInt(e.target.value) || 0)}
                    placeholder="Default: 10"
                    className="supply-input"
                  />
                </div>

                <div className="input-group">
                  <label>Flush Volume (mL)</label>
                  <input
                    type="number"
                    value={inputs.flushVolume}
                    onChange={(e) => handleInputChange('flushVolume', parseInt(e.target.value) || 0)}
                    placeholder="Default: 10"
                    className="supply-input"
                  />
                </div>

                <div className="input-group">
                  <label>Total Infusion Volume (mL) *</label>
                  <input
                    type="number"
                    value={inputs.totalInfusionVolume}
                    onChange={(e) => handleInputChange('totalInfusionVolume', e.target.value)}
                    placeholder="Enter volume"
                    className="supply-input"
                  />
                  {errors.totalInfusionVolume && <span className="error-text">{errors.totalInfusionVolume}</span>}
                </div>
              </div>

              {/* Optional Parameters */}
              <h4 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Optional Parameters
              </h4>
              <div className="input-grid">
                <div className="input-group">
                  <label>Total Infusion Time (Optional)</label>
                  <div className="time-input-group">
                    <input
                      type="number"
                      value={inputs.totalInfusionTime.hours}
                      onChange={(e) => handleTimeChange('hours', e.target.value)}
                      placeholder="Hours"
                      className="supply-input time-input"
                    />
                    <span className="time-separator">:</span>
                    <input
                      type="number"
                      value={inputs.totalInfusionTime.minutes}
                      onChange={(e) => handleTimeChange('minutes', e.target.value)}
                      placeholder="Minutes"
                      className="supply-input time-input"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Custom Infusion Rate (mL/hr) (Optional)</label>
                  <input
                    type="number"
                    value={inputs.customInfusionRate}
                    onChange={(e) => handleInputChange('customInfusionRate', e.target.value)}
                    placeholder="Will be calculated if not provided"
                    className="supply-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="reset-btn" onClick={resetCalculator}>
              Reset All
            </button>
            <button 
              className="calculate-btn"
              onClick={performCalculation}
              disabled={!selectedMedication || !inputs.patientWeight || !inputs.dose || !inputs.totalInfusionVolume}
            >
              Calculate Infusion
            </button>
          </div>

          {/* Results Dashboard */}
          {showResults && results && (
            <div className="results-dashboard">
              <div className="results-header">
                <h2>Calculation Results</h2>
                {/* Dose Safety Indicator */}
                <div className="dose-indicator-container">
                  <DoseSafetyIndicator 
                    doseStatus={results.doseValidation} 
                    value={results.dosePerKg}
                    title="DOSE SAFETY"
                  />
                </div>
              </div>

              {/* Summary Information Card */}
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>Summary Information</h3>
                  <Info size={20} />
                </div>
                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-label">Drug Strength</div>
                      <div className="info-value">{results.drugStrength} {results.drugStrengthUnit}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Prescribed Dose</div>
                      <div className="info-value">{results.prescribedDose} {results.doseUnit}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Dose per kg</div>
                      <div className="info-value highlight">{results.dosePerKg} mg/kg</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Dose Status</div>
                      <div className={`info-value ${results.doseValidation}`}>
                        {results.doseValidation?.toUpperCase() || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vial Calculations Card */}
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>Vial Calculations</h3>
                  <Droplets size={20} />
                </div>
                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-label">Total Vials Used</div>
                      <div className="info-value highlight">{results.totalVialsUsed}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Drug Volume</div>
                      <div className="info-value">{results.drugVolume?.toFixed(1)} mL</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Overfill Volume</div>
                      <div className="info-value">{results.overfillVolume || 0} mL</div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">
                        {results.removeVolume > 0 ? 'Remove Volume' : 'Add Volume'}
                      </div>
                      <div className="info-value">
                        {results.removeVolume > 0 ? results.removeVolume : results.addVolume} mL
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Prime Volume</div>
                      <div className="info-value">{results.primeVolume} mL</div>
                    </div>
                  </div>

                  {/* Vial Breakdown */}
                  {results.vialCombination && results.vialCombination.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1rem' }}>
                        Vial Combination
                      </h4>
                      <div className="vial-breakdown">
                        {results.vialCombination.map((vial, index) => (
                          <div key={index} className="vial-item">
                            <span>{vial.vialsUsed} × {vial.strength}{vial.unit} vials</span>
                            <span className="vial-volume">
                              ({vial.vialsUsed} × {vial.reconstitutionVolume || vial.volume}mL = {(vial.vialsUsed * (vial.reconstitutionVolume || vial.volume)).toFixed(1)}mL)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Infusion Parameters Card */}
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>Infusion Parameters</h3>
                  <Activity size={20} />
                </div>
                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <div className="info-label">Infusion Rate</div>
                      <div className="info-value highlight">
                        {results.infusionRate ? `${results.infusionRate} mL/hr` : 'Not calculated'}
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Total Infusion Time</div>
                      <div className="info-value">
                        {results.totalTime 
                          ? `${results.totalTime.hours}h ${results.totalTime.minutes}m`
                          : 'Not calculated'
                        }
                      </div>
                    </div>
                    <div className="info-item">
                      <div className="info-label">Infusion Mode</div>
                      <div className="info-value">{results.infusionMode}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infusion Steps Card */}
              {results.infusionSteps && results.infusionSteps.length > 0 && (
                <div className="dashboard-card">
                  <div className="card-header">
                    <h3>Infusion Steps Protocol</h3>
                    <Clock size={20} />
                  </div>
                  <div className="card-body">
                    {/* Steps Summary */}
                    {results.infusionSteps.totalTime && (
                      <div className="steps-summary">
                        <div className="summary-item">
                          <span className="summary-label">Total Infusion Time:</span>
                          <span className="summary-value">
                            {results.infusionSteps.totalTime.hours}h {results.infusionSteps.totalTime.minutes}m
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Medication Volume:</span>
                          <span className="summary-value">{results.infusionSteps.medicationVolume?.toFixed(1)} mL</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Flush Volume:</span>
                          <span className="summary-value">{results.infusionSteps.flushVolume} mL</span>
                        </div>
                      </div>
                    )}

                    <div className="steps-table">
                      <div className="table-header">
                        <div>Step</div>
                        <div>Rate (mL/hr)</div>
                        <div>Volume (mL)</div>
                        <div>Duration (min)</div>
                        <div>Description</div>
                      </div>
                      <div className="table-body">
                        {results.infusionSteps.filter(step => typeof step === 'object' && step.stepNumber).map((step, index) => (
                          <div key={index} className={`table-row ${step.description === 'Flush' ? 'flush-step' : ''}`}>
                            <div className="cell-step">{step.stepNumber}</div>
                            <div className="cell-rate">{step.rate}</div>
                            <div className="cell-volume">{step.stepVolume?.toFixed(1)}</div>
                            <div className="cell-duration">{step.stepDuration}</div>
                            <div className="cell-description">
                              {step.description || `Step ${step.stepNumber}`}
                              {step.description === 'Flush' && <span className="flush-badge">FLUSH</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Protocol Notes */}
                    {results.isException && (
                      <div className="protocol-note">
                        <Info size={16} />
                        <span>
                          Special protocol: Only overfill volume is removed for this medication (drug volume remains in bag).
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {Object.keys(errors).length > 0 && (
            <div className="error-section">
              {Object.values(errors).map((error, index) => (
                <div key={index} className="error-message">
                  <AlertCircle className="error-icon" />
                  {error}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrecisePumpCalculator;