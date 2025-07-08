import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './PumpSimulator.css';

const PumpSimulator = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [pump, setPump] = useState({
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

  // Screen rendering
  const renderScreen = () => {
    if (!pump.isOn) {
      return null;
    }
    
    let html = '';
    
    switch (pump.currentScreen) {
      case 'startup':
        html = (
          <>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>MOOG MEDICAL</div>
            <div style={{ fontSize: '14px' }}>Safely Managing<br/>Infusion<br/>...and Information</div>
          </>
        );
        break;
        
      case 'mainMenu':
        html = (
          <>
            <div className="screen-line">ENTER to Select</div>
            <div className={`screen-line${pump.menuIndex === 0 ? ' selected' : ''}`}>PROGRAM</div>
            <div className={`screen-line${pump.menuIndex === 1 ? ' selected' : ''}`}>BIOMED SETUP</div>
          </>
        );
        break;
        
      case 'therapySelect':
        const therapies = ['CONTINUOUS', 'PCA', 'INTERMITTENT', 'TPN', 'VARIABLE'];
        html = (
          <>
            <div style={{ fontSize: '13px', marginBottom: '6px' }}>Select Therapy</div>
            {therapies.map((therapy, index) => (
              <div key={therapy} className={`screen-line${pump.menuIndex === index ? ' selected' : ''}`}>{therapy}</div>
            ))}
          </>
        );
        break;
        
      case 'continuous':
        const rx = pump.therapies.continuous.prescription;
        let rateDisplay = rx.rate || '___';
        let vtbiDisplay = rx.vtbi || '___';
        
        if (pump.editMode && pump.fieldIndex === 0) {
          rateDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
        }
        if (pump.editMode && pump.fieldIndex === 1) {
          vtbiDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
        }
        
        html = (
          <>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>CONTINUOUS</div>
            <div className={`screen-line${pump.fieldIndex === 0 ? ' selected' : ''}`}>
              RATE: {rateDisplay} mL/hr
            </div>
            <div className={`screen-line${pump.fieldIndex === 1 ? ' selected' : ''}`}>
              VTBI: {vtbiDisplay} mL
            </div>
            <div className={`screen-line${pump.fieldIndex === 2 ? ' selected' : ''}`}>
              TIME: {rx.time || '__:__'}
            </div>
          </>
        );
        break;
        
      case 'pca':
        const pca = pump.therapies.pca;
        let concenDisplay = pca.concentration || '___';
        
        if (pump.editMode && pump.fieldIndex === 1) {
          concenDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
        }
        
        html = (
          <>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>PCA</div>
            <div className={`screen-line${pump.fieldIndex === 0 ? ' selected' : ''}`}>
              UNITS: {pca.units}
            </div>
            <div className={`screen-line${pump.fieldIndex === 1 ? ' selected' : ''}`}>
              CONCEN: {concenDisplay} mg/mL
            </div>
            <div className={`screen-line${pump.fieldIndex === 2 ? ' selected' : ''}`}>
              ADMIN Rt: {pca.adminRoute}
            </div>
          </>
        );
        break;
        
      case 'pcaPrescription':
        const pcaRx = pump.therapies.pca.prescription;
        let bagVolDisplay = pcaRx.bagVolume || '___';
        let basalRateDisplay = pcaRx.basalRate || '___';
        let ptBolusDisplay = pcaRx.patientBolus || '___';
        
        if (pump.editMode) {
          const editDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
          if (pump.fieldIndex === 0) bagVolDisplay = editDisplay;
          if (pump.fieldIndex === 1) basalRateDisplay = editDisplay;
          if (pump.fieldIndex === 2) ptBolusDisplay = editDisplay;
        }
        
        html = (
          <>
            <div style={{ fontSize: '16px', marginBottom: '6px' }}>PCA Prescription</div>
            <div className={`screen-line${pump.fieldIndex === 0 ? ' selected' : ''}`}>
              BAG VOL: {bagVolDisplay} mL
            </div>
            <div className={`screen-line${pump.fieldIndex === 1 ? ' selected' : ''}`}>
              BASL RATE: {basalRateDisplay} mg/hr
            </div>
            <div className={`screen-line${pump.fieldIndex === 2 ? ' selected' : ''}`}>
              Pt BOLUS: {ptBolusDisplay} mg
            </div>
          </>
        );
        break;
        
      case 'intermittent':
        const inter = pump.therapies.intermittent;
        let bagVolInterDisplay = inter.prescription.bagVolume || '___';
        let amtDoseDisplay = inter.prescription.amountPerDose || '___';
        
        if (pump.editMode && pump.fieldIndex === 1) {
          bagVolInterDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
        }
        if (pump.editMode && pump.fieldIndex === 2) {
          amtDoseDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
        }
        
        html = (
          <>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>INTERMITTENT</div>
            <div className={`screen-line${pump.fieldIndex === 0 ? ' selected' : ''}`}>
              UNITS: {inter.units}
            </div>
            <div className={`screen-line${pump.fieldIndex === 1 ? ' selected' : ''}`}>
              BAG VOL: {bagVolInterDisplay} mL
            </div>
            <div className={`screen-line${pump.fieldIndex === 2 ? ' selected' : ''}`}>
              AMT/DOSE: {amtDoseDisplay} mL
            </div>
          </>
        );
        break;
        
      case 'tpn':
        const tpn = pump.therapies.tpn.prescription;
        let bagVolTpnDisplay = tpn.bagVolume || '___';
        let volTbiDisplay = tpn.volumeTBI || '___';
        let infRateDisplay = tpn.infusionRate || '___';
        
        if (pump.editMode) {
          const editDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
          if (pump.fieldIndex === 0) bagVolTpnDisplay = editDisplay;
          if (pump.fieldIndex === 1) volTbiDisplay = editDisplay;
          if (pump.fieldIndex === 2) infRateDisplay = editDisplay;
        }
        
        html = (
          <>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>TPN</div>
            <div className={`screen-line${pump.fieldIndex === 0 ? ' selected' : ''}`}>
              BAG VOL: {bagVolTpnDisplay} mL
            </div>
            <div className={`screen-line${pump.fieldIndex === 1 ? ' selected' : ''}`}>
              Vol TBI: {volTbiDisplay} mL
            </div>
            <div className={`screen-line${pump.fieldIndex === 2 ? ' selected' : ''}`}>
              INF RATE: {infRateDisplay} mL/hr
            </div>
          </>
        );
        break;
        
      case 'variable':
        const variable = pump.therapies.variable;
        let numDosesDisplay = variable.prescription.numDoses || '___';
        let bagVolVarDisplay = variable.prescription.bagVolume || '___';
        
        if (pump.editMode && pump.fieldIndex === 0) {
          numDosesDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
        }
        if (pump.editMode && pump.fieldIndex === 1) {
          bagVolVarDisplay = <span className="cursor">{pump.editValue || '_'}</span>;
        }
        
        html = (
          <>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>VARIABLE</div>
            <div className={`screen-line${pump.fieldIndex === 0 ? ' selected' : ''}`}>
              # DOSES: {numDosesDisplay}
            </div>
            <div className={`screen-line${pump.fieldIndex === 1 ? ' selected' : ''}`}>
              BAG VOL: {bagVolVarDisplay} mL
            </div>
            <div className={`screen-line${pump.fieldIndex === 2 ? ' selected' : ''}`}>
              KVO RATE: {variable.prescription.kvoRate} mL/hr
            </div>
          </>
        );
        break;
        
      case 'biomedSetup':
        html = (
          <>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>BIOMED SETUP</div>
            <div className={`screen-line${pump.biomedMenuIndex === 0 ? ' selected' : ''}`}>Pump Settings</div>
            <div className={`screen-line${pump.biomedMenuIndex === 1 ? ' selected' : ''}`}>Alarm Settings</div>
            <div className={`screen-line${pump.biomedMenuIndex === 2 ? ' selected' : ''}`}>Service Mode</div>
            <div className={`screen-line${pump.biomedMenuIndex === 3 ? ' selected' : ''}`}>Exit</div>
          </>
        );
        break;
        
      case 'options':
        html = (
          <>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>OPTIONS</div>
            <div className={`screen-line${pump.optionsMenuIndex === 0 ? ' selected' : ''}`}>
              Lock: {pump.lockLevel}
            </div>
            <div className={`screen-line${pump.optionsMenuIndex === 1 ? ' selected' : ''}`}>
              DN Occlu: {pump.settings.downOcclusion}
            </div>
            <div className={`screen-line${pump.optionsMenuIndex === 2 ? ' selected' : ''}`}>
              AIR SENS: {pump.settings.airSensitivity} mL
            </div>
            <div className={`screen-line${pump.optionsMenuIndex === 3 ? ' selected' : ''}`}>
              ACCEPT OPT
            </div>
          </>
        );
        break;
        
      case 'readyToStart':
        html = (
          <div style={{ marginTop: '15px' }}>
            <div className="screen-line">Press RUN to START</div>
            <div className="screen-line" style={{ marginTop: '10px', fontSize: '14px' }}>Press NO to REVIEW</div>
          </div>
        );
        break;
        
      case 'running':
        const statusText = pump.isPaused ? 'P\nA\nU\nS\nE' : 'V\nO\nL\n\nR\nU\nN';
        let doseInfo = null;
        
        if (pump.currentTherapy === 'intermittent' || pump.currentTherapy === 'variable') {
          doseInfo = (
            <div className="info-row">
              <span className="info-label">DOSE:</span>
              <span className="info-value">{pump.infusionData.currentDose} of {pump.infusionData.totalDoses}</span>
            </div>
          );
        }
        
        html = (
          <>
            <div className="status-bar">
              {statusText.split('\n').map((char, i) => (
                <React.Fragment key={i}>{char}<br/></React.Fragment>
              ))}
            </div>
            <div className="main-content">
              {doseInfo}
              <div className="info-row">
                <span className="info-label">RATE:</span>
                <span className="info-value">{pump.infusionData.currentRate.toFixed(1)} mL/hr</span>
              </div>
              <div className="info-row">
                <span className="info-label">PRESSURE:</span>
                <span className="info-value">90 mmHg</span>
              </div>
              <div className="info-row">
                <span className="info-label">VOL INF:</span>
                <span className="info-value">{pump.infusionData.volumeInfused.toFixed(1)} mL</span>
              </div>
              <div className="info-row">
                <span className="info-label">REMAIN:</span>
                <span className="info-value">{(pump.infusionData.targetVolume - pump.infusionData.volumeInfused).toFixed(1)} mL</span>
              </div>
            </div>
          </>
        );
        break;
        
      case 'paused':
        html = (
          <div style={{ marginTop: '20px' }}>
            <div className="screen-line selected" style={{ fontSize: '24px' }}>PAUSED</div>
            <div className="screen-line" style={{ marginTop: '10px', fontSize: '14px' }}>Press RUN to Resume</div>
          </div>
        );
        break;
        
      case 'helpMenu':
        html = (
          <>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>HELP/OPTIONS</div>
            <div className={`screen-line${pump.helpMenuIndex === 0 ? ' selected' : ''}`}>System Info</div>
            <div className={`screen-line${pump.helpMenuIndex === 1 ? ' selected' : ''}`}>Alarm History</div>
            <div className={`screen-line${pump.helpMenuIndex === 2 ? ' selected' : ''}`}>Service Info</div>
            <div className={`screen-line${pump.helpMenuIndex === 3 ? ' selected' : ''}`}>Exit</div>
          </>
        );
        break;
        
      case 'systemInfo':
        html = (
          <>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>SYSTEM INFO</div>
            <div className="screen-line">Model: 6000 CMS</div>
            <div className="screen-line">SW Ver: R42C</div>
            <div className="screen-line">Battery: 80%</div>
            <div className="screen-line selected">Press NO to Exit</div>
          </>
        );
        break;
        
      case 'primeMenu':
        html = (
          <>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>PRIME/BOLUS</div>
            <div className={`screen-line${pump.primeMenuIndex === 0 ? ' selected' : ''}`}>Manual Prime</div>
            <div className={`screen-line${pump.primeMenuIndex === 1 ? ' selected' : ''}`}>Auto Prime</div>
            <div className={`screen-line${pump.primeMenuIndex === 2 ? ' selected' : ''}`}>Bolus Dose</div>
            <div className={`screen-line${pump.primeMenuIndex === 3 ? ' selected' : ''}`}>Exit</div>
          </>
        );
        break;
        
      case 'forceShutdown':
        html = (
          <>
            <div style={{ fontSize: '16px', marginTop: '10px' }}>FORCE SHUTDOWN</div>
            <div className="screen-line">Hold ON/OFF for</div>
            <div className="screen-line" style={{ fontSize: '24px' }}>{3 - Math.floor(pump.powerButtonHoldTime / 1000)}</div>
            <div className="screen-line">seconds</div>
          </>
        );
        break;
    }
    
    return html;
  };

  // LED control
  const updateLEDs = () => {
    return {
      run: pump.isRunning && !pump.isPaused,
      standby: pump.isOn && !pump.isRunning,
      alarm: pump.isPaused
    };
  };

  // Button handlers
  const handlePowerDown = () => {
    if (!pump.isOn) return;
    
    if (pump.isRunning && !pump.isPaused) {
      setPump(prev => ({ ...prev, powerButtonHoldTime: 0, currentScreen: 'forceShutdown' }));
      
      powerButtonTimerRef.current = setInterval(() => {
        setPump(prev => {
          const newHoldTime = prev.powerButtonHoldTime + 100;
          if (newHoldTime >= 3000) {
            clearInterval(powerButtonTimerRef.current);
            return {
              ...prev,
              isOn: false,
              currentScreen: 'off',
              isRunning: false,
              isPaused: false,
              isPriming: false,
              powerButtonHoldTime: 0
            };
          }
          return { ...prev, powerButtonHoldTime: newHoldTime };
        });
      }, 100);
    }
  };
  
  const handlePowerUp = () => {
    if (powerButtonTimerRef.current) {
      clearInterval(powerButtonTimerRef.current);
      powerButtonTimerRef.current = null;
      if (pump.isOn && pump.isRunning) {
        setPump(prev => ({ ...prev, currentScreen: 'running' }));
      }
    }
  };
  
  const handlePower = () => {
    if (!pump.isOn) {
      setPump(prev => ({ ...prev, isOn: true, currentScreen: 'startup' }));
      
      setTimeout(() => {
        setPump(prev => ({ ...prev, currentScreen: 'mainMenu', menuIndex: 0 }));
      }, 3000);
      
    } else {
      if (pump.isRunning && !pump.isPaused) {
        // Show alert
        const tempScreen = pump.currentScreen;
        setPump(prev => ({ ...prev, currentScreen: 'alert' }));
        setTimeout(() => {
          setPump(prev => ({ ...prev, currentScreen: tempScreen }));
        }, 2000);
      } else {
        setPump(prev => ({ 
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
    if (!pump.isOn || pump.editMode) return;
    
    setPump(prev => {
      let newState = { ...prev };
      
      if (prev.currentScreen === 'mainMenu') {
        newState.menuIndex = Math.max(0, prev.menuIndex - 1);
      } else if (prev.currentScreen === 'therapySelect') {
        newState.menuIndex = Math.max(0, prev.menuIndex - 1);
      } else if (prev.currentScreen === 'continuous') {
        newState.fieldIndex = Math.max(0, prev.fieldIndex - 1);
      } else if (prev.currentScreen === 'pca' || prev.currentScreen === 'pcaPrescription') {
        newState.fieldIndex = Math.max(0, prev.fieldIndex - 1);
      } else if (prev.currentScreen === 'intermittent') {
        newState.fieldIndex = Math.max(0, prev.fieldIndex - 1);
      } else if (prev.currentScreen === 'tpn') {
        newState.fieldIndex = Math.max(0, prev.fieldIndex - 1);
      } else if (prev.currentScreen === 'variable') {
        newState.fieldIndex = Math.max(0, prev.fieldIndex - 1);
      } else if (prev.currentScreen === 'helpMenu') {
        newState.helpMenuIndex = Math.max(0, prev.helpMenuIndex - 1);
      } else if (prev.currentScreen === 'primeMenu') {
        newState.primeMenuIndex = Math.max(0, prev.primeMenuIndex - 1);
      } else if (prev.currentScreen === 'biomedSetup') {
        newState.biomedMenuIndex = Math.max(0, prev.biomedMenuIndex - 1);
      } else if (prev.currentScreen === 'options') {
        newState.optionsMenuIndex = Math.max(0, prev.optionsMenuIndex - 1);
      }
      
      return newState;
    });
  };

  const handleDown = () => {
    if (!pump.isOn || pump.editMode) return;
    
    setPump(prev => {
      let newState = { ...prev };
      
      if (prev.currentScreen === 'mainMenu') {
        newState.menuIndex = Math.min(1, prev.menuIndex + 1);
      } else if (prev.currentScreen === 'therapySelect') {
        newState.menuIndex = Math.min(4, prev.menuIndex + 1);
      } else if (prev.currentScreen === 'continuous') {
        newState.fieldIndex = Math.min(2, prev.fieldIndex + 1);
      } else if (prev.currentScreen === 'pca') {
        newState.fieldIndex = Math.min(2, prev.fieldIndex + 1);
      } else if (prev.currentScreen === 'pcaPrescription') {
        newState.fieldIndex = Math.min(2, prev.fieldIndex + 1);
      } else if (prev.currentScreen === 'intermittent') {
        newState.fieldIndex = Math.min(2, prev.fieldIndex + 1);
      } else if (prev.currentScreen === 'tpn') {
        newState.fieldIndex = Math.min(2, prev.fieldIndex + 1);
      } else if (prev.currentScreen === 'variable') {
        newState.fieldIndex = Math.min(2, prev.fieldIndex + 1);
      } else if (prev.currentScreen === 'helpMenu') {
        newState.helpMenuIndex = Math.min(3, prev.helpMenuIndex + 1);
      } else if (prev.currentScreen === 'primeMenu') {
        newState.primeMenuIndex = Math.min(3, prev.primeMenuIndex + 1);
      } else if (prev.currentScreen === 'biomedSetup') {
        newState.biomedMenuIndex = Math.min(3, prev.biomedMenuIndex + 1);
      } else if (prev.currentScreen === 'options') {
        newState.optionsMenuIndex = Math.min(3, prev.optionsMenuIndex + 1);
      }
      
      return newState;
    });
  };

  const handleYes = () => {
    if (!pump.isOn) return;
    
    if (pump.editMode) {
      // Save the edited value
      setPump(prev => {
        let newState = { ...prev };
        
        if (prev.currentScreen === 'continuous') {
          const fields = ['rate', 'vtbi', 'time'];
          const field = fields[prev.fieldIndex];
          newState.therapies.continuous.prescription[field] = prev.editValue;
          
          if (prev.fieldIndex < 2) {
            const rate = parseFloat(newState.therapies.continuous.prescription.rate);
            const vtbi = parseFloat(newState.therapies.continuous.prescription.vtbi);
            if (rate > 0 && vtbi > 0) {
              const hours = Math.floor(vtbi / rate);
              const mins = Math.round(((vtbi / rate) - hours) * 60);
              newState.therapies.continuous.prescription.time = `${hours}:${mins.toString().padStart(2, '0')}`;
            }
          }
        } else if (prev.currentScreen === 'pca') {
          if (prev.fieldIndex === 1) {
            newState.therapies.pca.concentration = prev.editValue;
          }
        } else if (prev.currentScreen === 'pcaPrescription') {
          const fields = ['bagVolume', 'basalRate', 'patientBolus'];
          newState.therapies.pca.prescription[fields[prev.fieldIndex]] = prev.editValue;
        } else if (prev.currentScreen === 'intermittent') {
          const fields = ['', 'bagVolume', 'amountPerDose'];
          if (prev.fieldIndex > 0) {
            newState.therapies.intermittent.prescription[fields[prev.fieldIndex]] = prev.editValue;
          }
        } else if (prev.currentScreen === 'tpn') {
          const fields = ['bagVolume', 'volumeTBI', 'infusionRate'];
          newState.therapies.tpn.prescription[fields[prev.fieldIndex]] = prev.editValue;
        } else if (prev.currentScreen === 'variable') {
          const fields = ['numDoses', 'bagVolume'];
          if (prev.fieldIndex < 2) {
            newState.therapies.variable.prescription[fields[prev.fieldIndex]] = prev.editValue;
          }
        }
        
        newState.editMode = false;
        newState.editValue = '';
        return newState;
      });
      return;
    }
    
    // Navigation logic
    setPump(prev => {
      let newState = { ...prev };
      
      if (prev.currentScreen === 'mainMenu') {
        if (prev.menuIndex === 0) {
          newState.currentScreen = 'therapySelect';
          newState.menuIndex = 0;
        } else if (prev.menuIndex === 1) {
          newState.currentScreen = 'biomedSetup';
          newState.biomedMenuIndex = 0;
        }
      } else if (prev.currentScreen === 'therapySelect') {
        const therapyMap = ['continuous', 'pca', 'intermittent', 'tpn', 'variable'];
        newState.currentTherapy = therapyMap[prev.menuIndex];
        newState.currentScreen = newState.currentTherapy;
        newState.fieldIndex = 0;
      } else if (prev.currentScreen === 'continuous') {
        if (prev.fieldIndex < 2 && !prev.therapies.continuous.prescription[['rate', 'vtbi'][prev.fieldIndex]]) {
          newState.editMode = true;
          newState.editValue = '';
        } else if (prev.fieldIndex === 2) {
          newState.currentScreen = 'readyToStart';
          prepareInfusion(newState);
        } else {
          newState.fieldIndex++;
        }
      } else if (prev.currentScreen === 'pca') {
        if (prev.fieldIndex === 0) {
          // Cycle through units
          const units = ['mg', 'mcg', 'mL'];
          const currentIndex = units.indexOf(prev.therapies.pca.units);
          newState.therapies.pca.units = units[(currentIndex + 1) % units.length];
        } else if (prev.fieldIndex === 1 && !prev.therapies.pca.concentration) {
          newState.editMode = true;
          newState.editValue = '';
        } else if (prev.fieldIndex === 2) {
          // Cycle through admin routes
          const routes = ['IV', 'Epidural', 'SQ'];
          const currentIndex = routes.indexOf(prev.therapies.pca.adminRoute);
          newState.therapies.pca.adminRoute = routes[(currentIndex + 1) % routes.length];
        }
        
        if (prev.fieldIndex === 2 && prev.therapies.pca.concentration) {
          newState.currentScreen = 'pcaPrescription';
          newState.fieldIndex = 0;
        }
      } else if (prev.currentScreen === 'pcaPrescription') {
        const fields = ['bagVolume', 'basalRate', 'patientBolus'];
        if (!prev.therapies.pca.prescription[fields[prev.fieldIndex]]) {
          newState.editMode = true;
          newState.editValue = '';
        } else if (prev.fieldIndex === 2) {
          newState.currentScreen = 'readyToStart';
          prepareInfusion(newState);
        } else {
          newState.fieldIndex++;
        }
      } else if (prev.currentScreen === 'intermittent') {
        if (prev.fieldIndex === 0) {
          newState.fieldIndex++;
        } else if (prev.fieldIndex > 0 && !prev.therapies.intermittent.prescription[['', 'bagVolume', 'amountPerDose'][prev.fieldIndex]]) {
          newState.editMode = true;
          newState.editValue = '';
        } else if (prev.fieldIndex === 2) {
          newState.currentScreen = 'readyToStart';
          prepareInfusion(newState);
        } else {
          newState.fieldIndex++;
        }
      } else if (prev.currentScreen === 'tpn') {
        const fields = ['bagVolume', 'volumeTBI', 'infusionRate'];
        if (!prev.therapies.tpn.prescription[fields[prev.fieldIndex]]) {
          newState.editMode = true;
          newState.editValue = '';
        } else if (prev.fieldIndex === 2) {
          newState.currentScreen = 'readyToStart';
          prepareInfusion(newState);
        } else {
          newState.fieldIndex++;
        }
      } else if (prev.currentScreen === 'variable') {
        if (prev.fieldIndex < 2 && !prev.therapies.variable.prescription[['numDoses', 'bagVolume'][prev.fieldIndex]]) {
          newState.editMode = true;
          newState.editValue = '';
        } else if (prev.fieldIndex === 2) {
          newState.currentScreen = 'readyToStart';
          prepareInfusion(newState);
        } else {
          newState.fieldIndex++;
        }
      } else if (prev.currentScreen === 'helpMenu') {
        if (prev.helpMenuIndex === 0) {
          newState.currentScreen = 'systemInfo';
        } else if (prev.helpMenuIndex === 3) {
          newState.currentScreen = 'mainMenu';
        }
      } else if (prev.currentScreen === 'primeMenu') {
        if (prev.primeMenuIndex === 3) {
          newState.currentScreen = 'mainMenu';
        }
      } else if (prev.currentScreen === 'biomedSetup') {
        if (prev.biomedMenuIndex === 3) {
          newState.currentScreen = 'mainMenu';
          newState.menuIndex = 0;
        }
      } else if (prev.currentScreen === 'options') {
        if (prev.optionsMenuIndex === 0) {
          // Cycle through lock levels
          const levels = ['LL0', 'LL1', 'LL2', 'LL3'];
          const currentIndex = levels.indexOf(prev.lockLevel);
          newState.lockLevel = levels[(currentIndex + 1) % levels.length];
        } else if (prev.optionsMenuIndex === 1) {
          // Cycle through occlusion settings
          const settings = ['LOW', 'MED', 'HIGH'];
          const currentIndex = settings.indexOf(prev.settings.downOcclusion);
          newState.settings.downOcclusion = settings[(currentIndex + 1) % settings.length];
        } else if (prev.optionsMenuIndex === 2) {
          // Cycle through air sensitivity
          const sensitivities = ['0.1', '0.2', '0.5', '1.0', '2.0'];
          const currentIndex = sensitivities.indexOf(prev.settings.airSensitivity);
          newState.settings.airSensitivity = sensitivities[(currentIndex + 1) % sensitivities.length];
        } else if (prev.optionsMenuIndex === 3) {
          newState.currentScreen = prev.isRunning ? 'running' : 'readyToStart';
        }
      }
      
      return newState;
    });
  };

  const handleNo = () => {
    if (!pump.isOn) return;
    
    if (pump.editMode) {
      setPump(prev => ({ ...prev, editMode: false, editValue: '' }));
      return;
    }
    
    setPump(prev => {
      let newState = { ...prev };
      
      if (prev.currentScreen === 'readyToStart') {
        newState.currentScreen = prev.currentTherapy;
        newState.fieldIndex = 0;
      } else if (['continuous', 'pca', 'intermittent', 'tpn', 'variable'].includes(prev.currentScreen)) {
        newState.currentScreen = 'therapySelect';
        newState.menuIndex = 0;
      } else if (prev.currentScreen === 'pcaPrescription') {
        newState.currentScreen = 'pca';
        newState.fieldIndex = 0;
      } else if (prev.currentScreen === 'therapySelect' || prev.currentScreen === 'biomedSetup') {
        newState.currentScreen = 'mainMenu';
        newState.menuIndex = 0;
      } else if (prev.currentScreen === 'systemInfo') {
        newState.currentScreen = 'helpMenu';
        newState.helpMenuIndex = 0;
      } else if (prev.currentScreen === 'options') {
        if (prev.optionsMenuIndex === 0) {
          // Cycle through lock levels backward
          const levels = ['LL0', 'LL1', 'LL2', 'LL3'];
          const currentIndex = levels.indexOf(prev.lockLevel);
          newState.lockLevel = levels[(currentIndex + 3) % levels.length];
        } else if (prev.optionsMenuIndex === 1) {
          // Cycle through occlusion settings backward
          const settings = ['LOW', 'MED', 'HIGH'];
          const currentIndex = settings.indexOf(prev.settings.downOcclusion);
          newState.settings.downOcclusion = settings[(currentIndex + 2) % settings.length];
        } else if (prev.optionsMenuIndex === 2) {
          // Cycle through air sensitivity backward
          const sensitivities = ['0.1', '0.2', '0.5', '1.0', '2.0'];
          const currentIndex = sensitivities.indexOf(prev.settings.airSensitivity);
          newState.settings.airSensitivity = sensitivities[(currentIndex + 4) % sensitivities.length];
        }
      }
      
      return newState;
    });
  };

  const handleRun = () => {
    if (!pump.isOn) return;
    
    if (pump.currentScreen === 'readyToStart') {
      setPump(prev => ({ ...prev, isRunning: true, currentScreen: 'running' }));
      startInfusion();
    } else if (pump.currentScreen === 'running') {
      setPump(prev => ({ ...prev, isPaused: true, currentScreen: 'paused' }));
    } else if (pump.currentScreen === 'paused') {
      setPump(prev => ({ ...prev, isPaused: false, currentScreen: 'running' }));
    }
  };

  const handleNumeric = (num) => {
    if (!pump.isOn || !pump.editMode) return;
    
    setPump(prev => ({ ...prev, editValue: prev.editValue + num }));
  };

  const handleSilence = () => {
    if (!pump.isOn || !pump.editMode) return;
    
    if (!pump.editValue.includes('.')) {
      setPump(prev => ({ ...prev, editValue: prev.editValue + '.' }));
    }
  };

  const handleHelp = () => {
    if (!pump.isOn) return;
    
    if (pump.currentScreen === 'readyToStart' || pump.currentScreen === 'running') {
      setPump(prev => ({ ...prev, currentScreen: 'options', optionsMenuIndex: 0 }));
    } else if (!pump.isRunning) {
      setPump(prev => ({ ...prev, currentScreen: 'helpMenu', helpMenuIndex: 0 }));
    }
  };

  const handlePrime = () => {
    if (!pump.isOn || pump.isRunning) return;
    
    setPump(prev => ({ ...prev, currentScreen: 'primeMenu', primeMenuIndex: 0 }));
  };

  const prepareInfusion = (state) => {
    if (state.currentTherapy === 'continuous') {
      const rx = state.therapies.continuous.prescription;
      state.infusionData = {
        currentRate: parseFloat(rx.rate) || 125,
        targetVolume: parseFloat(rx.vtbi) || 100,
        volumeInfused: 0,
        timeRemaining: (parseFloat(rx.vtbi) || 100) / (parseFloat(rx.rate) || 125) * 60,
        currentDose: 1,
        totalDoses: 1
      };
    } else if (state.currentTherapy === 'pca') {
      const rx = state.therapies.pca.prescription;
      const concentration = parseFloat(state.therapies.pca.concentration) || 1;
      // Convert mg/hr to mL/hr based on concentration
      state.infusionData = {
        currentRate: (parseFloat(rx.basalRate) || 2) / concentration,
        targetVolume: parseFloat(rx.bagVolume) || 100,
        volumeInfused: 0,
        timeRemaining: (parseFloat(rx.bagVolume) || 100) / ((parseFloat(rx.basalRate) || 2) / concentration) * 60,
        currentDose: 1,
        totalDoses: 1
      };
    } else if (state.currentTherapy === 'intermittent') {
      const rx = state.therapies.intermittent.prescription;
      state.infusionData = {
        currentRate: parseFloat(rx.doseRate) || 100,
        targetVolume: parseFloat(rx.amountPerDose) || 50,
        volumeInfused: 0,
        currentDose: 1,
        totalDoses: Math.floor(parseFloat(rx.bagVolume) / parseFloat(rx.amountPerDose)) || 1,
        timeRemaining: 0
      };
    } else if (state.currentTherapy === 'tpn') {
      const rx = state.therapies.tpn.prescription;
      state.infusionData = {
        currentRate: parseFloat(rx.infusionRate) || 100,
        targetVolume: parseFloat(rx.volumeTBI) || 1000,
        volumeInfused: 0,
        timeRemaining: parseFloat(rx.totalTime) * 60 || 720,
        currentDose: 1,
        totalDoses: 1
      };
    } else if (state.currentTherapy === 'variable') {
      const rx = state.therapies.variable.prescription;
      state.infusionData = {
        currentRate: 100, // Default rate for first dose
        targetVolume: parseFloat(rx.bagVolume) || 500,
        volumeInfused: 0,
        currentDose: 1,
        totalDoses: parseInt(rx.numDoses) || 3,
        timeRemaining: 0
      };
    }
  };

  const startInfusion = () => {
    infusionIntervalRef.current = setInterval(() => {
      setPump(prev => {
        if (prev.isRunning && !prev.isPaused) {
          const newVolumeInfused = prev.infusionData.volumeInfused + prev.infusionData.currentRate / 3600;
          const newTimeRemaining = 
            (prev.infusionData.targetVolume - newVolumeInfused) / 
            prev.infusionData.currentRate * 60;
          
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
    <div className={`pump-simulator-container ${theme}`}>
      <button className="pump-close-button" onClick={onClose} aria-label="Close pump simulator">
        ×
      </button>
      <div className="pump-content-wrapper">
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
              <div className="screen-content" id="screenContent">
                {renderScreen()}
              </div>
            </div>
          </div>
          
          {/* Button panel */}
          <div className="button-panel">
            {/* Top row */}
            <div className="top-row">
              <button 
                className="btn-power" 
                id="btnPower"
                onClick={handlePower}
                onMouseDown={handlePowerDown}
                onMouseUp={handlePowerUp}
                onMouseLeave={handlePowerUp}
              >
                ON/<br/>OFF
              </button>
              
              <div className="led-group">
                <div className="led-row">
                  <span className={`led-dot ${leds.run ? 'active-green' : ''}`} id="ledRun"></span>
                  <span className="led-label">RUN</span>
                </div>
                <div className="led-row">
                  <span className={`led-dot ${leds.standby ? 'active-yellow' : ''}`} id="ledStandby"></span>
                  <span className="led-label">STANDBY</span>
                </div>
                <div className="led-row">
                  <span className={`led-dot ${leds.alarm ? 'active-yellow' : ''}`} id="ledAlarm"></span>
                  <span className="led-label">ALARM</span>
                </div>
              </div>
              
              <div className="spacer"></div>
              
              <div className="right-buttons">
                <button className="btn-help" id="btnHelp" onClick={handleHelp}>
                  HELP<br/>OPTIONS
                </button>
                
                <button className={`btn-run ${pump.isPaused ? '' : 'paused'}`} id="btnRun" onClick={handleRun}>
                  RUN<br/>PAUSE
                </button>
              </div>
            </div>
            
            {/* Main button grid */}
            <div className="button-grid">
              {/* Row 1 */}
              <button className="btn btn-arrow" id="btnUp" onClick={handleUp}>↑</button>
              <button className="btn btn-no" id="btnNo" onClick={handleNo}>
                NO<br/>CHANGE
              </button>
              <button className="btn btn-yes" id="btnYes" onClick={handleYes}>
                YES<br/>ENTER
              </button>
              <button className="btn btn-arrow" id="btnDown" onClick={handleDown}>↓</button>
              
              {/* Row 2 */}
              <button className="btn btn-number" id="btn1" onClick={() => handleNumeric('1')}>
                <div className="number-content">
                  <div className="number-label">Date<br/>Time</div>
                  <div className="number-digit">1</div>
                </div>
              </button>
              <button className="btn btn-number" id="btn2" onClick={() => handleNumeric('2')}>
                <div className="number-content">
                  <div className="number-label">Powr<br/>Chck</div>
                  <div className="number-digit">2</div>
                </div>
              </button>
              <button className="btn btn-number" id="btn3" onClick={() => handleNumeric('3')}>
                <div className="number-content">
                  <div className="number-label">Optn<br/>Info</div>
                  <div className="number-digit">3</div>
                </div>
              </button>
              <button className="btn btn-number" id="btn4" onClick={() => handleNumeric('4')}>
                <div className="number-content">
                  <div className="number-label">Hold<br/>Scrn</div>
                  <div className="number-digit">4</div>
                </div>
              </button>
              
              {/* Row 3 */}
              <button className="btn btn-number" id="btn5" onClick={() => handleNumeric('5')}>
                <div className="number-content">
                  <div className="number-label">Hrly<br/>Tot</div>
                  <div className="number-digit">5</div>
                </div>
              </button>
              <button className="btn btn-number" id="btn6" onClick={() => handleNumeric('6')}>
                <div className="number-content">
                  <div className="number-label">Thrpy<br/>Info</div>
                  <div className="number-digit">6</div>
                </div>
              </button>
              <button className="btn btn-number" id="btn7" onClick={() => handleNumeric('7')}>
                <div className="number-content">
                  <div className="number-label">Rx<br/>Info</div>
                  <div className="number-digit">7</div>
                </div>
              </button>
              <button className="btn btn-number" id="btn8" onClick={() => handleNumeric('8')}>
                <div className="number-content">
                  <div className="number-label">%<br/>Bols</div>
                  <div className="number-digit">8</div>
                </div>
              </button>
              
              {/* Row 4 */}
              <button className="btn btn-number" id="btn9" onClick={() => handleNumeric('9')}>
                <div className="number-content">
                  <div className="number-label">CLR<br/>Shft</div>
                  <div className="number-digit">9</div>
                </div>
              </button>
              <button className="btn btn-number" id="btn0" onClick={() => handleNumeric('0')}>
                <div className="number-content">
                  <div className="number-label">Chck<br/>Max</div>
                  <div className="number-digit">0</div>
                </div>
              </button>
              <button className="btn btn-silence" id="btnSilence" onClick={handleSilence}>
                <span className="dot">•</span>
                SILENCE
              </button>
              <button className="btn btn-prime" id="btnPrime" onClick={handlePrime}>
                PRIME<br/>BOLUS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PumpSimulator;