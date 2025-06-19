// Test specific medication calculations to verify correctness

import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('infusion-pump-config.json', 'utf8'));

console.log('=== TESTING SPECIFIC MEDICATION CALCULATIONS ===\n');

// Test cases
const testCases = [
  {
    name: 'ELFABRIO',
    weight: 92.53,
    dose: 100, // mg total
    expectedDrugVolume: 50, // mL
    expectedOverfill: 30, // mL for 250mL bag
    expectedRemoval: 80 // mL
  },
  {
    name: 'ELAPRASE',
    weight: 70,
    dose: 35, // mg total
    expectedDrugVolume: 6, // mL (2 x 3mL vials)
    expectedOverfill: 7, // mL (override)
    expectedRemoval: 0 // DO NOT remove
  },
  {
    name: 'FABRAZYME',
    weight: 70,
    dose: 70, // mg total
    expectedDrugVolume: 14.4, // mL (2 x 35mg vials @ 7.2mL each)
    expectedOverfill: 30, // mL for 250mL bag
    expectedRemoval: 44.4 // mL
  }
];

// Calculate drug volume for each test case
testCases.forEach(test => {
  console.log(`\n=== ${test.name} ===`);
  const medication = config.medications[test.name];
  
  console.log(`Patient weight: ${test.weight}kg`);
  console.log(`Total dose: ${test.dose}mg`);
  console.log(`Medication type: ${medication.dosageForm}`);
  
  // Calculate drug volume
  let calculatedDrugVolume = 0;
  
  if (medication.dosageForm === 'solution') {
    const concentration = medication.vialSizes[0].strength; // mg/mL
    const volumeNeeded = test.dose / concentration;
    
    // Calculate vial usage
    const sortedVials = [...medication.vialSizes].sort((a, b) => b.volume - a.volume);
    let remainingVolume = volumeNeeded;
    let vialUsage = [];
    
    for (const vial of sortedVials) {
      const count = Math.floor(remainingVolume / vial.volume);
      if (count > 0) {
        vialUsage.push({ vial, count });
        remainingVolume -= count * vial.volume;
      }
    }
    
    if (remainingVolume > 0.01) {
      const smallestVial = sortedVials[sortedVials.length - 1];
      const existing = vialUsage.find(v => v.vial.volume === smallestVial.volume);
      if (existing) {
        existing.count += 1;
      } else {
        vialUsage.push({ vial: smallestVial, count: 1 });
      }
    }
    
    calculatedDrugVolume = vialUsage.reduce((sum, v) => sum + v.count * v.vial.volume, 0);
    
    console.log(`\nVial usage:`);
    vialUsage.forEach(v => {
      console.log(`  ${v.count} × ${v.vial.volume}mL = ${v.count * v.vial.volume}mL`);
    });
    
  } else if (medication.dosageForm === 'lyophilized') {
    // For FABRAZYME, use 35mg vials
    const vial35 = medication.vialSizes.find(v => v.strength === 35);
    const vial5 = medication.vialSizes.find(v => v.strength === 5);
    
    let vialUsage = [];
    if (vial35) {
      const count35 = Math.floor(test.dose / 35);
      const remaining = test.dose - (count35 * 35);
      
      vialUsage.push({ vial: vial35, count: count35 });
      
      if (remaining > 0 && vial5) {
        const count5 = Math.ceil(remaining / 5);
        vialUsage.push({ vial: vial5, count: count5 });
      } else if (remaining > 0) {
        // Use one more 35mg vial
        vialUsage[0].count += 1;
      }
    }
    
    calculatedDrugVolume = vialUsage.reduce((sum, v) => 
      sum + v.count * (v.vial.reconstitutionVolume || 0), 0
    );
    
    console.log(`\nVial usage:`);
    vialUsage.forEach(v => {
      console.log(`  ${v.count} × ${v.vial.strength}mg (${v.vial.reconstitutionVolume}mL) = ${v.count * v.vial.reconstitutionVolume}mL`);
    });
  }
  
  console.log(`\nCalculated drug volume: ${calculatedDrugVolume.toFixed(1)}mL`);
  console.log(`Expected drug volume: ${test.expectedDrugVolume}mL`);
  console.log(`Match: ${Math.abs(calculatedDrugVolume - test.expectedDrugVolume) < 0.1 ? '✓' : '✗'}`);
  
  // Check overfill
  const overfill = medication.overfillOverride || 30; // 30mL for 250mL bag
  console.log(`\nOverfill: ${overfill}mL`);
  console.log(`Expected: ${test.expectedOverfill}mL`);
  console.log(`Match: ${overfill === test.expectedOverfill ? '✓' : '✗'}`);
  
  // Check removal volume
  let removalVolume = calculatedDrugVolume + overfill;
  if (medication.salineBagRules?.specialInstructions?.includes('DO NOT remove')) {
    removalVolume = 0;
  }
  
  console.log(`\nRemoval volume: ${removalVolume.toFixed(1)}mL`);
  console.log(`Expected: ${test.expectedRemoval}mL`);
  console.log(`Match: ${Math.abs(removalVolume - test.expectedRemoval) < 0.1 ? '✓' : '✗'}`);
});