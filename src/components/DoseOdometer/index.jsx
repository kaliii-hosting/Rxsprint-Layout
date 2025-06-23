import React, { useMemo, useEffect, useState } from 'react';
import './DoseOdometer.css';

const DoseOdometer = ({ 
  currentDose, 
  doseUnit, 
  medication, 
  patientWeight,
  isCalculated = false 
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  // Calculate dose ranges based on medication
  const doseRanges = useMemo(() => {
    if (!medication || !medication.standardDose) {
      return null;
    }

    const standardDose = medication.standardDose.value;
    const unit = medication.standardDose.unit;
    
    // Define ranges based on percentage of standard dose
    // Low: < 90% of standard
    // Optimal: 90% - 110% of standard  
    // High: > 110% of standard
    let ranges = {
      min: 0,
      low: standardDose * 0.9,
      optimal: standardDose,
      high: standardDose * 1.1,
      max: standardDose * 1.5,
      unit: unit
    };

    // Special handling for specific medications
    if (medication.brandName === 'XENPOZYME' && medication.standardDose.escalationSchedule) {
      // For dose escalation medications, adjust ranges
      const minDose = 0.03; // Starting dose
      const maxDose = 3; // Maximum dose
      ranges = {
        min: 0,
        low: minDose,
        optimal: medication.standardDose.maintenanceDose || 1,
        high: maxDose * 0.9,
        max: maxDose,
        unit: unit
      };
    } else if (medication.infusionSteps?.rechallenge) {
      // For medications with rechallenge protocols (like FABRAZYME)
      ranges.low = medication.infusionSteps.rechallenge.dose * 0.9;
      ranges.optimal = standardDose;
      ranges.high = standardDose * 1.1;
    } else if (medication.specialDosing?.includes('Fixed doses')) {
      // For fixed-dose medications, tighter ranges
      ranges.low = standardDose * 0.95;
      ranges.high = standardDose * 1.05;
    }

    // Handle unit conversions if needed
    if (medication.vialSizes && medication.vialSizes[0]?.unit === 'units' && unit === 'units/kg') {
      // Units-based medications may have different acceptable ranges
      ranges.low = standardDose * 0.85;
      ranges.high = standardDose * 1.15;
    }

    return ranges;
  }, [medication]);

  // Animate value on change
  useEffect(() => {
    if (currentDose !== undefined && currentDose !== null) {
      const timer = setTimeout(() => {
        setAnimatedValue(currentDose);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentDose]);

  // Calculate position on gauge (0-180 degrees)
  const calculatePosition = useMemo(() => {
    if (!doseRanges || !animatedValue) return 0;
    
    // Convert dose to match medication's standard unit for comparison
    let compareValue = animatedValue;
    const standardUnit = medication?.standardDose?.unit;
    
    // Apply same conversion logic for accurate positioning
    if ((doseUnit === 'mg' || doseUnit === 'units') && 
        (standardUnit === 'mg/kg' || standardUnit === 'units/kg') && 
        patientWeight) {
      compareValue = animatedValue / patientWeight;
    } else if ((doseUnit === 'mg/kg' || doseUnit === 'units/kg') && 
               (standardUnit === 'mg' || standardUnit === 'units') && 
               patientWeight) {
      compareValue = animatedValue * patientWeight;
    }
    
    const { min, max } = doseRanges;
    const range = max - min;
    const normalized = (compareValue - min) / range;
    const position = Math.min(Math.max(normalized, 0), 1) * 180;
    
    return position;
  }, [animatedValue, doseRanges, doseUnit, medication, patientWeight]);

  // Determine dose status
  const doseStatus = useMemo(() => {
    if (!doseRanges || !animatedValue) return 'none';
    
    // Convert dose to match medication's standard unit for comparison
    let compareValue = animatedValue;
    const standardUnit = medication?.standardDose?.unit;
    
    // Apply same conversion logic as displayDose for accurate comparison
    if ((doseUnit === 'mg' || doseUnit === 'units') && 
        (standardUnit === 'mg/kg' || standardUnit === 'units/kg') && 
        patientWeight) {
      compareValue = animatedValue / patientWeight;
    } else if ((doseUnit === 'mg/kg' || doseUnit === 'units/kg') && 
               (standardUnit === 'mg' || standardUnit === 'units') && 
               patientWeight) {
      compareValue = animatedValue * patientWeight;
    }
    
    const { low, high } = doseRanges;
    
    if (compareValue < low) return 'low';
    if (compareValue > high) return 'high';
    return 'optimal';
  }, [animatedValue, doseRanges, doseUnit, medication, patientWeight]);

  // Convert dose based on unit if needed
  const displayDose = useMemo(() => {
    if (!animatedValue) return 0;
    
    // Convert to match medication's standard unit for comparison
    let convertedDose = animatedValue;
    const standardUnit = medication?.standardDose?.unit;
    
    // If dose is in total units but standard is per kg, convert
    if ((doseUnit === 'mg' || doseUnit === 'units') && 
        (standardUnit === 'mg/kg' || standardUnit === 'units/kg') && 
        patientWeight) {
      convertedDose = animatedValue / patientWeight;
    }
    
    // If dose is per kg but standard is total, convert
    if ((doseUnit === 'mg/kg' || doseUnit === 'units/kg') && 
        (standardUnit === 'mg' || standardUnit === 'units') && 
        patientWeight) {
      convertedDose = animatedValue * patientWeight;
    }
    
    // If dose is in mg/mL, treat as concentration (special case)
    if (doseUnit === 'mg/mL') {
      // For concentration, we typically want to show the dose per kg
      if (standardUnit === 'mg/kg' && patientWeight) {
        // This would need total volume to calculate properly
        // For now, show as is
        convertedDose = animatedValue;
      }
    }
    
    // Format based on value size
    if (convertedDose < 0.1) {
      return convertedDose.toFixed(3);
    } else if (convertedDose < 10) {
      return convertedDose.toFixed(2);
    } else if (convertedDose < 100) {
      return convertedDose.toFixed(1);
    } else {
      return Math.round(convertedDose).toString();
    }
  }, [animatedValue, doseUnit, medication, patientWeight]);

  if (!medication || !doseRanges) {
    return (
      <div className="dose-odometer-container">
        <div className="odometer-loading">
          Select a medication to view dose range
        </div>
      </div>
    );
  }

  const radius = 70;
  const strokeWidth = 20;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;

  // Calculate stroke dash arrays for zones
  const lowZone = (doseRanges.low / doseRanges.max) * circumference;
  const optimalZone = ((doseRanges.high - doseRanges.low) / doseRanges.max) * circumference;
  const highZone = ((doseRanges.max - doseRanges.high) / doseRanges.max) * circumference;

  // Calculate indicator position
  const indicatorDashArray = `${(calculatePosition / 180) * circumference} ${circumference}`;

  return (
    <div className="dose-odometer-container">
      <h4 className="dose-odometer-title">Dose Range Indicator</h4>
      
      <div className="odometer-wrapper">
        <svg className="odometer-svg" viewBox="0 0 160 160">
          {/* Background arc */}
          <path
            className="odometer-background"
            d={`M ${80 - normalizedRadius} 80 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${80 + normalizedRadius} 80`}
          />
          
          {/* Zone arcs */}
          <path
            className="odometer-zone-low"
            d={`M ${80 - normalizedRadius} 80 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${80 + normalizedRadius} 80`}
            strokeDasharray={`${lowZone} ${circumference}`}
          />
          
          <path
            className="odometer-zone-optimal"
            d={`M ${80 - normalizedRadius} 80 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${80 + normalizedRadius} 80`}
            strokeDasharray={`${optimalZone} ${circumference}`}
            strokeDashoffset={-lowZone}
          />
          
          <path
            className="odometer-zone-high"
            d={`M ${80 - normalizedRadius} 80 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${80 + normalizedRadius} 80`}
            strokeDasharray={`${highZone} ${circumference}`}
            strokeDashoffset={-(lowZone + optimalZone)}
          />
          
          {/* Indicator */}
          {isCalculated && (
            <path
              className={`odometer-indicator ${doseStatus}`}
              d={`M ${80 - normalizedRadius} 80 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${80 + normalizedRadius} 80`}
              strokeDasharray={indicatorDashArray}
            />
          )}
        </svg>
        
        {/* Center display */}
        <div className="odometer-center">
          <p className={`odometer-value ${doseStatus}`}>
            {isCalculated ? displayDose : '--'}
          </p>
          <span className="odometer-unit">{medication.standardDose.unit}</span>
          {isCalculated && (
            <div className={`odometer-status ${doseStatus}`}>
              {doseStatus === 'low' && 'Below Range'}
              {doseStatus === 'optimal' && 'Optimal'}
              {doseStatus === 'high' && 'Above Range'}
            </div>
          )}
        </div>
        
        {/* Scale labels */}
        <div className="odometer-labels">
          <span className="odometer-label min">{doseRanges.min}</span>
          <span className="odometer-label optimal">{doseRanges.optimal}</span>
          <span className="odometer-label max">{doseRanges.max}</span>
        </div>
      </div>
      
      {/* Range information */}
      <div className="odometer-ranges">
        <div className="range-item">
          <span className="range-label">Low Range</span>
          <span className="range-value low">
            &lt; {doseRanges.low.toFixed(2)} {doseRanges.unit}
          </span>
        </div>
        <div className="range-item">
          <span className="range-label">Optimal Range</span>
          <span className="range-value optimal">
            {doseRanges.low.toFixed(2)} - {doseRanges.high.toFixed(2)} {doseRanges.unit}
          </span>
        </div>
        <div className="range-item">
          <span className="range-label">High Range</span>
          <span className="range-value high">
            &gt; {doseRanges.high.toFixed(2)} {doseRanges.unit}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DoseOdometer;