// Analysis of pump calculation sheets vs our calculator logic

console.log('=== PUMP SHEET ANALYSIS ===\n');

const pumpSheets = [
  {
    id: 'Sheet 1 - ELELYSO',
    weight: 77.11,
    medication: 'ELELYSO',
    dose: 4000, // units
    drugVolume: 100, // mL
    bagSize: 100, // mL (empty bag + 100mL saline added)
    overfill: 0, // Not removing overfill
    removalVolume: 0, // Adding to empty bag
    totalVolume: 200, // mL
    infusionRate: 150, // mL/hr
    totalTime: 80, // minutes (1hr 20min)
    primeVolume: 10,
    flushVolume: 10
  },
  {
    id: 'Sheet 2 - NEXVIAZYME',
    weight: 43.09,
    medication: 'NEXVIAZYME',
    dose: 900, // mg
    drugVolume: 90, // mL
    bagSize: 250, // mL D5W
    overfill: 30, // mL (for 250mL bag)
    removalVolume: 120, // mL
    totalVolume: 250, // mL
    infusionTime: 221, // minutes (3hr 41min)
    primeVolume: 10,
    flushVolume: 10,
    infusionSteps: [
      { rate: 13, duration: 30, volume: 6.5 },
      { rate: 38, duration: 30, volume: 19 },
      { rate: 63, duration: 30, volume: 31.5 },
      { rate: 88, duration: 'remainder', volume: 183 },
      { rate: 88, duration: 'flush', volume: 10 }
    ]
  },
  {
    id: 'Sheet 3 - XENPOZYME',
    weight: 58.97,
    medication: 'XENPOZYME',
    dose: 180, // mg
    drugVolume: 45, // mL
    bagSize: 250, // mL
    overfill: 30, // mL
    removalVolume: 75, // mL
    totalVolume: 250, // mL
    infusionTime: 220, // minutes (3hr 40min)
    primeVolume: 10,
    flushVolume: 10,
    infusionSteps: [
      { rate: 8.3, duration: 20, volume: 2.8 },
      { rate: 25, duration: 20, volume: 8.4 },
      { rate: 50, duration: 21, volume: 17.8 },
      { rate: 83.3, duration: 'remainder', volume: 211 },
      { rate: 83.3, duration: 'flush', volume: 10 }
    ]
  },
  {
    id: 'Sheet 4 - CEREZYME',
    weight: 52.16,
    medication: 'CEREZYME',
    dose: 3600, // units
    drugVolume: 90, // mL
    bagSize: 100, // mL (10mL saline to empty bag)
    overfill: 0, // Not applicable (empty bag)
    removalVolume: 0, // Adding to empty bag
    totalVolume: 110, // mL (includes extra flush)
    infusionTime: 79, // minutes (1hr 19min)
    primeVolume: 10,
    flushVolume: 20, // Extra flush
    infusionSteps: [
      { rate: 30, duration: 30, volume: 15 },
      { rate: 115, duration: 'remainder', volume: 75 },
      { rate: 115, duration: 'flush', volume: 20 }
    ]
  },
  {
    id: 'Sheet 5 - ELFABRIO',
    weight: 92.53,
    medication: 'ELFABRIO',
    dose: 100, // mg
    drugVolume: 50, // mL
    bagSize: 250, // mL
    overfill: 30, // mL
    removalVolume: 80, // mL
    totalVolume: 250, // mL
    infusionRate: 166, // mL/hr
    totalTime: 90, // minutes
    primeVolume: 10,
    flushVolume: 10
  },
  {
    id: 'Sheet 6 - ALDURAZYME',
    weight: 81.65,
    medication: 'ALDURAZYME',
    dose: 45, // mg
    drugVolume: 77.6, // mL
    bagSize: 250, // mL
    overfill: 30, // mL
    removalVolume: 107.6, // mL
    totalVolume: 250, // mL
    infusionRate: 80, // mL/hr
    totalTime: 187, // minutes (3hr 7min)
    primeVolume: 10,
    flushVolume: 10
  },
  {
    id: 'Sheet 7 - POMBILITI',
    weight: 87.54,
    medication: 'POMBILITI',
    dose: 1785, // mg
    drugVolume: 119, // mL
    bagSize: 500, // mL
    overfill: 40, // mL
    removalVolume: 159, // mL
    totalVolume: 500, // mL
    infusionTime: 222, // minutes (3hr 42min)
    primeVolume: 10,
    flushVolume: 10,
    infusionSteps: [
      { rate: 25, duration: 30, volume: 12.5 },
      { rate: 75, duration: 30, volume: 37.5 },
      { rate: 125, duration: 30, volume: 63 },
      { rate: 175, duration: 'remainder', volume: 377 },
      { rate: 175, duration: 'flush', volume: 10 }
    ]
  },
  {
    id: 'Sheet 8 - LUMIZYME',
    weight: 73.94,
    medication: 'LUMIZYME',
    dose: 1500, // mg
    drugVolume: 300, // mL
    bagSize: 500, // mL (200mL saline to empty bag)
    overfill: 0, // Not applicable (empty bag)
    removalVolume: 0, // Adding to empty bag
    totalVolume: 500, // mL
    infusionTime: 289, // minutes (4hr 49min)
    primeVolume: 10,
    flushVolume: 10,
    infusionSteps: [
      { rate: 12.5, duration: 30, volume: 6.3 },
      { rate: 25, duration: 30, volume: 12.5 },
      { rate: 50, duration: 30, volume: 25 },
      { rate: 75, duration: 30, volume: 37.7 },
      { rate: 100, duration: 30, volume: 50 },
      { rate: 125, duration: 30, volume: 62.5 },
      { rate: 150, duration: 30, volume: 75 },
      { rate: 175, duration: 'remainder', volume: 221 },
      { rate: 175, duration: 'flush', volume: 10 }
    ]
  }
];

