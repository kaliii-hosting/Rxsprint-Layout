// Test formula validation for regular custom infusion steps

console.log('Formula Validation Test for Regular Steps');
console.log('=========================================\n');

console.log('FORMULA: Volume = (Rate × Duration) ÷ 60\n');

// Test cases for regular steps
const testCases = [
  // Valid cases
  { rate: 100, duration: 30, volume: 50, expected: 'VALID', reason: '(100 × 30) ÷ 60 = 50' },
  { rate: 150, duration: 20, volume: 50, expected: 'VALID', reason: '(150 × 20) ÷ 60 = 50' },
  { rate: 60, duration: 60, volume: 60, expected: 'VALID', reason: '(60 × 60) ÷ 60 = 60' },
  { rate: 200, duration: 15, volume: 50, expected: 'VALID', reason: '(200 × 15) ÷ 60 = 50' },
  { rate: 83.3, duration: 36, volume: 50, expected: 'VALID', reason: '(83.3 × 36) ÷ 60 = 49.98 ≈ 50' },
  
  // Invalid cases
  { rate: 100, duration: 30, volume: 60, expected: 'INVALID', reason: '(100 × 30) ÷ 60 = 50, not 60' },
  { rate: 150, duration: 20, volume: 40, expected: 'INVALID', reason: '(150 × 20) ÷ 60 = 50, not 40' },
  { rate: 100, duration: 60, volume: 50, expected: 'INVALID', reason: '(100 × 60) ÷ 60 = 100, not 50' },
  { rate: 50, duration: 30, volume: 30, expected: 'INVALID', reason: '(50 × 30) ÷ 60 = 25, not 30' },
  
  // Edge cases
  { rate: 0, duration: 30, volume: 50, expected: 'INVALID', reason: 'Rate is 0' },
  { rate: 100, duration: 0, volume: 50, expected: 'INVALID', reason: 'Duration is 0' },
  { rate: 100, duration: 30, volume: 0, expected: 'INVALID', reason: 'Volume is 0' }
];

console.log('TEST CASES:\n');

testCases.forEach((test, index) => {
  const calculatedVolume = (test.rate * test.duration) / 60;
  const volumeMatch = Math.abs(calculatedVolume - test.volume) < 0.1;
  const isValid = test.rate > 0 && test.duration > 0 && test.volume > 0 && volumeMatch;
  
  console.log(`Test ${index + 1}:`);
  console.log(`  Rate: ${test.rate} mL/hr`);
  console.log(`  Duration: ${test.duration} min`);
  console.log(`  Volume: ${test.volume} mL`);
  console.log(`  Calculated: ${calculatedVolume.toFixed(1)} mL`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Actual: ${isValid ? 'VALID' : 'INVALID'}`);
  console.log(`  Result: ${(isValid ? 'VALID' : 'INVALID') === test.expected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Reason: ${test.reason}\n`);
});

console.log('VISUAL FEEDBACK FOR INVALID STEPS:');
console.log('- Red border (2px solid #ef4444)');
console.log('- Light red background (rgba(239, 68, 68, 0.08))');
console.log('- Red step number with red background');
console.log('- Red X mark in validation indicator');
console.log('- Error message: "Volume must equal (Rate × Duration) ÷ 60. Expected: X mL"');

console.log('\nEXCLUSIONS:');
console.log('- Flush step (last step) - Has its own validation, duration auto-calculated');
console.log('- Until infusion is complete step - Volume and duration auto-calculated');
console.log('- Only regular steps must follow the strict formula');

console.log('\nTOLERANCE:');
console.log('- Volume match tolerance: 0.1 mL');
console.log('- This accounts for floating-point precision issues');
console.log('- Example: 49.98 mL is considered equal to 50 mL');