// Enhanced Medication Data Model for Pump Calculator Integration
export const medicationDataModel = {
  // Basic Information
  brandName: '',
  genericName: '',
  indication: '',
  medicationCode: '',
  
  // Dosage Information
  dosageForm: '', // 'solution', 'lyophilized', 'oral'
  standardDose: {
    value: null,
    unit: '', // 'mg/kg', 'units/kg', etc.
    frequency: '', // 'weekly', 'every 2 weeks', etc.
    range: {
      min: null,
      max: null
    }
  },
  
  // Special Dosing Scenarios
  specialDosing: {
    rapidlyProgressing: {
      enabled: false,
      value: null,
      unit: '',
      frequency: '',
      infantDosing: {
        age: '',
        frequency: ''
      }
    },
    doseEscalation: {
      enabled: false,
      schedule: [] // Array of {dose, infusion, maintenance}
    },
    rechallengeProtocol: {
      enabled: false,
      dose: null,
      startRate: null,
      rateIncrease: '',
      maxRate: null,
      unit: '',
      indication: ''
    },
    metabolizerBased: {
      enabled: false,
      types: {} // e.g., extensiveIntermediate, poorMetabolizers
    }
  },
  
  // Vial Information
  vialSizes: [], // Array of vial configurations
  /*
  For solutions: {
    strength: number,
    volume: number,
    unit: 'mg/ml'
  }
  For lyophilized: {
    strength: number,
    unit: 'mg' or 'units',
    reconstitutionVolume: number,
    reconstitutionSolution: string,
    finalVolume: number,
    finalConcentration: number,
    withdrawVolume: number
  }
  */
  
  // Saline Bag Rules
  salineBagRules: {
    type: '', // 'weightBased', 'weightAndDoseBased', 'ageBasedPediatric', 'default'
    specialInstructions: '', // e.g., "D5W only", "DO NOT remove drug volume"
    rules: [] // Array of rules based on type
  },
  
  // Infusion Configuration
  infusionSteps: {
    type: '', // 'weightBased', 'standard', 'doseDependent', 'ertStatus', 'ageBased'
    minDuration: null, // minutes
    maxDuration: null,
    toleratedDuration: null,
    maxRate: null,
    rateUnit: '', // 'ml/hr', 'mg/kg/hr', 'mg/hr'
    steps: {} // Configuration varies by type
  },
  
  // Preparation Instructions
  preparationInstructions: {
    ivBagSize: '',
    overallVolume: '',
    drugVolume: '',
    removeFromBag: '',
    finalVolume: '',
    overfillOverride: null,
    specialNotes: []
  },
  
  // Additional Requirements
  filter: '',
  flushSolution: '', // e.g., "D5W" or "Normal Saline"
  primeVolume: null, // Override default if needed
  companionDrug: {
    enabled: false,
    name: '',
    capsuleStrength: null,
    dosing: '',
    timing: ''
  },
  
  // Special Notes and Warnings
  notes: '',
  warnings: [],
  concentrationRange: {
    min: null,
    max: null,
    unit: 'mg/ml'
  },
  
  // Administration Route
  administrationRoute: 'iv', // 'iv', 'oral', 'subcutaneous'
  
  // Pump-specific Settings
  pumpSettings: {
    requiresSpecialProgramming: false,
    programmingNotes: [],
    warmUpPhase: false,
    repeatRxOption: false
  }
};

// Helper function to get medication template
export const getMedicationTemplate = () => {
  return JSON.parse(JSON.stringify(medicationDataModel));
};

// Validation rules for medication data
export const medicationValidationRules = {
  required: ['brandName', 'dosageForm', 'standardDose.value', 'standardDose.unit'],
  conditionalRequired: {
    lyophilized: ['vialSizes[].reconstitutionVolume', 'vialSizes[].reconstitutionSolution'],
    solution: ['vialSizes[].volume', 'vialSizes[].strength'],
    weightBased: ['salineBagRules.rules'],
    infusionSteps: ['infusionSteps.type', 'infusionSteps.steps']
  }
};

