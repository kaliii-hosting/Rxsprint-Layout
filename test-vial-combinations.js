#!/usr/bin/env node

// Test script for vial combinations functionality

// Simulate the vial combination calculation logic
function calculateVialCombinations(totalDose, vialSizes) {
  if (!vialSizes || vialSizes.length === 0) return null;

  // For single vial size, return simple calculation
  if (vialSizes.length === 1) {
    const vial = vialSizes[0];
    const vialCount = Math.ceil(totalDose / vial.strength);
    return [{
      combination: [{ vial, count: vialCount }],
      totalVials: vialCount,
      actualDose: vialCount * vial.strength,
      waste: (vialCount * vial.strength) - totalDose,
      isOptimal: true
    }];
  }

  // For multiple vial sizes, calculate different combinations
  const combinations = [];
  const sortedVials = [...vialSizes].sort((a, b) => b.strength - a.strength);

  // Strategy 1: Use larger vials first (minimize vial count)
  const largeVialsFirst = [];
  let remainingDose = totalDose;
  
  for (const vial of sortedVials) {
    const vialCount = Math.floor(remainingDose / vial.strength);
    if (vialCount > 0) {
      largeVialsFirst.push({ vial, count: vialCount });
      remainingDose -= vialCount * vial.strength;
    }
  }
  
  if (remainingDose > 0.01) {
    const smallestVial = sortedVials[sortedVials.length - 1];
    const existingSmallest = largeVialsFirst.find(c => c.vial === smallestVial);
    if (existingSmallest) {
      existingSmallest.count += 1;
    } else {
      largeVialsFirst.push({ vial: smallestVial, count: 1 });
    }
  }

  // Calculate metrics
  let totalVialsLarge = 0;
  let actualDoseLarge = 0;
  largeVialsFirst.forEach(item => {
    totalVialsLarge += item.count;
    actualDoseLarge += item.count * item.vial.strength;
  });

  combinations.push({
    combination: largeVialsFirst,
    totalVials: totalVialsLarge,
    actualDose: actualDoseLarge,
    waste: actualDoseLarge - totalDose,
    strategy: 'Minimize vial count',
    isOptimal: true
  });

  // Additional strategies...
  const smallestVial = sortedVials[sortedVials.length - 1];
  const smallVialsOnly = Math.ceil(totalDose / smallestVial.strength);
  
  if (smallVialsOnly <= 10) {
    combinations.push({
      combination: [{ vial: smallestVial, count: smallVialsOnly }],
      totalVials: smallVialsOnly,
      actualDose: smallVialsOnly * smallestVial.strength,
      waste: (smallVialsOnly * smallestVial.strength) - totalDose,
      strategy: 'Small vials only',
      isOptimal: false
    });
  }

  return combinations.sort((a, b) => {
    if (a.waste !== b.waste) return a.waste - b.waste;
    return a.totalVials - b.totalVials;
  });
}

// Test cases
const testCases = [
  {
    medication: 'ELFABRIO',
    vialSizes: [
      { strength: 20, unit: 'mg', volume: 10 },
      { strength: 5, unit: 'mg', volume: 2.5 }
    ],
    doses: [25, 50, 75, 100, 115]
  },
  {
    medication: 'FABRAZYME',
    vialSizes: [
      { strength: 35, unit: 'mg' },
      { strength: 5, unit: 'mg' }
    ],
    doses: [30, 40, 70, 85, 100]
  },
  {
    medication: 'XENPOZYME',
    vialSizes: [
      { strength: 20, unit: 'mg' },
      { strength: 4, unit: 'mg' }
    ],
    doses: [24, 40, 52, 68, 84]
  }
];

console.log('Vial Combination Test Results:');
console.log('==============================\n');

testCases.forEach(testCase => {
  console.log(`\n${testCase.medication} (Vial sizes: ${testCase.vialSizes.map(v => v.strength + ' ' + v.unit).join(', ')})`);
  console.log('-'.repeat(70));
  
  testCase.doses.forEach(dose => {
    console.log(`\nDose: ${dose} mg`);
    const combinations = calculateVialCombinations(dose, testCase.vialSizes);
    
    combinations.forEach((combo, index) => {
      console.log(`\n  Option ${index + 1}: ${combo.strategy}${combo.isOptimal ? ' (RECOMMENDED)' : ''}`);
      combo.combination.forEach(item => {
        console.log(`    ${item.count} × ${item.vial.strength} ${item.vial.unit} vial`);
      });
      console.log(`    Total vials: ${combo.totalVials}`);
      console.log(`    Actual dose: ${combo.actualDose} ${combo.combination[0].vial.unit}`);
      console.log(`    Waste: ${combo.waste.toFixed(1)} ${combo.combination[0].vial.unit}`);
    });
  });
});

// Summary of advantages
console.log('\n\nAdvantages of Multiple Vial Sizes:');
console.log('===================================');
console.log('1. Flexibility: Healthcare providers can choose combinations based on availability');
console.log('2. Waste reduction: Smaller vials can be used to minimize drug waste');
console.log('3. Inventory management: Options for when specific vial sizes are out of stock');
console.log('4. Cost optimization: Choose combinations that balance cost and convenience');
console.log('5. Patient-specific needs: Adjust for pediatric vs adult dosing requirements');