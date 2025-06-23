import React from 'react';
import RedesignedPumpCalculator from '../../components/InfusionPumpCalculator/RedesignedPumpCalculator';
import './Pump.css';

const Pump = () => {
  return (
    <div className="pump-page page-container">
      <RedesignedPumpCalculator />
    </div>
  );
};

export default Pump;