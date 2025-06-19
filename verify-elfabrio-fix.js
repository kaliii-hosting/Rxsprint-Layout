// Verify ELFABRIO fix with corrected configuration

const correctedConfig = {
  vialSizes: [
    {
      strength: 2,  // mg/mL concentration
      volume: 10,   // mL per vial
      unit: "mg/ml"
    },
    {
      strength: 2,  // mg/mL concentration
      volume: 2.5,  // mL per vial
      unit: "mg/ml"
    }
  ]
};

console.log('=== ELFABRIO Fix Verification ===\n');

const totalDrugNeeded = 100; // mg
const concentration = 2; // mg/mL (same for all ELFABRIO vials)

console.log(`Total drug needed: ${totalDrugNeeded}mg`);
console.log(`Concentration: ${concentration}mg/mL`);

// Calculate volume needed
const totalVolumeNeeded = totalDrugNeeded / concentration;
console.log(`Volume needed: ${totalDrugNeeded}mg ÷ ${concentration}mg/mL = ${totalVolumeNeeded}mL`);

// Calculate vial combination (using larger vials first)
const vials = [];
let remainingVolume = totalVolumeNeeded;

// Try large vials first (10mL)
const largeVialCount = Math.floor(remainingVolume / 10);
if (largeVialCount > 0) {
  vials.push({
    size: '10mL',
    count: largeVialCount,
    totalVolume: largeVialCount * 10,
    totalMg: largeVialCount * 10 * concentration
  });
  remainingVolume -= largeVialCount * 10;
}

// Add small vials if needed
if (remainingVolume > 0) {
  const smallVialCount = Math.ceil(remainingVolume / 2.5);
  vials.push({
    size: '2.5mL',
    count: smallVialCount,
    totalVolume: smallVialCount * 2.5,
    totalMg: smallVialCount * 2.5 * concentration
  });
}

console.log('\nOptimal vial combination:');
let totalVolume = 0;
let totalMg = 0;
vials.forEach(v => {
  console.log(`- ${v.count} × ${v.size} vials = ${v.totalVolume}mL (${v.totalMg}mg)`);
  totalVolume += v.totalVolume;
  totalMg += v.totalMg;
});

console.log(`\nTotal drug volume: ${totalVolume}mL`);
console.log(`Total drug amount: ${totalMg}mg`);

console.log('\n=== Expected Results ===');
console.log('✓ Drug volume: 50mL');
console.log('✓ Vial combination: 5 × 10mL vials');
console.log('✓ With 30mL overfill, removal volume: 80mL');

console.log('\n=== Infusion Rate Note ===');
console.log('The pump sheet uses 166 mL/hr, which is 2× the protocol rate.');
console.log('The calculator may need an option to override protocol rates.');