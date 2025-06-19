// Analysis of all medications in the config to identify which need fixing

import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('infusion-pump-config.json', 'utf8'));

console.log('=== MEDICATION CONFIGURATION ANALYSIS ===\n');

const solutionMeds = [];
const lyophilizedMeds = [];

Object.entries(config.medications).forEach(([name, med]) => {
  if (med.dosageForm === 'solution') {
    solutionMeds.push({ name, ...med });
  } else if (med.dosageForm === 'lyophilized') {
    lyophilizedMeds.push({ name, ...med });
  }
});

console.log('SOLUTION MEDICATIONS (need strength = concentration in mg/mL):');
console.log('===========================================================');
solutionMeds.forEach(med => {
  console.log(`\n${med.name}:`);
  med.vialSizes.forEach(vial => {
    const totalMg = vial.strength * vial.volume;
    console.log(`  - Strength: ${vial.strength} ${vial.unit || 'mg/ml'}, Volume: ${vial.volume}mL`);
    console.log(`    Current interpretation: ${vial.strength}mg/mL × ${vial.volume}mL = ${totalMg}mg total`);
    
    // Check if this looks wrong (strength value is too high for concentration)
    if (vial.strength > 10 && vial.unit === 'mg/ml') {
      console.log(`    ⚠️  WARNING: Strength ${vial.strength} seems too high for mg/mL concentration`);
    }
  });
});

console.log('\n\nLYOPHILIZED MEDICATIONS (strength = total mg per vial):');
console.log('======================================================');
lyophilizedMeds.forEach(med => {
  console.log(`\n${med.name}:`);
  med.vialSizes.forEach(vial => {
    console.log(`  - Strength: ${vial.strength} ${vial.unit || 'mg'}`);
    if (vial.reconstitutionVolume) {
      const concentration = vial.strength / vial.reconstitutionVolume;
      console.log(`    Reconstitution: ${vial.reconstitutionVolume}mL → ${concentration.toFixed(1)}mg/mL`);
    }
  });
});

console.log('\n\n=== MEDICATIONS THAT NEED FIXING ===');
console.log('The following solution medications appear to have incorrect strength values:');

const needsFixing = [];
solutionMeds.forEach(med => {
  med.vialSizes.forEach(vial => {
    if (vial.strength > 10 && vial.unit === 'mg/ml') {
      if (!needsFixing.find(m => m.name === med.name)) {
        needsFixing.push(med);
      }
    }
  });
});

needsFixing.forEach(med => {
  console.log(`\n${med.name}:`);
  console.log('  Current config needs to be updated to use concentration (mg/mL) not total mg');
});