// Analyze patterns
console.log('=== KEY OBSERVATIONS ===\n');

console.log('1. DRUG VOLUME CALCULATIONS:');
pumpSheets.forEach(sheet => {
  console.log(`   ${sheet.medication}: ${sheet.drugVolume}mL for ${sheet.dose} ${sheet.medication.includes('ZYME') ? 'mg' : 'units'}`);
});

console.log('\n2. OVERFILL PATTERNS:');
console.log('   - 250mL bag: 30mL overfill');
console.log('   - 500mL bag: 40mL overfill');
console.log('   - Empty bag: No overfill (adding saline to empty bag)');

console.log('\n3. INFUSION RATE PATTERNS:');
console.log('   - Simple infusions: Single rate throughout');
console.log('   - Step-wise infusions: Multiple rates with specific durations');
console.log('   - Last step always includes flush at same rate');

console.log('\n4. SPECIAL CASES:');
console.log('   - ELELYSO, CEREZYME, LUMIZYME: Add to empty bag (no removal)');
console.log('   - NEXVIAZYME: Uses D5W instead of normal saline');
console.log('   - CEREZYME: Extra flush volume (20mL instead of 10mL)');

console.log('\n5. INFUSION TIME CALCULATIONS:');
pumpSheets.forEach(sheet => {
  if (sheet.infusionRate) {
    const calculatedTime = (sheet.totalVolume / sheet.infusionRate) * 60;
    console.log(`   ${sheet.medication}: ${sheet.totalTime}min actual vs ${calculatedTime.toFixed(0)}min calculated`);
  }
});

console.log('\n=== FORMULA VERIFICATION ===\n');

// Test our formulas
pumpSheets.forEach(sheet => {
  console.log(`\n${sheet.id}:`);
  
  // Verify removal volume
  if (sheet.removalVolume > 0) {
    const expectedRemoval = sheet.drugVolume + sheet.overfill;
    console.log(`  Removal: ${sheet.removalVolume}mL actual vs ${expectedRemoval}mL calculated`);
    console.log(`  Match: ${sheet.removalVolume === expectedRemoval ? '✓' : '✗'}`);
  } else {
    console.log(`  Removal: None (empty bag method)`);
  }
  
  // Verify infusion rate (for simple infusions)
  if (sheet.infusionRate) {
    const calculatedRate = sheet.totalVolume / (sheet.totalTime / 60);
    console.log(`  Rate: ${sheet.infusionRate}mL/hr actual vs ${calculatedRate.toFixed(1)}mL/hr calculated`);
    console.log(`  Match: ${Math.abs(sheet.infusionRate - calculatedRate) < 5 ? '✓' : '✗'}`);
  }
});