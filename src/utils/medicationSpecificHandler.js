// Comprehensive medication-specific handler for infusion calculations

/**
 * Individual medication handlers with specific logic for each medication
 */

// ALDURAZYME - Laronidase
export const handleAldurazyme = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate, // Already in mL/hr
      conversionSteps: [`Using ALDURAZYME rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'preparation',
        icon: '🧪',
        title: 'Preparation',
        content: 'Remove overfill from NS bag. Final rate ~3 hrs at 200 µg/kg/hr'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'MPS I - Hurler, Scheie, & Hurler-Scheie ≥ 6 months old'
      }
    ],
    infusionPattern: 'weight-based-stepwise',
    maxRate: null,
    companionDrug: null
  };
};

// CEREZYME - Imiglucerase
export const handleCerezyme = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using CEREZYME rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'preparation',
        icon: '🧪',
        title: 'Reconstitution',
        content: 'Final concentration = 40 units/mL. Reconstitute 400U vial with 10.2mL, withdraw 10mL'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Gaucher disease'
      }
    ],
    infusionPattern: 'standard',
    maxRate: null,
    companionDrug: null
  };
};

// ELAPRASE - Idursulfase
export const handleElaprase = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using ELAPRASE rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'timing',
        icon: '⏰',
        title: 'Infusion Duration',
        content: 'Total infusion over 3 hrs (may reduce to 1 hr if tolerated); max 8 hrs if reactions'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'MPS II - Hunter Syndrome ≥16 months old'
      }
    ],
    infusionPattern: 'standard',
    maxRate: null,
    companionDrug: null
  };
};

// ELFABRIO - Pegunigalsidase alfa-iwxj
export const handleElfabrio = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate * 2, // Double as per clinical practice
      conversionSteps: [`ELFABRIO protocol: ${configRate} mL/hr × 2 = ${configRate * 2} mL/hr (clinical practice)`],
      finalRate: configRate * 2
    }),
    specialNotes: [
      {
        type: 'rate-adjustment',
        icon: '📈',
        title: 'Rate Calculation',
        content: 'Protocol rates are doubled as per clinical practice'
      },
      {
        type: 'timing',
        icon: '⏱️',
        title: 'Minimum Duration',
        content: 'Minimum infusion time: 1.5 hours'
      },
      {
        type: 'ert-status',
        icon: '👤',
        title: 'ERT Status Based',
        content: `Using ${inputs.ertStatus || 'ertNaive'} protocol rates`
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Fabry disease in adults'
      }
    ],
    infusionPattern: 'weight-and-ert-based',
    maxRate: null,
    companionDrug: null
  };
};

// ELELYSO - Taliglucerase alfa
export const handleElelyso = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using ELELYSO rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'preparation',
        icon: '🧪',
        title: 'Final Concentration',
        content: 'Final concentration = 200 units/5ml'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Gaucher disease'
      }
    ],
    infusionPattern: 'standard',
    maxRate: null,
    companionDrug: null
  };
};

// FABRAZYME - Agalsidase beta
export const handleFabrazyme = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using FABRAZYME rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'preparation',
        icon: '🧪',
        title: 'Final Concentration',
        content: 'Final concentration = 5mg/ml'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Fabry disease'
      }
    ],
    infusionPattern: 'standard',
    maxRate: null,
    companionDrug: null
  };
};

// KANUMA - Sebelipase alfa
export const handleKanuma = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using KANUMA rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Lysosomal acid lipase deficiency'
      }
    ],
    infusionPattern: 'standard',
    maxRate: null,
    companionDrug: null
  };
};

// LUMIZYME - Alglucosidase alfa
export const handleLumizyme = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => {
      if (medication.infusionSteps?.rateUnit === 'mg/kg/hr') {
        const drugConcentration = 5; // mg/mL for LUMIZYME
        const rateInMgPerHr = configRate * weight;
        const rateInMlPerHr = rateInMgPerHr / drugConcentration;
        
        return {
          rateInMlPerHr,
          conversionSteps: [
            `Converting ${configRate} mg/kg/hr × ${weight} kg = ${rateInMgPerHr} mg/hr`,
            `${rateInMgPerHr} mg/hr ÷ ${drugConcentration} mg/mL = ${rateInMlPerHr.toFixed(1)} mL/hr`
          ],
          finalRate: rateInMlPerHr
        };
      }
      return {
        rateInMlPerHr: configRate,
        conversionSteps: [`Using LUMIZYME rate directly: ${configRate} mL/hr`],
        finalRate: configRate
      };
    },
    specialNotes: [
      {
        type: 'duration',
        icon: '⏰',
        title: 'Infusion Duration',
        content: 'Step-wise infusion over 4 hours, max rate 7 mg/kg/hr'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Pompe disease'
      }
    ],
    infusionPattern: 'weight-based-stepwise',
    maxRate: '7 mg/kg/hr',
    companionDrug: null
  };
};

// NAGLAZYME - Galsulfase
export const handleNaglazyme = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using NAGLAZYME rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'infusion-pattern',
        icon: '📋',
        title: 'Infusion Pattern',
        content: 'Infuse 2.5% of total volume over 1st hour, remaining 97.5% over next 3 hours'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'MPS VI - Maroteaux-Lamy syndrome'
      }
    ],
    infusionPattern: 'weight-based-stepwise',
    maxRate: null,
    companionDrug: null
  };
};

// NEXVIAZYME - Avalglucosidase alfa
export const handleNexviazyme = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => {
      if (medication.infusionSteps?.rateUnit === 'mg/kg/hr') {
        const drugConcentration = 15; // mg/mL
        const rateInMgPerHr = configRate * weight;
        const rateInMlPerHr = rateInMgPerHr / drugConcentration;
        const halvedRate = rateInMlPerHr / 2; // Halve as per clinical practice
        
        return {
          rateInMlPerHr: halvedRate,
          conversionSteps: [
            `Converting ${configRate} mg/kg/hr × ${weight} kg = ${rateInMgPerHr} mg/hr`,
            `${rateInMgPerHr} mg/hr ÷ ${drugConcentration} mg/mL = ${rateInMlPerHr.toFixed(1)} mL/hr`,
            `NEXVIAZYME halving: ${rateInMlPerHr.toFixed(1)} ÷ 2 = ${halvedRate.toFixed(1)} mL/hr`
          ],
          finalRate: halvedRate
        };
      }
      return {
        rateInMlPerHr: configRate / 2,
        conversionSteps: [`NEXVIAZYME halving: ${configRate} ÷ 2 = ${configRate / 2} mL/hr`],
        finalRate: configRate / 2
      };
    },
    specialNotes: [
      {
        type: 'solution-warning',
        icon: '🧪',
        title: 'Solution Requirement',
        content: 'Use D5W throughout, not normal saline'
      },
      {
        type: 'rate-adjustment',
        icon: '📊',
        title: 'Rate Calculation',
        content: 'Protocol rates are halved as per clinical practice'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Pompe disease'
      }
    ],
    infusionPattern: 'weight-based-stepwise',
    maxRate: '7 mg/kg/hr',
    companionDrug: null
  };
};

// POMBILITI - Cipaglucosidase alfa
export const handlePombiliti = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate, // Already in mL/hr despite config saying mg/kg/hr
      conversionSteps: [`Using POMBILITI rate directly: ${configRate} mL/hr (no conversion needed)`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'companion-drug',
        icon: '💊',
        title: 'Companion Drug Required',
        content: 'Give miglustat 1 hour before infusion'
      },
      {
        type: 'companion-details',
        icon: '⚕️',
        title: 'Miglustat Dosing',
        content: 'Weight-based dosing: 65mg capsules, timing: 1 hour before infusion'
      },
      {
        type: 'infusion-note',
        icon: '⚠️',
        title: 'Important',
        content: 'Must be given with miglustat 1 hour before infusion'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Pompe disease with miglustat'
      }
    ],
    infusionPattern: 'weight-based-stepwise',
    maxRate: '7 mg/kg/hr',
    companionDrug: {
      name: 'miglustat',
      capsuleStrength: 65,
      dosing: 'weight-based',
      timing: '1 hour before infusion'
    }
  };
};

// VIMIZIM - Elosulfase alfa
export const handleVimizim = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using VIMIZIM rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'infusion-pattern',
        icon: '📋',
        title: 'Infusion Pattern',
        content: 'Graduated infusion with specific volume fractions per step'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'MPS IVA - Morquio A syndrome'
      }
    ],
    infusionPattern: 'weight-based-stepwise',
    maxRate: null,
    companionDrug: null
  };
};

// VPRIV - Velaglucerase alfa
export const handleVpriv = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using VPRIV rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'rate-limit',
        icon: '⚡',
        title: 'Rate Limit',
        content: '60-minute infusion, max rate 1 unit/kg/min'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: '0.2 or 0.22 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Gaucher disease'
      }
    ],
    infusionPattern: 'standard',
    maxRate: '1 unit/kg/min',
    companionDrug: null
  };
};

// XENPOZYME - Olipudase alfa
export const handleXenpozyme = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using XENPOZYME rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'complex-dosing',
        icon: '📊',
        title: 'Complex Dosing',
        content: 'Complex dose escalation protocol. Different schedules for pediatric vs adult'
      },
      {
        type: 'filter',
        icon: '🔬',
        title: 'Filter Required',
        content: 'Low-protein-binding 0.2 micron in-line filter'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'ASMD (acid sphingomyelinase deficiency)'
      }
    ],
    infusionPattern: 'standard',
    maxRate: null,
    companionDrug: null
  };
};

// CERDELGA - Eliglustat (oral)
export const handleCerdelga = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: 0,
      conversionSteps: ['Oral medication - no infusion rate applicable'],
      finalRate: 0
    }),
    specialNotes: [
      {
        type: 'oral-medication',
        icon: '💊',
        title: 'Oral Medication',
        content: 'This is an oral medication - no infusion required'
      },
      {
        type: 'dosing-info',
        icon: '⚕️',
        title: 'Dosing Information',
        content: 'Dosing based on CYP2D6 metabolizer status'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Gaucher disease type 1'
      }
    ],
    infusionPattern: 'oral',
    maxRate: null,
    companionDrug: null
  };
};

// ZAVESCA - Miglustat (oral)
export const handleZavesca = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: 0,
      conversionSteps: ['Oral medication - no infusion rate applicable'],
      finalRate: 0
    }),
    specialNotes: [
      {
        type: 'oral-medication',
        icon: '💊',
        title: 'Oral Medication',
        content: 'This is an oral medication - no infusion required'
      },
      {
        type: 'dosing-info',
        icon: '⚕️',
        title: 'Dosing Information',
        content: 'Reduce dose for renal impairment'
      },
      {
        type: 'indication',
        icon: '📋',
        title: 'Indication',
        content: 'Gaucher disease type 1, Niemann-Pick type C'
      }
    ],
    infusionPattern: 'oral',
    maxRate: null,
    companionDrug: null
  };
};

/**
 * Main medication handler dispatcher
 */
export const getMedicationHandler = (medicationName) => {
  const handlers = {
    'ALDURAZYME': handleAldurazyme,
    'CEREZYME': handleCerezyme,
    'ELAPRASE': handleElaprase,
    'ELFABRIO': handleElfabrio,
    'ELELYSO': handleElelyso,
    'FABRAZYME': handleFabrazyme,
    'KANUMA': handleKanuma,
    'LUMIZYME': handleLumizyme,
    'NAGLAZYME': handleNaglazyme,
    'NEXVIAZYME': handleNexviazyme,
    'POMBILITI': handlePombiliti,
    'VIMIZIM': handleVimizim,
    'VPRIV': handleVpriv,
    'XENPOZYME': handleXenpozyme,
    'CERDELGA': handleCerdelga,
    'ZAVESCA': handleZavesca
  };

  return handlers[medicationName] || handleGenericMedication;
};

// Generic handler for unknown medications
const handleGenericMedication = (inputs, medication, weight) => {
  return {
    rateCalculation: (configRate) => ({
      rateInMlPerHr: configRate,
      conversionSteps: [`Using rate directly: ${configRate} mL/hr`],
      finalRate: configRate
    }),
    specialNotes: [
      {
        type: 'general',
        icon: 'ℹ️',
        title: 'General Information',
        content: 'Standard infusion protocol'
      }
    ],
    infusionPattern: 'standard',
    maxRate: null,
    companionDrug: null
  };
};