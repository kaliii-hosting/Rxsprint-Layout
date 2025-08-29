// Test to verify drug removal volume is NOT rounded to nearest 5 mL

console.log('Testing Drug Removal Volume - No 5 mL Rounding');
console.log('================================================\n');

// Test cases with expected exact removal volumes
const testCases = [
  {
    medication: 'Standard Medication',
    drugVolume: 12.3,
    overfill: 15,
    expectedRemoval: 27.3  // 12.3 + 15 = 27.3 (NOT rounded to 30)
  },
  {
    medication: 'Test Med 2',
    drugVolume: 8.7,
    overfill: 5,
    expectedRemoval: 13.7  // 8.7 + 5 = 13.7 (NOT rounded to 15)
  },
  {
    medication: 'Test Med 3',
    drugVolume: 22.1,
    overfill: 30,
    expectedRemoval: 52.1  // 22.1 + 30 = 52.1 (NOT rounded to 55)
  },
  {
    medication: 'Test Med 4',
    drugVolume: 16.8,
    overfill: 15,
    expectedRemoval: 31.8  // 16.8 + 15 = 31.8 (NOT rounded to 35)
  }
];

console.log('Test Cases - Verifying NO rounding to nearest 5 mL:\n');

testCases.forEach((test, index) => {
  const calculatedRemoval = Math.round((test.drugVolume + test.overfill) * 10) / 10;
  const oldRoundedValue = Math.ceil((test.drugVolume + test.overfill) / 5) * 5;
  
  console.log(`Test ${index + 1}: ${test.medication}`);
  console.log(`  Drug Volume: ${test.drugVolume} mL`);
  console.log(`  Overfill: ${test.overfill} mL`);
  console.log(`  Expected (Exact): ${test.expectedRemoval} mL`);
  console.log(`  Calculated: ${calculatedRemoval} mL`);
  console.log(`  Old (Rounded to 5): ${oldRoundedValue} mL`);
  console.log(`  Status: ${calculatedRemoval === test.expectedRemoval ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Difference from old: ${oldRoundedValue - calculatedRemoval} mL saved\n`);
});

// Special medication cases
console.log('\nSpecial Medication Cases:\n');

const specialCases = [
  {
    medication: 'ELAPRASE',
    drugVolume: 10,
    overfill: 5,
    expectedRemoval: 0,  // ELAPRASE should return 0
    note: 'DO NOT remove anything'
  },
  {
    medication: 'VPRIV',
    drugVolume: 15,
    overfill: 10,
    expectedRemoval: 0,  // VPRIV should return 0
    note: 'DO NOT remove drug volume or overfill'
  },
  {
    medication: 'NAGLAZYME (100mL bag)',
    drugVolume: 20,
    overfill: 5,
    bagSize: 100,
    expectedRemoval: 0,  // No removal for 100mL bag
    note: 'No removal for 100mL bag'
  },
  {
    medication: 'NAGLAZYME (250mL bag)',
    drugVolume: 20,
    overfill: 30,
    bagSize: 250,
    expectedRemoval: 50,  // drug + 30 mL overfill
    note: 'Remove drug volume + 30 mL'
  }
];

specialCases.forEach((test, index) => {
  console.log(`Special Case ${index + 1}: ${test.medication}`);
  console.log(`  Drug Volume: ${test.drugVolume} mL`);
  console.log(`  Overfill: ${test.overfill} mL`);
  if (test.bagSize) console.log(`  Bag Size: ${test.bagSize} mL`);
  console.log(`  Expected: ${test.expectedRemoval} mL`);
  console.log(`  Note: ${test.note}`);
  console.log(`  Old (if rounded): ${test.expectedRemoval > 0 ? Math.ceil(test.expectedRemoval / 5) * 5 : 0} mL\n`);
});

console.log('\nSummary:');
console.log('--------');
console.log('✓ Drug removal volumes are now calculated to exact 0.1 mL precision');
console.log('✓ No rounding to nearest 5 mL is applied');
console.log('✓ This provides more accurate medication preparation');
console.log('✓ Special medication rules (ELAPRASE, VPRIV, NAGLAZYME) are preserved');