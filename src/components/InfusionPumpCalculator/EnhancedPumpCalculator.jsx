import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Calculator, 
  Beaker, 
  ChevronDown, 
  Check, 
  X, 
  Activity, 
  Info, 
  AlertCircle,
  Clock,
  Droplets,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import './InfusionPumpCalculator.css';
import pumpDatabase from '../../pages/Pump/pump-database.json';
import pumpLogic from '../../pages/Pump/pump-logic.json';

const EnhancedPumpCalculator = () => {
  // Core state
  const [inputs, setInputs] = useState({
    patientWeight: '',
    medicationName: '',
    prescribedDose: '',
    prescribedDoseUnit: 'mg/kg',
    infusionMode: 'Remove Overfill',
    primeVolume: 10,
    flushVolume: 10,
    totalInfusionTime: { hours: '', minutes: '' },
    customInfusionRate: ''
  });
  
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [errors, setErrors] = useState({});
  const [validations, setValidations] = useState({
    dose: null, // 'correct', 'low', 'high', 'invalid'
    infusionMode: null, // 'correct', 'invalid'
    totalTime: null // 'correct', 'invalid'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState({
    infusionRate: null,
    totalTime: null,
    bagSize: null,
    drugVolume: null,
    overfillVolume: null
  });

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

  // Dose validation logic
  const validateDose = useCallback(() => {
    if (!selectedMedicationData || !inputs.prescribedDose || !inputs.patientWeight) {
      return null;
    }

    const prescribedDose = parseFloat(inputs.prescribedDose);
    const weight = parseFloat(inputs.patientWeight);
    const standardDose = selectedMedicationData.standardDose;

    if (!standardDose) return null;

    let expectedDose;
    if (inputs.prescribedDoseUnit === 'mg/kg' && standardDose.unit === 'mg/kg') {
      expectedDose = standardDose.value;
    } else if (inputs.prescribedDoseUnit === 'mg' && standardDose.unit === 'mg/kg') {
      expectedDose = standardDose.value * weight;
    } else if (inputs.prescribedDoseUnit === 'mg/kg' && standardDose.unit === 'mg') {
      expectedDose = standardDose.value / weight;
    } else {
      expectedDose = standardDose.value;
    }

    // Allow 10% variance for "correct" classification
    const variance = 0.1;
    const lowerBound = expectedDose * (1 - variance);
    const upperBound = expectedDose * (1 + variance);

    if (prescribedDose >= lowerBound && prescribedDose <= upperBound) {
      return 'correct';
    } else if (prescribedDose < lowerBound) {
      return 'low';
    } else {
      return 'high';
    }
  }, [selectedMedicationData, inputs.prescribedDose, inputs.patientWeight, inputs.prescribedDoseUnit]);

  // Infusion mode validation
  const validateInfusionMode = useCallback(() => {
    if (!selectedMedicationData) return null;

    // Check if medication has specific infusion mode requirements
    const recommendedModes = selectedMedicationData.recommendedInfusionModes || ['Add to empty bag', 'Remove Overfill'];
    
    return recommendedModes.includes(inputs.infusionMode) ? 'correct' : 'invalid';
  }, [selectedMedicationData, inputs.infusionMode]);

  // Calculate bag size based on weight and medication rules
  const calculateBagSize = useCallback(() => {
    if (!selectedMedicationData || !inputs.patientWeight) return null;

    const weight = parseFloat(inputs.patientWeight);
    const salineBagRules = selectedMedicationData.salineBagRules;

    if (!salineBagRules || !salineBagRules.weightBased) {
      return 250; // Default bag size
    }

    const applicableRule = salineBagRules.rules.find(rule => {
      if (rule.maxWeight === null) {
        return weight >= rule.minWeight;
      }
      return weight >= rule.minWeight && weight <= rule.maxWeight;
    });

    return applicableRule ? applicableRule.bagSize : 250;
  }, [selectedMedicationData, inputs.patientWeight]);

  // Calculate drug volume needed
  const calculateDrugVolume = useCallback(() => {
    if (!selectedMedicationData || !inputs.prescribedDose || !inputs.patientWeight) return null;

    const weight = parseFloat(inputs.patientWeight);
    const prescribedDose = parseFloat(inputs.prescribedDose);
    
    let totalDose;
    if (inputs.prescribedDoseUnit === 'mg/kg') {
      totalDose = prescribedDose * weight;
    } else {
      totalDose = prescribedDose;
    }

    const vialSizes = selectedMedicationData.vialSizes;
    if (!vialSizes || vialSizes.length === 0) return null;

    // Calculate optimal vial combination
    let drugVolume = 0;
    let remainingDose = totalDose;

    // Sort vials by strength (largest first) for optimal combination
    const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);

    for (const vial of sortedVials) {
      const vialsNeeded = Math.floor(remainingDose / vial.strength);
      if (vialsNeeded > 0) {
        if (vial.reconstitutionVolume) {
          // Lyophilized powder
          drugVolume += vialsNeeded * vial.reconstitutionVolume;
        } else {
          // Sterile solution
          drugVolume += vialsNeeded * vial.volume;
        }
        remainingDose -= vialsNeeded * vial.strength;
      }
    }

    // Handle remaining dose with smallest vial
    if (remainingDose > 0) {
      const smallestVial = sortedVials[sortedVials.length - 1];
      if (smallestVial.reconstitutionVolume) {
        drugVolume += smallestVial.reconstitutionVolume;
      } else {
        drugVolume += smallestVial.volume;
      }
    }

    return drugVolume;
  }, [selectedMedicationData, inputs.prescribedDose, inputs.patientWeight, inputs.prescribedDoseUnit]);

  // Calculate overfill volume
  const calculateOverfillVolume = useCallback(() => {
    const bagSize = calculateBagSize();
    if (!bagSize || !selectedMedicationData) return null;

    const overfillRules = selectedMedicationData.overfillRules || pumpLogic.pumpCalculationLogic.bagSelectionAndOverfill.standardOverfillVolumes;
    
    return overfillRules[bagSize.toString()]?.overfillRemoval || overfillRules[bagSize] || 0;
  }, [calculateBagSize, selectedMedicationData]);

  // Calculate infusion rate
  const calculateInfusionRate = useCallback(() => {
    const bagSize = calculateBagSize();
    const totalTime = inputs.totalInfusionTime;
    
    if (!bagSize || (!totalTime.hours && !totalTime.minutes)) return null;

    const totalMinutes = (parseInt(totalTime.hours) || 0) * 60 + (parseInt(totalTime.minutes) || 0);
    if (totalMinutes <= 0) return null;

    // Use medication-specific infusion rules if available
    if (selectedMedicationData?.infusionSteps) {
      return calculateMedicationSpecificRate();
    }

    // Basic calculation: rate = volume / time
    const rateMLPerMin = bagSize / totalMinutes;
    const rateMLPerHour = rateMLPerMin * 60;

    // Round down for safety as per pump logic
    return Math.floor(rateMLPerHour);
  }, [calculateBagSize, inputs.totalInfusionTime, selectedMedicationData]);

  // Calculate medication-specific infusion rate
  const calculateMedicationSpecificRate = useCallback(() => {
    if (!selectedMedicationData?.infusionSteps || !inputs.patientWeight) return null;

    const weight = parseFloat(inputs.patientWeight);
    const infusionSteps = selectedMedicationData.infusionSteps;

    // Determine weight category
    let weightCategory;
    if (infusionSteps.weightBased) {
      weightCategory = weight <= 20 ? '≤20kg' : '>20kg';
    }

    const steps = infusionSteps.steps[weightCategory] || infusionSteps.steps;
    if (!steps) return null;

    // Use the final step rate as the calculated rate
    const finalStep = steps[steps.length - 1];
    return finalStep?.rate || null;
  }, [selectedMedicationData, inputs.patientWeight]);

  // Calculate total infusion time
  const calculateTotalTime = useCallback(() => {
    if (!inputs.customInfusionRate) return null;

    const bagSize = calculateBagSize();
    const rate = parseFloat(inputs.customInfusionRate);
    
    if (!bagSize || !rate || rate <= 0) return null;

    const totalMinutes = bagSize / rate * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    return { hours, minutes };
  }, [calculateBagSize, inputs.customInfusionRate]);

  // Validate total infusion time
  const validateTotalTime = useCallback(() => {
    if (!inputs.totalInfusionTime.hours && !inputs.totalInfusionTime.minutes) return null;

    const calculatedRate = calculateInfusionRate();
    const providedRate = inputs.customInfusionRate ? parseFloat(inputs.customInfusionRate) : calculatedRate;
    
    if (!providedRate) return null;

    const bagSize = calculateBagSize();
    const totalMinutes = (parseInt(inputs.totalInfusionTime.hours) || 0) * 60 + (parseInt(inputs.totalInfusionTime.minutes) || 0);
    
    if (!bagSize || totalMinutes <= 0) return 'invalid';

    // Calculate expected time based on rate
    const expectedMinutes = bagSize / providedRate * 60;
    const variance = 0.05; // 5% variance allowed
    
    const lowerBound = expectedMinutes * (1 - variance);
    const upperBound = expectedMinutes * (1 + variance);

    return (totalMinutes >= lowerBound && totalMinutes <= upperBound) ? 'correct' : 'invalid';
  }, [inputs.totalInfusionTime, inputs.customInfusionRate, calculateInfusionRate, calculateBagSize]);

  // Update validations when inputs change
  useEffect(() => {
    setValidations({
      dose: validateDose(),
      infusionMode: validateInfusionMode(),
      totalTime: validateTotalTime()
    });

    setCalculatedValues({
      infusionRate: calculateInfusionRate(),
      totalTime: calculateTotalTime(),
      bagSize: calculateBagSize(),
      drugVolume: calculateDrugVolume(),
      overfillVolume: calculateOverfillVolume()
    });
  }, [validateDose, validateInfusionMode, validateTotalTime, calculateInfusionRate, calculateTotalTime, calculateBagSize, calculateDrugVolume, calculateOverfillVolume]);

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

  // Validation icon component
  const ValidationIcon = ({ status, className = "" }) => {
    switch (status) {
      case 'correct':
        return <CheckCircle2 className={`w-5 h-5 text-green-500 ${className}`} />;
      case 'low':
      case 'high':
      case 'invalid':
        return <XCircle className={`w-5 h-5 text-red-500 ${className}`} />;
      default:
        return null;
    }
  };

  // Main calculation function
  const performCalculation = () => {
    if (!selectedMedication || !inputs.patientWeight || !inputs.prescribedDose) {
      setErrors({ general: 'Please fill in all required fields' });
      return;
    }

    const bagSize = calculateBagSize();
    const drugVolume = calculateDrugVolume();
    const overfillVolume = calculateOverfillVolume();
    const infusionRate = inputs.customInfusionRate ? parseFloat(inputs.customInfusionRate) : calculateInfusionRate();
    
    // Generate infusion steps based on medication protocol
    const steps = generateInfusionSteps();

    const results = {
      bagSize,
      drugVolume,
      overfillVolume,
      infusionRate,
      totalVolume: bagSize,
      steps,
      validations,
      calculatedValues
    };

    setResults(results);
    setShowResults(true);
    setErrors({});
  };

  // Generate infusion steps based on medication protocol
  const generateInfusionSteps = () => {
    if (!selectedMedicationData?.infusionSteps) return [];

    const weight = parseFloat(inputs.patientWeight);
    const infusionSteps = selectedMedicationData.infusionSteps;
    
    let weightCategory;
    if (infusionSteps.weightBased) {
      weightCategory = weight <= 20 ? '≤20kg' : '>20kg';
    }

    const steps = infusionSteps.steps[weightCategory] || infusionSteps.steps;
    if (!steps) return [];

    const bagSize = calculateBagSize();
    const flushVol = parseInt(inputs.flushVolume) || 10;
    
    // Calculate step volumes
    const totalStepVolume = bagSize - flushVol;
    const stepsWithVolumes = steps.map((step, index) => {
      if (index === steps.length - 1) {
        // Last step gets remaining volume
        const usedVolume = steps.slice(0, -1).reduce((sum, s) => sum + (s.calculatedVolume || 0), 0);
        const remainingVolume = totalStepVolume - usedVolume;
        return {
          ...step,
          calculatedVolume: Math.max(0, remainingVolume),
          calculatedDuration: step.duration === 'remainder' ? null : step.duration
        };
      } else {
        // Fixed duration steps
        const volume = step.rate * (step.duration / 60);
        return {
          ...step,
          calculatedVolume: volume,
          calculatedDuration: step.duration
        };
      }
    });

    // Add flush step
    stepsWithVolumes.push({
      rate: stepsWithVolumes[stepsWithVolumes.length - 1]?.rate || 0,
      duration: Math.round(flushVol / (stepsWithVolumes[stepsWithVolumes.length - 1]?.rate || 1) * 60),
      description: 'Flush',
      calculatedVolume: flushVol,
      calculatedDuration: Math.round(flushVol / (stepsWithVolumes[stepsWithVolumes.length - 1]?.rate || 1) * 60)
    });

    return stepsWithVolumes;
  };

  return (
    <div className="pump-calculator">
      <div className="pump-header">
        <div className="pump-title">
          <Activity className="pump-icon" />
          <h2>Enhanced Infusion Pump Calculator</h2>
        </div>
        <div className="pump-subtitle">
          Calculate precise infusion rates with medication-specific protocols
        </div>
      </div>

      <div className="pump-content">
        {/* Medication Selection */}
        <div className="input-section">
          <h3>Medication Selection</h3>
          <div className="medication-grid">
            {medications.map((med) => (
              <div
                key={med.key}
                className={`medication-tile ${selectedMedication === med.key ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedMedication(med.key);
                  setInputs(prev => ({ ...prev, medicationName: med.key }));
                }}
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

        {/* Core Parameters */}
        <div className="input-section">
          <h3>Core Parameters</h3>
          <div className="input-grid">
            <div className="input-group">
              <label>Patient Weight (kg) *</label>
              <input
                type="number"
                value={inputs.patientWeight}
                onChange={(e) => handleInputChange('patientWeight', e.target.value)}
                placeholder="Enter weight in kg"
                className="pump-input"
              />
            </div>

            <div className="input-group">
              <label>
                Prescribed Dose *
                <ValidationIcon status={validations.dose} className="ml-2" />
                {validations.dose === 'low' && <span className="validation-text text-red-500">Below standard</span>}
                {validations.dose === 'high' && <span className="validation-text text-red-500">Above standard</span>}
                {validations.dose === 'correct' && <span className="validation-text text-green-500">Correct</span>}
              </label>
              <div className="dose-input-group">
                <input
                  type="number"
                  step="0.01"
                  value={inputs.prescribedDose}
                  onChange={(e) => handleInputChange('prescribedDose', e.target.value)}
                  placeholder="Enter dose"
                  className="pump-input"
                />
                <select
                  value={inputs.prescribedDoseUnit}
                  onChange={(e) => handleInputChange('prescribedDoseUnit', e.target.value)}
                  className="unit-select"
                >
                  <option value="mg/kg">mg/kg</option>
                  <option value="mg">mg</option>
                  <option value="mg/m²">mg/m²</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>
                Infusion Mode *
                <ValidationIcon status={validations.infusionMode} className="ml-2" />
              </label>
              <select
                value={inputs.infusionMode}
                onChange={(e) => handleInputChange('infusionMode', e.target.value)}
                className="pump-select"
              >
                <option value="Remove Overfill">Remove Overfill</option>
                <option value="Add to empty bag">Add to Empty Bag</option>
              </select>
            </div>

            <div className="input-group">
              <label>Prime Volume (mL)</label>
              <input
                type="number"
                value={inputs.primeVolume}
                onChange={(e) => handleInputChange('primeVolume', parseInt(e.target.value) || 0)}
                placeholder="Default: 10"
                className="pump-input"
              />
            </div>

            <div className="input-group">
              <label>Flush Volume (mL)</label>
              <input
                type="number"
                value={inputs.flushVolume}
                onChange={(e) => handleInputChange('flushVolume', parseInt(e.target.value) || 0)}
                placeholder="Default: 10"
                className="pump-input"
              />
            </div>
          </div>
        </div>

        {/* Optional Parameters */}
        <div className="input-section">
          <h3>Optional Parameters</h3>
          <div className="input-grid">
            <div className="input-group">
              <label>
                Total Infusion Time (Optional)
                <ValidationIcon status={validations.totalTime} className="ml-2" />
              </label>
              <div className="time-input-group">
                <input
                  type="number"
                  value={inputs.totalInfusionTime.hours}
                  onChange={(e) => handleTimeChange('hours', e.target.value)}
                  placeholder="Hours"
                  className="pump-input time-input"
                />
                <span className="time-separator">:</span>
                <input
                  type="number"
                  value={inputs.totalInfusionTime.minutes}
                  onChange={(e) => handleTimeChange('minutes', e.target.value)}
                  placeholder="Minutes"
                  className="pump-input time-input"
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
                className="pump-input"
              />
            </div>
          </div>
        </div>

        {/* Calculated Values Display */}
        {(calculatedValues.bagSize || calculatedValues.infusionRate) && (
          <div className="calculated-section">
            <h3>Calculated Values</h3>
            <div className="calculated-grid">
              {calculatedValues.bagSize && (
                <div className="calculated-item">
                  <label>Bag Size</label>
                  <div className="calculated-value">{calculatedValues.bagSize} mL</div>
                </div>
              )}
              {calculatedValues.drugVolume && (
                <div className="calculated-item">
                  <label>Drug Volume</label>
                  <div className="calculated-value">{calculatedValues.drugVolume.toFixed(1)} mL</div>
                </div>
              )}
              {calculatedValues.infusionRate && (
                <div className="calculated-item">
                  <label>Infusion Rate</label>
                  <div className="calculated-value">{calculatedValues.infusionRate} mL/hr</div>
                </div>
              )}
              {calculatedValues.totalTime && (
                <div className="calculated-item">
                  <label>Total Time</label>
                  <div className="calculated-value">
                    {calculatedValues.totalTime.hours}h {calculatedValues.totalTime.minutes}m
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-section">
          <button
            onClick={performCalculation}
            className="calculate-btn"
            disabled={!selectedMedication || !inputs.patientWeight || !inputs.prescribedDose}
          >
            <Calculator className="btn-icon" />
            Calculate Infusion
          </button>
        </div>

        {/* Results Display */}
        {showResults && results && (
          <div className="results-section">
            <h3>Calculation Results</h3>
            
            {/* Summary Cards */}
            <div className="results-grid">
              <div className="result-card">
                <div className="result-header">
                  <Droplets className="result-icon" />
                  <h4>Infusion Parameters</h4>
                </div>
                <div className="result-content">
                  <div className="result-item">
                    <span>Bag Size:</span>
                    <span>{results.bagSize} mL</span>
                  </div>
                  <div className="result-item">
                    <span>Drug Volume:</span>
                    <span>{results.drugVolume?.toFixed(1)} mL</span>
                  </div>
                  <div className="result-item">
                    <span>Overfill Removal:</span>
                    <span>{results.overfillVolume} mL</span>
                  </div>
                  <div className="result-item">
                    <span>Infusion Rate:</span>
                    <span className="highlight">{results.infusionRate} mL/hr</span>
                  </div>
                </div>
              </div>

              <div className="result-card">
                <div className="result-header">
                  <CheckCircle2 className="result-icon" />
                  <h4>Validation Status</h4>
                </div>
                <div className="result-content">
                  <div className="validation-item">
                    <span>Dose Validation:</span>
                    <div className="validation-status">
                      <ValidationIcon status={results.validations.dose} />
                      <span className={`status-text ${results.validations.dose}`}>
                        {results.validations.dose || 'Not validated'}
                      </span>
                    </div>
                  </div>
                  <div className="validation-item">
                    <span>Infusion Mode:</span>
                    <div className="validation-status">
                      <ValidationIcon status={results.validations.infusionMode} />
                      <span className={`status-text ${results.validations.infusionMode}`}>
                        {results.validations.infusionMode || 'Not validated'}
                      </span>
                    </div>
                  </div>
                  <div className="validation-item">
                    <span>Total Time:</span>
                    <div className="validation-status">
                      <ValidationIcon status={results.validations.totalTime} />
                      <span className={`status-text ${results.validations.totalTime}`}>
                        {results.validations.totalTime || 'Not validated'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Infusion Steps */}
            {results.steps && results.steps.length > 0 && (
              <div className="steps-section">
                <h4>Infusion Steps Protocol</h4>
                <div className="steps-table">
                  <div className="steps-header">
                    <div>Step</div>
                    <div>Rate (mL/hr)</div>
                    <div>Duration</div>
                    <div>Volume (mL)</div>
                    <div>Description</div>
                  </div>
                  {results.steps.map((step, index) => (
                    <div key={index} className="steps-row">
                      <div>{index + 1}</div>
                      <div>{step.rate}</div>
                      <div>{step.calculatedDuration || step.duration} min</div>
                      <div>{step.calculatedVolume?.toFixed(1)}</div>
                      <div>{step.description}</div>
                    </div>
                  ))}
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
  );
};

export default EnhancedPumpCalculator;