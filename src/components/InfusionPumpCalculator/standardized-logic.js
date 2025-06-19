// Standardized calculation logic for infusion pump calculator
// This file contains the improved logic that should be integrated into the calculator

/**
 * Calculate vial combination optimized for minimal waste and vial count
 * @param {number} totalDrugNeeded - Total drug amount needed in mg or units
 * @param {Array} vialSizes - Available vial sizes
 * @param {Object} medication - Medication configuration
 * @returns {Object} - Vials needed and calculation logic
 */
export const calculateVialCombination = (totalDrugNeeded, vialSizes, medication) => {
  const logic = [];
  let vials = [];
  
  if (medication.dosageForm === 'lyophilized') {
    // For powder medications - strength is total mg/units per vial
    const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);
    let remaining = totalDrugNeeded;
    
    // Use larger vials first
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
    logic.push(`Lyophilized form: ${totalDrugNeeded.toFixed(1)} ${unit} needed`);
    logic.push(`Vial combination: ${vials.map(v => `${v.count}×${v.strength}${v.unit || unit}`).join(' + ')}`);
    
  } else if (medication.dosageForm === 'solution') {
    // For solution medications - strength is concentration in mg/mL
    // All vials of same medication have same concentration
    const concentration = vialSizes[0].strength; // mg/mL
    const totalVolumeNeeded = totalDrugNeeded / concentration;
    
    logic.push(`Solution form: ${totalDrugNeeded.toFixed(1)}mg needed`);
    logic.push(`Concentration: ${concentration}mg/mL (same for all vial sizes)`);
    logic.push(`Volume needed: ${totalDrugNeeded.toFixed(1)}mg ÷ ${concentration}mg/mL = ${totalVolumeNeeded.toFixed(1)}mL`);
    
    // Sort vials by volume (largest first) to minimize vial count
    const sortedVials = [...vialSizes].sort((a, b) => b.volume - a.volume);
    
    let remainingVolume = totalVolumeNeeded;
    
    // Use larger vials first
    for (const vial of sortedVials) {
      if (remainingVolume <= 0.01) break;
      
      const vialsNeeded = Math.floor(remainingVolume / vial.volume);
      
      if (vialsNeeded > 0) {
        vials.push({
          ...vial,
          count: vialsNeeded,
          volumePerVial: vial.volume,
          concentration: vial.strength,
          totalVolume: vialsNeeded * vial.volume,
          totalMg: vialsNeeded * vial.volume * concentration
        });
        
        remainingVolume -= vialsNeeded * vial.volume;
      }
    }
    
    // Add smallest vial that covers remaining volume
    if (remainingVolume > 0.01) {
      for (let i = sortedVials.length - 1; i >= 0; i--) {
        const vial = sortedVials[i];
        if (vial.volume >= remainingVolume || i === 0) {
          const existingVial = vials.find(v => v.volume === vial.volume);
          
          if (existingVial) {
            existingVial.count += 1;
            existingVial.totalVolume += vial.volume;
            existingVial.totalMg += vial.volume * concentration;
          } else {
            vials.push({
              ...vial,
              count: 1,
              volumePerVial: vial.volume,
              concentration: vial.strength,
              totalVolume: vial.volume,
              totalMg: vial.volume * concentration
            });
          }
          break;
        }
      }
    }
    
    // Log vial selection
    logic.push(`Vial selection (minimizing count):`);
    let totalVolume = 0;
    vials.forEach(vial => {
      logic.push(`  - ${vial.count} × ${vial.volume}mL vials = ${vial.totalVolume.toFixed(1)}mL (${vial.totalMg.toFixed(1)}mg)`);
      totalVolume += vial.totalVolume;
    });
    
    logic.push(`Total volume from vials: ${totalVolume.toFixed(1)}mL`);
    logic.push(`💊 Drug volume = ${totalVolume.toFixed(1)}mL`);
  }
  
  return { vials, logic };
};

/**
 * Calculate drug volume based on medication type and vials used
 * @param {Array} vials - Vials being used
 * @param {Object} medication - Medication configuration
 * @returns {number} - Total drug volume in mL
 */
export const calculateDrugVolume = (vials, medication) => {
  if (medication.dosageForm === 'lyophilized') {
    // For powder: drug volume = sum of reconstitution volumes
    return vials.reduce((sum, vial) => {
      const reconVolume = vial.reconstitutionVolume || 0;
      return sum + (vial.count * reconVolume);
    }, 0);
  } else {
    // For solution: drug volume = sum of vial volumes used
    return vials.reduce((sum, vial) => {
      return sum + vial.totalVolume;
    }, 0);
  }
};

/**
 * Calculate overfill based on bag size using standard rules
 * @param {number} bagSize - Bag size in mL
 * @param {Object} medication - Medication configuration (may have overfill override)
 * @returns {Object} - Overfill amount and logic
 */
