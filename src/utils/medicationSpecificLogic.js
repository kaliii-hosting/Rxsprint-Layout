// Medication-specific logic handler

/**
 * Get medication-specific rate calculation logic
 * @param {string} medicationName - Name of the medication
 * @param {number} configRate - Rate from configuration
 * @param {number} patientWeight - Patient weight in kg
 * @param {string} ertStatus - ERT status for applicable medications
 * @param {Object} medication - Full medication object from config
 * @returns {Object} - Processed rate information
 */
export const calculateMedicationSpecificRate = (medicationName, configRate, patientWeight, ertStatus, medication) => {
  const result = {
    rateInMlPerHr: configRate,
    conversionSteps: [],
    specialNotes: []
  };

  switch (medicationName) {
    case 'POMBILITI':
      // POMBILITI rates are already in mL/hr - use directly
      result.rateInMlPerHr = configRate;
      result.conversionSteps.push(`Using POMBILITI rate directly: ${configRate} mL/hr (no conversion needed)`);
      break;

    case 'ELFABRIO':
      // ELFABRIO: Double the protocol rates as per clinical practice
      result.rateInMlPerHr = configRate * 2;
      result.conversionSteps.push(`ELFABRIO protocol: ${configRate} mL/hr × 2 = ${result.rateInMlPerHr} mL/hr (clinical practice)`);
      break;

    case 'NEXVIAZYME':
      // NEXVIAZYME: Convert mg/kg/hr to mL/hr, then halve
      if (medication.infusionSteps?.rateUnit === 'mg/kg/hr') {
        const drugConcentration = 15; // mg/mL after reconstitution
        const rateInMgPerHr = configRate * patientWeight;
        const rateInMlPerHr = rateInMgPerHr / drugConcentration;
        result.rateInMlPerHr = rateInMlPerHr / 2; // Halve as per clinical practice
        
        result.conversionSteps.push(`Converting ${configRate} mg/kg/hr × ${patientWeight} kg = ${rateInMgPerHr} mg/hr`);
        result.conversionSteps.push(`${rateInMgPerHr} mg/hr ÷ ${drugConcentration} mg/mL = ${rateInMlPerHr.toFixed(1)} mL/hr`);
        result.conversionSteps.push(`NEXVIAZYME halving: ${rateInMlPerHr.toFixed(1)} ÷ 2 = ${result.rateInMlPerHr.toFixed(1)} mL/hr`);
      } else {
        result.rateInMlPerHr = configRate / 2;
        result.conversionSteps.push(`NEXVIAZYME halving: ${configRate} ÷ 2 = ${result.rateInMlPerHr} mL/hr`);
      }
      break;

    case 'LUMIZYME':
      // LUMIZYME: Convert mg/kg/hr to mL/hr
      if (medication.infusionSteps?.rateUnit === 'mg/kg/hr') {
        const drugConcentration = 5; // mg/mL for LUMIZYME
        const rateInMgPerHr = configRate * patientWeight;
        result.rateInMlPerHr = rateInMgPerHr / drugConcentration;
        
        result.conversionSteps.push(`Converting ${configRate} mg/kg/hr × ${patientWeight} kg = ${rateInMgPerHr} mg/hr`);
        result.conversionSteps.push(`${rateInMgPerHr} mg/hr ÷ ${drugConcentration} mg/mL = ${result.rateInMlPerHr.toFixed(1)} mL/hr`);
      }
      break;

    default:
      // Standard handling for other medications
      if (medication.infusionSteps?.rateUnit === 'mg/kg/hr') {
        // Generic mg/kg/hr conversion
        const drugConcentration = getDrugConcentration(medicationName, medication);
        const rateInMgPerHr = configRate * patientWeight;
        result.rateInMlPerHr = rateInMgPerHr / drugConcentration;
        
        result.conversionSteps.push(`Converting ${configRate} mg/kg/hr × ${patientWeight} kg = ${rateInMgPerHr} mg/hr`);
        result.conversionSteps.push(`${rateInMgPerHr} mg/hr ÷ ${drugConcentration} mg/mL = ${result.rateInMlPerHr.toFixed(1)} mL/hr`);
      } else {
        // Rate already in mL/hr
        result.rateInMlPerHr = configRate;
        result.conversionSteps.push(`Using rate directly: ${configRate} mL/hr`);
      }
      break;
  }

  return result;
};

/**
 * Get drug concentration for conversion calculations
 */
const getDrugConcentration = (medicationName, medication) => {
  // Default concentrations for known medications
  const concentrations = {
    'POMBILITI': 15, // mg/mL
    'NEXVIAZYME': 15, // mg/mL  
    'LUMIZYME': 5, // mg/mL
    'ALDURAZYME': 2.9, // mg/mL
    'NAGLAZYME': 1, // mg/mL
    'VIMIZIM': 1 // mg/mL
  };

  return concentrations[medicationName] || 15; // Default fallback
};

/**
 * Get medication-specific special notes and instructions
 * @param {string} medicationName - Name of the medication
 * @param {Object} medication - Full medication object from config
 * @param {Object} inputs - Current form inputs
 * @returns {Array} - Array of special notes
 */
