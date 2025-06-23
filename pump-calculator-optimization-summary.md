# Pump Calculator Optimization Summary

## Changes Implemented

### 1. Updated pump-logic.json with new optimization rules:

- **Vial Optimization Rules:**
  - When multiple vial sizes are available, combine larger vials with smaller vials to minimize waste
  - Round down smaller remainders to avoid using additional vials for minimal amounts
  - Example: For 2.53 mg remainder when vials are 5mg and 10mg, do not add another vial

- **Volume Rounding Rules:**
  - Drug Volume: Round up to nearest 2.5 mL for volumes 10-50 mL, nearest 5 mL for volumes > 50 mL
  - Remove from Bag: Round up to nearest 5 mL for easier measurement
  - Examples: 47.5 mL drug volume → 50 mL, 77.5 mL removal → 80 mL

### 2. Updated calculateVials function with waste minimization logic:

- Implements a 30% threshold rule: if remainder is less than 30% of smallest vial, round down
- Automatically rounds drug volumes based on the rules in pump-logic.json
- Provides clear logging of optimization decisions

### 3. Updated calculateResults function to use rounded volumes:

- Uses rounded drug volume for all calculations
- Applies rounding to removal volumes (rounds up to nearest 5 mL)
- Maintains accuracy while improving practicality

### 4. Updated UI display:

- Shows rounded drug volume in preparation instructions
- Automatically calculates and displays rounded removal volume
- Provides clear visual feedback of optimized values

## Example Impact:

Previously: 47.5 mL drug volume + 30 mL overfill = 77.5 mL removal
Now: 50 mL drug volume + 30 mL overfill = 80 mL removal (rounded)

This prevents adding unnecessary vials for small remainders and makes measurements more practical for clinical use.