// Map existing medication fields to new structure
export const mapLegacyMedicationData = (legacyData) => {
  const mapped = getMedicationTemplate();
  
  // Basic fields
  mapped.brandName = legacyData.brandName || '';
  mapped.genericName = legacyData.genericName || '';
  mapped.indication = legacyData.indication || '';
  mapped.medicationCode = legacyData.medicationCode || '';
  mapped.dosageForm = legacyData.dosageForm || '';
  mapped.notes = legacyData.notes || '';
  mapped.filter = legacyData.filter || '';
  
  // Parse dose information
  if (legacyData.dose) {
    const doseMatch = legacyData.dose.match(/(\d+(?:\.\d+)?)\s*(mg\/kg|units\/kg|mg|units)/i);
    if (doseMatch) {
      mapped.standardDose.value = parseFloat(doseMatch[1]);
      mapped.standardDose.unit = doseMatch[2].toLowerCase();
    }
  }
  
  // Parse dose frequency
  if (legacyData.doseFrequency) {
    mapped.standardDose.frequency = legacyData.doseFrequency;
  }
  
  // Parse vial sizes
  if (legacyData.vialSize) {
    const vialData = parseVialSize(legacyData.vialSize, mapped.dosageForm);
    if (vialData) {
      mapped.vialSizes.push(vialData);
    }
  }
  
  // Parse reconstitution data
  if (legacyData.reconstitutionVolume) {
    const volume = parseFloat(legacyData.reconstitutionVolume);
    if (!isNaN(volume) && mapped.vialSizes.length > 0) {
      mapped.vialSizes[0].reconstitutionVolume = volume;
    }
  }
  
  if (legacyData.reconstitutionSolution) {
    if (mapped.vialSizes.length > 0) {
      mapped.vialSizes[0].reconstitutionSolution = legacyData.reconstitutionSolution;
    }
  }
  
  // Parse saline bag rules
  if (legacyData.normalSalineBag) {
    const bagData = parseSalineBagRules(legacyData.normalSalineBag);
    if (bagData) {
      mapped.salineBagRules = bagData;
    }
  }
  
  // Parse infusion steps
  if (legacyData.infusionSteps) {
    const stepsData = parseInfusionSteps(legacyData.infusionSteps);
    if (stepsData) {
      mapped.infusionSteps = stepsData;
    }
  }
  
  // Parse overfill rules
  if (legacyData.overfillRule) {
    const overfill = parseFloat(legacyData.overfillRule);
    if (!isNaN(overfill)) {
      mapped.preparationInstructions.overfillOverride = overfill;
    }
  }
  
  // Parse special dosing
  if (legacyData.specialDosing) {
    mapped.specialDosing = parseSpecialDosing(legacyData.specialDosing);
  }
  
  return mapped;
};

// Helper parsing functions
function parseVialSize(vialSizeStr, dosageForm) {
  if (!vialSizeStr) return null;
  
  const vial = {};
  
  if (dosageForm === 'solution') {
    // Parse solution format: "6mg/3mL"
    const match = vialSizeStr.match(/(\d+(?:\.\d+)?)\s*mg\s*\/\s*(\d+(?:\.\d+)?)\s*mL/i);
    if (match) {
      vial.strength = parseFloat(match[1]) / parseFloat(match[2]); // mg/mL
      vial.volume = parseFloat(match[2]);
      vial.unit = 'mg/ml';
    }
  } else if (dosageForm === 'lyophilized') {
    // Parse powder format: "400 units" or "50mg"
    const match = vialSizeStr.match(/(\d+(?:\.\d+)?)\s*(mg|units)/i);
    if (match) {
      vial.strength = parseFloat(match[1]);
      vial.unit = match[2].toLowerCase();
    }
  }
  
  return Object.keys(vial).length > 0 ? vial : null;
}

function parseSalineBagRules(bagRulesStr) {
  if (!bagRulesStr) return null;
  
  const rules = {
    type: 'default',
    rules: []
  };
  
  // Check for weight-based rules
  if (bagRulesStr.includes('kg')) {
    rules.type = 'weightBased';
    // Parse weight ranges and bag sizes
    const matches = bagRulesStr.matchAll(/(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)\s*kg[^:]*:\s*(\d+)\s*mL/gi);
    for (const match of matches) {
      rules.rules.push({
        minWeight: parseFloat(match[1]),
        maxWeight: parseFloat(match[2]),
        bagSize: parseInt(match[3])
      });
    }
  } else {
    // Simple bag size
    const match = bagRulesStr.match(/(\d+)\s*mL/i);
    if (match) {
      rules.defaultBagSize = parseInt(match[1]);
    }
  }
  
  return rules;
}

function parseInfusionSteps(stepsStr) {
  if (!stepsStr) return null;
  
  const infusion = {
    type: 'standard',
    steps: []
  };
  
  // Check for weight-based steps
  if (stepsStr.includes('kg:')) {
    infusion.type = 'weightBased';
    infusion.steps = {}; // Will be object with weight ranges as keys
  }
  
  // Parse step patterns
  const stepMatches = stepsStr.matchAll(/step\s*(\d+)[^:]*:\s*(\d+(?:\.\d+)?)\s*(mL\/hr|mg\/hr|mg\/kg\/hr)[^,]*(,\s*(\d+)\s*min)?/gi);
  for (const match of stepMatches) {
    const step = {
      step: parseInt(match[1]),
      rate: parseFloat(match[2]),
      rateUnit: match[3],
      duration: match[5] ? parseInt(match[5]) : 'remainder'
    };
    
    if (infusion.type === 'standard') {
      infusion.steps.push(step);
    }
  }
  
  return infusion;
}

function parseSpecialDosing(specialDosingStr) {
  const special = {
    rapidlyProgressing: { enabled: false },
    doseEscalation: { enabled: false },
    rechallengeProtocol: { enabled: false },
    metabolizerBased: { enabled: false }
  };
  
  if (!specialDosingStr) return special;
  
  // Check for dose escalation
  if (specialDosingStr.includes('escalation') || specialDosingStr.includes('titration')) {
    special.doseEscalation.enabled = true;
  }
  
  // Check for rapidly progressing
  if (specialDosingStr.includes('rapidly progressing')) {
    special.rapidlyProgressing.enabled = true;
  }
  
  return special;
}

export default medicationDataModel;