export const getMedicationSpecialNotes = (medicationName, medication, inputs = {}) => {
  const notes = [];

  switch (medicationName) {
    case 'POMBILITI':
      if (medication.companionDrug) {
        notes.push({
          type: 'companion-drug',
          icon: '💊',
          title: 'Companion Drug Required',
          content: `Give ${medication.companionDrug.name} ${medication.companionDrug.timing}`
        });
      }
      notes.push({
        type: 'infusion-note',
        icon: '⚠️',
        title: 'Important',
        content: 'Must be given with miglustat 1 hour before infusion'
      });
      break;

    case 'NEXVIAZYME':
      notes.push({
        type: 'solution-warning',
        icon: '🧪',
        title: 'Solution Requirement',
        content: 'Use D5W throughout, not normal saline'
      });
      notes.push({
        type: 'rate-adjustment',
        icon: '📊',
        title: 'Rate Calculation',
        content: 'Protocol rates are halved as per clinical practice'
      });
      break;

    case 'ELFABRIO':
      notes.push({
        type: 'rate-adjustment',
        icon: '📈',
        title: 'Rate Calculation',
        content: 'Protocol rates are doubled as per clinical practice'
      });
      notes.push({
        type: 'timing',
        icon: '⏱️',
        title: 'Minimum Duration',
        content: 'Minimum infusion time: 1.5 hours'
      });
      if (inputs.ertStatus) {
        notes.push({
          type: 'ert-status',
          icon: '👤',
          title: 'ERT Status',
          content: `Using ${inputs.ertStatus} protocol rates`
        });
      }
      break;

    case 'LUMIZYME':
      notes.push({
        type: 'duration',
        icon: '⏰',
        title: 'Infusion Duration',
        content: 'Step-wise infusion over 4 hours, max rate 7 mg/kg/hr'
      });
      break;

    case 'NAGLAZYME':
      notes.push({
        type: 'infusion-pattern',
        icon: '📋',
        title: 'Infusion Pattern',
        content: 'Infuse 2.5% of total volume over 1st hour, remaining 97.5% over next 3 hours'
      });
      break;

    case 'VIMIZIM':
      notes.push({
        type: 'infusion-pattern',
        icon: '📋',
        title: 'Infusion Pattern',
        content: 'Graduated infusion with specific volume fractions per step'
      });
      break;

    case 'ELAPRASE':
      notes.push({
        type: 'timing',
        icon: '⏰',
        title: 'Infusion Duration',
        content: 'Total infusion over 3 hrs (may reduce to 1 hr if tolerated); max 8 hrs if reactions'
      });
      break;

    case 'VPRIV':
      notes.push({
        type: 'rate-limit',
        icon: '⚡',
        title: 'Rate Limit',
        content: '60-minute infusion, max rate 1 unit/kg/min'
      });
      break;

    case 'XENPOZYME':
      notes.push({
        type: 'complex-dosing',
        icon: '📊',
        title: 'Complex Dosing',
        content: 'Complex dose escalation protocol. Different schedules for pediatric vs adult'
      });
      break;

    case 'CERDELGA':
    case 'ZAVESCA':
      notes.push({
        type: 'oral-medication',
        icon: '💊',
        title: 'Oral Medication',
        content: 'This is an oral medication - no infusion required'
      });
      break;
  }

  // Add filter requirement for all medications that have it
  if (medication.filter) {
    notes.push({
      type: 'filter',
      icon: '🔬',
      title: 'Filter Requirement',
      content: medication.filter
    });
  }

  // Add overfill override note if present
  if (medication.preparationInstructions?.overfillOverride) {
    notes.push({
      type: 'overfill',
      icon: '📏',
      title: 'Overfill Override',
      content: `Use ${medication.preparationInstructions.overfillOverride}mL overfill instead of standard`
    });
  }

  // Add any general notes from config
  if (medication.notes) {
    notes.push({
      type: 'general',
      icon: 'ℹ️',
      title: 'Additional Notes',
      content: medication.notes
    });
  }

  return notes;
};

/**
 * Get medication-specific infusion step handling
 * @param {string} medicationName - Name of the medication
 * @param {Object} medication - Full medication object from config
 * @param {number} patientWeight - Patient weight in kg
 * @param {string} ertStatus - ERT status
 * @returns {Object} - Infusion step configuration
 */
export const getMedicationInfusionConfig = (medicationName, medication, patientWeight, ertStatus) => {
  const config = {
    needsSpecialHandling: false,
    rateUnit: medication.infusionSteps?.rateUnit || 'mL/hr',
    maxRate: medication.infusionSteps?.maxRate,
    specialInstructions: []
  };

  switch (medicationName) {
    case 'POMBILITI':
      config.needsSpecialHandling = true;
      config.rateUnit = 'mL/hr'; // Override the config's mg/kg/hr
      config.specialInstructions.push('Rates are pre-converted to mL/hr');
      break;

    case 'ELFABRIO':
      config.needsSpecialHandling = true;
      config.specialInstructions.push('Requires weight AND ERT status selection');
      config.specialInstructions.push('Protocol rates are doubled for clinical use');
      break;

    case 'NEXVIAZYME':
      config.needsSpecialHandling = true;
      config.specialInstructions.push('Protocol rates are halved for clinical use');
      break;

    case 'LUMIZYME':
      config.specialInstructions.push('Complex weight-based step progression');
      break;
  }

  return config;
};