// Detailed analysis of infusion rate calculation discrepancy

console.log('=== INFUSION RATE ANALYSIS ===\n');

// From the pump sheet example
const pumpSheetData = {
  totalVolume: 250, // mL
  primeVolume: 10, // mL
  flushVolume: 10, // mL
  infusionRate: 166, // mL/hr
  totalTime: '1 hour 30 mins' // 90 minutes
};

console.log('Pump Sheet Data:');
console.log(`- Total volume: ${pumpSheetData.totalVolume}mL`);
console.log(`- Prime volume: ${pumpSheetData.primeVolume}mL`);
console.log(`- Flush volume: ${pumpSheetData.flushVolume}mL`);
console.log(`- Infusion rate: ${pumpSheetData.infusionRate}mL/hr`);
console.log(`- Total time: ${pumpSheetData.totalTime}`);

console.log('\n=== Method 1: Simple calculation (240mL over 90 min) ===');
const actualInfusionVolume = pumpSheetData.totalVolume - pumpSheetData.primeVolume;
const totalMinutes = 90;
const totalHours = totalMinutes / 60;
const simpleRate = actualInfusionVolume / totalHours;
console.log(`Actual infusion volume: ${actualInfusionVolume}mL`);
console.log(`Total time: ${totalMinutes} minutes = ${totalHours} hours`);
console.log(`Rate: ${actualInfusionVolume}mL ÷ ${totalHours}hr = ${simpleRate}mL/hr`);

console.log('\n=== Method 2: Checking if 166 mL/hr matches the time ===');
const timeAt166 = actualInfusionVolume / pumpSheetData.infusionRate;
console.log(`Time at 166mL/hr: ${actualInfusionVolume}mL ÷ ${pumpSheetData.infusionRate}mL/hr = ${timeAt166.toFixed(3)} hours`);
console.log(`= ${(timeAt166 * 60).toFixed(1)} minutes`);

console.log('\n=== Method 3: Working backwards from 166 mL/hr ===');
const volumeIn90min = pumpSheetData.infusionRate * totalHours;
console.log(`Volume at 166mL/hr for 90 min: ${pumpSheetData.infusionRate}mL/hr × ${totalHours}hr = ${volumeIn90min}mL`);

console.log('\n=== ELFABRIO Protocol Check ===');
// From config: ERT experienced, 70-100kg weight range
const patientWeight = 92.53;
const ertProtocol = {
  '<70kg': { rate: 50, duration: 'full' },
  '70-100kg': { rate: 83, duration: 'full' },
  '>100kg': { rate: 167, duration: 'full' }
};

console.log(`Patient weight: ${patientWeight}kg`);
console.log('ERT Experienced protocol rates:');
console.log(`- <70kg: ${ertProtocol['<70kg'].rate}mL/hr`);
console.log(`- 70-100kg: ${ertProtocol['70-100kg'].rate}mL/hr`);
console.log(`- >100kg: ${ertProtocol['>100kg'].rate}mL/hr`);

console.log('\n=== Possible Explanation ===');
console.log('The pump sheet shows 166 mL/hr, which is exactly 2× the protocol rate of 83 mL/hr');
console.log('This suggests the pump sheet might be using a different protocol or calculation method');

console.log('\n=== Verification with Protocol Rate ===');
const protocolRate = 83; // mL/hr for 70-100kg ERT experienced
const timeAtProtocolRate = actualInfusionVolume / protocolRate;
console.log(`Time at protocol rate (83mL/hr): ${actualInfusionVolume}mL ÷ ${protocolRate}mL/hr = ${timeAtProtocolRate.toFixed(2)} hours`);
console.log(`= ${(timeAtProtocolRate * 60).toFixed(0)} minutes`);

console.log('\n=== Conclusion ===');
console.log('The discrepancy appears to be due to:');
console.log('1. The pump sheet uses 166 mL/hr (exactly double the protocol rate)');
console.log('2. This gives a total time of ~87 minutes, rounded to 90 minutes');
console.log('3. The calculator may need to check if there\'s a specific override or different protocol being used');