// Detailed mathematical comparison of pump sheets vs calculator logic

import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('infusion-pump-config.json', 'utf8'));

console.log('=== DETAILED MATHEMATICAL COMPARISON ===\n');
console.log('Analyzing exact differences between pump sheets and calculator results\n');

// Sheet 1: ELELYSO
console.log('════════════════════════════════════════════════════════════════');
console.log('SHEET 1: ELELYSO');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 77.11 kg | Dose: 4000 units');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 100 mL');
console.log('Our Calculation:');
console.log('  - Vial size: 200 units reconstituted with 5.1 mL');
console.log('  - Vials needed: 4000 ÷ 200 = 20 vials');
console.log('  - Drug volume: 20 × 5.1 mL = 102 mL');
console.log('  - DIFFERENCE: 102 - 100 = 2 mL more');
console.log('\nWHY THE DIFFERENCE?');
console.log('  - Pump sheet may use withdrawal volume (5.0 mL) vs reconstitution volume (5.1 mL)');
console.log('  - 20 × 5.0 mL = 100 mL ✓');
console.log('\nBAG & REMOVAL:');
console.log('  - Method: Empty bag + 100 mL saline');
console.log('  - No removal needed ✓');
console.log('\nINFUSION RATE:');
console.log('  - Total volume: 200 mL over 80 minutes');
console.log('  - Rate: 200 ÷ (80/60) = 150 mL/hr ✓');

// Sheet 2: NEXVIAZYME
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 2: NEXVIAZYME');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 43.09 kg | Dose: 900 mg');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 90 mL');
console.log('Our Calculation:');
console.log('  - Vial size: 100 mg reconstituted with 10 mL');
console.log('  - Vials needed: 900 ÷ 100 = 9 vials');
console.log('  - Drug volume: 9 × 10 mL = 90 mL');
console.log('  - MATCH: ✓');
console.log('\nREMOVAL CALCULATION:');
console.log('  - Drug volume: 90 mL');
console.log('  - Overfill (250 mL bag): 30 mL');
console.log('  - Total removal: 90 + 30 = 120 mL ✓');

// Sheet 3: XENPOZYME
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 3: XENPOZYME');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 58.97 kg | Dose: 180 mg');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 45 mL');
console.log('Our Calculation (using config vials):');
console.log('  - Option 1: 20 mg vials (3 mL each)');
console.log('    180 ÷ 20 = 9 vials × 3 mL = 27 mL');
console.log('  - Option 2: 4 mg vials (0.6 mL each)');
console.log('    180 ÷ 4 = 45 vials × 0.6 mL = 27 mL');
console.log('  - DIFFERENCE: 45 - 27 = 18 mL more in pump sheet');
console.log('\nWHY THE DIFFERENCE?');
console.log('  - Pump sheet might be using 15 × 20mg vials = 300mg prepared');
console.log('  - 15 × 3 mL = 45 mL (preparing extra for stability/waste)');
console.log('  - OR different vial sizes not in our config');

// Sheet 4: CEREZYME
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 4: CEREZYME');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 52.16 kg | Dose: 3600 units');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 90 mL');
console.log('Our Calculation:');
console.log('  - Vial size: 400 units reconstituted with 10.2 mL');
console.log('  - Vials needed: 3600 ÷ 400 = 9 vials');
console.log('  - Drug volume: 9 × 10.2 mL = 91.8 mL');
console.log('  - DIFFERENCE: 91.8 - 90 = 1.8 mL more');
console.log('\nWHY THE DIFFERENCE?');
console.log('  - Config shows reconstitution: 10.2 mL, withdrawal: 10 mL');
console.log('  - Using withdrawal: 9 × 10 mL = 90 mL ✓');
console.log('\nSPECIAL NOTES:');
console.log('  - Empty bag method (10 mL saline to empty bag)');
console.log('  - Extra flush: 20 mL instead of standard 10 mL');

// Sheet 5: ELFABRIO
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 5: ELFABRIO');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 92.53 kg | Dose: 100 mg');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 50 mL');
console.log('Our Calculation:');
console.log('  - Concentration: 2 mg/mL');
console.log('  - Volume needed: 100 ÷ 2 = 50 mL');
console.log('  - Using 5 × 10 mL vials = 50 mL');
console.log('  - MATCH: ✓');
console.log('\nREMOVAL CALCULATION:');
console.log('  - Drug volume: 50 mL');
console.log('  - Overfill: 30 mL');
console.log('  - Total: 50 + 30 = 80 mL ✓');
console.log('\nINFUSION RATE:');
console.log('  - 250 mL over 90 minutes');
console.log('  - Rate: 250 ÷ 1.5 = 166.67 mL/hr');
console.log('  - Pump sheet shows 166 mL/hr (rounded) ✓');

