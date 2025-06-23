import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, Beaker, ChevronDown, Check, Activity, Info, AlertCircle, Shield } from 'lucide-react';
import './InfusionPumpCalculator.css';
import pumpDatabase from '../../pages/Pump/pump-database.json';
import pumpLogic from '../../pages/Pump/pump-logic.json';
import { getMedicationHandler } from '../../utils/medicationSpecificHandler';
import InfusionStepsEditor from '../InfusionStepsEditor';

const InfusionPumpCalculator = () => {
  // Core state
  const [inputs, setInputs] = useState({
    patientWeight: '',
    medicationName: '',
    prescribedDose: '',
    prescribedDoseUnit: 'mg/kg',
    ertStatus: 'ERT_naive' // For medications that require it
  });
  
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Advanced options
  const [infusionMode, setInfusionMode] = useState('Remove Overfill');
  const [primeVolume, setPrimeVolume] = useState(10);
  const [flushVolume, setFlushVolume] = useState(10);
  const [totalInfusionTime, setTotalInfusionTime] = useState({ hours: '', minutes: '' });
  const [customInfusionRate, setCustomInfusionRate] = useState('');

  const medications = useMemo(() => {
    return Object.entries(pumpDatabase.medications).map(([key, med]) => ({
      key,
      ...med,
      color: med.brandColor || '#ff5500' // Default color if not specified
    }));
  }, []);

  const selectedMedicationData = useMemo(() => {
    return selectedMedication ? pumpDatabase.medications[selectedMedication] : null;
  }, [selectedMedication]);

  // Calculate dose safety indicator
  const getDoseSafetyStatus = () => {
    if (!selectedMedicationData || !inputs.prescribedDose || !inputs.patientWeight) {
      return null;
    }

    const prescribedDose = parseFloat(inputs.prescribedDose);
    const standardDose = selectedMedicationData.standardDose?.value || 0;
    
    if (!standardDose || prescribedDose <= 0) {
      return null;
    }

    // Calculate percentage of standard dose
    const dosePercentage = (prescribedDose / standardDose) * 100;
    
    // Define thresholds
    if (dosePercentage < 80) {
      return {
        status: 'low',
        color: '#f59e0b', // Orange
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        message: 'Low Dose',
        description: `${dosePercentage.toFixed(0)}% of standard dose`
      };
    } else if (dosePercentage >= 80 && dosePercentage <= 120) {
      return {
        status: 'correct',
        color: '#22c55e', // Green
        bgColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.3)',
        message: 'Standard Dose',
        description: `${dosePercentage.toFixed(0)}% of standard dose`
      };
    } else {
      return {
        status: 'high',
        color: '#ef4444', // Red
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        message: 'High Dose',
        description: `${dosePercentage.toFixed(0)}% of standard dose`
      };
    }
  };

  const doseSafetyStatus = getDoseSafetyStatus();

  // Calculate BSA if needed
  const calculateBSA = (weight, height) => {
    if (!weight || !height) return 0;
    return Math.sqrt((weight * height) / 3600);
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
    
    if (!inputs.prescribedDose || parseFloat(inputs.prescribedDose) <= 0) {
      newErrors.prescribedDose = 'Prescribed dose is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Main calculation function
  const calculateInfusion = () => {
    if (!validateInputs()) return;
    
    const weight = parseFloat(inputs.patientWeight);
    const dose = parseFloat(inputs.prescribedDose);
    const medication = selectedMedicationData;
    
    // Get medication-specific handler
    const handler = getMedicationHandler(selectedMedication);
    const handlerResult = handler(inputs, medication, weight);
    
    // Calculate total dose based on unit
    let totalDose;
    if (inputs.prescribedDoseUnit === 'mg/kg') {
      totalDose = dose * weight;
    } else if (inputs.prescribedDoseUnit === 'mg/m2' && inputs.patientHeight) {
      const bsa = calculateBSA(weight, inputs.patientHeight);
      totalDose = dose * bsa;
    } else {
      totalDose = dose;
    }
    
    // Calculate vials needed
    const vialSize = medication.vialSizes?.[0]?.strength || 0;
    const vialsNeeded = Math.ceil(totalDose / vialSize);
    const totalDrugVolume = vialsNeeded * (medication.vialSizes?.[0]?.reconstitutionVolume || 0);
    
    // Calculate infusion parameters
    const standardBagSize = medication.standardBagSizes?.[0] || 100;
    const finalVolume = infusionMode === 'Remove Overfill' 
      ? standardBagSize 
      : standardBagSize + totalDrugVolume;
    
    // Calculate infusion rate using medication-specific logic
    let infusionRate;
    if (customInfusionRate) {
      infusionRate = parseFloat(customInfusionRate);
    } else if (totalInfusionTime.hours || totalInfusionTime.minutes) {
      const totalMinutes = (parseInt(totalInfusionTime.hours) || 0) * 60 + (parseInt(totalInfusionTime.minutes) || 0);
      infusionRate = finalVolume / (totalMinutes / 60);
    } else {
      // Use medication's standard infusion time
      const standardTime = medication.infusionSteps?.standard?.[0]?.duration || 60;
      infusionRate = finalVolume / (standardTime / 60);
    }
    
    setResults({
      totalDose: totalDose.toFixed(2),
      vialsNeeded,
      totalDrugVolume: totalDrugVolume.toFixed(1),
      finalVolume: finalVolume.toFixed(1),
      infusionRate: infusionRate.toFixed(1),
      infusionTime: Math.round(finalVolume / infusionRate * 60),
      overfillVolume: infusionMode === 'Remove Overfill' ? totalDrugVolume.toFixed(1) : '0',
      primeVolume,
      flushVolume,
      totalVolumeNeeded: (finalVolume + primeVolume + flushVolume).toFixed(1),
      companionDrug: handlerResult.companionDrug,
      maxRate: handlerResult.maxRate,
      infusionPattern: handlerResult.infusionPattern
    });
    
    setShowResults(true);
  };

  const handleReset = () => {
    setInputs({
      patientWeight: '',
      medicationName: '',
      prescribedDose: '',
      prescribedDoseUnit: 'mg/kg',
      ertStatus: 'ERT_naive'
    });
    setSelectedMedication(null);
    setResults(null);
    setShowResults(false);
    setErrors({});
    setInfusionMode('Remove Overfill');
    setPrimeVolume(10);
    setFlushVolume(10);
    setTotalInfusionTime({ hours: '', minutes: '' });
    setCustomInfusionRate('');
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMedicationSelect = (medKey) => {
    setSelectedMedication(medKey);
    setInputs(prev => ({ ...prev, medicationName: medKey }));
    if (errors.medication) {
      setErrors(prev => ({ ...prev, medication: '' }));
    }
  };

  return (
    <div className="infusion-pump-calculator">
      <div className="calculator-content">
        <div className="pump-dashboard">
          {/* Medication Selector Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Select Medication</h3>
              <Beaker size={20} />
            </div>
            <div className="card-body">
              <div className="medication-grid">
                {medications.map((medication) => (
                  <button
                    key={medication.key}
                    className={`medication-tile ${selectedMedication === medication.key ? 'selected' : ''}`}
                    style={{
                      '--medication-color': medication.color,
                      borderColor: selectedMedication === medication.key ? medication.color : 'transparent'
                    }}
                    onClick={() => handleMedicationSelect(medication.key)}
                  >
                    <div className="medication-icon" style={{ background: medication.color }}>
                      {medication.brandName.charAt(0)}
                    </div>
                    <span className="medication-name">{medication.brandName}</span>
                    {selectedMedication === medication.key && (
                      <Check className="check-icon" size={16} style={{ color: medication.color }} />
                    )}
                  </button>
                ))}
              </div>
              {errors.medication && <span className="error-text" style={{ marginTop: '1rem', display: 'block' }}>{errors.medication}</span>}
            </div>
          </div>

          {/* Patient Parameters Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Patient Parameters</h3>
              <Activity size={20} />
            </div>
            <div className="card-body">
              <div className="input-grid">
                <div className="input-group">
                  <label>Patient Weight (kg)</label>
                  <input
                    type="number"
                    value={inputs.patientWeight}
                    onChange={(e) => handleInputChange('patientWeight', e.target.value)}
                    placeholder="Enter weight"
                    className={`pump-input ${errors.patientWeight ? 'error' : ''}`}
                  />
                  {errors.patientWeight && <span className="error-text">{errors.patientWeight}</span>}
                </div>
                
                <div className="input-group">
                  <label>Prescribed Dose</label>
                  <div className="dose-input-group">
                    <input
                      type="number"
                      value={inputs.prescribedDose}
                      onChange={(e) => handleInputChange('prescribedDose', e.target.value)}
                      placeholder="Enter dose"
                      className={`pump-input dose-input ${errors.prescribedDose ? 'error' : ''}`}
                    />
                    <div className="custom-dropdown">
                      <select
                        value={inputs.prescribedDoseUnit}
                        onChange={(e) => handleInputChange('prescribedDoseUnit', e.target.value)}
                        className="pump-dropdown dose-unit-select"
                      >
                        <option value="mg/kg">mg/kg</option>
                        <option value="mg">mg (total)</option>
                        <option value="mg/m2">mg/m²</option>
                        <option value="units/kg">units/kg</option>
                      </select>
                      <ChevronDown className="dropdown-icon" size={16} />
                    </div>
                  </div>
                  {errors.prescribedDose && <span className="error-text">{errors.prescribedDose}</span>}
                  
                  {/* Dose Safety Indicator */}
                  {doseSafetyStatus && (
                    <div 
                      className="dose-safety-indicator"
                      style={{
                        background: doseSafetyStatus.bgColor,
                        borderColor: doseSafetyStatus.borderColor,
                        color: doseSafetyStatus.color
                      }}
                    >
                      <Shield size={16} style={{ color: doseSafetyStatus.color }} />
                      <div className="dose-safety-content">
                        <span className="dose-safety-message">{doseSafetyStatus.message}</span>
                        <span className="dose-safety-description">{doseSafetyStatus.description}</span>
                      </div>
                    </div>
                  )}
                </div>

                {inputs.prescribedDoseUnit === 'mg/m2' && (
                  <div className="input-group">
                    <label>Patient Height (cm)</label>
                    <input
                      type="number"
                      value={inputs.patientHeight || ''}
                      onChange={(e) => handleInputChange('patientHeight', e.target.value)}
                      placeholder="Enter height"
                      className="pump-input"
                    />
                  </div>
                )}
                
                {/* Show ERT status for medications that need it */}
                {selectedMedicationData && selectedMedicationData.infusionSteps && 
                 (selectedMedicationData.infusionSteps.ERT_naive || selectedMedicationData.infusionSteps.ERT_experienced) && (
                  <div className="input-group">
                    <label>ERT Status</label>
                    <div className="custom-dropdown">
                      <select
                        value={inputs.ertStatus}
                        onChange={(e) => handleInputChange('ertStatus', e.target.value)}
                        className="pump-dropdown"
                      >
                        <option value="ERT_naive">ERT Naive</option>
                        <option value="ERT_experienced">ERT Experienced</option>
                      </select>
                      <ChevronDown className="dropdown-icon" size={16} />
                    </div>
                  </div>
                )}
                
                <div className="input-group">
                  <label>Infusion Mode</label>
                  <div className="custom-dropdown">
                    <select
                      value={infusionMode}
                      onChange={(e) => setInfusionMode(e.target.value)}
                      className="pump-dropdown"
                    >
                      <option value="Remove Overfill">Remove Overfill</option>
                      <option value="Add to Bag">Add to Bag</option>
                    </select>
                    <ChevronDown className="dropdown-icon" size={16} />
                  </div>
                </div>
                
                <div className="input-group">
                  <label>Prime Volume (mL)</label>
                  <input
                    type="number"
                    value={primeVolume}
                    onChange={(e) => setPrimeVolume(parseFloat(e.target.value) || 0)}
                    placeholder="Enter prime volume"
                    className="pump-input"
                  />
                </div>
                
                <div className="input-group">
                  <label>Flush Volume (mL)</label>
                  <input
                    type="number"
                    value={flushVolume}
                    onChange={(e) => setFlushVolume(parseFloat(e.target.value) || 0)}
                    placeholder="Enter flush volume"
                    className="pump-input"
                  />
                </div>

                <div className="input-group">
                  <label>Total Infusion Time (optional)</label>
                  <div className="time-input-group">
                    <input
                      type="number"
                      value={totalInfusionTime.hours}
                      onChange={(e) => setTotalInfusionTime(prev => ({ ...prev, hours: e.target.value }))}
                      placeholder="Hr"
                      className="pump-input time-input"
                      min="0"
                    />
                    <input
                      type="number"
                      value={totalInfusionTime.minutes}
                      onChange={(e) => setTotalInfusionTime(prev => ({ ...prev, minutes: e.target.value }))}
                      placeholder="Min"
                      className="pump-input time-input"
                      min="0"
                      max="59"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Custom Rate (mL/hr) - Optional</label>
                  <input
                    type="number"
                    value={customInfusionRate}
                    onChange={(e) => setCustomInfusionRate(e.target.value)}
                    placeholder="Leave blank for auto"
                    className="pump-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="reset-btn" onClick={handleReset}>
              Reset All
            </button>
            <button 
              className="calculate-btn"
              onClick={calculateInfusion}
            >
              Calculate Infusion
            </button>
          </div>

          {/* Results Dashboard */}
          {showResults && results && (
            <div className="results-dashboard">
              <div className="results-header">
                <h2>Infusion Calculations</h2>
                {selectedMedicationData && (
                  <div className="medication-badge" style={{ background: selectedMedicationData.brandColor || '#ff5500' }}>
                    {selectedMedicationData.brandName}
                  </div>
                )}
              </div>

              <div className="results-grid">
                {/* Drug Preparation Card */}
                <div className="result-card">
                  <div className="result-card-header">
                    <h4>Drug Preparation</h4>
                  </div>
                  <div className="result-content">
                    <div className="result-item">
                      <span className="result-label">Total Dose</span>
                      <span className="result-value">{results.totalDose} mg</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Vials Needed</span>
                      <span className="result-value">{results.vialsNeeded}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Total Drug Volume</span>
                      <span className="result-value">{results.totalDrugVolume} mL</span>
                    </div>
                    {infusionMode === 'Remove Overfill' && (
                      <div className="result-item">
                        <span className="result-label">Overfill to Remove</span>
                        <span className="result-value highlight">{results.overfillVolume} mL</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Infusion Parameters Card */}
                <div className="result-card">
                  <div className="result-card-header">
                    <h4>Infusion Parameters</h4>
                  </div>
                  <div className="result-content">
                    <div className="result-item">
                      <span className="result-label">Final Bag Volume</span>
                      <span className="result-value">{results.finalVolume} mL</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Infusion Rate</span>
                      <span className="result-value highlight">{results.infusionRate} mL/hr</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Infusion Time</span>
                      <span className="result-value">{results.infusionTime} minutes</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Total Volume Needed</span>
                      <span className="result-value">{results.totalVolumeNeeded} mL</span>
                    </div>
                  </div>
                </div>

                {/* Pump Settings Card */}
                <div className="result-card">
                  <div className="result-card-header">
                    <h4>Pump Settings</h4>
                  </div>
                  <div className="result-content">
                    <div className="result-item">
                      <span className="result-label">Volume to Infuse</span>
                      <span className="result-value">{results.finalVolume} mL</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Rate</span>
                      <span className="result-value highlight">{results.infusionRate} mL/hr</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Prime Volume</span>
                      <span className="result-value">{results.primeVolume} mL</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Flush Volume</span>
                      <span className="result-value">{results.flushVolume} mL</span>
                    </div>
                  </div>
                </div>
                
                {/* Companion Drug Card */}
                {results.companionDrug && (
                  <div className="result-card">
                    <div className="result-card-header">
                      <h4>Companion Drug Required</h4>
                      <AlertCircle size={20} />
                    </div>
                    <div className="result-content">
                      <div className="companion-drug-info">
                        <div className="drug-name">
                          <strong>Drug:</strong> {results.companionDrug.name}
                        </div>
                        <div className="drug-strength">
                          <strong>Strength:</strong> {results.companionDrug.capsuleStrength}mg capsules
                        </div>
                        <div className="drug-timing">
                          <strong>Timing:</strong> {results.companionDrug.timing}
                        </div>
                        <div className="drug-dosing">
                          <strong>Dosing:</strong> {results.companionDrug.dosing}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Infusion Steps Editor - Full Width */}
              <InfusionStepsEditor 
                selectedMedication={selectedMedicationData}
                patientWeight={parseFloat(inputs.patientWeight) || 0}
                finalVolume={parseFloat(results.finalVolume) || 0}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfusionPumpCalculator;