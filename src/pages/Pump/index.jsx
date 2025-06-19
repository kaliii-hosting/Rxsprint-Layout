import React from 'react';
import InfusionPumpCalculator from '../../components/InfusionPumpCalculator';
import './Pump.css';

const Pump = () => {
  return (
    <div className="pump-page">
      <InfusionPumpCalculator />
    </div>
  );
};

export default Pump;