// Analysis of ELFABRIO vial calculation issue

console.log('=== ELFABRIO Vial Calculation Issue ===\n');

// The problem: Calculator is selecting wrong vials
const issue = {
  current: {
    vials: '2x 5mg/mL × 2.5mL',
    totalDrug: '2 × 5mg = 10mg (incorrect!)',
    drugVolume: '5.0mL'
  },
  expected: {
    vials: '5x 20mg (10mL each)',
    totalDrug: '5 × 20mg = 100mg',
    drugVolume: '50mL'
  }
};

console.log('Current (Wrong) Calculation:');
console.log(`- Vials: ${issue.current.vials}`);
console.log(`- Total drug: ${issue.current.totalDrug}`);
console.log(`- Drug volume: ${issue.current.drugVolume}`);

console.log('\nExpected Calculation:');
console.log(`- Vials: ${issue.expected.vials}`);
console.log(`- Total drug: ${issue.expected.totalDrug}`);
console.log(`- Drug volume: ${issue.expected.drugVolume}`);

console.log('\n=== Root Cause Analysis ===');
console.log('The calculator is misinterpreting the vial strength for solution medications.');
console.log('For ELFABRIO:');
console.log('- Large vial: 20mg total in 10mL (concentration: 2mg/mL)');
console.log('- Small vial: 5mg total in 2.5mL (concentration: 2mg/mL)');
console.log('\nThe "strength" field should represent total mg per vial, not mg/mL');

console.log('\n=== Fix Required ===');
console.log('In the calculateVialCombination function, for solution medications:');
console.log('1. Vial strength should be total mg in the vial (20mg for large, 5mg for small)');
console.log('2. When calculating drug volume, use the actual volume of solution needed');
console.log('3. The concentration is constant at 2mg/mL for all ELFABRIO vials');

console.log('\n=== Correct Vial Configuration ===');
const correctVialConfig = {
  vialSizes: [
    {
      strength: 20,  // Total mg in vial
      volume: 10,    // Volume in mL
      concentration: 2, // mg/mL
      unit: "mg"
    },
    {
      strength: 5,   // Total mg in vial
      volume: 2.5,   // Volume in mL
      concentration: 2, // mg/mL
      unit: "mg"
    }
  ]
};

console.log(JSON.stringify(correctVialConfig, null, 2));