// Sheet 6: ALDURAZYME
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 6: ALDURAZYME');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 81.65 kg | Dose: 45 mg');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 77.6 mL');
console.log('Our Calculation:');
console.log('  - Concentration: 2.9 mg/mL');
console.log('  - Volume needed: 45 ÷ 2.9 = 15.52 mL');
console.log('  - Using 4 × 5 mL vials = 20 mL total');
console.log('  - DIFFERENCE: 77.6 - 20 = 57.6 mL more in pump sheet!');
console.log('\nWHY THE HUGE DIFFERENCE?');
console.log('  - Standard dose: 0.58 mg/kg × 81.65 = 47.36 mg');
console.log('  - But even at 47.36 mg, we would only need ~20 mL');
console.log('  - LIKELY EXPLANATION: Pump sheet may be showing total vial volume prepared');
console.log('  - If preparing 16 vials × 5 mL = 80 mL (close to 77.6 mL)');
console.log('  - This suggests batch preparation or different protocol');

// Sheet 7: POMBILITI
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 7: POMBILITI');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 87.54 kg | Dose: 1785 mg (rounded from 1750.8)');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 119 mL');
console.log('Our Calculation:');
console.log('  - Vial size: 105 mg reconstituted with 7.2 mL');
console.log('  - Vials needed: 1785 ÷ 105 = 17 vials');
console.log('  - Drug volume: 17 × 7.2 mL = 122.4 mL');
console.log('  - DIFFERENCE: 122.4 - 119 = 3.4 mL more');
console.log('\nWHY THE DIFFERENCE?');
console.log('  - Config shows final volume: 7 mL (vs 7.2 mL reconstitution)');
console.log('  - Using 17 × 7 mL = 119 mL ✓');

// Sheet 8: LUMIZYME
console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SHEET 8: LUMIZYME');
console.log('════════════════════════════════════════════════════════════════');
console.log('Patient: 73.94 kg | Dose: 1500 mg');
console.log('\nDRUG VOLUME CALCULATION:');
console.log('Pump Sheet: 300 mL');
console.log('Our Calculation:');
console.log('  - Vial size: 50 mg reconstituted with 10.3 mL');
console.log('  - Vials needed: 1500 ÷ 50 = 30 vials');
console.log('  - Drug volume: 30 × 10.3 mL = 309 mL');
console.log('  - DIFFERENCE: 309 - 300 = 9 mL more');
console.log('\nWHY THE DIFFERENCE?');
console.log('  - Likely using withdrawal volume of 10 mL per vial');
console.log('  - 30 × 10 mL = 300 mL ✓');
console.log('\nSPECIAL NOTES:');
console.log('  - Empty bag method (200 mL saline to empty bag)');
console.log('  - Complex step protocol with 9 steps');

console.log('\n\n════════════════════════════════════════════════════════════════');
console.log('SUMMARY OF MATHEMATICAL DIFFERENCES');
console.log('════════════════════════════════════════════════════════════════');
console.log('\n1. RECONSTITUTION vs WITHDRAWAL VOLUMES:');
console.log('   - ELELYSO: 5.1 mL recon → 5.0 mL withdrawal');
console.log('   - CEREZYME: 10.2 mL recon → 10.0 mL withdrawal');
console.log('   - POMBILITI: 7.2 mL recon → 7.0 mL withdrawal');
console.log('   - LUMIZYME: 10.3 mL recon → 10.0 mL withdrawal');
console.log('\n2. UNEXPLAINED LARGE DIFFERENCES:');
console.log('   - ALDURAZYME: 77.6 mL vs 20 mL (3.8× difference)');
console.log('   - XENPOZYME: 45 mL vs 27 mL (1.7× difference)');
console.log('\n3. PERFECT MATCHES:');
console.log('   - ELFABRIO: Solution medication calculations match exactly');
console.log('   - NEXVIAZYME: Lyophilized calculations match exactly');
console.log('\n4. ALL OVERFILL & REMOVAL CALCULATIONS MATCH PERFECTLY');