export const calculateOverfill = (bagSize, medication) => {
  let overfill = 0;
  let logic = '';
  
  if (medication.overfillOverride) {
    overfill = medication.overfillOverride;
    logic = `Using medication-specific overfill: ${overfill}mL`;
  } else {
    // Standard overfill rules
    const overfillRules = {
      50: 5,
      100: 7,
      150: 25,
      250: 30,
      500: 40,
      1000: 60
    };
    
    if (overfillRules[bagSize]) {
      overfill = overfillRules[bagSize];
      logic = `Standard overfill for ${bagSize}mL bag: ${overfill}mL`;
    } else {
      // Find closest standard size
      const sizes = Object.keys(overfillRules).map(Number).sort((a, b) => a - b);
      let closest = sizes[0];
      let minDiff = Math.abs(bagSize - closest);
      
      for (const size of sizes) {
        const diff = Math.abs(bagSize - size);
        if (diff < minDiff) {
          minDiff = diff;
          closest = size;
        }
      }
      
      overfill = overfillRules[closest];
      logic = `Using overfill for closest size (${closest}mL): ${overfill}mL`;
    }
  }
  
  return { overfill, logic };
};

/**
 * Calculate removal volume from bag
 * @param {number} drugVolume - Drug volume in mL
 * @param {number} overfill - Overfill volume in mL
 * @param {Object} medication - Medication configuration
 * @returns {Object} - Removal volume and logic
 */
export const calculateRemovalVolume = (drugVolume, overfill, medication) => {
  let removalVolume = drugVolume + overfill;
  let logic = [];
  
  // Check for special instructions
  if (medication.salineBagRules?.specialInstructions?.includes('DO NOT remove')) {
    removalVolume = 0;
    logic.push('Special instruction: DO NOT remove drug volume or overfill from bag');
  } else {
    logic.push(`Removal volume calculation:`);
    logic.push(`  - Drug volume: ${drugVolume.toFixed(1)}mL`);
    logic.push(`  - Overfill: ${overfill}mL`);
    logic.push(`  - Total to remove: ${removalVolume.toFixed(1)}mL`);
  }
  
  return { removalVolume, logic };
};

/**
 * Format pump rate according to pump display limitations
 * @param {number} rate - Rate in mL/hr
 * @returns {number} - Formatted rate
 */
export const formatPumpRate = (rate) => {
  // Max 3 digits with decimal OR 4 digits without decimal
  if (rate < 1000) {
    return Math.round(rate * 10) / 10; // Round to 1 decimal
  } else {
    return Math.round(rate); // No decimals for rates >= 1000
  }
};

/**
 * Calculate infusion steps based on medication protocol and user input
 * @param {Object} params - All parameters needed for calculation
 * @returns {Object} - Steps array and calculation logic
 */
export const generateInfusionSteps = (params) => {
  const {
    medication,
    weight,
    totalVolume,
    primeVolume,
    flushVolume,
    targetTotalTime,
    medicationName,
    ertStatus,
    patientAge
  } = params;
  
  const steps = [];
  const logic = [];
  
  // Account for prime volume
  const actualInfusionVolume = totalVolume - primeVolume;
  logic.push(`Actual infusion volume: ${totalVolume}mL - ${primeVolume}mL (prime) = ${actualInfusionVolume}mL`);
  
  // If user specified total time, calculate rate
  if (targetTotalTime && targetTotalTime > 0) {
    const mainVolume = actualInfusionVolume - flushVolume;
    const baseRate = actualInfusionVolume / (targetTotalTime / 60);
    
    logic.push(`User-specified time: ${targetTotalTime} minutes`);
    logic.push(`Base rate: ${actualInfusionVolume}mL ÷ ${(targetTotalTime/60).toFixed(2)}hr = ${formatPumpRate(baseRate)}mL/hr`);
    
    // Create simple infusion plan
    steps.push({
      stepNumber: 1,
      rate: formatPumpRate(baseRate),
      duration: Math.round((mainVolume / baseRate) * 60),
      volume: mainVolume,
      rateUnit: 'ml/hr'
    });
    
    if (flushVolume > 0) {
      steps.push({
        stepNumber: 2,
        rate: formatPumpRate(baseRate),
        duration: Math.round((flushVolume / baseRate) * 60),
        volume: flushVolume,
        rateUnit: 'ml/hr',
        isFlush: true
      });
    }
  } else {
    // Use medication-specific protocol
    logic.push('Using medication protocol for infusion steps');
    // ... (medication-specific logic would go here)
  }
  
  // Verify total volume and time
  const totalStepVolume = steps.reduce((sum, step) => sum + step.volume, 0);
  const totalStepDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  
  logic.push(`\nVerification:`);
  logic.push(`Total volume: ${totalStepVolume}mL (should be ${actualInfusionVolume}mL)`);
  logic.push(`Total time: ${totalStepDuration} minutes`);
  
  return { steps, logic };
};

// Export all standardized functions
export default {
  calculateVialCombination,
  calculateDrugVolume,
  calculateOverfill,
  calculateRemovalVolume,
  formatPumpRate,
  generateInfusionSteps
};