import React, { useState, useMemo } from 'react';
import './InfusionPumpCalculator.css';
import pumpConfig from '../../../infusion-pump-config.json';

const InfusionPumpCalculator = () => {
  const [inputs, setInputs] = useState({
    patientWeight: '',
    medicationName: '',
    prescribedDose: '',
    doseUnit: 'mg/kg',
    infusionFrequency: 'every 2 weeks',
    totalInfusionVolume: '',
    primeVolume: '10',
    flushVolume: '10',
    infusionTimeHours: '',
    infusionTimeMinutes: '',
    ertStatus: 'ertNaive',
    infusionNumber: 1,
    patientAge: 'adult',
    preparationMethod: '' // New field for preparation method
  });

  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState({});
  const [showLogic, setShowLogic] = useState(false);
  const [calculationLogic, setCalculationLogic] = useState([]);
  const [showMedicationInfo, setShowMedicationInfo] = useState(false);

  const medications = useMemo(() => {
    return Object.keys(pumpConfig.medications).sort();
  }, []);

  const selectedMedication = useMemo(() => {
    return inputs.medicationName ? pumpConfig.medications[inputs.medicationName] : null;
  }, [inputs.medicationName]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateInputs = () => {
    const newErrors = {};
    
    if (!inputs.patientWeight || parseFloat(inputs.patientWeight) <= 0) {
      newErrors.patientWeight = 'Please enter a valid patient weight';
    }
    
    if (!inputs.medicationName) {
      newErrors.medicationName = 'Please select a medication';
    }
    
    if (!inputs.prescribedDose || parseFloat(inputs.prescribedDose) <= 0) {
      newErrors.prescribedDose = 'Please enter a valid dose';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const classifyDose = (actualDosePerKg, standardDose) => {
    const ratio = actualDosePerKg / standardDose;
    const thresholds = pumpConfig.configuration.doseClassification;
    
    if (ratio < thresholds.low.threshold) {
      return { classification: 'low', ...thresholds.low };
    } else if (ratio >= thresholds.correct.minThreshold && ratio <= thresholds.correct.maxThreshold) {
      return { classification: 'correct', ...thresholds.correct };
    } else {
      return { classification: 'high', ...thresholds.high };
    }
  };

  const calculateVialCombination = (totalDrugNeeded, vialSizes, medication) => {
    const logic = [];
    let vials = [];
    
    if (medication.dosageForm === 'lyophilized') {
      // For powder medications
      const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);
      let remaining = totalDrugNeeded;
      
      // Calculate optimal vial combination
      for (const vial of sortedVials) {
        const vialStrength = vial.strength;
        const count = Math.floor(remaining / vialStrength);
        
        if (count > 0) {
          vials.push({ ...vial, count });
          remaining -= count * vialStrength;
        }
      }
      
      // Add one more vial if there's remaining drug needed
      if (remaining > 0.01) {
        const smallestVial = sortedVials[sortedVials.length - 1];
        const existingSmall = vials.find(v => v.strength === smallestVial.strength);
        if (existingSmall) {
          existingSmall.count += 1;
        } else {
          vials.push({ ...smallestVial, count: 1 });
        }
      }
      
      const unit = medication.vialSizes[0].unit || 'mg';
      logic.push(`Optimized vial combination for ${totalDrugNeeded.toFixed(1)} ${unit}: ${vials.map(v => `${v.count}x${v.strength}${v.unit || unit}`).join(' + ')}`);
    } else {
      // For solution medications - minimize vial count by using larger vials first
      // Sort vials by volume (largest first) to minimize total vial count
      const sortedVials = [...vialSizes].sort((a, b) => b.volume - a.volume);
      
      // Calculate total volume needed based on concentration
      // All vials should have the same concentration for a given medication
      const concentration = sortedVials[0].strength; // mg/mL
      const totalVolumeNeeded = totalDrugNeeded / concentration;
      
      let remainingVolume = totalVolumeNeeded;
      vials = [];
      
      // Use larger vials first
      for (const vial of sortedVials) {
        if (remainingVolume <= 0.01) break; // 0.01mL tolerance
        
        const vialsNeeded = Math.floor(remainingVolume / vial.volume);
        
        if (vialsNeeded > 0) {
          vials.push({
            ...vial,
            count: vialsNeeded,
            volumePerVial: vial.volume,
            concentration: vial.strength,
            totalVolume: vialsNeeded * vial.volume
          });
          
          remainingVolume -= vialsNeeded * vial.volume;
        }
      }
      
      // If there's remaining volume, add one more of the smallest vial that covers it
      if (remainingVolume > 0.01) {
        // Find the smallest vial that can cover the remaining volume
        for (let i = sortedVials.length - 1; i >= 0; i--) {
          const vial = sortedVials[i];
          if (vial.volume >= remainingVolume || i === 0) {
            // Check if we already have this vial size
            const existingVial = vials.find(v => v.strength === vial.strength && v.volume === vial.volume);
            
            if (existingVial) {
              existingVial.count += 1;
              existingVial.totalVolume += vial.volume;
            } else {
              vials.push({
                ...vial,
                count: 1,
                volumePerVial: vial.volume,
                concentration: vial.strength,
                totalVolume: vial.volume
              });
            }
            break;
          }
        }
      }
      
      // Calculate totals
      let totalVolumeAvailable = 0;
      let totalMgAvailable = 0;
      
      vials.forEach(vial => {
        totalVolumeAvailable += vial.totalVolume;
        totalMgAvailable += vial.totalVolume * vial.concentration;
      });
      
      // Update vials with total volume needed for drug withdrawal
      vials = vials.map(v => ({
        ...v,
        totalVolumeNeeded: totalVolumeNeeded
      }));
      
      logic.push(`Solution form: ${totalDrugNeeded.toFixed(1)}mg needed`);
      logic.push(`Concentration: ${concentration}mg/mL for all vials`);
      logic.push(`Minimum volume needed: ${totalDrugNeeded.toFixed(1)}mg ÷ ${concentration}mg/mL = ${totalVolumeNeeded.toFixed(1)}mL`);
      logic.push(`Vial selection to minimize total count:`);
      
      vials.forEach(vial => {
        const mgInThisSize = vial.totalVolume * vial.concentration;
        logic.push(`  - ${vial.count} × ${vial.volume}mL vials = ${vial.totalVolume.toFixed(1)}mL (${mgInThisSize.toFixed(1)}mg)`);
      });
      
      const totalVialCount = vials.reduce((sum, v) => sum + v.count, 0);
      
      logic.push(`Total: ${totalVialCount} vials providing ${totalVolumeAvailable.toFixed(1)}mL of solution`);
      logic.push(`💊 Drug volume = total volume of all vials used`);
    }
    
    return { vials, logic };
  };

  const selectSalineBag = (weight, medication, dose) => {
    const rules = medication.salineBagRules;
    let bagSize = 100;
    let logic = '';
    
    if (rules.weightBased) {
      const rule = rules.rules.find(r => {
        const meetsMin = !r.minWeight || weight >= r.minWeight;
        const meetsMax = !r.maxWeight || weight <= r.maxWeight;
        return meetsMin && meetsMax;
      });
      
      if (rule) {
        bagSize = rule.bagSize;
        logic = `Selected ${bagSize}mL bag based on weight ${weight}kg (rule: ${rule.minWeight || 0}-${rule.maxWeight || '∞'}kg)`;
      }
    } else if (rules.weightAndDoseBased) {
      const doseKey = dose === 1 ? 'dose1mg' : 'dose3mg';
      const rule = rules.rules.find(r => weight >= r.minWeight && weight <= r.maxWeight);
      
      if (rule && rule[doseKey]) {
        bagSize = rule[doseKey];
        logic = `Selected ${bagSize}mL bag based on weight ${weight}kg and dose ${dose}mg/kg`;
      }
    } else if (rules.ageBasedPediatric) {
      const ageRule = rules.rules.find(r => r.type === inputs.patientAge);
      if (ageRule) {
        bagSize = Array.isArray(ageRule.bagSize) ? ageRule.bagSize[0] : ageRule.bagSize;
        logic = `Selected ${bagSize}mL bag for ${inputs.patientAge} patient`;
      }
    } else if (rules.defaultBagSize) {
      bagSize = Array.isArray(rules.defaultBagSize) ? rules.defaultBagSize[0] : rules.defaultBagSize;
      logic = `Using default bag size: ${bagSize}mL`;
    }
    
    return { bagSize, logic };
  };

  const calculateOverfill = (totalInfusionVolume, medication) => {
    let overfill = 0;
    let logic = '';
    
    if (medication.overfillOverride) {
      overfill = medication.overfillOverride;
      logic = `Using medication-specific overfill: ${overfill}mL`;
    } else {
      // Use the overfill rules based on total infusion volume:
      // 50mL → 5mL, 100mL → 7mL, 150mL → 25mL, 250mL → 30mL, 500mL → 40mL, 1000mL → 60mL
      const overfillRules = {
        50: 5,
        100: 7,
        150: 25,
        250: 30,
        500: 40,
        1000: 60
      };
      
      // Find the exact match for the total infusion volume
      if (overfillRules[totalInfusionVolume]) {
        overfill = overfillRules[totalInfusionVolume];
      } else {
        // If no exact match, find the closest standard volume
        const standardVolumes = Object.keys(overfillRules).map(Number).sort((a, b) => a - b);
        
        // Find the closest standard volume
        let closestVolume = standardVolumes[0];
        let minDifference = Math.abs(totalInfusionVolume - closestVolume);
        
        for (const volume of standardVolumes) {
          const difference = Math.abs(totalInfusionVolume - volume);
          if (difference < minDifference) {
            minDifference = difference;
            closestVolume = volume;
          }
        }
        
        overfill = overfillRules[closestVolume];
        logic = `Using overfill for closest standard volume (${closestVolume}mL): ${overfill}mL`;
      }
      
      if (!logic) {
        logic = `Overfill for ${totalInfusionVolume}mL total infusion volume: ${overfill}mL (per standard overfill rules)`;
      }
    }
    
    return { overfill, logic };
  };

  // Format rate for pump display: max 3 digits with decimal OR 4 digits without decimal
  const formatPumpRate = (rate) => {
    if (rate < 1000) {
      // For rates < 1000, we can have decimals
      return Math.round(rate * 10) / 10; // Round to 1 decimal place
    } else {
      // For rates >= 1000, no decimals allowed
      return Math.round(rate);
    }
  };

  const generateInfusionSteps = (medication, weight, totalVolume, primeVolume, flushVolume, targetTotalTime, medicationName, ertStatus, patientAge) => {
    const steps = [];
    const logic = [];
    const infusionSteps = medication.infusionSteps;
    
    if (!infusionSteps && !targetTotalTime) {
      return { steps: [], logic: ['No infusion steps defined for this medication and no total time specified'] };
    }
    
    // FIXED: Calculate infusion rate using total volume (prime is irrelevant)
    logic.push(`Total infusion volume: ${totalVolume}mL`);
    logic.push(`Flush volume: ${flushVolume}mL (will be last step)`);
    logic.push(`Volume for infusion steps (excluding flush): ${totalVolume - flushVolume}mL`);
    
    // If we have a target total time, calculate base infusion rate
    if (targetTotalTime && targetTotalTime > 0) {
      // CRITICAL: Rate uses TOTAL volume, not volume minus flush
      const baseRate = totalVolume / (targetTotalTime / 60); // ml/hr
      const formattedRate = formatPumpRate(baseRate);
      
      logic.push(`\nTarget total infusion time: ${targetTotalTime} minutes`);
      logic.push(`Infusion rate: ${totalVolume}mL ÷ ${(targetTotalTime/60).toFixed(2)}hr = ${formattedRate} mL/hr`);
      
      // If medication has specific step protocols, use them but adjust rates
      if (infusionSteps && infusionSteps.steps) {
        let selectedSteps = [];
        
        // Get the appropriate steps based on medication configuration
        if (infusionSteps.weightBased) {
          const weightRanges = Object.keys(infusionSteps.steps);
          for (const range of weightRanges) {
            if (evaluateWeightRange(range, weight)) {
              selectedSteps = infusionSteps.steps[range];
              logic.push(`Using infusion steps for weight range: ${range}`);
              break;
            }
          }
        } else if (infusionSteps.ertStatus && medicationName === 'ELFABRIO') {
          const ertSteps = infusionSteps.steps[ertStatus];
          const weightKey = weight < 70 ? '<70kg' : weight <= 100 ? '70-100kg' : '>100kg';
          if (ertSteps && ertSteps[weightKey]) {
            selectedSteps = [{
              rate: ertSteps[weightKey].rate,
              duration: 'full',
              rateUnit: ertSteps[weightKey].rateUnit
            }];
            logic.push(`Using ${ertStatus} protocol for ${weightKey}`);
          }
        } else if (infusionSteps.steps) {
          selectedSteps = infusionSteps.steps;
        }
        
        // Calculate steps with proper volumes and durations
        if (selectedSteps.length > 0) {
          let remainingVolume = totalVolume - flushVolume;
          let calculatedSteps = [];
          
          // Process non-remainder steps first
          for (let i = 0; i < selectedSteps.length; i++) {
            const step = selectedSteps[i];
            
            if (step.duration !== 'remainder' && step.duration !== 'full' && typeof step.duration === 'number') {
              const stepVolume = (step.rate * step.duration) / 60;
              
              if (stepVolume <= remainingVolume) {
                calculatedSteps.push({
                  stepNumber: i + 1,
                  rate: formatPumpRate(step.rate),
                  duration: step.duration,
                  volume: Math.round(stepVolume),
                  rateUnit: step.rateUnit || 'ml/hr'
                });
                remainingVolume -= stepVolume;
                
                logic.push(`Step ${i + 1}: ${Math.round(stepVolume)}mL at ${formatPumpRate(step.rate)}mL/hr = ${step.duration} minutes`);
              }
            }
          }
          
          // Add remainder step if needed
          if (remainingVolume > 0) {
            // Calculate rate for remaining volume to fit in remaining time
            const usedTime = calculatedSteps.reduce((sum, s) => sum + s.duration, 0);
            const remainingTime = targetTotalTime - usedTime - (flushVolume / formattedRate * 60);
            const remainderRate = remainingVolume / (remainingTime / 60);
            
            calculatedSteps.push({
              stepNumber: calculatedSteps.length + 1,
              rate: formatPumpRate(remainderRate),
              duration: Math.round(remainingTime),
              volume: Math.round(remainingVolume),
              rateUnit: 'ml/hr'
            });
            
            logic.push(`Step ${calculatedSteps.length}: ${Math.round(remainingVolume)}mL × 60 ÷ ${formatPumpRate(remainderRate)}mL/hr = ${Math.round(remainingTime)} minutes`);
          }
          
          // Add flush as final step
          if (flushVolume > 0) {
            const flushDuration = Math.round((flushVolume / formattedRate) * 60);
            calculatedSteps.push({
              stepNumber: calculatedSteps.length + 1,
              rate: formatPumpRate(formattedRate),
              duration: flushDuration,
              volume: flushVolume,
              rateUnit: 'ml/hr',
              isFlush: true
            });
            
            logic.push(`Flush step: ${flushVolume}mL × 60 ÷ ${formatPumpRate(formattedRate)}mL/hr = ${flushDuration} minutes`);
          }
          
          steps.push(...calculatedSteps);
        } else {
          // No specific steps, use simple calculation
          const mainVolume = totalVolume - flushVolume;
          const mainDuration = Math.round((mainVolume / formattedRate) * 60);
          
          steps.push({
            stepNumber: 1,
            rate: formattedRate,
            duration: mainDuration,
            volume: mainVolume,
            rateUnit: 'ml/hr'
          });
          
          if (flushVolume > 0) {
            const flushDuration = Math.round((flushVolume / baseRate) * 60);
            steps.push({
              stepNumber: 2,
              rate: formattedRate,
              duration: flushDuration,
              volume: flushVolume,
              rateUnit: 'ml/hr',
              isFlush: true
            });
          }
        }
      } else {
        // No protocol steps, create simple infusion plan
        const mainVolume = totalVolume - flushVolume;
        const mainDuration = Math.round((mainVolume / formattedRate) * 60);
        
        steps.push({
          stepNumber: 1,
          rate: formattedRate,
          duration: mainDuration,
          volume: mainVolume,
          rateUnit: 'ml/hr'
        });
        
        logic.push(`\nStep 1: ${mainVolume}mL at ${formattedRate}mL/hr`);
        logic.push(`Duration: ${mainVolume}mL ÷ ${formattedRate}mL/hr × 60 = ${mainDuration} minutes`);
        
        if (flushVolume > 0) {
          const flushDuration = Math.round((flushVolume / formattedRate) * 60);
          steps.push({
            stepNumber: 2,
            rate: formattedRate,
            duration: flushDuration,
            volume: flushVolume,
            rateUnit: 'ml/hr',
            isFlush: true
          });
          
          logic.push(`\nStep 2 (Flush): ${flushVolume}mL at ${formattedRate}mL/hr`);
          logic.push(`Duration: ${flushVolume}mL ÷ ${formattedRate}mL/hr × 60 = ${flushDuration} minutes`);
        }
      }
    } else if (infusionSteps && infusionSteps.defaultInfusion) {
      // Use default duration (2 hours)
      const defaultDuration = 120;
      const rate = formatPumpRate(totalVolume / (defaultDuration / 60));
      
      // Main infusion step
      const mainVolume = totalVolume - flushVolume;
      const mainDuration = Math.round((mainVolume / rate) * 60);
      
      steps.push({
        stepNumber: 1,
        rate: rate,
        duration: mainDuration,
        volume: mainVolume,
        rateUnit: 'ml/hr'
      });
      
      // Flush step
      if (flushVolume > 0) {
        const flushDuration = Math.round((flushVolume / rate) * 60);
        steps.push({
          stepNumber: 2,
          rate: rate,
          duration: flushDuration,
          volume: flushVolume,
          rateUnit: 'ml/hr',
          isFlush: true
        });
      }
      
      logic.push(`Using default infusion duration: ${infusionSteps.defaultInfusion.duration}`);
      logic.push(`Calculated rate: ${rate} mL/hr for ${totalVolume}mL`);
    }
    
    // Verification
    const totalStepVolume = steps.reduce((sum, step) => sum + step.volume, 0);
    const totalStepDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    
    logic.push(`\nVerification:`);
    logic.push(`Total step volumes: ${steps.map(s => s.volume).join(' + ')} = ${totalStepVolume}mL`);
    logic.push(`Expected: ${totalVolume}mL (${Math.abs(totalStepVolume - totalVolume) < 0.1 ? '✓' : '✗'})`);
    logic.push(`Total time: ${steps.map(s => s.duration).join(' + ')} = ${totalStepDuration} minutes`);
    
    if (targetTotalTime) {
      logic.push(`Expected time: ${targetTotalTime} minutes (${Math.abs(totalStepDuration - targetTotalTime) <= 1 ? '✓' : '✗'})`);
    }
    
    logic.push(`\nNote: Prime volume (${primeVolume}mL) is administered separately and not included in rate calculations`);
    
    return { steps, logic };
  };

  const evaluateWeightRange = (range, weight) => {
    if (range.includes('<=')) {
      return weight <= parseFloat(range.replace('<=', '').replace('kg', ''));
    } else if (range.includes('>=')) {
      return weight >= parseFloat(range.replace('>=', '').replace('kg', ''));
    } else if (range.includes('>')) {
      return weight > parseFloat(range.replace('>', '').replace('kg', ''));
    } else if (range.includes('<')) {
      return weight < parseFloat(range.replace('<', '').replace('kg', ''));
    } else if (range.includes('-')) {
      const [min, max] = range.replace('kg', '').split('-').map(parseFloat);
      return weight >= min && weight <= max;
    }
    return false;
  };

  const calculateInfusion = () => {
    console.log('Calculate button clicked');
    console.log('Current inputs:', inputs);
    console.log('Selected medication:', selectedMedication);
    
    try {
      if (!validateInputs()) {
        console.log('Validation failed');
        return;
      }
      
      const weight = parseFloat(inputs.patientWeight);
      const dose = parseFloat(inputs.prescribedDose);
      const medication = selectedMedication;
      
      if (!medication) {
        console.error('No medication selected');
        setErrors({ medicationName: 'Please select a medication' });
        return;
      }
      
      const logic = [];
      
      const totalDrugNeeded = (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') ? dose * weight : dose;
      const dosePerKg = (inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg') ? dose : dose / weight;
    
    logic.push(`Patient weight: ${weight}kg`);
    logic.push(`Prescribed dose: ${dose} ${inputs.doseUnit} = ${totalDrugNeeded.toFixed(1)}mg total`);
    
    const standardDose = medication.standardDose.value;
    const doseClassification = classifyDose(dosePerKg, standardDose);
    logic.push(`Dose classification: ${dosePerKg.toFixed(2)}mg/kg is ${(dosePerKg/standardDose*100).toFixed(0)}% of standard dose (${standardDose}mg/kg)`);
    
    const { vials, logic: vialLogic } = calculateVialCombination(totalDrugNeeded, medication.vialSizes, medication);
    logic.push(...vialLogic);
    
    // Calculate total drug volume
    let drugVolume = 0;
    if (medication.dosageForm === 'lyophilized') {
      // For powder medications - drug volume = total reconstitution volume of all vials used
      drugVolume = vials.reduce((sum, vial) => {
        const reconstitutionVolumePerVial = vial.reconstitutionVolume || 0;
        const totalReconstitutionVolume = vial.count * reconstitutionVolumePerVial;
        
        logic.push(`${vial.count} vial(s) of ${vial.strength}${vial.unit || 'mg'} × ${reconstitutionVolumePerVial}mL reconstitution = ${totalReconstitutionVolume.toFixed(1)}mL`);
        
        return sum + totalReconstitutionVolume;
      }, 0);
      
      logic.push(`Total drug volume (reconstitution volume): ${drugVolume.toFixed(1)}mL`);
    } else {
      // For solution medications - drug volume is the total volume of solution from all vials
      drugVolume = vials.reduce((sum, vial) => {
        const volumePerVial = vial.volumePerVial || vial.volume || 0;
        const totalVolumeFromThisSize = vial.count * volumePerVial;
        
        logic.push(`${vial.count} vial(s) of ${vial.strength}mg/mL × ${volumePerVial}mL = ${totalVolumeFromThisSize.toFixed(1)}mL`);
        
        return sum + totalVolumeFromThisSize;
      }, 0);
      
      // Show the concentration info
      if (vials.length > 0) {
        const concentration = vials[0].concentration || vials[0].strength;
        logic.push(`Drug concentration: ${concentration}mg/mL`);
        logic.push(`Total drug in solution: ${totalDrugNeeded.toFixed(1)}mg`);
        logic.push(`Total drug volume (from vials): ${drugVolume.toFixed(1)}mL`);
      }
    }
    
    const { bagSize, logic: bagLogic } = selectSalineBag(weight, medication, dosePerKg);
    logic.push(bagLogic);
    
    // Determine total infusion volume (either user input or bag size)
    const totalVolume = inputs.totalInfusionVolume ? 
      parseFloat(inputs.totalInfusionVolume) : 
      bagSize;
    
    // Handle preparation method
    let overfill = 0;
    let removalVolume = 0;
    let salineToAdd = 0;
    
    if (inputs.preparationMethod === 'emptyBag') {
      // Empty bag method: no overfill, calculate saline needed
      overfill = 0;
      removalVolume = 0;
      salineToAdd = totalVolume - drugVolume;
      
      logic.push('Preparation method: Add to empty bag');
      logic.push(`Empty bag preparation - no overfill or removal`);
      logic.push(`Normal saline to add: ${totalVolume}mL (total) - ${drugVolume.toFixed(1)}mL (drug) = ${salineToAdd.toFixed(1)}mL`);
    } else {
      // Standard method: calculate overfill and removal
      const overfillResult = calculateOverfill(totalVolume, medication);
      overfill = overfillResult.overfill;
      logic.push('Preparation method: Remove from saline bag');
      logic.push(overfillResult.logic);
      
      // Calculate removal volume (overfill + drug volume)
      removalVolume = overfill + drugVolume;
      
      // Check for special instructions
      if (medication.salineBagRules?.specialInstructions?.includes('DO NOT remove')) {
        removalVolume = 0;
        logic.push('Special instruction: DO NOT remove drug volume or overfill from bag');
      } else {
        logic.push(`Total volume to remove from ${totalVolume}mL total infusion volume: ${removalVolume.toFixed(1)}mL`);
        logic.push(`  - Overfill: ${overfill}mL`);
        logic.push(`  - Drug volume: ${drugVolume.toFixed(1)}mL`);
      }
    }
    
    const primeVolume = parseFloat(inputs.primeVolume) || 10;
    const flushVolume = parseFloat(inputs.flushVolume) || 10;
    
    // Calculate total target time in minutes from hours and minutes
    const hours = parseFloat(inputs.infusionTimeHours) || 0;
    const minutes = parseFloat(inputs.infusionTimeMinutes) || 0;
    const targetTotalTime = (hours * 60 + minutes) || null;
    
    const { steps, logic: stepsLogic } = generateInfusionSteps(
      medication, 
      weight, 
      totalVolume, 
      primeVolume, 
      flushVolume,
      targetTotalTime,
      inputs.medicationName,
      inputs.ertStatus,
      inputs.patientAge
    );
    logic.push(...stepsLogic);
    
    const totalInfusionTime = steps.reduce((sum, step) => sum + step.duration, 0);
    
    setResults({
      doseClassification,
      vials,
      drugVolume: drugVolume.toFixed(1),
      bagSize,
      overfill,
      removalVolume: removalVolume.toFixed(1),
      salineToAdd: salineToAdd.toFixed(1),
      preparationMethod: inputs.preparationMethod,
      totalVolume,
      infusionSteps: steps,
      totalInfusionTime,
      filter: medication.filter,
      specialNotes: medication.notes,
      alerts: generateAlerts(medication)
    });
    
    setCalculationLogic(logic);
    } catch (error) {
      console.error('Error in calculateInfusion:', error);
      setErrors({ general: 'An error occurred during calculation. Please check your inputs.' });
    }
  };

  const generateAlerts = (medication) => {
    const alerts = [];
    
    if (medication.salineBagRules?.specialInstructions) {
      alerts.push({ type: 'warning', message: medication.salineBagRules.specialInstructions });
    }
    
    if (inputs.medicationName === 'NEXVIAZYME') {
      alerts.push({ type: 'critical', message: 'Use D5W only - NOT normal saline' });
    }
    
    if (inputs.medicationName === 'POMBILITI') {
      alerts.push({ type: 'info', message: 'Must be given with miglustat 1 hour before infusion' });
    }
    
    if (inputs.medicationName === 'XENPOZYME') {
      alerts.push({ type: 'info', message: 'Complex dose escalation protocol - verify infusion number' });
    }
    
    return alerts;
  };

  return (
    <div className="infusion-pump-calculator">
      <div className="calculator-header">
        <h2>Infusion Pump Calculator</h2>
        <p>Calculate precise infusion parameters for lysosomal storage disorder treatments</p>
      </div>

      <div className="calculator-body">
        <div className="input-section">
          <h3>Patient & Medication Information</h3>
          
          <div className="input-grid">
            <div className="input-group">
              <label htmlFor="patientWeight">Patient Weight (kg) *</label>
              <input
                type="number"
                id="patientWeight"
                name="patientWeight"
                value={inputs.patientWeight}
                onChange={handleInputChange}
                step="0.1"
                min="0"
                className={errors.patientWeight ? 'error' : ''}
              />
              {errors.patientWeight && <span className="error-message">{errors.patientWeight}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="medicationName">Medication *</label>
              <select
                id="medicationName"
                name="medicationName"
                value={inputs.medicationName}
                onChange={handleInputChange}
                className={errors.medicationName ? 'error' : ''}
              >
                <option value="">Select medication...</option>
                {medications.filter(med => 
                  pumpConfig.medications[med].dosageForm !== 'oral'
                ).map(med => (
                  <option key={med} value={med}>
                    {med} ({pumpConfig.medications[med].genericName})
                  </option>
                ))}
              </select>
              {errors.medicationName && <span className="error-message">{errors.medicationName}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="prescribedDose">Prescribed Dose *</label>
              <div className="dose-input">
                <input
                  type="number"
                  id="prescribedDose"
                  name="prescribedDose"
                  value={inputs.prescribedDose}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={errors.prescribedDose ? 'error' : ''}
                />
                <select
                  name="doseUnit"
                  value={inputs.doseUnit}
                  onChange={handleInputChange}
                >
                  <option value="mg/kg">mg/kg</option>
                  <option value="units/kg">units/kg</option>
                  <option value="mg">mg total</option>
                  <option value="units">units total</option>
                </select>
              </div>
              {errors.prescribedDose && <span className="error-message">{errors.prescribedDose}</span>}
            </div>

            <div className="input-group">
              <label htmlFor="infusionFrequency">Infusion Frequency</label>
              <select
                id="infusionFrequency"
                name="infusionFrequency"
                value={inputs.infusionFrequency}
                onChange={handleInputChange}
              >
                <option value="weekly">Weekly</option>
                <option value="every 2 weeks">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="totalInfusionVolume">Total Infusion Volume (mL)</label>
              <input
                type="number"
                id="totalInfusionVolume"
                name="totalInfusionVolume"
                value={inputs.totalInfusionVolume}
                onChange={handleInputChange}
                step="1"
                min="0"
                placeholder="Auto-calculated if blank"
              />
            </div>

            <div className="input-group">
              <label htmlFor="primeVolume">Prime Volume (mL)</label>
              <input
                type="number"
                id="primeVolume"
                name="primeVolume"
                value={inputs.primeVolume}
                onChange={handleInputChange}
                step="1"
                min="0"
              />
            </div>

            <div className="input-group">
              <label htmlFor="flushVolume">Flush Volume (mL)</label>
              <input
                type="number"
                id="flushVolume"
                name="flushVolume"
                value={inputs.flushVolume}
                onChange={handleInputChange}
                step="1"
                min="0"
              />
            </div>

            <div className="input-group">
              <label>Preparation Method</label>
              <div className="preparation-method-options">
                {!inputs.preparationMethod && (
                  <>
                    <div 
                      className="method-option"
                      onClick={() => handleInputChange({ target: { name: 'preparationMethod', value: 'emptyBag' }})}
                    >
                      <input
                        type="radio"
                        id="emptyBag"
                        name="preparationMethod"
                        value="emptyBag"
                        checked={false}
                        onChange={() => {}}
                      />
                      <label htmlFor="emptyBag">Add to empty bag</label>
                    </div>
                    <div 
                      className="method-option"
                      onClick={() => handleInputChange({ target: { name: 'preparationMethod', value: 'salineBag' }})}
                    >
                      <input
                        type="radio"
                        id="salineBag"
                        name="preparationMethod"
                        value="salineBag"
                        checked={false}
                        onChange={() => {}}
                      />
                      <label htmlFor="salineBag">Remove from saline bag</label>
                    </div>
                    <span className="field-hint">Select only one</span>
                  </>
                )}
                {inputs.preparationMethod === 'emptyBag' && (
                  <div className="selected-method">
                    <span>✓ Add to empty bag</span>
                    <button 
                      type="button"
                      className="clear-method"
                      onClick={() => handleInputChange({ target: { name: 'preparationMethod', value: '' }})}
                    >
                      Change
                    </button>
                  </div>
                )}
                {inputs.preparationMethod === 'salineBag' && (
                  <div className="selected-method">
                    <span>✓ Remove from saline bag</span>
                    <button 
                      type="button"
                      className="clear-method"
                      onClick={() => handleInputChange({ target: { name: 'preparationMethod', value: '' }})}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="input-group time-input-group">
              <label>Total Infusion Time</label>
              <div className="time-inputs">
                <div className="time-field">
                  <input
                    type="number"
                    id="infusionTimeHours"
                    name="infusionTimeHours"
                    value={inputs.infusionTimeHours}
                    onChange={handleInputChange}
                    step="1"
                    min="0"
                    max="24"
                    placeholder="0"
                  />
                  <span className="time-label">hours</span>
                </div>
                <div className="time-field">
                  <input
                    type="number"
                    id="infusionTimeMinutes"
                    name="infusionTimeMinutes"
                    value={inputs.infusionTimeMinutes}
                    onChange={handleInputChange}
                    step="1"
                    min="0"
                    max="59"
                    placeholder="0"
                  />
                  <span className="time-label">minutes</span>
                </div>
              </div>
              <span className="field-hint">Optional - uses protocol if blank</span>
            </div>

            {inputs.medicationName === 'ELFABRIO' && (
              <div className="input-group">
                <label htmlFor="ertStatus">ERT Status</label>
                <select
                  id="ertStatus"
                  name="ertStatus"
                  value={inputs.ertStatus}
                  onChange={handleInputChange}
                >
                  <option value="ertNaive">ERT Naive</option>
                  <option value="ertExperienced">ERT Experienced</option>
                </select>
              </div>
            )}

            {inputs.medicationName === 'XENPOZYME' && (
              <div className="input-group">
                <label htmlFor="infusionNumber">Infusion Number</label>
                <input
                  type="number"
                  id="infusionNumber"
                  name="infusionNumber"
                  value={inputs.infusionNumber}
                  onChange={handleInputChange}
                  min="1"
                  max="11"
                />
              </div>
            )}

            {(inputs.medicationName === 'ELELYSO' || inputs.medicationName === 'XENPOZYME') && (
              <div className="input-group">
                <label htmlFor="patientAge">Patient Type</label>
                <select
                  id="patientAge"
                  name="patientAge"
                  value={inputs.patientAge}
                  onChange={handleInputChange}
                >
                  <option value="adult">Adult</option>
                  <option value="pediatric">Pediatric</option>
                </select>
              </div>
            )}
          </div>

          {selectedMedication && (
            <div className="medication-info-preview">
              <div 
                className="medication-info-header"
                onClick={() => setShowMedicationInfo(!showMedicationInfo)}
              >
                <h4>Selected Medication Information</h4>
                <span className="toggle-icon">{showMedicationInfo ? '−' : '+'}</span>
              </div>
              {showMedicationInfo && (
                <div className="medication-details-grid">
                <div className="detail-item">
                  <label>Generic Name:</label>
                  <span>{selectedMedication.genericName}</span>
                </div>
                <div className="detail-item">
                  <label>Standard Dose:</label>
                  <span>
                    {selectedMedication.standardDose.value} {selectedMedication.standardDose.unit} 
                    {selectedMedication.standardDose.frequency}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Dosage Form:</label>
                  <span>{selectedMedication.dosageForm === 'lyophilized' ? 'Powder (Lyophilized)' : 'Solution'}</span>
                </div>
                <div className="detail-item full-width">
                  <label>Available Vial Sizes:</label>
                  <div className="vial-sizes-preview">
                    {selectedMedication.vialSizes.map((vial, index) => (
                      <div key={index} className="vial-size-item">
                        {selectedMedication.dosageForm === 'lyophilized' ? (
                          <>
                            <strong>{vial.strength}{vial.unit || 'mg'}</strong>
                            {vial.reconstitutionVolume && (
                              <span className="reconstitution-info">
                                (Reconstitute with {vial.reconstitutionVolume}mL {vial.reconstitutionSolution || ''})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <strong>{vial.strength}mg/mL × {vial.volume}mL</strong>
                            <span className="vial-volume">(Total: {(vial.strength * vial.volume).toFixed(0)}mg per vial)</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {selectedMedication.standardDose.range && (
                  <div className="detail-item">
                    <label>Dose Range:</label>
                    <span>
                      {selectedMedication.standardDose.range.min} - {selectedMedication.standardDose.range.max} 
                      {selectedMedication.standardDose.unit}
                    </span>
                  </div>
                )}
                {selectedMedication.indication && (
                  <div className="detail-item full-width">
                    <label>Indication:</label>
                    <span>{selectedMedication.indication}</span>
                  </div>
                )}
                {selectedMedication.filter && (
                  <div className="detail-item full-width">
                    <label>Filter Required:</label>
                    <span>{selectedMedication.filter}</span>
                  </div>
                )}
                {selectedMedication.notes && (
                  <div className="detail-item full-width">
                    <label>Special Notes:</label>
                    <span className="special-notes">{selectedMedication.notes}</span>
                  </div>
                )}
                </div>
              )}
              
              {/* Show dose comparison if dose is entered */}
              {showMedicationInfo && inputs.prescribedDose && inputs.patientWeight && (
                <div className="dose-comparison">
                  {(() => {
                    const weight = parseFloat(inputs.patientWeight);
                    const dose = parseFloat(inputs.prescribedDose);
                    const dosePerKg = inputs.doseUnit === 'mg/kg' || inputs.doseUnit === 'units/kg' ? dose : dose / weight;
                    const standardDose = selectedMedication.standardDose.value;
                    const ratio = dosePerKg / standardDose;
                    const classification = classifyDose(dosePerKg, standardDose);
                    
                    return (
                      <div className={`dose-preview ${classification.classification}`}>
                        <span className="dose-preview-label">Prescribed dose:</span>
                        <span className="dose-preview-value" style={{ color: classification.color }}>
                          {dosePerKg.toFixed(2)} {inputs.doseUnit.includes('units') ? 'units' : 'mg'}/kg ({(ratio * 100).toFixed(0)}% of standard)
                        </span>
                        <span className="dose-preview-status">{classification.label}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          <button 
            className="calculate-button"
            onClick={calculateInfusion}
          >
            Calculate Infusion Parameters
          </button>
          
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}
        </div>

        {results && (
          <div className="results-section">
            <h3>Calculation Results</h3>
            
            {results.alerts && results.alerts.length > 0 && (
              <div className="alerts-section">
                {results.alerts.map((alert, index) => (
                  <div key={index} className={`alert alert-${alert.type}`}>
                    {alert.message}
                  </div>
                ))}
              </div>
            )}

            <div className="dose-classification">
              <h4>Dose Classification</h4>
              <div className={`dose-indicator ${results.doseClassification.classification}`}>
                <span className="dose-label">{results.doseClassification.label}</span>
                <span className="dose-value" style={{ color: results.doseClassification.color }}>
                  {((parseFloat(inputs.prescribedDose) / selectedMedication.standardDose.value) * 100).toFixed(0)}% of standard dose
                </span>
              </div>
            </div>

            <div className="vials-section">
              <h4>Vial Requirements</h4>
              <div className="vials-list">
                {results.vials.map((vial, index) => (
                  <div key={index} className="vial-item">
                    <span className="vial-count">{vial.count}x</span>
                    <span className="vial-strength">
                      {selectedMedication.dosageForm === 'lyophilized' ? 
                        `${vial.strength}${vial.unit || 'mg'}` :
                        `${vial.concentration}mg/mL × ${vial.volumePerVial}mL`
                      }
                    </span>
                    {vial.reconstitutionVolume && (
                      <span className="vial-reconstitution">
                        Reconstitute with {vial.reconstitutionVolume}mL {vial.reconstitutionSolution || ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="preparation-section">
              <h4>Preparation Instructions</h4>
              <div className="preparation-grid">
                {results.preparationMethod === 'emptyBag' ? (
                  <>
                    <div className="prep-item full-width">
                      <label>Method:</label>
                      <span className="highlight">Add to empty bag</span>
                    </div>
                    <div className="prep-item">
                      <label>Saline to add:</label>
                      <span className="highlight">{results.salineToAdd}mL {selectedMedication.salineBagRules?.specialInstructions?.includes('D5W') ? 'D5W' : 'Normal Saline'}</span>
                    </div>
                    <div className="prep-item">
                      <label>Drug Volume:</label>
                      <span className="highlight">{results.drugVolume}mL</span>
                    </div>
                    <div className="prep-item">
                      <label>Final volume:</label>
                      <span>{results.totalVolume}mL</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="prep-item">
                      <label>IV Bag Size:</label>
                      <span>{results.bagSize}mL {selectedMedication.salineBagRules?.specialInstructions?.includes('D5W') ? 'D5W' : 'Normal Saline'}</span>
                    </div>
                    <div className="prep-item">
                      <label>Overfill Volume:</label>
                      <span>{results.overfill}mL</span>
                    </div>
                    <div className="prep-item">
                      <label>Drug Volume:</label>
                      <span className="highlight">{results.drugVolume}mL</span>
                    </div>
                    <div className="prep-item">
                      <label>Remove from bag:</label>
                      <span className="highlight">{results.removalVolume}mL</span>
                    </div>
                    <div className="prep-item">
                      <label>Final volume:</label>
                      <span>{results.totalVolume}mL</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="infusion-steps-section">
              <h4>Infusion Steps</h4>
              <div className="steps-table">
                <div className="steps-header">
                  <span>Step</span>
                  <span>Rate</span>
                  <span>Duration</span>
                  <span>Volume</span>
                </div>
                {results.infusionSteps.map((step, index) => (
                  <div key={index} className="step-row">
                    <span>Step {step.stepNumber}{step.isFlush ? ' (Flush)' : ''}</span>
                    <span>{step.rate} {step.rateUnit}</span>
                    <span>{step.duration} min</span>
                    <span>{step.volume} mL</span>
                  </div>
                ))}
              </div>
              <div className="total-time">
                Total Infusion Time: <strong>
                  {(() => {
                    const hours = Math.floor(results.totalInfusionTime / 60);
                    const minutes = results.totalInfusionTime % 60;
                    if (hours > 0) {
                      return `${hours}h ${minutes}min`;
                    }
                    return `${minutes} minutes`;
                  })()}
                </strong>
              </div>
            </div>

            <div className="additional-info">
              <div className="info-item">
                <label>Filter Required:</label>
                <span>{results.filter}</span>
              </div>
              {results.specialNotes && (
                <div className="info-item">
                  <label>Special Notes:</label>
                  <span>{results.specialNotes}</span>
                </div>
              )}
            </div>

            <div className="calculation-logic-section">
              <button 
                className="logic-toggle"
                onClick={() => setShowLogic(!showLogic)}
              >
                {showLogic ? 'Hide' : 'Show'} Calculation Logic
              </button>
              
              {showLogic && (
                <div className="logic-content">
                  <h4>Calculation Logic & Reasoning</h4>
                  <ul>
                    {calculationLogic.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfusionPumpCalculator;