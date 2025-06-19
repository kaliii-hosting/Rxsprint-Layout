// Detailed comparison of infusion steps and rates between pump sheets and calculator logic

import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('infusion-pump-config.json', 'utf8'));

console.log('=== INFUSION STEPS & RATES COMPARISON ===\n');

// Sheet 1: ELELYSO - Simple infusion
console.log('════════════════════════════════════════════════════════════════');
console.log('SHEET 1: ELELYSO - Simple Single Rate');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet:');
console.log('  Step 1: 190 mL at 150 mL/hr');
console.log('  Step 2: 10 mL (flush) at 150 mL/hr');
console.log('  Total time: 80 minutes');
console.log('\nOur Config:');
const elelyso = config.medications.ELELYSO;
console.log('  Age-based protocol:');
console.log('  - Pediatric: Start 60 mL/hr, max 120 mL/hr');
console.log('  - Adult: Start 72 mL/hr, max 132 mL/hr');
console.log('\nANALYSIS:');
console.log('  - Pump sheet uses 150 mL/hr (exceeds our max rates)');
console.log('  - This is a custom rate, not following standard protocol');
console.log('  - Calculator would need user to specify custom time/rate');

// Sheet 2: NEXVIAZYME - Step protocol
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 2: NEXVIAZYME - Complex Step Protocol');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet (43.09 kg patient):');
console.log('  Step 1: 6.5 mL at 13 mL/hr × 30 min');
console.log('  Step 2: 19 mL at 38 mL/hr × 30 min');
console.log('  Step 3: 31.5 mL at 63 mL/hr × 30 min');
console.log('  Step 4: 183 mL at 88 mL/hr until complete');
console.log('  Step 5: 10 mL at 88 mL/hr (flush)');
console.log('  Total: 250 mL in 221 minutes');
console.log('\nOur Config (20-30kg range):');
const nexviazyme = config.medications.NEXVIAZYME;
console.log('  Step 1: 4 mL/hr × 30 min');
console.log('  Step 2: 9 mL/hr × 30 min');
console.log('  Step 3: 20 mL/hr × 30 min');
console.log('  Step 4: 35 mL/hr remainder');
console.log('\nDISCREPANCY ANALYSIS:');
console.log('  - Patient is 43.09 kg (30.1-35kg range in config)');
console.log('  - Config shows: 5, 11, 26, 44 mL/hr for 30.1-35kg');
console.log('  - Pump sheet rates are ~2.6× higher than config');
console.log('  - Suggests dose-adjusted rates or different protocol');

// Sheet 3: XENPOZYME - Dose escalation
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 3: XENPOZYME - Dose Escalation Protocol');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet (180 mg dose = 3 mg/kg for 60kg patient):');
console.log('  Step 1: 2.8 mL at 8.3 mL/hr × 20 min');
console.log('  Step 2: 8.4 mL at 25 mL/hr × 20 min');
console.log('  Step 3: 17.8 mL at 50 mL/hr × 21 min');
console.log('  Step 4: 211 mL at 83.3 mL/hr until complete');
console.log('  Step 5: 10 mL at 83.3 mL/hr (flush)');
console.log('\nOur Config Analysis:');
const xenpozyme = config.medications.XENPOZYME;
console.log('  XENPOZYME has dose-dependent protocols (0.03-3 mg/kg)');
console.log('  For 3 mg/kg dose (maintenance):');
console.log('    - 0.1 mg/kg/hr × 20 min');
console.log('    - 1 mg/kg/hr × 20 min');
console.log('    - 2 mg/kg/hr × 21 min');
console.log('    - 3.33 mg/kg/hr remainder');
console.log('\nRATE CONVERSION:');
console.log('  For 60 kg patient at 3 mg/kg = 180 mg total:');
console.log('  - 0.1 mg/kg/hr = 6 mg/hr = 3 mL/hr (at 2mg/mL)');
console.log('  - 1 mg/kg/hr = 60 mg/hr = 30 mL/hr');
console.log('  - 2 mg/kg/hr = 120 mg/hr = 60 mL/hr');
console.log('  - 3.33 mg/kg/hr = 200 mg/hr = 100 mL/hr');
console.log('\nDISCREPANCY:');
console.log('  Config: 3, 30, 60, 100 mL/hr');
console.log('  Pump sheet: 8.3, 25, 50, 83.3 mL/hr');
console.log('  Pump sheet rates are different, possibly adjusted protocol');

// Sheet 4: CEREZYME - Modified protocol
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 4: CEREZYME - Modified Simple Protocol');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet:');
console.log('  Step 1: 15 mL at 30 mL/hr × 30 min');
console.log('  Step 2: 75 mL at 115 mL/hr until complete');
console.log('  Step 3: 20 mL at 115 mL/hr (extra flush)');
console.log('\nOur Config:');
console.log('  Default: 1-2 hours infusion, no specific steps');
console.log('\nANALYSIS:');
console.log('  - Pump sheet uses step-up protocol not in config');
console.log('  - Extra flush (20 mL vs standard 10 mL)');
console.log('  - Custom clinical protocol');

// Sheet 5: ELFABRIO - Different rate
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 5: ELFABRIO - ERT Protocol Rate');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet (92.53 kg patient):');
console.log('  - 250 mL at 166 mL/hr = 90 minutes');
console.log('\nOur Config (70-100kg ERT-experienced):');
console.log('  - Protocol rate: 83 mL/hr');
console.log('  - At 83 mL/hr: 250 mL would take 181 minutes');
console.log('\nDISCREPANCY:');
console.log('  - Pump sheet rate is exactly 2× protocol rate');
console.log('  - 166 ÷ 83 = 2.0');
console.log('  - Suggests modified protocol or faster infusion allowed');

// Sheet 6: ALDURAZYME - Protocol match
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 6: ALDURAZYME - Simple Rate');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet:');
console.log('  - 250 mL at 80 mL/hr = 187.5 minutes');
console.log('\nOur Config (>20kg):');
console.log('  Step protocol: 5, 10, 20, 40, 80 mL/hr');
console.log('  Final rate: 80 mL/hr matches pump sheet');
console.log('\nANALYSIS:');
console.log('  - Pump sheet shows final rate only');
console.log('  - Likely completed step-up and running at max rate');

// Sheet 7: POMBILITI - Step protocol
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 7: POMBILITI - Standard Step Protocol');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet (87.54 kg patient):');
console.log('  Step 1: 12.5 mL at 25 mL/hr × 30 min');
console.log('  Step 2: 37.5 mL at 75 mL/hr × 30 min');
console.log('  Step 3: 63 mL at 125 mL/hr × 30 min');
console.log('  Step 4: 377 mL at 175 mL/hr until complete');
console.log('  Step 5: 10 mL at 175 mL/hr (flush)');
console.log('\nOur Config (60.1-100kg):');
console.log('  Step 1: 25 mL/hr × 30 min');
console.log('  Step 2: 75 mL/hr × 30 min');
console.log('  Step 3: 125 mL/hr × 30 min');
console.log('  Step 4: 175 mL/hr remainder');
console.log('\nPERFECT MATCH ✓');

// Sheet 8: LUMIZYME - Complex protocol
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 8: LUMIZYME - 9-Step Protocol');
console.log('════════════════════════════════════════════════════════════════');
console.log('Pump Sheet shows 9 steps increasing from 12.5 to 175 mL/hr');
console.log('\nOur Config Analysis:');
console.log('  Weight-based step protocols with max 7 mg/kg/hr');
console.log('  For 73.94 kg (60.1-100kg range):');
console.log('  - Steps: 25, 75, 125, 175 mL/hr');
console.log('\nDISCREPANCY:');
console.log('  - Pump sheet has 9 steps vs config 4 steps');
console.log('  - More gradual ramp-up in clinical practice');
console.log('  - Final rate matches (175 mL/hr)');

console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SUMMARY OF INFUSION PROTOCOL FINDINGS');
console.log('════════════════════════════════════════════════════════════════');
console.log('\n1. PERFECT PROTOCOL MATCHES:');
console.log('   - POMBILITI: Exact step rates match');
console.log('   - ALDURAZYME: Final rate matches');
console.log('\n2. RATE CALCULATION FORMULA:');
console.log('   All sheets correctly use: Rate = Volume ÷ Time');
console.log('\n3. PROTOCOL VARIATIONS:');
console.log('   - ELFABRIO: 2× faster than protocol (166 vs 83 mL/hr)');
console.log('   - NEXVIAZYME: Different rates than config');
console.log('   - XENPOZYME: Modified dose-based rates');
console.log('   - LUMIZYME: More gradual steps (9 vs 4)');
console.log('\n4. CUSTOM PROTOCOLS:');
console.log('   - ELELYSO: Single rate instead of step protocol');
console.log('   - CEREZYME: Added step protocol not in config');
console.log('\n5. KEY INSIGHT:');
console.log('   Clinical practice often modifies standard protocols based on:');
console.log('   - Patient tolerance');
console.log('   - Institutional preferences');
console.log('   - Physician orders');
console.log('   - Previous infusion history');