// Test script for ELFABRIO pump calculation
// Based on the example pump sheet dated 04/23/2025

const testData = {
  patientWeight: 92.53, // kg
  medicationName: 'ELFABRIO',
  dose: 100, // mg total (from sheet)
  bagSize: 250, // ml (from sheet)
  primeVolume: 10, // ml
  flushVolume: 10, // ml (from sheet)
  totalInfusionVolume: 250, // ml
  expectedResults: {
    drugVolume: 50, // ml (from sheet)
    removalVolume: 80, // ml (from sheet - drug & bag overfill)
    infusionRate: 166, // ml/hr (from sheet)
    totalInfusionTime: 90 // minutes (1 hour 30 mins from sheet)
  }
};

// ELFABRIO configuration from JSON
const elfabrioConfig = {
  genericName: "Pegunigalsidase alfa-iwxj",
  indication: "Fabry in adults",
  dosageForm: "solution",
  standardDose: {
    value: 1,
    unit: "mg/kg",
    frequency: "every 2 weeks"
  },
  vialSizes: [
    {
      strength: 20,
      volume: 10,
      unit: "mg/ml"
    },
    {
      strength: 5,
      volume: 2.5,
      unit: "mg/ml"
    }
  ]
};

// Calculate drug volume based on vials
function calculateDrugVolume(totalDrugNeeded) {
  console.log(`\n=== Drug Volume Calculation ===`);
  console.log(`Total drug needed: ${totalDrugNeeded}mg`);
  
  // For solution medications, drug volume = total volume of vials used
  // ELFABRIO is 2mg/mL concentration (20mg in 10mL vial)
  const concentration = elfabrioConfig.vialSizes[0].strength / elfabrioConfig.vialSizes[0].volume;
  console.log(`Concentration: ${concentration}mg/mL`);
  
  // Calculate vial combination
  const vials = [];
  let remainingDrug = totalDrugNeeded;
  
  // Sort vials by volume (largest first) to minimize vial count
  const sortedVials = [...elfabrioConfig.vialSizes].sort((a, b) => b.volume - a.volume);
  
  for (const vial of sortedVials) {
    const mgPerVial = vial.strength;
    const vialsNeeded = Math.floor(remainingDrug / mgPerVial);
    
    if (vialsNeeded > 0) {
      vials.push({
        ...vial,
        count: vialsNeeded,
        totalVolume: vialsNeeded * vial.volume
      });
      remainingDrug -= vialsNeeded * mgPerVial;
    }
  }
  
  // Add one more vial if there's remaining drug
  if (remainingDrug > 0) {
    // Use the smallest vial that can cover it
    for (let i = sortedVials.length - 1; i >= 0; i--) {
      const vial = sortedVials[i];
      if (vial.strength >= remainingDrug || i === 0) {
        const existingVial = vials.find(v => v.strength === vial.strength);
        if (existingVial) {
          existingVial.count += 1;
          existingVial.totalVolume += vial.volume;
        } else {
          vials.push({
            ...vial,
            count: 1,
            totalVolume: vial.volume
          });
        }
        break;
      }
    }
  }
  
  // Calculate total drug volume
  const totalDrugVolume = vials.reduce((sum, vial) => sum + vial.totalVolume, 0);
  
  console.log(`\nVial combination:`);
  vials.forEach(vial => {
    console.log(`  ${vial.count} × ${vial.strength}mg (${vial.volume}mL) = ${vial.totalVolume}mL`);
  });
  console.log(`Total drug volume: ${totalDrugVolume}mL`);
  
  return totalDrugVolume;
}

// Calculate overfill based on bag size
function calculateOverfill(bagSize) {
  const overfillRules = {
    50: 5,
    100: 7,
    150: 25,
    250: 30,
    500: 40,
    1000: 60
  };
  
  return overfillRules[bagSize] || 0;
}

// Calculate infusion rate
function calculateInfusionRate(totalVolume, primeVolume, totalTimeMinutes) {
  const actualInfusionVolume = totalVolume - primeVolume;
  const totalTimeHours = totalTimeMinutes / 60;
  const rate = actualInfusionVolume / totalTimeHours;
  
  // Format rate for pump (max 3 digits with decimal OR 4 digits without decimal)
  if (rate < 1000) {
    return Math.round(rate * 10) / 10;
  } else {
    return Math.round(rate);
  }
}

// Run the test
console.log('=== ELFABRIO Pump Calculation Test ===');
console.log(`Patient weight: ${testData.patientWeight}kg`);
console.log(`Prescribed dose: ${testData.dose}mg total`);
console.log(`Dose per kg: ${(testData.dose / testData.patientWeight).toFixed(2)}mg/kg`);

// 1. Calculate drug volume
const calculatedDrugVolume = calculateDrugVolume(testData.dose);
console.log(`\n✓ Drug volume calculation:`);
console.log(`  Expected: ${testData.expectedResults.drugVolume}mL`);
console.log(`  Calculated: ${calculatedDrugVolume}mL`);
console.log(`  Match: ${calculatedDrugVolume === testData.expectedResults.drugVolume ? 'YES' : 'NO'}`);

// 2. Calculate overfill
const overfill = calculateOverfill(testData.bagSize);
console.log(`\n✓ Overfill calculation:`);
console.log(`  Bag size: ${testData.bagSize}mL`);
console.log(`  Overfill: ${overfill}mL`);

// 3. Calculate removal volume
const removalVolume = overfill + calculatedDrugVolume;
console.log(`\n✓ Removal volume calculation:`);
console.log(`  Expected: ${testData.expectedResults.removalVolume}mL`);
console.log(`  Calculated: ${removalVolume}mL (${overfill}mL overfill + ${calculatedDrugVolume}mL drug)`);
console.log(`  Match: ${removalVolume === testData.expectedResults.removalVolume ? 'YES' : 'NO'}`);

// 4. Calculate infusion rate
const calculatedRate = calculateInfusionRate(testData.totalInfusionVolume, testData.primeVolume, testData.expectedResults.totalInfusionTime);
console.log(`\n✓ Infusion rate calculation:`);
console.log(`  Total volume: ${testData.totalInfusionVolume}mL`);
console.log(`  Prime volume: ${testData.primeVolume}mL`);
console.log(`  Actual infusion volume: ${testData.totalInfusionVolume - testData.primeVolume}mL`);
console.log(`  Total time: ${testData.expectedResults.totalInfusionTime} minutes`);
console.log(`  Expected rate: ${testData.expectedResults.infusionRate}mL/hr`);
console.log(`  Calculated rate: ${calculatedRate}mL/hr`);
console.log(`  Match: ${Math.abs(calculatedRate - testData.expectedResults.infusionRate) < 1 ? 'YES' : 'NO'}`);

// 5. Verify flush step
console.log(`\n✓ Flush volume: ${testData.flushVolume}mL at ${testData.expectedResults.infusionRate}mL/hr`);

// Summary
console.log(`\n=== SUMMARY ===`);
const allMatch = 
  calculatedDrugVolume === testData.expectedResults.drugVolume &&
  removalVolume === testData.expectedResults.removalVolume &&
  Math.abs(calculatedRate - testData.expectedResults.infusionRate) < 1;

console.log(`All calculations match: ${allMatch ? '✅ YES' : '❌ NO'}`);

if (!allMatch) {
  console.log('\nDiscrepancies found - please review the calculator logic.');
}