# ELFABRIO Pump Calculator Test Results

## Test Parameters
- **Date**: 04/23/2025 (from pump sheet)
- **Patient Weight**: 92.53 kg
- **Medication**: ELFABRIO (Pegunigalsidase alfa-iwxj)
- **Prescribed Dose**: 100 mg total
- **Bag Size**: 250 mL normal saline
- **Prime Volume**: 10 mL
- **Flush Volume**: 10 mL

## Test Results Summary

### ✅ Calculations that Match:
1. **Drug Volume**: 50 mL
   - Calculated correctly based on 5 × 20mg vials (10mL each)
   - Concentration: 2mg/mL

2. **Removal Volume**: 80 mL
   - Overfill: 30 mL (correct for 250mL bag)
   - Drug volume: 50 mL
   - Total: 80 mL ✅

### ❌ Discrepancy Found:
**Infusion Rate Calculation**
- **Pump Sheet Rate**: 166 mL/hr
- **Calculator Logic**: 160 mL/hr (based on 240mL over 90 minutes)
- **Difference**: 6 mL/hr

## Analysis of Discrepancy

### Root Cause:
The pump sheet uses 166 mL/hr, which is exactly **2× the ELFABRIO protocol rate** of 83 mL/hr for ERT-experienced patients in the 70-100kg weight range.

### Calculations:
1. **At 166 mL/hr**: 240mL takes 86.7 minutes (matches closer to stated 90 min)
2. **At 160 mL/hr**: 240mL takes exactly 90 minutes
3. **Protocol rate (83 mL/hr)**: Would take 173 minutes

### Possible Explanations:
1. The pump sheet may be using a modified protocol with doubled infusion rate
2. There might be a specific clinical reason for the faster infusion rate
3. The calculator may need an option to override protocol rates when specified

## Recommendations:
1. **Add flexibility** to the calculator to accept user-specified infusion rates
2. **Verify** with clinical staff if 166 mL/hr is a standard modification for ELFABRIO
3. **Consider adding** a note in the calculator when the calculated rate differs from protocol

## Overall Assessment:
The pump calculator logic is **mostly correct**. The main discrepancy is in the infusion rate, where the pump sheet uses a rate that's exactly double the standard protocol. All other calculations (drug volume, vial selection, overfill, removal volume) match perfectly.