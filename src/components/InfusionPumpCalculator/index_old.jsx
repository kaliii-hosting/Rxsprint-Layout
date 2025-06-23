import React, { useState, useMemo, useEffect } from 'react';
import './InfusionPumpCalculator.css';
import '../shared/PumpCalculatorStyles.css';
import pumpDatabase from '../../../pump-database.json';
import pumpLogic from '../../../pump-logic.json';

const InfusionPumpCalculator = () => {
  const [inputs, setInputs] = useState({
    // Core fields
    patientWeight: '',
    medicationName: '',
    
    // Dynamic fields based on medication
    // Will be populated based on selected medication
  });

  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState({});
  const [showLogic, setShowLogic] = useState(false);
  const [calculationLogic, setCalculationLogic] = useState([]);
  const [showMedicationInfo, setShowMedicationInfo] = useState(false);
  const [infusionMode, setInfusionMode] = useState('Remove Overfill');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [primeVolume, setPrimeVolume] = useState(10);
  const [flushVolume, setFlushVolume] = useState(10);
  const [totalInfusionTime, setTotalInfusionTime] = useState({ hours: '', minutes: '' });
  const [manualBagSize, setManualBagSize] = useState('');
  const [customInfusionRate, setCustomInfusionRate] = useState('');
  const [vialCombineMode, setVialCombineMode] = useState('smart');
  const [customVialSelections, setCustomVialSelections] = useState({});
  const [prescribedDoseUnit, setPrescribedDoseUnit] = useState('mg/kg');
  const [showDoseIndicator, setShowDoseIndicator] = useState(false);

  const medications = useMemo(() => {
    return Object.keys(pumpDatabase.medications).sort();
  }, []);

  const selectedMedication = useMemo(() => {
    return inputs.medicationName ? pumpDatabase.medications[inputs.medicationName] : null;
  }, [inputs.medicationName]);

  // Get medication-specific fields based on selected medication
  const getMedicationFields = (medication) => {
    if (!medication) return [];
    
    const fields = [];
    
    // Always include custom infusion rate override as optional field
    fields.push({
      name: 'customInfusionRate',
      label: 'Custom Infusion Rate (mL/hr)',
      type: 'number',
      placeholder: 'Optional - Leave blank for auto-calculation',
      description: 'Override the calculated infusion rate',
      required: false,
      min: 1,
      step: 1
    });
    
    // Always include patient age for medications with age-based dosing
    if (medication.indication && (medication.indication.includes('years') || medication.indication.includes('months'))) {
      fields.push({
        name: 'patientAge',
        label: 'Patient Age',
        type: 'select',
        options: [
          { value: 'pediatric', label: 'Pediatric' },
          { value: 'adult', label: 'Adult' }
        ],
        required: true
      });
    }

    // BSA for medications with BSA-based dosing
    if (medication.specialDosing && medication.specialDosing.includes('BSA')) {
      fields.push({
        name: 'patientHeight',
        label: 'Patient Height (cm)',
        type: 'number',
        required: true
      });
      fields.push({
        name: 'bsaCalculated',
        label: 'Body Surface Area (m²)',
        type: 'readonly',
        calculate: true
      });
    }

    // ERT status for medications like ELFABRIO
    if (medication.infusionSteps?.ertStatus) {
      fields.push({
        name: 'ertStatus',
        label: 'ERT Status',
        type: 'select',
        options: [
          { value: 'ertNaive', label: 'ERT-Naive' },
          { value: 'ertExperienced', label: 'ERT-Experienced' }
        ],
        required: true
      });
    }

    // Dose escalation for XENPOZYME
    if (medication.standardDose?.escalationSchedule) {
      fields.push({
        name: 'escalationWeek',
        label: 'Dose Escalation Week',
        type: 'select',
        options: Object.keys(medication.standardDose.escalationSchedule).map(week => ({
          value: week,
          label: week === 'week0' ? 'Week 0' : 
                 week === 'week14' ? 'Week 14+ (Maintenance)' : 
                 week.replace('week', 'Week ')
        })),
        required: true
      });
    }

    // Metabolizer status for CERDELGA
    if (medication.brandName === 'CERDELGA') {
      fields.push({
        name: 'metabolizerStatus',
        label: 'Metabolizer Status',
        type: 'select',
        options: [
          { value: 'extensive', label: 'Extensive Metabolizer' },
          { value: 'intermediate', label: 'Intermediate Metabolizer' },
          { value: 'poor', label: 'Poor Metabolizer' }
        ],
        required: true
      });
    }

    // Renal function for ZAVESCA
    if (medication.brandName === 'ZAVESCA') {
      fields.push({
        name: 'creatinineClearance',
        label: 'Creatinine Clearance (mL/min)',
        type: 'number',
        min: 0,
        required: true
      });
    }

    // Rapidly progressing disease for KANUMA
    if (medication.standardDose?.rapidProgression) {
      fields.push({
        name: 'rapidlyProgressing',
        label: 'Rapidly Progressing Disease',
        type: 'checkbox',
        description: 'Check if patient has rapidly progressing LAL deficiency'
      });
    }

    // Infusion number for tracking
    if (medication.infusionSteps && !medication.dosageForm?.includes('oral')) {
      fields.push({
        name: 'infusionNumber',
        label: 'Infusion Number',
        type: 'number',
        min: 1,
        defaultValue: 1,
        description: 'Which infusion is this for the patient?'
      });
    }

    // Override dose option
    fields.push({
      name: 'overrideDose',
      label: 'Override Dose',
      type: 'checkbox',
      description: 'Check to manually enter dose'
    });

    // Manual dose entry (shown only if override is checked)
    fields.push({
      name: 'manualDose',
      label: `Manual Dose (${medication.standardDose?.unit || 'mg/kg'})`,
      type: 'number',
      min: 0,
      showIf: 'overrideDose',
      description: 'Enter custom dose'
    });

    // Vial size selection if multiple sizes available
    if (medication.vialSizes && medication.vialSizes.length > 1) {
      const availableVials = medication.vialSizes.filter(v => !v.availability || v.availability !== 'unavailable');
      if (availableVials.length > 1) {
        fields.push({
          name: 'preferredVialSize',
          label: 'Preferred Vial Size',
          type: 'select',
          options: availableVials.map(vial => ({
            value: vial.strength,
            label: `${vial.strength} ${vial.unit}${vial.form ? ' (' + vial.form + ')' : ''}`
          })),
          defaultValue: availableVials[0].strength
        });
      }
    }

    // Saline bag override
    if (medication.salineBagRules && !medication.dosageForm?.includes('oral')) {
      fields.push({
        name: 'overrideSalineBag',
        label: 'Override Saline Bag Size',
        type: 'checkbox'
      });
      fields.push({
        name: 'manualSalineBag',
        label: 'Manual Saline Bag Size (mL)',
        type: 'select',
        options: [
          { value: '50', label: '50 mL' },
          { value: '100', label: '100 mL' },
          { value: '150', label: '150 mL' },
          { value: '200', label: '200 mL' },
          { value: '250', label: '250 mL' },
          { value: '300', label: '300 mL' },
          { value: '500', label: '500 mL' },
          { value: '600', label: '600 mL' },
          { value: '700', label: '700 mL' },
          { value: '800', label: '800 mL' },
          { value: '900', label: '900 mL' },
          { value: '1000', label: '1000 mL' }
        ],
        showIf: 'overrideSalineBag'
      });
    }

    // Prime and flush volumes
    if (!medication.dosageForm?.includes('oral')) {
      fields.push({
        name: 'primeVolume',
        label: 'Prime Volume (mL)',
        type: 'number',
        min: 0,
        defaultValue: 10,
        description: 'Volume to prime IV line'
      });
      fields.push({
        name: 'flushVolume',
        label: 'Flush Volume (mL)',
        type: 'number',
        min: 0,
        defaultValue: 10,
        description: 'Volume to flush IV line after infusion'
      });
    }

    return fields;
  };

  // Handle medication change
  const handleMedicationChange = (medicationName) => {
    const medication = pumpDatabase.medications[medicationName];
    const fields = getMedicationFields(medication);
    
    // Reset inputs to default values
    const newInputs = {
      patientWeight: inputs.patientWeight,
      medicationName: medicationName
    };

    // Set default values for medication-specific fields
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        newInputs[field.name] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        newInputs[field.name] = false;
      } else {
        newInputs[field.name] = '';
      }
    });

    setInputs(newInputs);
    setResults(null);
    setErrors({});
    // Also clear the advanced options custom infusion rate
    setCustomInfusionRate('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'medicationName') {
      handleMedicationChange(value);
    } else {
      setInputs(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
      setErrors(prev => ({ ...prev, [name]: '' }));
      
      // Sync custom infusion rate between medication fields and advanced options
      if (name === 'customInfusionRate') {
        setCustomInfusionRate(value);
      }
    }
  };

  // Calculate BSA if needed
  useEffect(() => {
    if (inputs.patientWeight && inputs.patientHeight) {
      // Mosteller formula: BSA (m²) = √((height(cm) × weight(kg)) / 3600)
      const bsa = Math.sqrt((parseFloat(inputs.patientHeight) * parseFloat(inputs.patientWeight)) / 3600);
      setInputs(prev => ({ ...prev, bsaCalculated: bsa.toFixed(2) }));
    }
  }, [inputs.patientWeight, inputs.patientHeight]);

  const validateInputs = () => {
    const newErrors = {};
    
    if (!inputs.patientWeight || parseFloat(inputs.patientWeight) <= 0) {
      newErrors.patientWeight = 'Please enter a valid patient weight';
    }
    
    if (!inputs.medicationName) {
      newErrors.medicationName = 'Please select a medication';
    }

    // Validate medication-specific required fields
    if (selectedMedication) {
      const fields = getMedicationFields(selectedMedication);
      fields.forEach(field => {
        if (field.required && !field.showIf && !inputs[field.name]) {
          newErrors[field.name] = `Please enter ${field.label}`;
        }
        // Check conditional required fields
        if (field.required && field.showIf && inputs[field.showIf] && !inputs[field.name]) {
          newErrors[field.name] = `Please enter ${field.label}`;
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateDose = () => {
    if (!selectedMedication) return null;
    
    const weight = parseFloat(inputs.patientWeight);
    let dose = 0;
    let doseUnit = selectedMedication.standardDose?.unit || 'mg/kg';
    const logic = [];

    // Check if manual dose override
    if (inputs.overrideDose && inputs.manualDose) {
      dose = parseFloat(inputs.manualDose);
      logic.push(`Using manual dose override: ${dose} ${doseUnit}`);
      return { dose, doseUnit, logic };
    }

    // Handle oral medications
    if (selectedMedication.dosageForm === 'oral') {
      if (selectedMedication.brandName === 'CERDELGA') {
        const metabolizer = inputs.metabolizerStatus;
        if (metabolizer === 'poor') {
          dose = 84;
          doseUnit = 'mg';
          logic.push('Poor metabolizer: 84 mg once daily');
        } else {
          dose = 84;
          doseUnit = 'mg';
          logic.push('Extensive/Intermediate metabolizer: 84 mg twice daily');
        }
      } else if (selectedMedication.brandName === 'ZAVESCA') {
        const crcl = parseFloat(inputs.creatinineClearance);
        doseUnit = 'mg';
        if (crcl > 70) {
          dose = 100;
          logic.push('CrCl >70 mL/min: 100 mg three times daily');
        } else if (crcl >= 50) {
          dose = 100;
          logic.push('CrCl 50-70 mL/min: 100 mg twice daily');
        } else if (crcl >= 30) {
          dose = 100;
          logic.push('CrCl 30-50 mL/min: 100 mg once daily');
        } else {
          dose = 0;
          logic.push('CrCl <30 mL/min: Not recommended');
        }
      }
      return { dose, doseUnit, logic };
    }

    // Handle IV medications
    if (selectedMedication.standardDose) {
      // Check for dose escalation (XENPOZYME)
      if (selectedMedication.standardDose.escalationSchedule && inputs.escalationWeek) {
        dose = selectedMedication.standardDose.escalationSchedule[inputs.escalationWeek];
        logic.push(`Using dose escalation schedule: ${inputs.escalationWeek} = ${dose} ${doseUnit}`);
      }
      // Check for rapidly progressing disease (KANUMA)
      else if (inputs.rapidlyProgressing && selectedMedication.standardDose.rapidProgression) {
        dose = selectedMedication.standardDose.rapidProgression;
        logic.push(`Rapidly progressing disease dose: ${dose} ${doseUnit}`);
      }
      // Check for pediatric dose (NEXVIAZYME)
      else if (selectedMedication.standardDose.pediatricDose && weight < 30) {
        dose = selectedMedication.standardDose.pediatricDose;
        logic.push(`Pediatric dose (weight <30 kg): ${dose} ${doseUnit}`);
      }
      // Standard dose calculation
      else {
        dose = selectedMedication.standardDose.value;
        logic.push(`Standard dose: ${dose} ${doseUnit}`);
      }
    }

    return { dose, doseUnit, logic };
  };

  const calculateTotalDose = (doseInfo, weight) => {
    if (!doseInfo) return null;
    
    const { dose, doseUnit } = doseInfo;
    let totalDose = 0;
    const logic = [];

    if (doseUnit.includes('/kg')) {
      totalDose = dose * weight;
      logic.push(`Total dose = ${dose} ${doseUnit} × ${weight} kg = ${totalDose.toFixed(2)} ${doseUnit.replace('/kg', '')}`);
    } else {
      totalDose = dose;
      logic.push(`Fixed dose: ${totalDose} ${doseUnit}`);
    }

    return { totalDose, totalUnit: doseUnit.replace('/kg', ''), logic };
  };

  const getSalineBagSize = (medication, weight, dose) => {
    if (!medication.salineBagRules) return null;
    
    const logic = [];
    let bagSize = 100; // default

    // Check for manual override
    if (inputs.overrideSalineBag && inputs.manualSalineBag) {
      bagSize = parseInt(inputs.manualSalineBag);
      logic.push(`Using manual saline bag override: ${bagSize} mL`);
      return { bagSize, logic };
    }

    // Special case for NEXVIAZYME - must use D5W
    if (medication.brandName === 'NEXVIAZYME') {
      logic.push('IMPORTANT: Must use D5W (5% Dextrose in Water) - NOT Normal Saline');
    }

    const rules = medication.salineBagRules;

    // Fixed bag size
    if (rules.fixed) {
      bagSize = rules.bagSize;
      logic.push(`Fixed bag size: ${bagSize} mL`);
      if (rules.specialInstructions) {
        logic.push(rules.specialInstructions);
      }
    }
    // Weight-based rules
    else if (rules.weightBased && rules.rules) {
      const applicableRule = rules.rules.find(rule => {
        const minOk = !rule.minWeight || weight >= rule.minWeight;
        const maxOk = !rule.maxWeight || weight <= rule.maxWeight;
        return minOk && maxOk;
      });

      if (applicableRule) {
        bagSize = applicableRule.bagSize;
        logic.push(applicableRule.description || `Weight ${weight} kg: ${bagSize} mL bag`);
      }
    }
    // Weight and dose based (NEXVIAZYME, KANUMA)
    else if (rules.weightAndDoseBased) {
      if (medication.brandName === 'NEXVIAZYME') {
        const doseLevel = inputs.patientWeight < 30 ? '40mg/kg' : '20mg/kg';
        const doseRules = rules.rules.find(r => r.dose === doseLevel);
        if (doseRules) {
          const weightRule = doseRules.weightRanges.find(range => 
            weight >= range.minWeight && weight <= range.maxWeight
          );
          if (weightRule) {
            bagSize = weightRule.bagSize;
            logic.push(`${doseLevel} dose, weight ${weight} kg: ${bagSize} mL D5W`);
          }
        }
      } else if (medication.brandName === 'KANUMA') {
        const doseKey = inputs.rapidlyProgressing ? 'dose3mg' : 'dose1mg';
        const rule = rules.rules.find(r => 
          weight >= r.minWeight && weight <= r.maxWeight
        );
        if (rule) {
          bagSize = rule[doseKey];
          logic.push(`${inputs.rapidlyProgressing ? '3 mg/kg' : '1 mg/kg'} dose, weight ${weight} kg: ${bagSize} mL NS`);
        }
      }
    }

    return { bagSize, logic };
  };

  const calculateVials = (medication, totalDose) => {
    if (!medication.vialSizes || medication.dosageForm === 'oral') return null;
    
    const logic = [];
    const vials = [];
    let totalVials = 0;

    // Get available vial sizes
    let availableVials = medication.vialSizes.filter(v => !v.availability || v.availability !== 'unavailable');
    
    // Sort by strength descending for optimal vial usage
    availableVials = availableVials.sort((a, b) => b.strength - a.strength);

    // Check if using custom vial selection mode
    if (vialCombineMode === 'custom' && Object.keys(customVialSelections).length > 0) {
      logic.push('=== Custom Vial Selection ===');
      
      // Use custom selections
      availableVials.forEach(vial => {
        const customCount = customVialSelections[vial.strength] || 0;
        if (customCount > 0) {
          vials.push({
            strength: vial.strength,
            unit: vial.unit,
            count: customCount,
            volume: vial.volume,
            concentration: vial.concentration
          });
          totalVials += customCount;
          logic.push(`${customCount} vial(s) of ${vial.strength} ${vial.unit} (manually selected)`);
        }
      });
      
      // Calculate total dose from selected vials
      const totalSelectedDose = vials.reduce((sum, vial) => sum + (vial.strength * vial.count), 0);
      if (totalSelectedDose < totalDose) {
        logic.push(`Warning: Selected vials provide ${totalSelectedDose.toFixed(2)} ${availableVials[0].unit}, which is less than required dose of ${totalDose.toFixed(2)} ${availableVials[0].unit}`);
      } else if (totalSelectedDose > totalDose) {
        const waste = totalSelectedDose - totalDose;
        const wastePercentage = (waste / totalDose) * 100;
        logic.push(`Selected vials provide ${totalSelectedDose.toFixed(2)} ${availableVials[0].unit}, resulting in ${waste.toFixed(2)} ${availableVials[0].unit} waste (${wastePercentage.toFixed(1)}%)`);
      }
    } else {
      // Smart vial combination logic (existing code)
      // If user has preferred vial size, prioritize it
      if (inputs.preferredVialSize) {
        const preferred = availableVials.find(v => v.strength === parseFloat(inputs.preferredVialSize));
        if (preferred) {
          availableVials = [preferred, ...availableVials.filter(v => v.strength !== preferred.strength)];
        }
      }

      let remainingDose = totalDose;
      const smallestVialStrength = availableVials[availableVials.length - 1].strength;

      // Waste minimization logic
      logic.push('=== Smart Vial Optimization (Minimize Waste) ===');
      
      availableVials.forEach(vial => {
        if (remainingDose > 0) {
          const vialsNeeded = Math.floor(remainingDose / vial.strength);
          if (vialsNeeded > 0) {
            vials.push({
              strength: vial.strength,
              unit: vial.unit,
              count: vialsNeeded,
              volume: vial.volume,
              concentration: vial.concentration
            });
            totalVials += vialsNeeded;
            remainingDose -= vialsNeeded * vial.strength;
            logic.push(`${vialsNeeded} vial(s) of ${vial.strength} ${vial.unit}`);
          }
        }
      });

      // Check if we need one more vial for remaining dose
      // Apply waste minimization rule: don't add vial for very small remainders
      if (remainingDose > 0) {
        // Calculate percentage of smallest vial
        const percentageOfSmallestVial = (remainingDose / smallestVialStrength) * 100;
        
        // If remainder is less than 30% of smallest vial, round down (don't add vial)
        if (percentageOfSmallestVial < 30) {
          logic.push(`Remaining ${remainingDose.toFixed(2)} ${availableVials[0].unit} (${percentageOfSmallestVial.toFixed(1)}% of smallest vial) - rounded down to minimize waste`);
        } else {
          // Add one more vial for significant remainder
          const smallestVial = availableVials[availableVials.length - 1];
          vials.push({
            strength: smallestVial.strength,
            unit: smallestVial.unit,
            count: 1,
            volume: smallestVial.volume,
            concentration: smallestVial.concentration
          });
          totalVials += 1;
          logic.push(`1 additional vial of ${smallestVial.strength} ${smallestVial.unit} for remaining ${remainingDose.toFixed(2)} ${smallestVial.unit}`);
        }
      }
    }

    // Calculate actual drug volume and apply rounding
    let totalDrugVolume = vials.reduce((sum, vial) => sum + (vial.volume * vial.count), 0);
    let roundedDrugVolume = totalDrugVolume;
    
    // Apply volume rounding rules from pump-logic.json
    if (totalDrugVolume > 10) {
      // Round up to nearest 2.5 mL for volumes 10-50 mL
      if (totalDrugVolume <= 50) {
        roundedDrugVolume = Math.ceil(totalDrugVolume / 2.5) * 2.5;
      } else {
        // Round up to nearest 5 mL for volumes > 50 mL
        roundedDrugVolume = Math.ceil(totalDrugVolume / 5) * 5;
      }
      
      if (roundedDrugVolume !== totalDrugVolume) {
        logic.push(`Drug volume rounding: ${totalDrugVolume.toFixed(1)} mL → ${roundedDrugVolume} mL`);
      }
    }

    return { vials, totalVials, logic, totalDrugVolume, roundedDrugVolume };
  };

  const getInfusionSteps = (medication, weight, bagSize) => {
    if (!medication.infusionSteps) return null;
    
    const logic = [];
    let steps = [];

    // Handle ERT status based steps (ELFABRIO)
    if (medication.infusionSteps.ertStatus && inputs.ertStatus) {
      const ertSteps = medication.infusionSteps.steps[inputs.ertStatus];
      let rateInfo;
      
      if (weight < 70) {
        rateInfo = ertSteps['<70kg'];
        logic.push(`${inputs.ertStatus === 'ertNaive' ? 'ERT-Naive' : 'ERT-Experienced'}, weight <70 kg`);
      } else if (weight <= 100) {
        rateInfo = ertSteps['70-100kg'];
        logic.push(`${inputs.ertStatus === 'ertNaive' ? 'ERT-Naive' : 'ERT-Experienced'}, weight 70-100 kg`);
      } else {
        rateInfo = ertSteps['>100kg'];
        logic.push(`${inputs.ertStatus === 'ertNaive' ? 'ERT-Naive' : 'ERT-Experienced'}, weight >100 kg`);
      }

      steps = [{
        rate: rateInfo.rate,
        duration: 'entire infusion',
        description: rateInfo.description,
        rateUnit: rateInfo.rateUnit || 'mL/hr'
      }];
    }
    // Handle weight-based steps
    else if (medication.infusionSteps.weightBased && medication.infusionSteps.steps) {
      // Find matching weight range
      const weightRanges = Object.keys(medication.infusionSteps.steps);
      let matchingRange = null;

      for (const range of weightRanges) {
        if (range.includes('-')) {
          const [min, max] = range.split('-').map(s => parseFloat(s.replace(/[^\d.]/g, '')));
          if (weight >= min && weight <= max) {
            matchingRange = range;
            break;
          }
        } else if (range.startsWith('<')) {
          const max = parseFloat(range.replace(/[^\d.]/g, ''));
          if (weight < max) {
            matchingRange = range;
            break;
          }
        } else if (range.startsWith('>') || range.startsWith('≥')) {
          const min = parseFloat(range.replace(/[^\d.]/g, ''));
          if (weight >= min) {
            matchingRange = range;
            break;
          }
        }
      }

      if (matchingRange && medication.infusionSteps.steps[matchingRange]) {
        steps = medication.infusionSteps.steps[matchingRange];
        logic.push(`Using infusion protocol for weight range: ${matchingRange}`);
      }
    }
    // Handle volume-based steps (NAGLAZYME)
    else if (medication.infusionSteps.volumeBased && medication.infusionSteps.steps) {
      const volumeKey = bagSize >= 250 ? '250mL' : '100mL';
      if (medication.infusionSteps.steps[volumeKey]) {
        steps = medication.infusionSteps.steps[volumeKey];
        logic.push(`Using infusion protocol for ${volumeKey} bag`);
      }
    }
    // Handle dose-based steps (NEXVIAZYME)
    else if (medication.infusionSteps.doseBasedSteps) {
      if (medication.brandName === 'NEXVIAZYME') {
        const doseLevel = weight < 30 ? '40mg/kg' : '20mg/kg';
        const infusionNum = inputs.infusionNumber || 1;
        const stepKey = doseLevel === '40mg/kg' && infusionNum > 1 ? '40mg/kg_subsequent' : 
                       doseLevel === '40mg/kg' ? '40mg/kg_initial' : '20mg/kg';
        
        if (medication.infusionSteps.steps[stepKey]) {
          steps = medication.infusionSteps.steps[stepKey];
          logic.push(`Using ${stepKey.replace('_', ' ')} infusion protocol`);
        }
      }
    }
    // Age and dose based (XENPOZYME)
    else if (medication.infusionSteps.ageAndDoseBased) {
      const isAdult = inputs.patientAge === 'adult';
      const doseValue = inputs.escalationWeek ? 
        medication.standardDose.escalationSchedule[inputs.escalationWeek] : 
        medication.standardDose.maintenanceDose;
      
      const ageGroup = isAdult ? 'adult' : 'pediatric';
      const doseKey = doseValue <= 0.1 ? '0.1mg/kg' : 
                     doseValue <= 0.3 ? '0.3mg/kg' :
                     doseValue <= 0.6 ? '0.6mg/kg' :
                     doseValue <= 1.0 ? '1mg/kg' :
                     '2-3mg/kg';
      
      if (medication.infusionSteps[ageGroup] && medication.infusionSteps[ageGroup][doseKey]) {
        steps = medication.infusionSteps[ageGroup][doseKey];
        logic.push(`Using ${ageGroup} ${doseKey} infusion protocol`);
      }
    }
    // Handle standard infusion steps
    else if (medication.infusionSteps.standard) {
      steps = medication.infusionSteps.standard;
      logic.push('Using standard infusion protocol');
    }
    // Handle simple rate-based steps (like ELELYSO with initial and max rates)
    else if (medication.infusionSteps.initialRate && medication.infusionSteps.maxRate) {
      const ageBasedSteps = medication.infusionSteps.ageBasedSteps;
      let initialRate, maxRate;
      
      if (ageBasedSteps && medication.infusionSteps.pediatric && medication.infusionSteps.adult) {
        const ageGroup = inputs.patientAge === 'adult' ? 'adult' : 'pediatric';
        initialRate = medication.infusionSteps[ageGroup].initialRate;
        maxRate = medication.infusionSteps[ageGroup].maxRate;
        logic.push(`Using ${ageGroup} rate protocol`);
      } else {
        initialRate = medication.infusionSteps.initialRate;
        maxRate = medication.infusionSteps.maxRate;
      }
      
      // Convert from mL/min to mL/hr if unit is mL/min
      const unit = medication.infusionSteps.unit || 'mL/hr';
      const conversionFactor = unit === 'mL/min' ? 60 : 1;
      
      steps = [
        {
          rate: Math.floor(initialRate * conversionFactor),
          duration: 15, // Initial 15 minutes
          description: `Initial rate: ${initialRate} ${unit}`,
          rateUnit: 'mL/hr'
        },
        {
          rate: Math.floor(maxRate * conversionFactor),
          duration: 'remainder',
          description: `Maximum rate: ${maxRate} ${unit}`,
          rateUnit: 'mL/hr'
        }
      ];
      logic.push('Using initial/max rate protocol');
    }
    // Handle mg-based steps (like FABRAZYME)
    else if (medication.infusionSteps.mgBasedSteps) {
      // For medications with mg/min rates, we need to calculate based on total dose
      const totalDose = weight * (medication.standardDose?.value || 1); // Total mg
      const initialRate = medication.infusionSteps.initialRate || 0.25; // mg/min
      const concentration = medication.vialSizes[0]?.concentration || 5; // mg/mL
      const initialRateMLHr = (initialRate / concentration) * 60; // Convert to mL/hr
      
      steps = [
        {
          rate: Math.floor(initialRateMLHr),
          duration: 15,
          description: `Initial rate: ${initialRate} mg/min`,
          rateUnit: 'mL/hr'
        }
      ];
      
      // Add escalation information
      if (medication.infusionSteps.escalationRate) {
        steps.push({
          rate: Math.floor(initialRateMLHr * 2), // Double the rate as a simple escalation
          duration: 'remainder',
          description: 'Escalated rate',
          rateUnit: 'mL/hr'
        });
      }
      
      logic.push('Using mg-based infusion protocol');
    }
    // Default: no specific steps
    else {
      logic.push('No specific infusion protocol found, will use single-rate infusion');
    }

    return { steps, logic };
  };

  const calculateResults = () => {
    if (!validateInputs()) return;

    const weight = parseFloat(inputs.patientWeight);
    const logic = [];
    
    logic.push('=== PUMP CALCULATION WORKFLOW (per pump-logic.json) ===');
    logic.push('Step 1: User Inputs');
    logic.push(`- Patient weight: ${weight} kg`);
    logic.push(`- Selected medication: ${selectedMedication.brandName}`);
    logic.push(`- Infusion mode: ${infusionMode}`);

    // Step 2: Calculate prescribed dose
    const doseInfo = calculateDose();
    if (!doseInfo) return;
    
    let prescribedDose = inputs.prescribedDose ? parseFloat(inputs.prescribedDose) : doseInfo.dose;
    let effectiveDoseUnit = inputs.prescribedDose ? prescribedDoseUnit : doseInfo.doseUnit;
    
    // Convert prescribed dose to mg/kg if needed for calculations
    let doseInMgPerKg = prescribedDose;
    if (inputs.prescribedDose && prescribedDoseUnit !== doseInfo.doseUnit) {
      if (prescribedDoseUnit === 'mg' || prescribedDoseUnit === 'units') {
        // Total dose provided, convert to per kg
        doseInMgPerKg = prescribedDose / weight;
        logic.push(`- Converting total dose: ${prescribedDose} ${prescribedDoseUnit} ÷ ${weight} kg = ${doseInMgPerKg.toFixed(2)} ${prescribedDoseUnit.replace(/s$/, '')}/kg`);
      } else if (prescribedDoseUnit === 'mg/mL') {
        // This is a concentration, not a dose - user needs to specify volume
        logic.push(`- Warning: mg/mL is a concentration unit. Using as dose per kg.`);
        doseInMgPerKg = prescribedDose;
      }
    }
    
    logic.push('\nStep 2: Medication Volume Calculation');
    logic.push(`- Prescribed dose: ${prescribedDose} ${effectiveDoseUnit}`);
    if (inputs.prescribedDose && prescribedDoseUnit !== doseInfo.doseUnit) {
      logic.push(`- Calculated dose: ${doseInMgPerKg.toFixed(2)} ${doseInfo.doseUnit}`);
    }

    // Calculate total dose needed
    const totalDoseInfo = calculateTotalDose({ ...doseInfo, dose: doseInMgPerKg }, weight);
    if (totalDoseInfo) {
      logic.push(...totalDoseInfo.logic);
    }

    // Calculate vials and drug volume
    const vialInfo = calculateVials(selectedMedication, totalDoseInfo?.totalDose || 0);
    let drugVolume = 0;
    let roundedDrugVolume = 0;
    if (vialInfo) {
      drugVolume = vialInfo.totalDrugVolume || vialInfo.vials.reduce((sum, vial) => sum + (vial.volume * vial.count), 0);
      roundedDrugVolume = vialInfo.roundedDrugVolume || drugVolume;
      logic.push(`- Total medication volume: ${drugVolume.toFixed(1)} mL`);
      if (roundedDrugVolume !== drugVolume) {
        logic.push(`- Rounded drug volume: ${roundedDrugVolume} mL`);
      }
      logic.push(...vialInfo.logic);
    }

    // Step 3: Determine total infusion volume and bag size
    let totalInfusionVolume = inputs.totalInfusionVolume ? 
      parseFloat(inputs.totalInfusionVolume) : 
      calculateAutoInfusionVolume(weight, selectedMedication);
    
    logic.push('\nStep 3: Overfill Calculation');
    
    // Determine saline bag size
    let bagSize = 0;
    let overfillVolume = 0;
    
    if (manualBagSize) {
      bagSize = parseInt(manualBagSize);
      logic.push(`- Using manual bag size override: ${bagSize} mL`);
    } else {
      // Auto-select bag size based on total infusion volume
      bagSize = selectBagSizeFromVolume(totalInfusionVolume);
      logic.push(`- Auto-selected bag size based on volume: ${bagSize} mL`);
    }

    // Get overfill volume from pump-logic.json
    const overfillData = pumpLogic.pumpCalculationLogic.bagSelectionAndOverfill.standardOverfillVolumes[bagSize.toString()];
    if (overfillData && infusionMode === 'Remove Overfill') {
      overfillVolume = overfillData.overfillRemoval;
      logic.push(`- Overfill to remove from ${bagSize} mL bag: ${overfillVolume} mL`);
      
      // Special case for ELAPRASE
      if (selectedMedication.brandName === 'ELAPRASE') {
        logic.push('- ELAPRASE Exception: Do not remove drug volume from bag');
      }
    }

    // Calculate final infusion volume based on mode
    if (infusionMode === 'Remove Overfill') {
      // Use rounded drug volume for removal calculation
      let totalRemoval = selectedMedication.brandName === 'ELAPRASE' ? overfillVolume : roundedDrugVolume + overfillVolume;
      
      // Apply rounding to removal volume (round up to nearest 5 mL)
      const roundedRemoval = Math.ceil(totalRemoval / 5) * 5;
      if (roundedRemoval !== totalRemoval) {
        logic.push(`- Removal volume rounding: ${totalRemoval.toFixed(1)} mL → ${roundedRemoval} mL`);
        totalRemoval = roundedRemoval;
      }
      
      // IMPORTANT: Total infusion volume remains at bag size for Remove Overfill mode
      totalInfusionVolume = bagSize;
      logic.push(`- Total removal from bag: ${totalRemoval} mL`);
      logic.push(`- Add drug volume to bag: ${roundedDrugVolume} mL`);
      logic.push(`- Final infusion volume: ${totalInfusionVolume} mL (original bag size)`);
      logic.push(`- Actual volume in bag after preparation: ${bagSize} - ${totalRemoval} + ${roundedDrugVolume} = ${(bagSize - totalRemoval + roundedDrugVolume).toFixed(1)} mL`);
    } else {
      // Add to empty bag mode
      totalInfusionVolume = bagSize;
      logic.push(`- Add drug to empty bag: ${roundedDrugVolume} mL`);
      logic.push(`- Add NS to empty bag: ${(bagSize - roundedDrugVolume).toFixed(1)} mL`);
      logic.push(`- Final infusion volume: ${totalInfusionVolume} mL`);
    }

    // Step 4: Prime & Flush Volumes
    logic.push('\nStep 4: Prime & Flush Volumes');
    logic.push(`- Prime volume: ${primeVolume} mL (not included in calculations)`);
    logic.push(`- Flush volume: ${flushVolume} mL (used in step volume calculation)`);

    // Step 5: Calculate infusion rate
    logic.push('\nStep 5: Infusion Rate Rules');
    const totalTimeMinutes = (parseInt(totalInfusionTime.hours) || 0) * 60 + (parseInt(totalInfusionTime.minutes) || 0);
    
    let infusionRate = 0;
    // Check for custom infusion rate from either medication fields or advanced options
    const customRate = inputs.customInfusionRate || customInfusionRate;
    if (customRate) {
      infusionRate = Math.floor(parseFloat(customRate)); // Apply rounding down
      logic.push(`- Using custom infusion rate override: ${infusionRate} mL/hr (rounded down from ${customRate})`);
    } else if (totalTimeMinutes > 0) {
      // Critical rule: Use full total infusion volume for rate calculation
      const calculatedRate = (totalInfusionVolume / totalTimeMinutes) * 60;
      logic.push(`- Infusion rate = ${totalInfusionVolume.toFixed(1)} mL ÷ ${totalTimeMinutes} min × 60 = ${calculatedRate.toFixed(2)} mL/hr`);
      
      // Apply pump rounding rule: Always round DOWN to nearest whole number
      infusionRate = applyPumpRounding(calculatedRate);
      logic.push(`- Rounded DOWN to nearest whole number (per safety protocol): ${infusionRate} mL/hr`);
    }

    // Step 6: Calculate step volumes
    logic.push('\nStep 6: Step Volume Calculation');
    const infusionInfo = getInfusionSteps(selectedMedication, weight, bagSize);
    let infusionSteps = [];
    
    if (infusionInfo?.steps && infusionInfo.steps.length > 0 && infusionRate > 0) {
      // Calculate volume available for infusion steps (excluding flush)
      const volumeForSteps = totalInfusionVolume - flushVolume;
      logic.push(`- Volume for infusion steps: ${totalInfusionVolume.toFixed(1)} - ${flushVolume} = ${volumeForSteps.toFixed(1)} mL`);
      
      // Add infusion protocol logic
      if (infusionInfo.logic && infusionInfo.logic.length > 0) {
        logic.push(...infusionInfo.logic.map(l => `- ${l}`));
      }
      
      // Distribute volume across steps
      infusionSteps = calculateStepVolumes(infusionInfo.steps, volumeForSteps, flushVolume, infusionRate, logic);
    } else if (infusionRate > 0) {
      // No specific protocol, create simple infusion with flush
      logic.push('- No specific infusion protocol, using single-rate infusion');
      const volumeForSteps = totalInfusionVolume - flushVolume;
      infusionSteps = calculateStepVolumes([], volumeForSteps, flushVolume, infusionRate, logic);
    }

    const results = {
      dose: prescribedDose,
      doseUnit: effectiveDoseUnit,
      totalDose: totalDoseInfo?.totalDose || 0,
      totalDoseUnit: totalDoseInfo?.totalUnit || '',
      frequency: selectedMedication.standardDose?.frequency || '',
      vials: vialInfo?.vials || [],
      totalVials: vialInfo?.totalVials || 0,
      drugVolume: drugVolume,
      roundedDrugVolume: roundedDrugVolume,
      salineBagSize: bagSize,
      salineBagType: selectedMedication.brandName === 'NEXVIAZYME' ? 'D5W' : 'NS',
      overfillVolume: overfillVolume,
      totalInfusionVolume: totalInfusionVolume,
      infusionSteps: infusionSteps,
      infusionRate: infusionRate,
      totalInfusionTime: totalTimeMinutes,
      primeVolume: primeVolume,
      flushVolume: flushVolume,
      filter: selectedMedication.filter || 'None specified',
      reconstitutionInfo: vialInfo?.vials[0]?.concentration ? 
        selectedMedication.vialSizes.find(v => v.strength === vialInfo.vials[0].strength) : null,
      notes: selectedMedication.notes || '',
      specialDosing: selectedMedication.specialDosing || ''
    };

    setResults(results);
    setCalculationLogic(logic);
  };

  // Helper function to auto-calculate infusion volume based on weight
  const calculateAutoInfusionVolume = (weight, medication) => {
    // Default volume calculation based on medication guidelines
    if (medication.infusionVolumeRules) {
      const rules = medication.infusionVolumeRules;
      if (rules.fixed) {
        return rules.volume;
      } else if (rules.weightBased) {
        return Math.min(rules.maxVolume || 1000, weight * (rules.mlPerKg || 3));
      }
    }
    // Default: 3 mL/kg up to 250 mL
    return Math.min(250, weight * 3);
  };

  // Helper function to select bag size from volume
  const selectBagSizeFromVolume = (volume) => {
    const bagSizes = [50, 100, 150, 250, 500, 1000];
    for (const size of bagSizes) {
      if (volume <= size) {
        return size;
      }
    }
    return 1000;
  };

  // Helper function to apply pump display rounding
  // Per pump-logic.json: Always round DOWN to nearest whole number for safety
  const applyPumpRounding = (rate) => {
    // Always round down to nearest whole number
    return Math.floor(rate);
  };

  // Helper function to calculate step volumes
  const calculateStepVolumes = (steps, volumeForSteps, flushVolume, infusionRate, logic) => {
    const calculatedSteps = [];
    let remainingVolume = volumeForSteps;
    let totalStepTime = 0;
    
    // First, check if medication has specific step protocols
    if (steps && steps.length > 0) {
      // Process non-flush steps first
      steps.forEach((step, index) => {
        if (step.duration === 'entire infusion') {
          // Single step infusion (like ELFABRIO)
          const stepRate = step.rate ? Math.floor(step.rate) : infusionRate;
          calculatedSteps.push({
            ...step,
            volume: volumeForSteps,
            duration: Math.round((volumeForSteps * 60) / stepRate),
            rate: stepRate
          });
          remainingVolume = 0;
          totalStepTime = Math.round((volumeForSteps * 60) / stepRate);
          logic.push(`- Step ${index + 1}: ${volumeForSteps.toFixed(1)} mL at ${stepRate} mL/hr for entire infusion`);
        } else if (step.duration && typeof step.duration === 'number') {
          // Fixed duration step
          const stepRate = step.rate ? Math.floor(step.rate) : infusionRate;
          const stepVolume = (stepRate * step.duration) / 60;
          
          calculatedSteps.push({
            ...step,
            volume: stepVolume,
            duration: step.duration,
            rate: stepRate
          });
          
          remainingVolume -= stepVolume;
          totalStepTime += step.duration;
          logic.push(`- Step ${index + 1}: ${stepVolume.toFixed(1)} mL at ${stepRate} mL/hr = ${step.duration} min`);
        } else if (step.percentage) {
          // Percentage-based step
          const stepVolume = volumeForSteps * (step.percentage / 100);
          const stepRate = step.rate ? Math.floor(step.rate) : infusionRate;
          const stepDuration = Math.round((stepVolume * 60) / stepRate);
          
          calculatedSteps.push({
            ...step,
            volume: stepVolume,
            duration: stepDuration,
            rate: stepRate
          });
          
          remainingVolume -= stepVolume;
          totalStepTime += stepDuration;
          logic.push(`- Step ${index + 1}: ${stepVolume.toFixed(1)} mL (${step.percentage}%) at ${stepRate} mL/hr = ${stepDuration} min`);
        } else if (step.volume) {
          // Fixed volume step
          const stepRate = step.rate ? Math.floor(step.rate) : infusionRate;
          const stepDuration = Math.round((step.volume * 60) / stepRate);
          
          calculatedSteps.push({
            ...step,
            volume: step.volume,
            duration: stepDuration,
            rate: stepRate
          });
          
          remainingVolume -= step.volume;
          totalStepTime += stepDuration;
          logic.push(`- Step ${index + 1}: ${step.volume.toFixed(1)} mL at ${stepRate} mL/hr = ${stepDuration} min`);
        }
      });
      
      // Handle any remaining volume
      if (remainingVolume > 0.1) {
        // Add a final infusion step for remaining volume
        const remainingDuration = Math.round((remainingVolume * 60) / infusionRate);
        calculatedSteps.push({
          rate: infusionRate,
          duration: remainingDuration,
          volume: remainingVolume,
          description: 'Remaining infusion'
        });
        totalStepTime += remainingDuration;
        logic.push(`- Step ${calculatedSteps.length}: ${remainingVolume.toFixed(1)} mL (remaining) at ${infusionRate} mL/hr = ${remainingDuration} min`);
      }
    } else {
      // No specific protocol, use single step
      const infusionDuration = Math.round((volumeForSteps * 60) / infusionRate);
      calculatedSteps.push({
        rate: infusionRate,
        duration: infusionDuration,
        volume: volumeForSteps,
        description: 'Primary infusion'
      });
      totalStepTime = infusionDuration;
      logic.push(`- Step 1: ${volumeForSteps.toFixed(1)} mL at ${infusionRate} mL/hr = ${infusionDuration} min`);
    }
    
    // Always add flush as the last step
    const flushDuration = Math.round((flushVolume * 60) / infusionRate);
    calculatedSteps.push({
      rate: infusionRate,
      duration: flushDuration,
      volume: flushVolume,
      description: 'Flush'
    });
    totalStepTime += flushDuration;
    logic.push(`- Step ${calculatedSteps.length} (Flush): ${flushVolume} mL at ${infusionRate} mL/hr = ${flushDuration} min`);
    
    // Verify calculations
    const totalVolume = calculatedSteps.reduce((sum, step) => sum + step.volume, 0);
    logic.push(`\n- Verification:`);
    logic.push(`  - Total step volumes: ${totalVolume.toFixed(1)} mL (should equal ${(volumeForSteps + flushVolume).toFixed(1)} mL)`);
    logic.push(`  - Total step durations: ${totalStepTime} min`);
    
    return calculatedSteps;
  };

  const renderMedicationFields = () => {
    if (!selectedMedication) return null;

    const fields = getMedicationFields(selectedMedication);
    
    return fields.map(field => {
      // Check if field should be shown based on conditions
      if (field.showIf && !inputs[field.showIf]) {
        return null;
      }

      return (
        <div key={field.name} className="form-group">
          <label htmlFor={field.name}>{field.label}</label>
          
          {field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              value={inputs[field.name] || ''}
              onChange={handleInputChange}
              className={errors[field.name] ? 'error' : ''}
            >
              <option value="">Select {field.label}</option>
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                id={field.name}
                name={field.name}
                checked={inputs[field.name] || false}
                onChange={handleInputChange}
              />
              <span className="checkbox-label">{field.description}</span>
            </div>
          ) : field.type === 'readonly' ? (
            <input
              type="text"
              id={field.name}
              name={field.name}
              value={inputs[field.name] || ''}
              readOnly
              className="readonly"
            />
          ) : (
            <input
              type={field.type || 'text'}
              id={field.name}
              name={field.name}
              value={inputs[field.name] || ''}
              onChange={handleInputChange}
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={field.placeholder}
              className={errors[field.name] ? 'error' : ''}
            />
          )}
          
          {field.description && field.type !== 'checkbox' && (
            <small className="field-description">{field.description}</small>
          )}
          {errors[field.name] && <span className="error-text">{errors[field.name]}</span>}
        </div>
      );
    }).filter(Boolean);
  };

  // Helper functions for dose range indicator
  const getDoseStatus = () => {
    if (!selectedMedication || !inputs.prescribedDose || !inputs.patientWeight) return 'none';
    
    const standardDose = selectedMedication.standardDose?.value;
    if (!standardDose) return 'none';
    
    // Convert dose to match medication's standard unit for comparison
    let compareValue = parseFloat(inputs.prescribedDose);
    const standardUnit = selectedMedication.standardDose?.unit;
    
    // Apply same conversion logic as DoseOdometer
    if ((prescribedDoseUnit === 'mg' || prescribedDoseUnit === 'units') && 
        (standardUnit === 'mg/kg' || standardUnit === 'units/kg')) {
      compareValue = compareValue / parseFloat(inputs.patientWeight);
    } else if ((prescribedDoseUnit === 'mg/kg' || prescribedDoseUnit === 'units/kg') && 
               (standardUnit === 'mg' || standardUnit === 'units')) {
      compareValue = compareValue * parseFloat(inputs.patientWeight);
    }
    
    const low = standardDose * 0.9;
    const high = standardDose * 1.1;
    
    if (compareValue < low) return 'low';
    if (compareValue > high) return 'high';
    return 'optimal';
  };

  const getDosePosition = () => {
    if (!selectedMedication || !inputs.prescribedDose || !inputs.patientWeight) return 50;
    
    const standardDose = selectedMedication.standardDose?.value;
    if (!standardDose) return 50;
    
    // Convert dose to match medication's standard unit
    let compareValue = parseFloat(inputs.prescribedDose);
    const standardUnit = selectedMedication.standardDose?.unit;
    
    if ((prescribedDoseUnit === 'mg' || prescribedDoseUnit === 'units') && 
        (standardUnit === 'mg/kg' || standardUnit === 'units/kg')) {
      compareValue = compareValue / parseFloat(inputs.patientWeight);
    } else if ((prescribedDoseUnit === 'mg/kg' || prescribedDoseUnit === 'units/kg') && 
               (standardUnit === 'mg' || standardUnit === 'units')) {
      compareValue = compareValue * parseFloat(inputs.patientWeight);
    }
    
    // Calculate position as percentage (0-100)
    const min = 0;
    const max = standardDose * 1.5;
    const position = ((compareValue - min) / (max - min)) * 100;
    
    return Math.min(Math.max(position, 0), 100);
  };

  const getDoseStatusText = () => {
    const status = getDoseStatus();
    switch (status) {
      case 'low': return 'Below Standard Range';
      case 'optimal': return 'Within Standard Range';
      case 'high': return 'Above Standard Range';
      default: return 'Enter dose to see status';
    }
  };

  const canCalculate = () => {
    const hasRequiredFields = inputs.patientWeight && 
                            inputs.medicationName && 
                            inputs.prescribedDose &&
                            inputs.totalInfusionVolume &&
                            (totalInfusionTime.hours || totalInfusionTime.minutes);
    
    // Check medication-specific required fields
    if (selectedMedication) {
      const fields = getMedicationFields(selectedMedication);
      const requiredFields = fields.filter(f => f.required);
      
      for (const field of requiredFields) {
        if (!inputs[field.name]) {
          return false;
        }
      }
    }
    
    return hasRequiredFields;
  };

  return (
    <div className="infusion-pump-calculator">
      <div className="calculator-container">
        <div className="calculator-header">
          <h2>Infusion Pump Calculator</h2>
          <p className="subtitle">Precision dosing calculator for lysosomal storage disorder treatments</p>
        </div>

        {/* Three Column Layout Container */}
        <div className="three-column-container">
          {/* Column 1: Patient Information */}
          <div className="column-section">
            <h3>Patient Information</h3>
            <div className="column-content">
              <div className="form-group">
                <label htmlFor="patientWeight">Patient Weight (kg)</label>
                <input
                  type="number"
                  id="patientWeight"
                  name="patientWeight"
                  value={inputs.patientWeight}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className={errors.patientWeight ? 'error' : ''}
                />
                {errors.patientWeight && <span className="error-text">{errors.patientWeight}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="medicationName">Select Medication</label>
                <select
                  id="medicationName"
                  name="medicationName"
                  value={inputs.medicationName}
                  onChange={handleInputChange}
                  className={errors.medicationName ? 'error' : ''}
                >
                  <option value="">Choose a medication...</option>
                  {medications.map(med => (
                    <option key={med} value={med}>
                      {med} ({pumpDatabase.medications[med].genericName})
                    </option>
                  ))}
                </select>
                {errors.medicationName && <span className="error-text">{errors.medicationName}</span>}
              </div>

              {selectedMedication && (
                <>
                  <div className="form-group">
                    <label htmlFor="infusionMode">Infusion Mode</label>
                    <select
                      id="infusionMode"
                      name="infusionMode"
                      value={infusionMode}
                      onChange={(e) => setInfusionMode(e.target.value)}
                    >
                      <option value="Remove Overfill">Remove Overfill</option>
                      <option value="Add to empty bag">Add to empty bag</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="totalInfusionVolume">Total Infusion Volume (mL)</label>
                    <input
                      type="number"
                      id="totalInfusionVolume"
                      name="totalInfusionVolume"
                      value={inputs.totalInfusionVolume || ''}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated"
                      min="0"
                    />
                    <small className="field-description">Leave blank for auto-calculation</small>
                  </div>

                  <div className="form-group">
                    <label>Total Infusion Time</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        name="infusionTimeHours"
                        value={totalInfusionTime.hours}
                        onChange={(e) => setTotalInfusionTime(prev => ({ ...prev, hours: e.target.value }))}
                        placeholder="Hr"
                        min="0"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="number"
                        name="infusionTimeMinutes"
                        value={totalInfusionTime.minutes}
                        onChange={(e) => setTotalInfusionTime(prev => ({ ...prev, minutes: e.target.value }))}
                        placeholder="Min"
                        min="0"
                        max="59"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="primeVolume">Prime Volume (mL)</label>
                    <input
                      type="number"
                      id="primeVolume"
                      name="primeVolume"
                      value={primeVolume}
                      onChange={(e) => setPrimeVolume(e.target.value)}
                      min="0"
                      step="1"
                    />
                    <small className="field-description">Volume to prime IV line</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="flushVolume">Flush Volume (mL)</label>
                    <input
                      type="number"
                      id="flushVolume"
                      name="flushVolume"
                      value={flushVolume}
                      onChange={(e) => setFlushVolume(e.target.value)}
                      min="0"
                      step="1"
                    />
                    <small className="field-description">Volume for final flush</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="prescribedDose">Prescribed Dose</label>
                    <div className="dose-input-group">
                      <input
                        type="number"
                        id="prescribedDose"
                        name="prescribedDose"
                        value={inputs.prescribedDose || ''}
                        onChange={handleInputChange}
                        placeholder={selectedMedication.standardDose ? `${selectedMedication.standardDose.value}` : '0'}
                        min="0"
                        step="0.1"
                        className="dose-input"
                      />
                      <select
                        id="prescribedDoseUnit"
                        name="prescribedDoseUnit"
                        value={prescribedDoseUnit}
                        onChange={(e) => setPrescribedDoseUnit(e.target.value)}
                        className="dose-unit-select"
                      >
                        <option value="mg/kg">mg/kg</option>
                        <option value="mg">mg (total)</option>
                        <option value="mg/mL">mg/mL</option>
                        <option value="units/kg">units/kg</option>
                        <option value="units">units (total)</option>
                      </select>
                    </div>
                    {selectedMedication.standardDose && (
                      <small className="field-description">
                        Standard: {selectedMedication.standardDose.value} {selectedMedication.standardDose.unit}
                      </small>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Column 2: Medication-Specific Information */}
          {selectedMedication && (
            <div className="column-section">
              <h3>Medication-Specific Information</h3>
              <div className="column-content">
                {renderMedicationFields()}
              </div>
            </div>
          )}

          {/* Column 3: Preparation Instructions (Preview) */}
          {selectedMedication && (
            <div className="column-section">
              <h3>Preparation Preview</h3>
              <div className="column-content preparation-preview">
                {/* MEDICATION INFORMATION - Moved to collapsible section */}

                {/* PRESCRIBED INFORMATION */}
                <div className="preview-section">
                  <h4 className="preview-section-title">Prescribed Information</h4>
                  
                  {inputs.prescribedDose && (
                    <div className="preview-card">
                      <span className="preview-label">Prescribed Dose</span>
                      <span className="preview-value">{inputs.prescribedDose} {prescribedDoseUnit}</span>
                    </div>
                  )}
                  
                  {inputs.totalInfusionVolume && (
                    <div className="preview-card">
                      <span className="preview-label">Prescribed Total Volume</span>
                      <span className="preview-value">{inputs.totalInfusionVolume} mL</span>
                    </div>
                  )}
                  
                  {(totalInfusionTime.hours || totalInfusionTime.minutes) && (
                    <div className="preview-card">
                      <span className="preview-label">Total Infusion Time</span>
                      <span className="preview-value">
                        {totalInfusionTime.hours && `${totalInfusionTime.hours}h `}
                        {totalInfusionTime.minutes && `${totalInfusionTime.minutes}min`}
                        {!totalInfusionTime.hours && !totalInfusionTime.minutes && 'Not set'}
                      </span>
                    </div>
                  )}
                </div>

                {/* CALCULATED INFORMATION */}
                <div className="preview-section">
                  <h4 className="preview-section-title">Calculated Values</h4>
                  
                  {inputs.patientWeight && (
                    <div className="preview-card">
                      <span className="preview-label">Patient Weight</span>
                      <span className="preview-value">{inputs.patientWeight} kg</span>
                    </div>
                  )}

                  {(() => {
                    const doseInfo = calculateDose();
                    if (doseInfo && inputs.patientWeight) {
                      const totalDoseInfo = calculateTotalDose(doseInfo, parseFloat(inputs.patientWeight));
                      return (
                        <>
                          {!inputs.prescribedDose && (
                            <div className="preview-card">
                              <span className="preview-label">Calculated Dose</span>
                              <span className="preview-value">{doseInfo.dose} {doseInfo.doseUnit}</span>
                            </div>
                          )}
                          {totalDoseInfo && (
                            <div className="preview-card">
                              <span className="preview-label">Total Dose Required</span>
                              <span className="preview-value">{totalDoseInfo.totalDose.toFixed(2)} {totalDoseInfo.totalUnit}</span>
                            </div>
                          )}
                        </>
                      );
                    }
                    return null;
                  })()}

                  <div className="preview-card">
                    <span className="preview-label">Infusion Mode</span>
                    <span className="preview-value">{infusionMode}</span>
                  </div>
                </div>

                <div className="preview-info">
                  <p>Complete all fields and click Calculate to generate full preparation instructions</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Sections Below Three Columns */}
        <div className="form-container">
          {selectedMedication && (
            <>

                {/* Collapsible Medication Information */}
                <div className="medication-info-section">
                  <button
                    className="collapsible-header"
                    onClick={() => setShowMedicationInfo(!showMedicationInfo)}
                    type="button"
                  >
                    <span>{showMedicationInfo ? '▼' : '▶'}</span>
                    <h3>Medication Information - {selectedMedication.brandName}</h3>
                  </button>
                  
                  {showMedicationInfo && (
                    <div className="medication-info-content">
                      <div className="medication-info-grid">
                        <div className="info-card">
                          <h4>Basic Information</h4>
                          <p><strong>Brand Name:</strong> {selectedMedication.brandName}</p>
                          <p><strong>Generic Name:</strong> {selectedMedication.genericName}</p>
                          <p><strong>Indication:</strong> {selectedMedication.indication}</p>
                          <p><strong>Dosage Form:</strong> {selectedMedication.dosageForm}</p>
                        </div>

                        {selectedMedication.vialOptions && (
                          <div className="info-card">
                            <h4>Vial Information</h4>
                            {selectedMedication.vialOptions.map((vial, index) => (
                              <p key={index}>
                                <strong>{vial.strength} {vial.unit}:</strong> {vial.volume} mL
                                {vial.reconstitutionVolume && ` (Reconstitute with ${vial.reconstitutionVolume} mL)`}
                              </p>
                            ))}
                          </div>
                        )}


                        {selectedMedication.administrationGuidelines && (
                          <div className="info-card">
                            <h4>Administration Guidelines</h4>
                            {selectedMedication.administrationGuidelines.premedication && (
                              <p><strong>Premedication:</strong> {selectedMedication.administrationGuidelines.premedication}</p>
                            )}
                            {selectedMedication.administrationGuidelines.filter && (
                              <p><strong>Filter:</strong> {selectedMedication.administrationGuidelines.filter}</p>
                            )}
                            {selectedMedication.administrationGuidelines.compatibility && (
                              <p><strong>Compatibility:</strong> {selectedMedication.administrationGuidelines.compatibility}</p>
                            )}
                          </div>
                        )}

                        {selectedMedication.specialConsiderations && (
                          <div className="info-card">
                            <h4>Special Considerations</h4>
                            <p>{selectedMedication.specialConsiderations}</p>
                          </div>
                        )}

                        {selectedMedication.notes && (
                          <div className="info-card">
                            <h4>Additional Notes</h4>
                            <p>{selectedMedication.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Preview Cards from Column 3 */}
                      <div className="preview-cards-section" style={{marginTop: '20px'}}>
                        <div className="preview-card">
                          <span className="preview-label">Selected Medication</span>
                          <span className="preview-value">{selectedMedication.brandName}</span>
                        </div>
                        
                        {selectedMedication.standardDose && (
                          <div className="preview-card">
                            <span className="preview-label">Dose per Patient Weight</span>
                            <span className="preview-value">{selectedMedication.standardDose.value} {selectedMedication.standardDose.unit}</span>
                          </div>
                        )}
                        
                        {selectedMedication.vialSizes && (
                          <div className="preview-card">
                            <span className="preview-label">Available Vial Sizes</span>
                            <span className="preview-value">
                              {selectedMedication.vialSizes
                                .filter(v => !v.availability || v.availability !== 'unavailable')
                                .map(v => `${v.strength} ${v.unit}`)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {selectedMedication.filter && (
                          <div className="preview-card">
                            <span className="preview-label">Filter Required</span>
                            <span className="preview-value">{selectedMedication.filter}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Options */}
                <div className="advanced-options-section">
                  <button
                    className="collapsible-header"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    type="button"
                  >
                    <span>{showAdvancedOptions ? '▼' : '▶'}</span>
                    <h3>Advanced Options</h3>
                  </button>
                  
                  {showAdvancedOptions && (
                    <div className="advanced-options-content">
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="manualBagSize">Manual Saline Bag Size Override</label>
                          <select
                            id="manualBagSize"
                            name="manualBagSize"
                            value={manualBagSize}
                            onChange={(e) => setManualBagSize(e.target.value)}
                          >
                            <option value="">Auto-select based on volume</option>
                            <option value="50">50 mL</option>
                            <option value="100">100 mL</option>
                            <option value="150">150 mL</option>
                            <option value="250">250 mL</option>
                            <option value="500">500 mL</option>
                            <option value="1000">1000 mL</option>
                          </select>
                        </div>

                        {/* Hide custom infusion rate in advanced options since it's now in medication fields */}
                        {false && (
                          <div className="form-group">
                            <label htmlFor="customInfusionRate">Custom Infusion Rate Override (mL/hr)</label>
                            <input
                              type="number"
                              id="customInfusionRate"
                              name="customInfusionRate"
                              value={customInfusionRate}
                              onChange={(e) => setCustomInfusionRate(e.target.value)}
                              placeholder="Leave blank for auto-calculation"
                              min="0"
                              step="0.1"
                            />
                            <small className="field-description">Override calculated infusion rate</small>
                          </div>
                        )}

                        {/* Vial Combination Mode */}
                        {selectedMedication && selectedMedication.vialSizes && selectedMedication.vialSizes.length > 0 && (
                          <>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                              <label htmlFor="vialCombineMode">Vial Combination Mode</label>
                              <select
                                id="vialCombineMode"
                                name="vialCombineMode"
                                value={vialCombineMode}
                                onChange={(e) => {
                                  setVialCombineMode(e.target.value);
                                  if (e.target.value === 'smart') {
                                    setCustomVialSelections({});
                                  }
                                }}
                              >
                                <option value="smart">Smart Combining (Minimize Waste)</option>
                                <option value="custom">Custom Vial Selection</option>
                              </select>
                              <small className="field-description">
                                {vialCombineMode === 'smart' 
                                  ? 'Automatically selects vials to minimize medication waste'
                                  : 'Manually select which vials and how many to use'}
                              </small>
                            </div>

                            {/* Custom Vial Selection Fields */}
                            {vialCombineMode === 'custom' && (
                              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <h4>Select Vials to Use</h4>
                                <div className="vial-selection-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {selectedMedication.vialSizes
                                    .filter(v => !v.availability || v.availability !== 'unavailable')
                                    .sort((a, b) => b.strength - a.strength)
                                    .map(vial => (
                                      <div key={vial.strength} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <label style={{ flex: '1', minWidth: '200px' }}>
                                          {vial.strength} {vial.unit} vial ({vial.volume} mL)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          max="99"
                                          value={customVialSelections[vial.strength] || 0}
                                          onChange={(e) => {
                                            const value = parseInt(e.target.value) || 0;
                                            setCustomVialSelections(prev => ({
                                              ...prev,
                                              [vial.strength]: value
                                            }));
                                          }}
                                          style={{ width: '80px' }}
                                        />
                                        <span style={{ minWidth: '50px' }}>vials</span>
                                      </div>
                                    ))}
                                </div>
                                {results && vialCombineMode === 'custom' && (
                                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                                    <strong>Total Selected:</strong> {Object.values(customVialSelections).reduce((sum, count) => sum + count, 0)} vials
                                    {(() => {
                                      const totalDose = selectedMedication.vialSizes
                                        .filter(v => !v.availability || v.availability !== 'unavailable')
                                        .reduce((sum, vial) => sum + (vial.strength * (customVialSelections[vial.strength] || 0)), 0);
                                      const requiredDose = results.totalDose;
                                      if (totalDose > 0) {
                                        return (
                                          <>
                                            <br />
                                            <strong>Total Dose:</strong> {totalDose.toFixed(2)} {results.totalDoseUnit}
                                            <br />
                                            <strong>Required Dose:</strong> {requiredDose.toFixed(2)} {results.totalDoseUnit}
                                            {totalDose < requiredDose && (
                                              <span style={{ color: '#d9534f', marginLeft: '8px' }}>
                                                (Insufficient - need {(requiredDose - totalDose).toFixed(2)} {results.totalDoseUnit} more)
                                              </span>
                                            )}
                                            {totalDose > requiredDose && (
                                              <span style={{ color: '#f0ad4e', marginLeft: '8px' }}>
                                                (Excess - {(totalDose - requiredDose).toFixed(2)} {results.totalDoseUnit} waste)
                                              </span>
                                            )}
                                          </>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>

        <div className="form-actions">
          <button 
            className="calculate-btn"
            onClick={calculateResults}
            disabled={!canCalculate()}
          >
            Calculate
          </button>
          <button 
            className="clear-btn"
            onClick={() => {
              setInputs({ patientWeight: '', medicationName: '' });
              setResults(null);
              setErrors({});
              setCalculationLogic([]);
            }}
          >
            Clear All
          </button>
        </div>
        
        {/* Simple Dose Range Indicator */}
        {selectedMedication && inputs.prescribedDose && inputs.patientWeight && (
          <div className="dose-range-indicator">
            <div className="dose-range-header">
              <span className="dose-range-title">Dose Range Status</span>
              <span className="dose-range-value">
                {inputs.prescribedDose} {prescribedDoseUnit}
              </span>
            </div>
            <div className="dose-range-bar">
              <div className="dose-range-track">
                <div className="dose-range-zone low" style={{width: '30%'}}>
                  <span className="zone-label">Low</span>
                </div>
                <div className="dose-range-zone optimal" style={{width: '40%'}}>
                  <span className="zone-label">Optimal</span>
                </div>
                <div className="dose-range-zone high" style={{width: '30%'}}>
                  <span className="zone-label">High</span>
                </div>
              </div>
              <div 
                className={`dose-range-pointer ${getDoseStatus()}`}
                style={{left: `${getDosePosition()}%`}}
              >
                <div className="pointer-line"></div>
                <div className="pointer-dot"></div>
              </div>
            </div>
            <div className="dose-range-info">
              <span className={`dose-status ${getDoseStatus()}`}>
                {getDoseStatusText()}
              </span>
              {selectedMedication.standardDose && (
                <span className="standard-dose">
                  Standard: {selectedMedication.standardDose.value} {selectedMedication.standardDose.unit}
                </span>
              )}
            </div>
          </div>
        )}

        {results && (
          <div className="results-section">
            {/* Preparation Instructions */}
            <div className="preparation-section">
              <h3 className="section-header">Preparation Instructions</h3>
              <div className="preparation-grid">
                <div className="prep-card">
                  <span className="prep-label">IV Bag Size</span>
                  <span className="prep-value">{results.salineBagSize}<span className="prep-unit">mL</span></span>
                  <span className="prep-label">{results.salineBagType === 'D5W' ? 'D5W' : 'Normal Saline'}</span>
                </div>
                
                <div className="prep-card">
                  <span className="prep-label">Overfill Volume</span>
                  <span className="prep-value">{results.overfillVolume}<span className="prep-unit">mL</span></span>
                </div>
                
                <div className="prep-card">
                  <span className="prep-label">Drug Volume</span>
                  <span className="prep-value highlight">
                    {results.roundedDrugVolume || results.vials.reduce((sum, vial) => sum + (vial.volume * vial.count), 0).toFixed(1)}
                    <span className="prep-unit">mL</span>
                  </span>
                </div>
                
                {infusionMode === 'Remove Overfill' ? (
                  <div className="prep-card">
                    <span className="prep-label">Remove from Bag</span>
                    <span className="prep-value highlight">
                      {(() => {
                        const drugVol = results.roundedDrugVolume || results.vials.reduce((sum, vial) => sum + (vial.volume * vial.count), 0);
                        const removal = selectedMedication.brandName === 'ELAPRASE' ? 
                          results.overfillVolume :
                          drugVol + results.overfillVolume;
                        // Round to nearest 5 mL
                        return Math.ceil(removal / 5) * 5;
                      })()}
                      <span className="prep-unit">mL</span>
                    </span>
                  </div>
                ) : (
                  <div className="prep-card">
                    <span className="prep-label">Add NS to Empty Bag</span>
                    <span className="prep-value highlight">
                      {(results.salineBagSize - (results.roundedDrugVolume || results.vials.reduce((sum, vial) => sum + (vial.volume * vial.count), 0))).toFixed(1)}
                      <span className="prep-unit">mL</span>
                    </span>
                  </div>
                )}
                
                <div className="prep-card">
                  <span className="prep-label">Final Volume</span>
                  <span className="prep-value">{results.totalInfusionVolume.toFixed(1)}<span className="prep-unit">mL</span></span>
                </div>
              </div>
            </div>

            {/* Infusion Steps */}
            {results.infusionSteps.length > 0 && (
              <div className="infusion-steps-section">
                <h3 className="section-header">Infusion Steps</h3>
                <table className="infusion-steps-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Rate</th>
                      <th>Duration</th>
                      <th>Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.infusionSteps.map((step, index) => {
                      const isFlush = index === results.infusionSteps.length - 1 && step.description === 'Flush';
                      const volumeDisplay = step.volume ? `${step.volume.toFixed(1)} mL` : 
                                          step.duration === 'remainder' || step.duration === 'entire infusion' ? 'Remainder' :
                                          `${((step.rate * step.duration) / 60).toFixed(1)} mL`;
                      
                      return (
                        <tr key={index}>
                          <td>{isFlush ? 'Step ' + (index + 1) + ' (Flush)' : `Step ${index + 1}`}</td>
                          <td>{step.rate} {step.rateUnit || 'mL/hr'}</td>
                          <td>{typeof step.duration === 'number' ? `${step.duration} min` : step.duration}</td>
                          <td>{volumeDisplay}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Additional Information Cards */}
            <div className="result-grid">
              <div className="result-card">
                <h4>Dose Information</h4>
                <p><strong>Prescribed Dose:</strong> {results.dose} {results.doseUnit}</p>
                <p><strong>Total Dose:</strong> {results.totalDose.toFixed(2)} {results.totalDoseUnit}</p>
                <p><strong>Frequency:</strong> {results.frequency}</p>
                <p><strong>Infusion Mode:</strong> {infusionMode}</p>
              </div>

              <div className="result-card">
                <h4>Infusion Parameters</h4>
                <p><strong>Total Infusion Volume:</strong> {results.totalInfusionVolume.toFixed(1)} mL</p>
                <p><strong>Infusion Rate:</strong> {results.infusionRate} mL/hr</p>
                <p><strong>Total Time:</strong> {Math.floor(results.totalInfusionTime / 60)}h {results.totalInfusionTime % 60}min</p>
                <p><strong>Prime Volume:</strong> {results.primeVolume} mL</p>
                <p><strong>Flush Volume:</strong> {results.flushVolume} mL</p>
              </div>

              {results.vials.length > 0 && (
                <div className="result-card">
                  <h4>Vial Requirements</h4>
                  {results.vials.map((vial, index) => (
                    <p key={index}>
                      <strong>{vial.count} ×</strong> {vial.strength} {vial.unit} vial(s)
                    </p>
                  ))}
                  <p><strong>Total Vials:</strong> {results.totalVials}</p>
                </div>
              )}

              {results.reconstitutionInfo && (
                <div className="result-card">
                  <h4>Reconstitution</h4>
                  <p><strong>Solution:</strong> {results.reconstitutionInfo.reconstitutionSolution}</p>
                  <p><strong>Volume:</strong> {results.reconstitutionInfo.reconstitutionVolume} mL per vial</p>
                  <p><strong>Final Concentration:</strong> {results.reconstitutionInfo.concentration} {results.totalDoseUnit}/mL</p>
                </div>
              )}

              <div className="result-card">
                <h4>Filter Information</h4>
                <p>{results.filter}</p>
              </div>
            </div>

            {(results.notes || results.specialDosing || results.infusionSteps.length > 0) && (
              <div className="notes-section">
                {results.notes && (
                  <div className="note-box">
                    <h4>Important Notes</h4>
                    <p>{results.notes}</p>
                  </div>
                )}
                {results.specialDosing && (
                  <div className="note-box">
                    <h4>Special Dosing Considerations</h4>
                    <p>{results.specialDosing}</p>
                  </div>
                )}
                {results.infusionSteps.length > 0 && (
                  <div className="note-box">
                    <h4>Infusion Protocol Details</h4>
                    <div className="infusion-protocol-details">
                      {results.infusionSteps.map((step, index) => {
                        const isFlush = index === results.infusionSteps.length - 1 && step.description === 'Flush';
                        return (
                          <div key={index} className="protocol-step">
                            <h5>{isFlush ? `Step ${index + 1} - Flush` : `Step ${index + 1}`}</h5>
                            <ul>
                              <li><strong>Rate:</strong> {step.rate} {step.rateUnit || 'mL/hr'}</li>
                              <li><strong>Duration:</strong> {typeof step.duration === 'number' ? `${step.duration} minutes` : step.duration}</li>
                              <li><strong>Volume:</strong> {step.volume ? `${step.volume.toFixed(1)} mL` : 
                                                            step.duration === 'remainder' || step.duration === 'entire infusion' ? 'Remainder of infusion' :
                                                            `${((step.rate * step.duration) / 60).toFixed(1)} mL`}</li>
                              {step.description && step.description !== 'Flush' && (
                                <li><strong>Description:</strong> {step.description}</li>
                              )}
                              {step.maxRate && (
                                <li><strong>Maximum Rate:</strong> {step.maxRate} mL/hr</li>
                              )}
                              {step.notes && (
                                <li><strong>Notes:</strong> {step.notes}</li>
                              )}
                            </ul>
                          </div>
                        );
                      })}
                      {selectedMedication.administrationGuidelines?.premedication && (
                        <div className="protocol-step">
                          <h5>Premedication Requirements</h5>
                          <p>{selectedMedication.administrationGuidelines.premedication}</p>
                        </div>
                      )}
                      {selectedMedication.administrationGuidelines?.monitoring && (
                        <div className="protocol-step">
                          <h5>Monitoring Requirements</h5>
                          <p>{selectedMedication.administrationGuidelines.monitoring}</p>
                        </div>
                      )}
                      {selectedMedication.infusionSteps?.specialConsiderations && (
                        <div className="protocol-step">
                          <h5>Special Infusion Considerations</h5>
                          <p>{selectedMedication.infusionSteps.specialConsiderations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              className="show-logic-btn"
              onClick={() => setShowLogic(!showLogic)}
            >
              {showLogic ? 'Hide' : 'Show'} Calculation Details
            </button>

            {showLogic && (
              <div className="calculation-logic">
                <h4>Detailed Calculation Steps</h4>
                {calculationLogic.map((calc, index) => {
                  if (calc.startsWith('===') || calc.startsWith('\n')) {
                    return <p key={index} className="logic-header">{calc}</p>;
                  } else if (calc.startsWith('Step')) {
                    return <p key={index} style={{ color: '#66d9ef', fontWeight: 600, marginTop: '12px' }}>{calc}</p>;
                  } else if (calc.startsWith('-')) {
                    return <p key={index} style={{ marginLeft: '16px' }}>{calc}</p>;
                  }
                  return <p key={index}>{calc}</p>;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InfusionPumpCalculator;