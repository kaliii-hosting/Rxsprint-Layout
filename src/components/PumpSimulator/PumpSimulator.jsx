import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './PumpSimulator.css';

const PumpSimulator = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [pumpState, setPumpState] = useState({
    isOn: false,
    currentScreen: 'off',
    menuIndex: 0,
    fieldIndex: 0,
    editMode: false,
    editValue: '',
    currentTherapy: null,
    helpMenuIndex: 0,
    primeMenuIndex: 0,
    powerButtonHoldTime: 0,
    powerButtonTimer: null,
    biomedMenuIndex: 0,
    optionsMenuIndex: 0,
    lockLevel: 'LL0',
    
    therapies: {
      continuous: {
        units: 'mL',
        concentration: '',
        delay: false,
        delayTime: '',
        delayDate: '',
        medLimitsOn: false,
        maxRate: '',
        prescription: {
          bagVolume: '',
          rate: '',
          vtbi: '',
          time: '',
          kvoRate: '0.1'
        }
      },
      pca: {
        units: 'mg',
        concentration: '1.0',
        adminRoute: 'IV',
        loadDose: '0',
        medLimitsOn: false,
        maxRate: '',
        deltaRate: '',
        deltaTime: '',
        maxBolus: '',
        minInterval: '',
        bolusPerHour: '',
        prescription: {
          bagVolume: '',
          basalRate: '',
          patientBolus: '',
          bolusInterval: '',
          bolusPerHour: ''
        }
      },
      intermittent: {
        units: 'mL',
        concentration: '',
        delay: false,
        prescription: {
          bagVolume: '',
          amountPerDose: '',
          doseRate: '',
          doseDuration: '',
          doseFrequency: '',
          kvoRate: '0.1',
          dosesPerBag: '',
          totalTime: ''
        }
      },
      tpn: {
        delay: false,
        prescription: {
          bagVolume: '',
          volumeTBI: '',
          infusionRate: '',
          upRamp: '0',
          downRamp: '0',
          totalTime: '',
          kvoRate: '0.1'
        }
      },
      variable: {
        units: 'mL',
        concentration: '',
        delay: false,
        prescription: {
          bagVolume: '',
          numDoses: '',
          kvoRate: '0.1',
          doses: []
        }
      }
    },
    
    isRunning: false,
    isPaused: false,
    isPriming: false,
    
    infusionData: {
      volumeInfused: 0,
      targetVolume: 0,
      currentRate: 0,
      timeRemaining: 0,
      currentDose: 1,
      totalDoses: 1
    },
    
    settings: {
      airSensitivity: '0.5',
      downOcclusion: 'LOW'
    }
  });

  const powerButtonTimerRef = useRef(null);
  const infusionIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      if (powerButtonTimerRef.current) {
        clearInterval(powerButtonTimerRef.current);
      }
      if (infusionIntervalRef.current) {
        clearInterval(infusionIntervalRef.current);
      }
    };
  }, [isOpen]);

  const renderScreen = () => {
    if (!pumpState.isOn) {
      return '';
    }
    
    let content = '';
    
    switch (pumpState.currentScreen) {
      case 'startup':
        return (
          <>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>MOOG MEDICAL</div>
            <div style={{ fontSize: '14px' }}>Safely Managing<br/>Infusion<br/>...and Information</div>
          </>
        );
        
      case 'mainMenu':
        return (
          <>
            <div className="screen-line">ENTER to Select</div>
            <div className={`screen-line${pumpState.menuIndex === 0 ? ' selected' : ''}`}>PROGRAM</div>
            <div className={`screen-line${pumpState.menuIndex === 1 ? ' selected' : ''}`}>BIOMED SETUP</div>
          </>
        );
        
      case 'therapySelect':
        const therapies = ['CONTINUOUS', 'PCA', 'INTERMITTENT', 'TPN', 'VARIABLE'];
        return (
          <>
            <div style={{ fontSize: '13px', marginBottom: '6px' }}>Select Therapy</div>
            {therapies.map((therapy, index) => (
              <div key={therapy} className={`screen-line${pumpState.menuIndex === index ? ' selected' : ''}`}>
                {therapy}
              </div>
            ))}
          </>
        );
        
      case 'continuous':
        const rx = pumpState.therapies.continuous.prescription;
        const rateDisplay = pumpState.editMode && pumpState.fieldIndex === 0 
          ? <span className="cursor">{pumpState.editValue || '_'}</span> 
          : (rx.rate || '___');
        const vtbiDisplay = pumpState.editMode && pumpState.fieldIndex === 1 
          ? <span className="cursor">{pumpState.editValue || '_'}</span> 
          : (rx.vtbi || '___');
          
        return (
          <>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>CONTINUOUS</div>
            <div className={`screen-line${pumpState.fieldIndex === 0 ? ' selected' : ''}`}>
              RATE: {rateDisplay} mL/hr
            </div>
            <div className={`screen-line${pumpState.fieldIndex === 1 ? ' selected' : ''}`}>
              VTBI: {vtbiDisplay} mL
            </div>
            <div className={`screen-line${pumpState.fieldIndex === 2 ? ' selected' : ''}`}>
              TIME: {rx.time || '__:__'}
            </div>
          </>
        );
        
      case 'readyToStart':
        return (
          <div style={{ marginTop: '15px' }}>
            <div className="screen-line">Press RUN to START</div>
            <div className="screen-line" style={{ marginTop: '10px', fontSize: '14px' }}>Press NO to REVIEW</div>
          </div>
        );
        
      case 'running':
        const statusText = pumpState.isPaused ? 'P\nA\nU\nS\nE' : 'V\nO\nL\n\nR\nU\nN';
        const doseInfo = (pumpState.currentTherapy === 'intermittent' || pumpState.currentTherapy === 'variable') ? (
          <div className="info-row">
            <span className="info-label">DOSE:</span>
            <span className="info-value">{pumpState.infusionData.currentDose} of {pumpState.infusionData.totalDoses}</span>
          </div>
        ) : null;
        
        return (
          <>
            <div className="status-bar">
              {statusText.split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>
            <div className="main-content">
              {doseInfo}
              <div className="info-row">
                <span className="info-label">RATE:</span>
                <span className="info-value">{pumpState.infusionData.currentRate.toFixed(1)} mL/hr</span>
              </div>
              <div className="info-row">
                <span className="info-label">PRESSURE:</span>
                <span className="info-value">90 mmHg</span>
              </div>
              <div className="info-row">
                <span className="info-label">VOL INF:</span>
                <span className="info-value">{pumpState.infusionData.volumeInfused.toFixed(1)} mL</span>
              </div>
              <div className="info-row">
                <span className="info-label">REMAIN:</span>
                <span className="info-value">{(pumpState.infusionData.targetVolume - pumpState.infusionData.volumeInfused).toFixed(1)} mL</span>
              </div>
            </div>
          </>
        );
        
      case 'paused':
        return (
          <div style={{ marginTop: '20px' }}>
            <div className="screen-line selected" style={{ fontSize: '24px' }}>PAUSED</div>
            <div className="screen-line" style={{ marginTop: '10px', fontSize: '14px' }}>Press RUN to Resume</div>
          </div>
        );
        
      default:
        return <div>Screen: {pumpState.currentScreen}</div>;
    }
  };

  const updateLEDs = () => {
    return {
      run: pumpState.isRunning && !pumpState.isPaused,
      standby: pumpState.isOn && !pumpState.isRunning,
      alarm: pumpState.isPaused
    };
  };

  const handlePowerButton = () => {
    if (!pumpState.isOn) {
      setPumpState(prev => ({ ...prev, isOn: true, currentScreen: 'startup' }));
      
      setTimeout(() => {
        setPumpState(prev => ({ ...prev, currentScreen: 'mainMenu', menuIndex: 0 }));
      }, 3000);
    } else {
      if (pumpState.isRunning && !pumpState.isPaused) {
        // Show alert for running pump
        setPumpState(prev => ({ ...prev, currentScreen: 'alert' }));
        setTimeout(() => {
          setPumpState(prev => ({ ...prev, currentScreen: 'running' }));
        }, 2000);
      } else {
        setPumpState(prev => ({ 
          ...prev, 
          isOn: false, 
          currentScreen: 'off',
          isRunning: false,
          isPriming: false
        }));
      }
    }
  };

  const handleUp = () => {
    if (!pumpState.isOn || pumpState.editMode) return;
    
    const menuLimits = {
      mainMenu: 1,
      therapySelect: 4,
      continuous: 2,
      helpMenu: 3,
      primeMenu: 3,
      biomedSetup: 3,
      options: 3
    };
    
    if (pumpState.currentScreen in menuLimits) {
      setPumpState(prev => ({
        ...prev,
        menuIndex: Math.max(0, prev.menuIndex - 1),
        fieldIndex: Math.max(0, prev.fieldIndex - 1)
      }));
    }
  };

  const handleDown = () => {
    if (!pumpState.isOn || pumpState.editMode) return;
    
    const menuLimits = {
      mainMenu: 1,
      therapySelect: 4,
      continuous: 2,
      helpMenu: 3,
      primeMenu: 3,
      biomedSetup: 3,
      options: 3
    };
    
    if (pumpState.currentScreen in menuLimits) {
      const limit = menuLimits[pumpState.currentScreen];
      setPumpState(prev => ({
        ...prev,
        menuIndex: Math.min(limit, prev.menuIndex + 1),
        fieldIndex: Math.min(limit, prev.fieldIndex + 1)
      }));
    }
  };

  const handleYes = () => {
    if (!pumpState.isOn) return;
    
    if (pumpState.editMode) {
      // Save edited value
      if (pumpState.currentScreen === 'continuous') {
        const fields = ['rate', 'vtbi', 'time'];
        const field = fields[pumpState.fieldIndex];
        
        setPumpState(prev => {
          const newState = { ...prev };
          newState.therapies.continuous.prescription[field] = prev.editValue;
          
          // Calculate time if rate and vtbi are set
          if (prev.fieldIndex < 2) {
            const rate = parseFloat(newState.therapies.continuous.prescription.rate);
            const vtbi = parseFloat(newState.therapies.continuous.prescription.vtbi);
            if (rate > 0 && vtbi > 0) {
              const hours = Math.floor(vtbi / rate);
              const mins = Math.round(((vtbi / rate) - hours) * 60);
              newState.therapies.continuous.prescription.time = `${hours}:${mins.toString().padStart(2, '0')}`;
            }
          }
          
          return {
            ...newState,
            editMode: false,
            editValue: ''
          };
        });
      }
      return;
    }
    
    // Navigation logic
    if (pumpState.currentScreen === 'mainMenu') {
      if (pumpState.menuIndex === 0) {
        setPumpState(prev => ({ ...prev, currentScreen: 'therapySelect', menuIndex: 0 }));
      }
    } else if (pumpState.currentScreen === 'therapySelect') {
      const therapyMap = ['continuous', 'pca', 'intermittent', 'tpn', 'variable'];
      setPumpState(prev => ({ 
        ...prev, 
        currentTherapy: therapyMap[prev.menuIndex],
        currentScreen: therapyMap[prev.menuIndex],
        fieldIndex: 0
      }));
    } else if (pumpState.currentScreen === 'continuous') {
      if (pumpState.fieldIndex < 2 && !pumpState.therapies.continuous.prescription[['rate', 'vtbi'][pumpState.fieldIndex]]) {
        setPumpState(prev => ({ ...prev, editMode: true, editValue: '' }));
      } else if (pumpState.fieldIndex === 2) {
        setPumpState(prev => ({ ...prev, currentScreen: 'readyToStart' }));
        prepareInfusion();
      } else {
        setPumpState(prev => ({ ...prev, fieldIndex: prev.fieldIndex + 1 }));
      }
    }
  };

  const handleNo = () => {
    if (!pumpState.isOn) return;
    
    if (pumpState.editMode) {
      setPumpState(prev => ({ ...prev, editMode: false, editValue: '' }));
      return;
    }
    
    if (pumpState.currentScreen === 'readyToStart') {
      setPumpState(prev => ({ ...prev, currentScreen: prev.currentTherapy, fieldIndex: 0 }));
    } else if (['continuous', 'pca', 'intermittent', 'tpn', 'variable'].includes(pumpState.currentScreen)) {
      setPumpState(prev => ({ ...prev, currentScreen: 'therapySelect', menuIndex: 0 }));
    } else if (pumpState.currentScreen === 'therapySelect') {
      setPumpState(prev => ({ ...prev, currentScreen: 'mainMenu', menuIndex: 0 }));
    }
  };

  const handleRun = () => {
    if (!pumpState.isOn) return;
    
    if (pumpState.currentScreen === 'readyToStart') {
      setPumpState(prev => ({ ...prev, isRunning: true, currentScreen: 'running' }));
      startInfusion();
    } else if (pumpState.currentScreen === 'running') {
      setPumpState(prev => ({ ...prev, isPaused: true, currentScreen: 'paused' }));
    } else if (pumpState.currentScreen === 'paused') {
      setPumpState(prev => ({ ...prev, isPaused: false, currentScreen: 'running' }));
    }
  };

  const handleNumeric = (num) => {
    if (!pumpState.isOn || !pumpState.editMode) return;
    
    setPumpState(prev => ({ ...prev, editValue: prev.editValue + num }));
  };

  const handleSilence = () => {
    if (!pumpState.isOn || !pumpState.editMode) return;
    
    if (!pumpState.editValue.includes('.')) {
      setPumpState(prev => ({ ...prev, editValue: prev.editValue + '.' }));
    }
  };

  const prepareInfusion = () => {
    if (pumpState.currentTherapy === 'continuous') {
      const rx = pumpState.therapies.continuous.prescription;
      setPumpState(prev => ({
        ...prev,
        infusionData: {
          currentRate: parseFloat(rx.rate) || 125,
          targetVolume: parseFloat(rx.vtbi) || 100,
          volumeInfused: 0,
          timeRemaining: (parseFloat(rx.vtbi) || 100) / (parseFloat(rx.rate) || 125) * 60,
          currentDose: 1,
          totalDoses: 1
        }
      }));
    }
  };

  const startInfusion = () => {
    infusionIntervalRef.current = setInterval(() => {
      setPumpState(prev => {
        if (prev.isRunning && !prev.isPaused) {
          const newVolumeInfused = prev.infusionData.volumeInfused + prev.infusionData.currentRate / 3600;
          const newTimeRemaining = (prev.infusionData.targetVolume - newVolumeInfused) / prev.infusionData.currentRate * 60;
          
          if (newVolumeInfused >= prev.infusionData.targetVolume) {
            clearInterval(infusionIntervalRef.current);
            return {
              ...prev,
              isRunning: false,
              currentScreen: 'complete',
              infusionData: {
                ...prev.infusionData,
                volumeInfused: prev.infusionData.targetVolume,
                timeRemaining: 0
              }
            };
          }
          
          return {
            ...prev,
            infusionData: {
              ...prev.infusionData,
              volumeInfused: newVolumeInfused,
              timeRemaining: newTimeRemaining
            }
          };
        }
        return prev;
      });
    }, 1000);
  };

  const leds = updateLEDs();

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="pump-overlay" onClick={onClose} />
      <div className="pump-modal">
        <div className="pump-modal-header">
          <h2>CURLIN 6000 CMS - Pump Simulator</h2>
          <button className="close-pump-modal" onClick={onClose}>×</button>
        </div>
        <div className="pump-modal-content">
          <div className="pump-device">
            {/* Display area */}
            <div className="display-area">
              {/* Header row */}
              <div className="header-row">
                <div className="brand-text">CURLIN MEDICAL</div>
                <div className="model-text">6000 <span className="cms">CMS</span></div>
              </div>
              
              {/* LCD Screen */}
              <div className="lcd-screen">
                <div className="screen-content">
                  {renderScreen()}
                </div>
              </div>
            </div>
            
            {/* Button panel */}
            <div className="button-panel">
              {/* Top row */}
              <div className="top-row">
                <button className="btn-power" onClick={handlePowerButton}>
                  ON/<br/>OFF
                </button>
                
                <div className="led-group">
                  <div className="led-row">
                    <span className={`led-dot ${leds.run ? 'active-green' : ''}`}></span>
                    <span className="led-label">RUN</span>
                  </div>
                  <div className="led-row">
                    <span className={`led-dot ${leds.standby ? 'active-yellow' : ''}`}></span>
                    <span className="led-label">STANDBY</span>
                  </div>
                  <div className="led-row">
                    <span className={`led-dot ${leds.alarm ? 'active-yellow' : ''}`}></span>
                    <span className="led-label">ALARM</span>
                  </div>
                </div>
                
                <div className="spacer"></div>
                
                <div className="right-buttons">
                  <button className="btn-help">
                    HELP<br/>OPTIONS
                  </button>
                  
                  <button className={`btn-run ${pumpState.isPaused ? '' : 'paused'}`} onClick={handleRun}>
                    RUN<br/>PAUSE
                  </button>
                </div>
              </div>
              
              {/* Main button grid */}
              <div className="button-grid">
                {/* Row 1 */}
                <button className="btn btn-arrow" onClick={handleUp}>↑</button>
                <button className="btn btn-no" onClick={handleNo}>
                  NO<br/>CHANGE
                </button>
                <button className="btn btn-yes" onClick={handleYes}>
                  YES<br/>ENTER
                </button>
                <button className="btn btn-arrow" onClick={handleDown}>↓</button>
                
                {/* Row 2 */}
                <button className="btn btn-number" onClick={() => handleNumeric('1')}>
                  <div className="number-content">
                    <div className="number-label">Date<br/>Time</div>
                    <div className="number-digit">1</div>
                  </div>
                </button>
                <button className="btn btn-number" onClick={() => handleNumeric('2')}>
                  <div className="number-content">
                    <div className="number-label">Powr<br/>Chck</div>
                    <div className="number-digit">2</div>
                  </div>
                </button>
                <button className="btn btn-number" onClick={() => handleNumeric('3')}>
                  <div className="number-content">
                    <div className="number-label">Optn<br/>Info</div>
                    <div className="number-digit">3</div>
                  </div>
                </button>
                <button className="btn btn-number" onClick={() => handleNumeric('4')}>
                  <div className="number-content">
                    <div className="number-label">Hold<br/>Scrn</div>
                    <div className="number-digit">4</div>
                  </div>
                </button>
                
                {/* Row 3 */}
                <button className="btn btn-number" onClick={() => handleNumeric('5')}>
                  <div className="number-content">
                    <div className="number-label">Hrly<br/>Tot</div>
                    <div className="number-digit">5</div>
                  </div>
                </button>
                <button className="btn btn-number" onClick={() => handleNumeric('6')}>
                  <div className="number-content">
                    <div className="number-label">Thrpy<br/>Info</div>
                    <div className="number-digit">6</div>
                  </div>
                </button>
                <button className="btn btn-number" onClick={() => handleNumeric('7')}>
                  <div className="number-content">
                    <div className="number-label">Rx<br/>Info</div>
                    <div className="number-digit">7</div>
                  </div>
                </button>
                <button className="btn btn-number" onClick={() => handleNumeric('8')}>
                  <div className="number-content">
                    <div className="number-label">%<br/>Bols</div>
                    <div className="number-digit">8</div>
                  </div>
                </button>
                
                {/* Row 4 */}
                <button className="btn btn-number" onClick={() => handleNumeric('9')}>
                  <div className="number-content">
                    <div className="number-label">CLR<br/>Shft</div>
                    <div className="number-digit">9</div>
                  </div>
                </button>
                <button className="btn btn-number" onClick={() => handleNumeric('0')}>
                  <div className="number-content">
                    <div className="number-label">Chck<br/>Max</div>
                    <div className="number-digit">0</div>
                  </div>
                </button>
                <button className="btn btn-silence" onClick={handleSilence}>
                  <span className="dot">•</span>
                  SILENCE
                </button>
                <button className="btn btn-prime">
                  PRIME<br/>BOLUS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default PumpSimulator;