import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import './InfusionStepsEditor.css';

const InfusionStepsEditor = ({ selectedMedication, patientWeight, finalVolume }) => {
  const [steps, setSteps] = useState([
    { id: 1, duration: '', rate: '', volume: '', validated: false }
  ]);
  const [validationResults, setValidationResults] = useState({});
  const [showValidation, setShowValidation] = useState(false);

  // Add a new step
  const addStep = () => {
    const newStep = {
      id: steps.length + 1,
      duration: '',
      rate: '',
      volume: '',
      validated: false
    };
    setSteps([...steps, newStep]);
  };

  // Remove a step
  const removeStep = (id) => {
    if (steps.length > 1) {
      const filteredSteps = steps.filter(step => step.id !== id);
      // Renumber steps
      const renumberedSteps = filteredSteps.map((step, index) => ({
        ...step,
        id: index + 1
      }));
      setSteps(renumberedSteps);
    }
  };

  // Update step data
  const updateStep = (id, field, value) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, [field]: value, validated: false } : step
    ));
    setShowValidation(false);
  };

  // Calculate volume from rate and duration
  const calculateVolume = (rate, duration) => {
    const rateNum = parseFloat(rate) || 0;
    const durationNum = parseFloat(duration) || 0;
    return ((rateNum * durationNum) / 60).toFixed(2);
  };

  // Auto-calculate volume when rate or duration changes
  useEffect(() => {
    const updatedSteps = steps.map(step => ({
      ...step,
      volume: calculateVolume(step.rate, step.duration)
    }));
    setSteps(updatedSteps);
  }, [steps.map(s => s.rate + s.duration).join(',')]);

  // Validation logic based on the screenshot
  const validateSteps = () => {
    const results = {};
    let totalVolume = 0;
    let previousRate = 0;
    
    steps.forEach((step, index) => {
      const rate = parseFloat(step.rate) || 0;
      const duration = parseFloat(step.duration) || 0;
      const volume = parseFloat(step.volume) || 0;
      
      results[step.id] = {
        errors: [],
        warnings: [],
        valid: true
      };

      // Check if fields are filled
      if (!step.rate || !step.duration) {
        results[step.id].errors.push('Rate and duration are required');
        results[step.id].valid = false;
      }

      // Validate rate progression (should increase with each step)
      if (index > 0 && rate <= previousRate) {
        results[step.id].warnings.push('Rate should increase from previous step');
      }

      // Check for reasonable rate limits
      if (rate > 999) {
        results[step.id].errors.push('Rate exceeds maximum limit (999 mL/hr)');
        results[step.id].valid = false;
      }

      // Check duration limits
      if (duration < 1) {
        results[step.id].errors.push('Duration must be at least 1 minute');
        results[step.id].valid = false;
      }

      if (duration > 480) { // 8 hours
        results[step.id].warnings.push('Duration exceeds 8 hours');
      }

      // Medication-specific validations
      if (selectedMedication) {
        // Add medication-specific validation rules here
        // For example, some medications have max rate limits
        
        // Check if it's a stepped infusion medication
        if (index === 0 && rate > 50) {
          results[step.id].warnings.push('Initial rate may be too high for this medication');
        }
        
        // Weight-based rate calculations
        if (patientWeight) {
          const ratePerKg = rate / patientWeight;
          if (ratePerKg > 10) {
            results[step.id].warnings.push('Rate per kg may be too high');
          }
        }
      }

      totalVolume += volume;
      previousRate = rate;
    });

    // Check total volume against final volume
    if (finalVolume && Math.abs(totalVolume - finalVolume) > 5) {
      results.totalVolume = {
        error: `Total volume (${totalVolume.toFixed(1)} mL) differs from final volume (${finalVolume} mL)`,
        valid: false
      };
    }

    setValidationResults(results);
    setShowValidation(true);

    // Update steps with validation status
    const validatedSteps = steps.map(step => ({
      ...step,
      validated: results[step.id]?.valid && !results[step.id]?.warnings?.length
    }));
    setSteps(validatedSteps);
  };

  // Calculate total infusion time
  const totalTime = steps.reduce((sum, step) => sum + (parseFloat(step.duration) || 0), 0);
  const totalVolumeSum = steps.reduce((sum, step) => sum + (parseFloat(step.volume) || 0), 0);

  return (
    <div className="infusion-steps-editor">
      <div className="editor-header">
        <h3>Infusion Steps Plan</h3>
        <button className="validate-btn" onClick={validateSteps}>
          <Check size={18} />
          Validate Steps
        </button>
      </div>

      <div className="steps-table">
        <div className="table-header">
          <div className="header-cell">Step</div>
          <div className="header-cell">Duration (min)</div>
          <div className="header-cell">Rate (mL/hr)</div>
          <div className="header-cell">Volume (mL)</div>
          <div className="header-cell">Actions</div>
        </div>

        <div className="table-body">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`table-row ${step.validated ? 'validated' : ''} ${showValidation && validationResults[step.id]?.valid === false ? 'invalid' : ''}`}
            >
              <div className="cell step-number">
                <div className="step-badge">{step.id}</div>
              </div>
              
              <div className="cell">
                <input
                  type="number"
                  value={step.duration}
                  onChange={(e) => updateStep(step.id, 'duration', e.target.value)}
                  placeholder="0"
                  className="step-input"
                  min="0"
                />
              </div>
              
              <div className="cell">
                <input
                  type="number"
                  value={step.rate}
                  onChange={(e) => updateStep(step.id, 'rate', e.target.value)}
                  placeholder="0.0"
                  className="step-input"
                  min="0"
                  step="0.1"
                />
              </div>
              
              <div className="cell">
                <input
                  type="number"
                  value={step.volume}
                  className="step-input volume-input"
                  readOnly
                  placeholder="0.0"
                />
              </div>
              
              <div className="cell actions">
                {steps.length > 1 && (
                  <button
                    className="remove-btn"
                    onClick={() => removeStep(step.id)}
                    title="Remove step"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {showValidation && validationResults[step.id] && (
                <div className="validation-feedback">
                  {validationResults[step.id].errors.map((error, idx) => (
                    <div key={idx} className="validation-error">
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  ))}
                  {validationResults[step.id].warnings.map((warning, idx) => (
                    <div key={idx} className="validation-warning">
                      <AlertCircle size={14} />
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="table-footer">
          <button className="add-step-btn" onClick={addStep}>
            <Plus size={18} />
            Add Step
          </button>
        </div>
      </div>

      <div className="steps-summary">
        <div className="summary-item">
          <span className="summary-label">Total Steps:</span>
          <span className="summary-value">{steps.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Time:</span>
          <span className="summary-value">{totalTime} min</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Volume:</span>
          <span className="summary-value">{totalVolumeSum.toFixed(1)} mL</span>
        </div>
      </div>

      {showValidation && validationResults.totalVolume && (
        <div className="total-volume-validation">
          <AlertCircle size={16} />
          {validationResults.totalVolume.error}
        </div>
      )}
    </div>
  );
};

export default InfusionStepsEditor;