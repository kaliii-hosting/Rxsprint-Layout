// Test drug volume, overfill, and removal calculations for all medications

import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('infusion-pump-config.json', 'utf8'));

console.log('=== TESTING ALL MEDICATIONS CALCULATIONS ===\n');

// Test parameters
const testWeight = 70; // kg
const testBagSize = 250; // mL

// Expected overfill for 250mL bag
const expectedOverfill = 30; // mL

// Test each medication
Object.entries(config.medications).forEach(([name, medication]) => {
  if (medication.dosageForm === 'oral') return; // Skip oral medications
  
  console.log(`\n=== ${name} ===`);
  console.log(`Type: ${medication.dosageForm}`);
  
  // Calculate drug needed based on standard dose
  const standardDose = medication.standardDose.value;
  const unit = medication.standardDose.unit;
  
  let totalDrugNeeded;
  if (unit === 'mg/kg' || unit === 'units/kg') {
    totalDrugNeeded = standardDose * testWeight;
  } else {
    totalDrugNeeded = standardDose;
  }
  
  console.log(`Drug needed: ${totalDrugNeeded} ${unit.replace('/kg', '')}`);
  
  // Check vial configuration
  if (medication.dosageForm === 'solution') {
    console.log('Vial sizes (solution):');
    medication.vialSizes.forEach(vial => {
      const concentration = vial.strength;
      const totalMgPerVial = concentration * vial.volume;
      console.log(`  - ${vial.volume}mL @ ${concentration}mg/mL = ${totalMgPerVial}mg per vial`);
      
      // Check if strength is concentration or total mg
      if (concentration > 10 && vial.unit === 'mg/ml') {
        console.log(`    ⚠️  WARNING: Strength ${concentration} seems too high for concentration`);
      }
    });
    
    // Calculate drug volume for solution
    const concentration = medication.vialSizes[0].strength;
    const drugVolume = totalDrugNeeded / concentration;
    console.log(`Drug volume: ${totalDrugNeeded} ÷ ${concentration}mg/mL = ${drugVolume.toFixed(1)}mL`);
    
  } else if (medication.dosageForm === 'lyophilized') {
    console.log('Vial sizes (lyophilized):');
    medication.vialSizes.forEach(vial => {
      console.log(`  - ${vial.strength}${vial.unit || 'mg'} reconstituted with ${vial.reconstitutionVolume || '?'}mL`);
    });
    
    // Calculate drug volume for lyophilized (sum of reconstitution volumes)
    // This is simplified - actual calculation would optimize vial usage
    const largestVial = medication.vialSizes[0];
    if (largestVial.reconstitutionVolume) {
      const vialsNeeded = Math.ceil(totalDrugNeeded / largestVial.strength);
      const drugVolume = vialsNeeded * largestVial.reconstitutionVolume;
      console.log(`Drug volume (approx): ${vialsNeeded} vials × ${largestVial.reconstitutionVolume}mL = ${drugVolume}mL`);
    }
  }
  
  // Check overfill rules
  if (medication.overfillOverride) {
    console.log(`Overfill: ${medication.overfillOverride}mL (medication-specific override)`);
  } else {
    console.log(`Overfill: ${expectedOverfill}mL (standard for ${testBagSize}mL bag)`);
  }
  
  // Check removal rules
  if (medication.salineBagRules?.specialInstructions?.includes('DO NOT remove')) {
    console.log('Removal: 0mL (DO NOT remove instruction)');
  } else {
    console.log('Removal: Drug volume + Overfill');
  }
});

console.log('\n\n=== ISSUES FOUND ===');
console.log('The following medications may have incorrect configurations:');

// Check for potential issues
Object.entries(config.medications).forEach(([name, medication]) => {
  if (medication.dosageForm === 'solution') {
    medication.vialSizes.forEach(vial => {
      if (vial.strength > 10 && vial.unit === 'mg/ml') {
        console.log(`- ${name}: Strength ${vial.strength} mg/mL seems too high (should be concentration)`);
      }
    });
  }
});