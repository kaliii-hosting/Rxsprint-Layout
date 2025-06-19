// Fixed infusion rate calculation logic

/**
 * CORRECT INFUSION RATE CALCULATION
 * 
 * Key principles:
 * 1. Infusion rate = (Total Volume - Prime Volume) / Total Time
 * 2. Step 1 volume = Total Volume - Prime Volume - Flush Volume
 * 3. Flush step volume = Flush Volume (at same rate)
 * 
 * Example:
 * - Total volume: 250mL
 * - Prime volume: 10mL (not included in rate calculation)
 * - Flush volume: 10mL (included in rate calculation)
 * - Total time: 90 minutes
 * 
 * Rate = (250 - 10) / (90/60) = 240 / 1.5 = 160 mL/hr
 * Step 1: 230mL at 160 mL/hr = 86.25 minutes
 * Step 2 (flush): 10mL at 160 mL/hr = 3.75 minutes
 * Total: 90 minutes ✓
 */

export const calculateInfusionSteps = (params) => {
  const {
    totalVolume,
    primeVolume,
    flushVolume,
    targetTotalTime,
    medication,
    weight,
    ertStatus,
    patientAge
  } = params;
  
  const steps = [];
  const logic = [];
  
  // CRITICAL: Actual infusion volume for rate calculation includes flush
  const actualInfusionVolume = totalVolume - primeVolume;
  logic.push(`Total volume: ${totalVolume}mL`);
  logic.push(`Prime volume: ${primeVolume}mL (administered separately)`);
  logic.push(`Actual infusion volume: ${actualInfusionVolume}mL (includes flush)`);
  
  if (targetTotalTime && targetTotalTime > 0) {
    // Calculate infusion rate using full infusion volume
    const infusionRate = actualInfusionVolume / (targetTotalTime / 60);
    const formattedRate = formatPumpRate(infusionRate);
    
    logic.push(`\nRate calculation:`);
    logic.push(`${actualInfusionVolume}mL ÷ ${(targetTotalTime/60).toFixed(2)} hours = ${formattedRate} mL/hr`);
    
    // Calculate step volumes
    const mainStepVolume = actualInfusionVolume - flushVolume;
    const mainStepDuration = Math.round((mainStepVolume / infusionRate) * 60);
    
    // Step 1: Main infusion (excluding flush)
    steps.push({
      stepNumber: 1,
      rate: formattedRate,
      duration: mainStepDuration,
      volume: mainStepVolume,
      rateUnit: 'ml/hr'
    });
    
    logic.push(`\nStep 1: ${mainStepVolume}mL at ${formattedRate} mL/hr`);
    logic.push(`Duration: ${mainStepVolume}mL ÷ ${formattedRate} mL/hr × 60 = ${mainStepDuration} minutes`);
    
    // Step 2: Flush (if applicable)
    if (flushVolume > 0) {
      const flushDuration = Math.round((flushVolume / infusionRate) * 60);
      
      steps.push({
        stepNumber: 2,
        rate: formattedRate,
        duration: flushDuration,
        volume: flushVolume,
        rateUnit: 'ml/hr',
        isFlush: true
      });
      
      logic.push(`\nStep 2 (Flush): ${flushVolume}mL at ${formattedRate} mL/hr`);
      logic.push(`Duration: ${flushVolume}mL ÷ ${formattedRate} mL/hr × 60 = ${flushDuration} minutes`);
    }
    
    // Verification
    const totalStepVolume = steps.reduce((sum, step) => sum + step.volume, 0);
    const totalStepDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    
    logic.push(`\nVerification:`);
    logic.push(`Total volume: ${steps.map(s => s.volume).join(' + ')} = ${totalStepVolume}mL`);
    logic.push(`Expected: ${actualInfusionVolume}mL (${totalStepVolume === actualInfusionVolume ? '✓' : '✗'})`);
    logic.push(`Total time: ${steps.map(s => s.duration).join(' + ')} = ${totalStepDuration} minutes`);
    logic.push(`Expected: ${targetTotalTime} minutes (${Math.abs(totalStepDuration - targetTotalTime) <= 1 ? '✓' : '✗'})`);
    
  } else {
    // Use medication protocol
    logic.push(`Using medication protocol for infusion rate`);
    // Protocol-specific logic would go here
  }
  
  return { steps, logic };
};

// Format pump rate helper
const formatPumpRate = (rate) => {
  if (rate < 1000) {
    return Math.round(rate * 10) / 10;
  } else {
    return Math.round(rate);
  }
};

// Example calculation to demonstrate the fix
console.log('=== INFUSION RATE FIX DEMONSTRATION ===\n');

const exampleParams = {
  totalVolume: 250,
  primeVolume: 10,
  flushVolume: 10,
  targetTotalTime: 90
};

const { steps, logic } = calculateInfusionSteps(exampleParams);

console.log('Calculation logic:');
logic.forEach(line => console.log(line));

console.log('\n\nResulting steps:');
steps.forEach(step => {
  console.log(`Step ${step.stepNumber}${step.isFlush ? ' (Flush)' : ''}: ${step.volume}mL at ${step.rate} mL/hr for ${step.duration} minutes`);
});

console.log('\n=== KEY DIFFERENCE ===');
console.log('OLD (incorrect): Rate = (250 - 10 - 10) / 1.5 = 153.3 mL/hr');
console.log('NEW (correct): Rate = (250 - 10) / 1.5 = 160 mL/hr');
console.log('\nThe flush volume is part of the infusion, not excluded from rate calculation!');

export default calculateInfusionSteps;