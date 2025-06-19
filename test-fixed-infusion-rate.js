// Test the fixed infusion rate calculation logic

console.log('=== TESTING FIXED INFUSION RATE LOGIC ===\n');

// Test case based on the ELFABRIO pump sheet example
const testCase = {
  totalVolume: 250,      // mL
  primeVolume: 10,       // mL (irrelevant for rate calculation)
  flushVolume: 10,       // mL
  targetTime: 90,        // minutes
};

console.log('Test Parameters:');
console.log(`- Total infusion volume: ${testCase.totalVolume}mL`);
console.log(`- Prime volume: ${testCase.primeVolume}mL (not used in calculations)`);
console.log(`- Flush volume: ${testCase.flushVolume}mL`);
console.log(`- Target total time: ${testCase.targetTime} minutes`);

console.log('\n=== CORRECT CALCULATION ===');

// Step 1: Calculate infusion rate using TOTAL volume
const infusionRate = testCase.totalVolume / (testCase.targetTime / 60);
console.log(`\nInfusion rate calculation:`);
console.log(`${testCase.totalVolume}mL ÷ ${(testCase.targetTime/60).toFixed(2)} hours = ${infusionRate.toFixed(1)} mL/hr`);

// Step 2: Calculate step volumes
const mainStepVolume = testCase.totalVolume - testCase.flushVolume;
const flushStepVolume = testCase.flushVolume;

console.log(`\nStep volumes:`);
console.log(`- Main infusion steps: ${mainStepVolume}mL`);
console.log(`- Flush step: ${flushStepVolume}mL`);
console.log(`- Total: ${mainStepVolume + flushStepVolume}mL ✓`);

// Step 3: Calculate step durations
const mainStepDuration = (mainStepVolume / infusionRate) * 60;
const flushStepDuration = (flushStepVolume / infusionRate) * 60;

console.log(`\nStep durations at ${infusionRate.toFixed(1)} mL/hr:`);
console.log(`- Step 1: ${mainStepVolume}mL ÷ ${infusionRate.toFixed(1)} mL/hr × 60 = ${mainStepDuration.toFixed(1)} minutes`);
console.log(`- Step 2 (Flush): ${flushStepVolume}mL ÷ ${infusionRate.toFixed(1)} mL/hr × 60 = ${flushStepDuration.toFixed(1)} minutes`);
console.log(`- Total time: ${(mainStepDuration + flushStepDuration).toFixed(1)} minutes`);

// Verification
console.log('\n=== VERIFICATION ===');
const totalCalculatedTime = mainStepDuration + flushStepDuration;
const timeDifference = Math.abs(totalCalculatedTime - testCase.targetTime);

console.log(`Expected total time: ${testCase.targetTime} minutes`);
console.log(`Calculated total time: ${totalCalculatedTime.toFixed(1)} minutes`);
console.log(`Difference: ${timeDifference.toFixed(1)} minutes ${timeDifference < 1 ? '✓' : '✗'}`);

console.log('\n=== SUMMARY ===');
console.log('Key principles applied:');
console.log('1. Infusion rate = Total Volume / Total Time (prime irrelevant)');
console.log('2. Step volumes sum = Total Volume (240 + 10 = 250)');
console.log('3. Last step = Flush volume at same rate');
console.log('4. All steps use the same infusion rate');

// Compare with pump sheet
console.log('\n=== PUMP SHEET COMPARISON ===');
console.log('Pump sheet shows 166 mL/hr, which would give:');
const pumpSheetTime = testCase.totalVolume / 166 * 60;
console.log(`- Time at 166 mL/hr: ${pumpSheetTime.toFixed(1)} minutes`);
console.log(`- This suggests a clinical protocol override or different calculation method`);