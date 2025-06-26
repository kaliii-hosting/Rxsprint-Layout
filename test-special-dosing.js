#!/usr/bin/env node

// Test script for special dosing functionality

const testCases = [
  {
    medication: 'LUMIZYME',
    patientWeight: '70',
    scenarios: [
      { dose: '20', unit: 'mg/kg', expected: 'correct' },
      { dose: '40', unit: 'mg/kg', expected: 'correct (weekly)' },
      { dose: '15', unit: 'mg/kg', expected: 'low' },
      { dose: '50', unit: 'mg/kg', expected: 'high' }
    ]
  },
  {
    medication: 'CEREZYME',
    patientWeight: '50',
    scenarios: [
      { dose: '2.5', unit: 'units/kg', expected: 'low (but valid for 3x weekly)' },
      { dose: '60', unit: 'units/kg', expected: 'correct' },
      { dose: '120', unit: 'units/kg', expected: 'high (but within range)' },
      { dose: '150', unit: 'units/kg', expected: 'high (exceeds range)' }
    ]
  },
  {
    medication: 'FABRAZYME',
    patientWeight: '60',
    scenarios: [
      { dose: '1', unit: 'mg/kg', expected: 'correct' },
      { dose: '0.5', unit: 'mg/kg', expected: 'correct (rechallenge)' },
      { dose: '0.3', unit: 'mg/kg', expected: 'low' },
      { dose: '1.5', unit: 'mg/kg', expected: 'high' }
    ]
  },
  {
    medication: 'KANUMA',
    patientWeight: '25',
    scenarios: [
      { dose: '1', unit: 'mg/kg', expected: 'correct' },
      { dose: '3', unit: 'mg/kg', expected: 'correct (rapid progression)' },
      { dose: '0.5', unit: 'mg/kg', expected: 'low' },
      { dose: '4', unit: 'mg/kg', expected: 'high' }
    ]
  },
  {
    medication: 'NEXVIAZYME',
    patientWeight: '25',
    scenarios: [
      { dose: '40', unit: 'mg/kg', expected: 'correct (pediatric)' },
      { dose: '20', unit: 'mg/kg', expected: 'low for pediatric' }
    ]
  },
  {
    medication: 'NEXVIAZYME',
    patientWeight: '70',
    scenarios: [
      { dose: '20', unit: 'mg/kg', expected: 'correct (adult)' },
      { dose: '40', unit: 'mg/kg', expected: 'high for adult' }
    ]
  }
];

console.log('Special Dosing Test Cases:');
console.log('==========================\n');

testCases.forEach((testCase, index) => {
  console.log(`Test Case ${index + 1}: ${testCase.medication} (${testCase.patientWeight} kg patient)`);
  console.log('-'.repeat(50));
  
  testCase.scenarios.forEach(scenario => {
    console.log(`  Dose: ${scenario.dose} ${scenario.unit}`);
    console.log(`  Expected: ${scenario.expected}`);
    console.log('');
  });
  
  console.log('\n');
});

console.log('\nSpecial Dosing Options by Medication:');
console.log('=====================================\n');

const specialDosingInfo = {
  'LUMIZYME': [
    'Standard: 20 mg/kg every 2 weeks',
    'High dose: 40 mg/kg weekly'
  ],
  'CEREZYME': [
    'Low frequent: 2.5 units/kg 3 times weekly',
    'Standard: 60 units/kg every 2 weeks',
    'High: up to 120 units/kg every 2 weeks'
  ],
  'FABRAZYME': [
    'Standard: 1 mg/kg every 2 weeks',
    'Rechallenge: 0.5 mg/kg (IgE-positive/skin-test-positive)'
  ],
  'KANUMA': [
    'Standard: 1 mg/kg every 2 weeks',
    'Rapid progression: 3 mg/kg every 2 weeks',
    'Infants <6 months: 1 mg/kg weekly'
  ],
  'NEXVIAZYME': [
    'Adults (≥30 kg): 20 mg/kg every 2 weeks',
    'Pediatric (<30 kg): 40 mg/kg every 2 weeks'
  ],
  'POMBILITI': [
    'Standard: 20 mg/kg every 2 weeks',
    'Oral (40-49.9 kg): 195 mg (3 capsules)',
    'Oral (≥50 kg): 260 mg (4 capsules)'
  ],
  'VPRIV': [
    'Standard: 60 units/kg every 2 weeks',
    'High: up to 120 units/kg every 2 weeks'
  ],
  'ZAVESCA': [
    'CrCl >70: 100 mg TID',
    'CrCl 50-70: 100 mg BID',
    'CrCl 30-50: 100 mg daily',
    'NPC (BSA ≥1.25): 200 mg TID',
    'NPC (BSA 0.88-1.25): 200 mg BID',
    'NPC (BSA 0.73-0.88): 100 mg TID',
    'NPC (BSA 0.47-0.73): 100 mg BID',
    'NPC (BSA <0.47): 100 mg daily'
  ]
};

Object.entries(specialDosingInfo).forEach(([med, options]) => {
  console.log(`${med}:`);
  options.forEach(option => {
    console.log(`  • ${option}`);
  });
  console.log('');
});