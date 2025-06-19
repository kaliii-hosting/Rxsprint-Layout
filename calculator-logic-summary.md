# Infusion Pump Calculator - Standardized Logic Summary

## Key Fixes Applied

### 1. **Configuration Updates**
- **ELFABRIO**: Changed strength from 20/5 to 2 mg/mL (concentration)
- **KANUMA**: Changed strength from 20 to 2 mg/mL (concentration)
- All solution medications now use concentration (mg/mL) for strength field

### 2. **Standardized Calculation Rules**

#### A. **Vial Combination Logic**
- **Solution medications**: 
  - Strength = concentration (mg/mL)
  - Drug volume = total volume of vials used
  - Optimize for minimum vial count
  
- **Lyophilized medications**:
  - Strength = total mg/units per vial
  - Drug volume = sum of reconstitution volumes
  - Use largest vials first to minimize waste

#### B. **Overfill Calculation**
Standard rules applied consistently:
- 50mL bag → 5mL overfill
- 100mL bag → 7mL overfill
- 150mL bag → 25mL overfill
- 250mL bag → 30mL overfill
- 500mL bag → 40mL overfill
- 1000mL bag → 60mL overfill

#### C. **Removal Volume**
- Standard: Drug volume + Overfill
- Exception: Check for "DO NOT remove" instructions (e.g., ELAPRASE)

#### D. **Infusion Rate**
- If user specifies time: Calculate rate from volume/time
- Otherwise: Use medication protocol
- Format rates for pump display (max 3 digits with decimal)

## Implementation in Calculator

The calculator should:

1. **Identify medication type** (solution vs lyophilized)
2. **Calculate vials needed** based on type
3. **Determine drug volume** correctly:
   - Solution: Total vial volume used
   - Lyophilized: Total reconstitution volume
4. **Apply overfill rules** consistently
5. **Calculate removal volume** with special instruction checks
6. **Generate infusion steps** based on user input or protocol

## Testing Results

✅ **Working correctly:**
- ELFABRIO: 100mg → 50mL drug volume, 80mL removal
- Overfill calculations for all bag sizes
- Special instructions (DO NOT remove)
- Medication-specific overrides

⚠️ **Notes:**
- Infusion rates may need user override option (e.g., ELFABRIO 166 vs 83 mL/hr)
- Some medications may have specific clinical protocols not in config

## Next Steps

1. Apply the standardized logic to the main calculator component
2. Ensure all solution medications have correct concentration values
3. Add option for user to override protocol infusion rates
4. Test with various patient weights and doses