import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  ChevronRight,
  ChevronLeft,
  Check,
  Pill,
  FlaskConical,
  Droplets,
  Clock,
  Settings,
  FileText
} from 'lucide-react';
import './MedicationForm.css';

const MedicationForm = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Information
    brandName: '',
    genericName: '',
    dosageForm: 'solution', // solution, lyophilized, oral
    
    // Standard Dose
    standardDose: {
      value: '',
      unit: 'mg/kg',
      frequency: 'every week',
      range: {
        min: '',
        max: ''
      }
    },
    
    // Vial Sizes
    vialSizes: [],
    
    // Saline Bag Rules
    salineBagRules: {
      type: 'weightBased', // weightBased, fixed, volumeBased
      fixedBagSize: '',
      specialInstructions: '',
      rules: []
    },
    
    // Infusion Steps
    infusionSteps: {
      type: 'standard', // standard, stepwise, weightBased
      duration: '',
      steps: []
    },
    
    // Special Dosing
    specialDosing: {
      enabled: false,
      description: '',
      rapidlyProgressing: {
        enabled: false,
        value: '',
        unit: '',
        frequency: ''
      },
      doseEscalation: {
        enabled: false,
        schedule: []
      }
    },
    
    // Additional Info
    filter: '',
    notes: '',
    infusionRate: '',
    overfillRules: {}
  });

  const [errors, setErrors] = useState({});
  const [savedMedications, setSavedMedications] = useState([]);

  const steps = [
    { title: 'Basic Information', icon: Pill },
    { title: 'Vial Configuration', icon: FlaskConical },
    { title: 'Dosing Rules', icon: Settings },
    { title: 'Saline Bags', icon: Droplets },
    { title: 'Infusion Steps', icon: Clock },
    { title: 'Additional Info', icon: FileText }
  ];

  // Load saved medications on mount
  useEffect(() => {
    const saved = localStorage.getItem('customMedications');
    if (saved) {
      setSavedMedications(JSON.parse(saved));
    }
  }, [isOpen]);

  // Validation functions
  const validateStep = (step) => {
    const newErrors = {};
    
    switch(step) {
      case 0: // Basic Information
        if (!formData.brandName) newErrors.brandName = 'Brand name is required';
        if (!formData.dosageForm) newErrors.dosageForm = 'Dosage form is required';
        break;
      case 1: // Vial Configuration
        if (formData.vialSizes.length === 0) newErrors.vialSizes = 'At least one vial size is required';
        break;
      case 2: // Dosing Rules
        if (!formData.standardDose.value) newErrors.standardDoseValue = 'Standard dose is required';
        break;
      case 3: // Saline Bags
        if (formData.salineBagRules.type === 'weightBased' && formData.salineBagRules.rules.length === 0) {
          newErrors.salineRules = 'At least one weight-based rule is required';
        }
        if (formData.salineBagRules.type === 'fixed' && !formData.salineBagRules.fixedBagSize) {
          newErrors.fixedBagSize = 'Fixed bag size is required';
        }
        break;
      case 4: // Infusion Steps
        if (formData.infusionSteps.type === 'stepwise' && formData.infusionSteps.steps.length === 0) {
          newErrors.infusionSteps = 'At least one infusion step is required';
        }
        if (formData.infusionSteps.type === 'standard' && !formData.infusionSteps.duration) {
          newErrors.infusionDuration = 'Infusion duration is required';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Input handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  // Vial size handlers
  const addVialSize = () => {
    const newVial = formData.dosageForm === 'lyophilized' ? {
      strength: '',
      unit: 'mg',
      reconstitutionVolume: '',
      reconstitutionSolution: 'Sterile water',
      finalVolume: '',
      finalConcentration: '',
      withdrawVolume: ''
    } : {
      strength: '',
      unit: 'mg',
      volume: '',
      concentration: ''
    };
    
    setFormData(prev => ({
      ...prev,
      vialSizes: [...prev.vialSizes, newVial]
    }));
  };

  const updateVialSize = (index, field, value) => {
    const newVialSizes = [...formData.vialSizes];
    newVialSizes[index][field] = value;
    
    // Auto-calculate concentration for solutions
    if (formData.dosageForm === 'solution' && (field === 'strength' || field === 'volume')) {
      const strength = parseFloat(newVialSizes[index].strength);
      const volume = parseFloat(newVialSizes[index].volume);
      if (strength && volume) {
        newVialSizes[index].concentration = (strength / volume).toFixed(2);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      vialSizes: newVialSizes
    }));
  };

  const removeVialSize = (index) => {
    setFormData(prev => ({
      ...prev,
      vialSizes: prev.vialSizes.filter((_, i) => i !== index)
    }));
  };

  // Saline bag rule handlers
  const addSalineRule = () => {
    const newRule = {
      minWeight: '',
      maxWeight: '',
      bagSize: '',
      description: ''
    };
    
    setFormData(prev => ({
      ...prev,
      salineBagRules: {
        ...prev.salineBagRules,
        rules: [...prev.salineBagRules.rules, newRule]
      }
    }));
  };

  const updateSalineRule = (index, field, value) => {
    const newRules = [...formData.salineBagRules.rules];
    newRules[index][field] = value;
    
    setFormData(prev => ({
      ...prev,
      salineBagRules: {
        ...prev.salineBagRules,
        rules: newRules
      }
    }));
  };

  const removeSalineRule = (index) => {
    setFormData(prev => ({
      ...prev,
      salineBagRules: {
        ...prev.salineBagRules,
        rules: prev.salineBagRules.rules.filter((_, i) => i !== index)
      }
    }));
  };

  // Infusion step handlers
  const addInfusionStep = () => {
    const newStep = {
      rate: '',
      duration: '',
      description: '',
      rateUnit: 'ml/hr'
    };
    
    setFormData(prev => ({
      ...prev,
      infusionSteps: {
        ...prev.infusionSteps,
        steps: [...prev.infusionSteps.steps, newStep]
      }
    }));
  };

  const updateInfusionStep = (index, field, value) => {
    const newSteps = [...formData.infusionSteps.steps];
    newSteps[index][field] = value;
    
    setFormData(prev => ({
      ...prev,
      infusionSteps: {
        ...prev.infusionSteps,
        steps: newSteps
      }
    }));
  };

  const removeInfusionStep = (index) => {
    setFormData(prev => ({
      ...prev,
      infusionSteps: {
        ...prev.infusionSteps,
        steps: prev.infusionSteps.steps.filter((_, i) => i !== index)
      }
    }));
  };

  // Save medication
  const saveMedication = () => {
    // Validate all steps
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }

    // Format medication data for pump-database.json structure
    const medicationKey = formData.brandName.toUpperCase().replace(/\s+/g, '_');
    const medicationData = {
      brandName: formData.brandName,
      genericName: formData.genericName || '',
      dosageForm: formData.dosageForm,
      vialSizes: formData.vialSizes,
      standardDose: formData.standardDose,
      infusionRate: formData.infusionRate,
      salineBagRules: formData.salineBagRules.type === 'weightBased' ? {
        weightBased: true,
        rules: formData.salineBagRules.rules
      } : formData.salineBagRules.type === 'fixed' ? {
        fixed: true,
        bagSize: formData.salineBagRules.fixedBagSize,
        specialInstructions: formData.salineBagRules.specialInstructions
      } : {
        volumeBased: true,
        defaultVolume: formData.salineBagRules.fixedBagSize
      },
      overfillRules: formData.overfillRules,
      filter: formData.filter,
      infusionSteps: formData.infusionSteps,
      notes: formData.notes,
      specialDosing: formData.specialDosing.enabled ? formData.specialDosing.description : ''
    };

    // Save to localStorage
    const existingMeds = JSON.parse(localStorage.getItem('customMedications') || '{}');
    existingMeds[medicationKey] = medicationData;
    localStorage.setItem('customMedications', JSON.stringify(existingMeds));

    // Update pump calculator's available medications
    const event = new CustomEvent('medicationAdded', { 
      detail: { 
        key: medicationKey, 
        data: medicationData 
      } 
    });
    window.dispatchEvent(event);

    // Reset form and close
    alert(`Medication "${formData.brandName}" has been successfully added!`);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      brandName: '',
      genericName: '',
      dosageForm: 'solution',
      standardDose: {
        value: '',
        unit: 'mg/kg',
        frequency: 'every week',
        range: { min: '', max: '' }
      },
      vialSizes: [],
      salineBagRules: {
        type: 'weightBased',
        fixedBagSize: '',
        specialInstructions: '',
        rules: []
      },
      infusionSteps: {
        type: 'standard',
        duration: '',
        steps: []
      },
      specialDosing: {
        enabled: false,
        description: '',
        rapidlyProgressing: {
          enabled: false,
          value: '',
          unit: '',
          frequency: ''
        },
        doseEscalation: {
          enabled: false,
          schedule: []
        }
      },
      filter: '',
      notes: '',
      infusionRate: '',
      overfillRules: {}
    });
    setCurrentStep(0);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="medication-form-overlay">
      <div className="medication-form-modal">
        <div className="medication-form-header">
          <h2>Add New Medication</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="medication-form-progress">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index} 
                className={`progress-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="step-icon">
                  {index < currentStep ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <span className="step-title">{step.title}</span>
              </div>
            );
          })}
        </div>

        <div className="medication-form-content">
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <div className="form-step">
              <h3>Basic Information</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                Enter the essential medication details. Only brand name and dosage form are required.
              </p>
              
              <div className="form-group">
                <label>Brand Name *</label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => handleInputChange('brandName', e.target.value)}
                  placeholder="e.g., ALDURAZYME"
                  className={errors.brandName ? 'error' : ''}
                />
                {errors.brandName && <span className="error-message">{errors.brandName}</span>}
              </div>

              <div className="form-group">
                <label>Generic Name (Optional)</label>
                <input
                  type="text"
                  value={formData.genericName}
                  onChange={(e) => handleInputChange('genericName', e.target.value)}
                  placeholder="e.g., Laronidase"
                />
              </div>

              <div className="form-group">
                <label>Dosage Form *</label>
                <select
                  value={formData.dosageForm}
                  onChange={(e) => handleInputChange('dosageForm', e.target.value)}
                >
                  <option value="solution">Solution</option>
                  <option value="lyophilized">Lyophilized (Powder)</option>
                  <option value="oral">Oral</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Vial Configuration */}
          {currentStep === 1 && (
            <div className="form-step">
              <h3>Vial Configuration</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                Configure the available vial sizes and concentrations for accurate dose calculations.
              </p>
              
              <div className="vial-list">
                {formData.vialSizes.map((vial, index) => (
                  <div key={index} className="vial-item">
                    <div className="vial-header">
                      <h4>Vial {index + 1}</h4>
                      <button 
                        className="remove-button"
                        onClick={() => removeVialSize(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="vial-fields">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Strength</label>
                          <input
                            type="number"
                            value={vial.strength}
                            onChange={(e) => updateVialSize(index, 'strength', e.target.value)}
                            placeholder="e.g., 2.9"
                          />
                        </div>
                        <div className="form-group">
                          <label>Unit</label>
                          <select
                            value={vial.unit}
                            onChange={(e) => updateVialSize(index, 'unit', e.target.value)}
                          >
                            <option value="mg">mg</option>
                            <option value="units">units</option>
                            <option value="mcg">mcg</option>
                          </select>
                        </div>
                      </div>

                      {formData.dosageForm === 'solution' && (
                        <div className="form-row">
                          <div className="form-group">
                            <label>Volume (mL)</label>
                            <input
                              type="number"
                              value={vial.volume}
                              onChange={(e) => updateVialSize(index, 'volume', e.target.value)}
                              placeholder="e.g., 5"
                            />
                          </div>
                          <div className="form-group">
                            <label>Concentration</label>
                            <input
                              type="number"
                              value={vial.concentration}
                              readOnly
                              placeholder="Auto-calculated"
                            />
                          </div>
                        </div>
                      )}

                      {formData.dosageForm === 'lyophilized' && (
                        <>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Reconstitution Volume (mL)</label>
                              <input
                                type="number"
                                value={vial.reconstitutionVolume}
                                onChange={(e) => updateVialSize(index, 'reconstitutionVolume', e.target.value)}
                                placeholder="e.g., 10.2"
                              />
                            </div>
                            <div className="form-group">
                              <label>Reconstitution Solution</label>
                              <select
                                value={vial.reconstitutionSolution}
                                onChange={(e) => updateVialSize(index, 'reconstitutionSolution', e.target.value)}
                              >
                                <option value="Sterile water">Sterile Water</option>
                                <option value="Normal Saline">Normal Saline</option>
                                <option value="D5W">D5W</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Final Volume (mL)</label>
                              <input
                                type="number"
                                value={vial.finalVolume}
                                onChange={(e) => updateVialSize(index, 'finalVolume', e.target.value)}
                                placeholder="e.g., 10.6"
                              />
                            </div>
                            <div className="form-group">
                              <label>Withdraw Volume (mL)</label>
                              <input
                                type="number"
                                value={vial.withdrawVolume}
                                onChange={(e) => updateVialSize(index, 'withdrawVolume', e.target.value)}
                                placeholder="e.g., 10.0"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button className="add-button" onClick={addVialSize}>
                <Plus size={16} /> Add Vial Size
              </button>
              
              {errors.vialSizes && (
                <div className="error-banner">
                  <AlertCircle size={16} />
                  {errors.vialSizes}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Dosing Rules */}
          {currentStep === 2 && (
            <div className="form-step">
              <h3>Dosing Rules</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                Define the standard dosing parameters. Special dosing scenarios are optional.
              </p>
              
              <div className="section">
                <h4>Standard Dose</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Dose Value *</label>
                    <input
                      type="number"
                      value={formData.standardDose.value}
                      onChange={(e) => handleNestedInputChange('standardDose', 'value', e.target.value)}
                      placeholder="e.g., 0.58"
                      className={errors.standardDoseValue ? 'error' : ''}
                    />
                    {errors.standardDoseValue && <span className="error-message">{errors.standardDoseValue}</span>}
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select
                      value={formData.standardDose.unit}
                      onChange={(e) => handleNestedInputChange('standardDose', 'unit', e.target.value)}
                    >
                      <option value="mg/kg">mg/kg</option>
                      <option value="units/kg">units/kg</option>
                      <option value="mg">mg</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={formData.standardDose.frequency}
                    onChange={(e) => handleNestedInputChange('standardDose', 'frequency', e.target.value)}
                  >
                    <option value="every week">Every Week</option>
                    <option value="every 2 weeks">Every 2 Weeks</option>
                    <option value="every 3 weeks">Every 3 Weeks</option>
                    <option value="every 4 weeks">Every 4 Weeks</option>
                    <option value="twice daily">Twice Daily</option>
                    <option value="once daily">Once Daily</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Min Dose (optional)</label>
                    <input
                      type="number"
                      value={formData.standardDose.range.min}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        standardDose: {
                          ...prev.standardDose,
                          range: {
                            ...prev.standardDose.range,
                            min: e.target.value
                          }
                        }
                      }))}
                      placeholder="Minimum dose"
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Dose (optional)</label>
                    <input
                      type="number"
                      value={formData.standardDose.range.max}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        standardDose: {
                          ...prev.standardDose,
                          range: {
                            ...prev.standardDose.range,
                            max: e.target.value
                          }
                        }
                      }))}
                      placeholder="Maximum dose"
                    />
                  </div>
                </div>
              </div>

              <div className="section">
                <h4 style={{color: '#6b7280'}}>Special Dosing (Optional)</h4>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.specialDosing.enabled}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        specialDosing: {
                          ...prev.specialDosing,
                          enabled: e.target.checked
                        }
                      }))}
                    />
                    Enable Special Dosing
                  </label>
                </div>

                {formData.specialDosing.enabled && (
                  <div className="form-group">
                    <label>Special Dosing Description</label>
                    <textarea
                      value={formData.specialDosing.description}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        specialDosing: {
                          ...prev.specialDosing,
                          description: e.target.value
                        }
                      }))}
                      placeholder="Describe special dosing scenarios..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Saline Bags */}
          {currentStep === 3 && (
            <div className="form-step">
              <h3>Saline Bag Configuration</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                Set up rules for IV bag selection based on patient weight or fixed sizes.
              </p>
              
              <div className="form-group">
                <label>Bag Selection Type</label>
                <select
                  value={formData.salineBagRules.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    salineBagRules: {
                      ...prev.salineBagRules,
                      type: e.target.value
                    }
                  }))}
                >
                  <option value="weightBased">Weight-Based</option>
                  <option value="fixed">Fixed Size</option>
                  <option value="volumeBased">Volume-Based</option>
                </select>
              </div>

              {formData.salineBagRules.type === 'weightBased' && (
                <>
                  <div className="rule-list">
                    {formData.salineBagRules.rules.map((rule, index) => (
                      <div key={index} className="rule-item">
                        <div className="rule-header">
                          <h4>Weight Rule {index + 1}</h4>
                          <button 
                            className="remove-button"
                            onClick={() => removeSalineRule(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Min Weight (kg)</label>
                            <input
                              type="number"
                              value={rule.minWeight}
                              onChange={(e) => updateSalineRule(index, 'minWeight', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Max Weight (kg)</label>
                            <input
                              type="number"
                              value={rule.maxWeight}
                              onChange={(e) => updateSalineRule(index, 'maxWeight', e.target.value)}
                              placeholder="20"
                            />
                          </div>
                          <div className="form-group">
                            <label>Bag Size (mL)</label>
                            <select
                              value={rule.bagSize}
                              onChange={(e) => updateSalineRule(index, 'bagSize', e.target.value)}
                            >
                              <option value="">Select...</option>
                              <option value="50">50 mL</option>
                              <option value="100">100 mL</option>
                              <option value="150">150 mL</option>
                              <option value="250">250 mL</option>
                              <option value="500">500 mL</option>
                              <option value="1000">1000 mL</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Description</label>
                          <input
                            type="text"
                            value={rule.description}
                            onChange={(e) => updateSalineRule(index, 'description', e.target.value)}
                            placeholder="e.g., ≤20 kg: use 100 mL NS"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="add-button" onClick={addSalineRule}>
                    <Plus size={16} /> Add Weight Rule
                  </button>
                  
                  {errors.salineRules && (
                    <div className="error-banner">
                      <AlertCircle size={16} />
                      {errors.salineRules}
                    </div>
                  )}
                </>
              )}

              {formData.salineBagRules.type === 'fixed' && (
                <>
                  <div className="form-group">
                    <label>Fixed Bag Size (mL) *</label>
                    <select
                      value={formData.salineBagRules.fixedBagSize}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        salineBagRules: {
                          ...prev.salineBagRules,
                          fixedBagSize: e.target.value
                        }
                      }))}
                      className={errors.fixedBagSize ? 'error' : ''}
                    >
                      <option value="">Select...</option>
                      <option value="50">50 mL</option>
                      <option value="100">100 mL</option>
                      <option value="150">150 mL</option>
                      <option value="250">250 mL</option>
                      <option value="500">500 mL</option>
                      <option value="1000">1000 mL</option>
                    </select>
                    {errors.fixedBagSize && <span className="error-message">{errors.fixedBagSize}</span>}
                  </div>

                  <div className="form-group">
                    <label>Special Instructions</label>
                    <textarea
                      value={formData.salineBagRules.specialInstructions}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        salineBagRules: {
                          ...prev.salineBagRules,
                          specialInstructions: e.target.value
                        }
                      }))}
                      placeholder="e.g., DO NOT remove drug volume or overfill"
                      rows={2}
                    />
                  </div>
                </>
              )}

              {formData.salineBagRules.type === 'volumeBased' && (
                <div className="form-group">
                  <label>Default Volume</label>
                  <input
                    type="text"
                    value={formData.salineBagRules.fixedBagSize}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      salineBagRules: {
                        ...prev.salineBagRules,
                        fixedBagSize: e.target.value
                      }
                    }))}
                    placeholder="e.g., 100-200 mL NS"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Infusion Steps */}
          {currentStep === 4 && (
            <div className="form-step">
              <h3>Infusion Configuration</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                Configure infusion rates and steps for pump programming.
              </p>
              
              <div className="form-group">
                <label>Infusion Type</label>
                <select
                  value={formData.infusionSteps.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    infusionSteps: {
                      ...prev.infusionSteps,
                      type: e.target.value
                    }
                  }))}
                >
                  <option value="standard">Standard (Constant Rate)</option>
                  <option value="stepwise">Stepwise (Increasing Rate)</option>
                  <option value="weightBased">Weight-Based Steps</option>
                </select>
              </div>

              {formData.infusionSteps.type === 'standard' && (
                <div className="form-group">
                  <label>Infusion Duration *</label>
                  <input
                    type="text"
                    value={formData.infusionSteps.duration}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      infusionSteps: {
                        ...prev.infusionSteps,
                        duration: e.target.value
                      }
                    }))}
                    placeholder="e.g., 1-2 hours or 3-4 hours"
                    className={errors.infusionDuration ? 'error' : ''}
                  />
                  {errors.infusionDuration && <span className="error-message">{errors.infusionDuration}</span>}
                </div>
              )}

              {formData.infusionSteps.type === 'stepwise' && (
                <>
                  <div className="step-list">
                    {formData.infusionSteps.steps.map((step, index) => (
                      <div key={index} className="step-item">
                        <div className="step-header">
                          <h4>Step {index + 1}</h4>
                          <button 
                            className="remove-button"
                            onClick={() => removeInfusionStep(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label>Rate</label>
                            <input
                              type="text"
                              value={step.rate}
                              onChange={(e) => updateInfusionStep(index, 'rate', e.target.value)}
                              placeholder="e.g., 8 or increase by 8"
                            />
                          </div>
                          <div className="form-group">
                            <label>Duration</label>
                            <input
                              type="text"
                              value={step.duration}
                              onChange={(e) => updateInfusionStep(index, 'duration', e.target.value)}
                              placeholder="e.g., 15 or remainder"
                            />
                          </div>
                          <div className="form-group">
                            <label>Unit</label>
                            <select
                              value={step.rateUnit}
                              onChange={(e) => updateInfusionStep(index, 'rateUnit', e.target.value)}
                            >
                              <option value="ml/hr">mL/hr</option>
                              <option value="mg/hr">mg/hr</option>
                              <option value="units/hr">units/hr</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Description</label>
                          <input
                            type="text"
                            value={step.description}
                            onChange={(e) => updateInfusionStep(index, 'description', e.target.value)}
                            placeholder="e.g., Initial rate or 10 µg/kg/hr"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="add-button" onClick={addInfusionStep}>
                    <Plus size={16} /> Add Infusion Step
                  </button>
                  
                  {errors.infusionSteps && (
                    <div className="error-banner">
                      <AlertCircle size={16} />
                      {errors.infusionSteps}
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label>Infusion Rate Description</label>
                <input
                  type="text"
                  value={formData.infusionRate}
                  onChange={(e) => handleInputChange('infusionRate', e.target.value)}
                  placeholder="e.g., over 3-4 hours or Taper over 1–3 hrs (max 8 hrs)"
                />
              </div>
            </div>
          )}

          {/* Step 5: Additional Info */}
          {currentStep === 5 && (
            <div className="form-step">
              <h3>Additional Information (Optional)</h3>
              <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '20px'}}>
                These fields are optional but can provide helpful reference information.
              </p>
              
              <div className="form-group">
                <label>Filter Requirements</label>
                <input
                  type="text"
                  value={formData.filter}
                  onChange={(e) => handleInputChange('filter', e.target.value)}
                  placeholder="e.g., low-protein-binding 0.2 micron in-line filter"
                />
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional preparation or administration notes..."
                  rows={4}
                />
              </div>

              <div className="section">
                <h4 style={{color: '#6b7280'}}>Overfill Rules (Optional)</h4>
                <div className="overfill-grid">
                  {[50, 100, 150, 200, 250, 300, 500, 1000].map(size => (
                    <div key={size} className="overfill-item">
                      <label>{size} mL bag:</label>
                      <input
                        type="number"
                        value={formData.overfillRules[size] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          overfillRules: {
                            ...prev.overfillRules,
                            [size]: e.target.value
                          }
                        }))}
                        placeholder="Overfill mL"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="summary-section">
                <h4>Summary</h4>
                <div className="summary-content">
                  <p><strong>Medication:</strong> {formData.brandName} ({formData.genericName})</p>
                  <p><strong>Form:</strong> {formData.dosageForm}</p>
                  <p><strong>Standard Dose:</strong> {formData.standardDose.value} {formData.standardDose.unit} {formData.standardDose.frequency}</p>
                  <p><strong>Vial Sizes:</strong> {formData.vialSizes.length} configured</p>
                  <p><strong>Saline Bags:</strong> {formData.salineBagRules.type}</p>
                  <p><strong>Infusion Type:</strong> {formData.infusionSteps.type}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="medication-form-footer">
          <button 
            className="secondary-button" 
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          
          <div className="button-group">
            {currentStep < steps.length - 1 ? (
              <button className="primary-button" onClick={handleNext}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button className="save-button" onClick={saveMedication}>
                <Save size={16} /> Save Medication
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationForm;