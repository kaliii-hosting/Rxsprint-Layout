import React, { useState, useEffect } from 'react';
import { Calculator as CalculatorIcon, Grid3X3, Heart, Weight } from 'lucide-react';
import './Calculator.css';

const Calculator = () => {
  // Calculator mode state
  const [calculatorMode, setCalculatorMode] = useState('standard'); // 'standard', 'cross', 'bmi', or 'abw'
  const [deviceMode, setDeviceMode] = useState('desktop'); // For responsive toolbar

  // Standard calculator state
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  // Cross multiplication state
  const [crossValues, setCrossValues] = useState({ A: '', B: '', C: '', D: '' });
  const [activeField, setActiveField] = useState('A');

  // BMI Calculator state
  const [bmiValues, setBmiValues] = useState({
    weight: '',
    height: '',
    weightUnit: 'kg', // 'kg' or 'lb'
    heightUnit: 'm'   // 'm' or 'in'
  });
  const [bmiResult, setBmiResult] = useState(null);

  // ABW Calculator state
  const [abwValues, setAbwValues] = useState({
    gender: 'male', // 'male' or 'female'
    height: '',     // in inches
    actualWeight: '' // in kg
  });
  const [abwResults, setAbwResults] = useState({ ibw: null, abw: null });

  // Detect device mode for responsive toolbar
  useEffect(() => {
    const updateDeviceMode = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceMode('mobile');
      } else if (width < 1024) {
        setDeviceMode('tablet');
      } else {
        setDeviceMode('desktop');
      }
    };
    
    updateDeviceMode();
    window.addEventListener('resize', updateDeviceMode);
    return () => window.removeEventListener('resize', updateDeviceMode);
  }, []);

  // Format display value
  const formatDisplay = (value) => {
    // Convert to number and back to remove trailing zeros
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    // Format large numbers
    if (Math.abs(num) >= 1e9) {
      return num.toExponential(6);
    }
    
    // Limit decimal places
    const str = num.toString();
    if (str.includes('.') && str.split('.')[1].length > 8) {
      return num.toFixed(8).replace(/\.?0+$/, '');
    }
    
    return str;
  };

  // Standard calculator functions
  const inputNumber = (num) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      // Limit input length
      if (display.length < 9 || display === '0') {
        setDisplay(display === '0' ? String(num) : display + num);
      }
    }
  };

  const inputDecimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  const percentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(formatDisplay(String(newValue)));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '−':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return secondValue !== 0 ? firstValue / secondValue : 0;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const equals = () => {
    const inputValue = parseFloat(display);
    
    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(formatDisplay(String(newValue)));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  // Cross multiplication functions
  const inputCrossNumber = (num) => {
    if (activeField) {
      const currentValue = crossValues[activeField];
      if (currentValue.length < 12) { // Increased limit for more numbers
        setCrossValues(prev => ({
          ...prev,
          [activeField]: prev[activeField] + num
        }));
      }
    }
  };

  const inputCrossDecimal = () => {
    if (activeField && !crossValues[activeField].includes('.')) {
      setCrossValues(prev => ({
        ...prev,
        [activeField]: prev[activeField] === '' ? '0.' : prev[activeField] + '.'
      }));
    }
  };

  const clearCross = () => {
    setCrossValues({ A: '', B: '', C: '', D: '' });
    setActiveField('A');
  };

  const backspaceCross = () => {
    if (activeField && crossValues[activeField]) {
      setCrossValues(prev => ({
        ...prev,
        [activeField]: prev[activeField].slice(0, -1)
      }));
    }
  };

  const calculateCross = () => {
    const { A, B, C, D } = crossValues;
    const filled = [A, B, C, D].filter(v => v !== '');
    
    if (filled.length === 3) {
      const numA = parseFloat(A) || 0;
      const numB = parseFloat(B) || 0;
      const numC = parseFloat(C) || 0;
      const numD = parseFloat(D) || 0;
      
      let result;
      let resultField;
      
      if (A === '') {
        result = (numB * numC) / numD;
        resultField = 'A';
      } else if (B === '') {
        result = (numA * numD) / numC;
        resultField = 'B';
      } else if (C === '') {
        result = (numA * numD) / numB;
        resultField = 'C';
      } else if (D === '') {
        result = (numB * numC) / numA;
        resultField = 'D';
      }
      
      if (result !== undefined && !isNaN(result) && isFinite(result)) {
        setCrossValues(prev => ({
          ...prev,
          [resultField]: result.toFixed(2).replace(/\.?0+$/, '')
        }));
      }
    }
  };

  // BMI Calculator functions
  const calculateBMI = () => {
    const weight = parseFloat(bmiValues.weight);
    const height = parseFloat(bmiValues.height);
    
    if (!weight || !height || weight <= 0 || height <= 0) {
      setBmiResult(null);
      return;
    }
    
    let weightInKg = weight;
    let heightInM = height;
    
    // Convert weight to kg if needed
    if (bmiValues.weightUnit === 'lb') {
      weightInKg = weight * 0.453592; // 1 lb = 0.453592 kg
    }
    
    // Convert height to meters if needed
    if (bmiValues.heightUnit === 'in') {
      heightInM = height * 0.0254; // 1 inch = 0.0254 meters
    }
    
    const bmi = weightInKg / (heightInM * heightInM);
    
    let category = '';
    if (bmi < 18.5) {
      category = 'Underweight';
    } else if (bmi >= 18.5 && bmi < 25) {
      category = 'Normal weight';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Overweight';
    } else {
      category = 'Obese';
    }
    
    setBmiResult({
      bmi: parseFloat(bmi.toFixed(2)),
      category: category
    });
  };

  // ABW Calculator functions
  const calculateABW = () => {
    const height = parseFloat(abwValues.height);
    const actualWeight = parseFloat(abwValues.actualWeight);
    
    if (!height || !actualWeight || height <= 0 || actualWeight <= 0) {
      setAbwResults({ ibw: null, abw: null });
      return;
    }
    
    // Calculate IBW using Devine formula
    let ibw;
    if (abwValues.gender === 'male') {
      ibw = 50 + 2.3 * (height - 60);
    } else {
      ibw = 45.5 + 2.3 * (height - 60);
    }
    
    // Ensure IBW is not negative
    if (ibw < 0) ibw = 0;
    
    // Calculate ABW
    const abw = ibw + 0.4 * (actualWeight - ibw);
    
    setAbwResults({
      ibw: parseFloat(ibw.toFixed(2)),
      abw: parseFloat(abw.toFixed(2))
    });
  };

  // Effect to calculate BMI when values change
  useEffect(() => {
    if (calculatorMode === 'bmi') {
      calculateBMI();
    }
  }, [bmiValues, calculatorMode]);

  // Effect to calculate ABW when values change
  useEffect(() => {
    if (calculatorMode === 'abw') {
      calculateABW();
    }
  }, [abwValues, calculatorMode]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (calculatorMode === 'standard') {
        switch(e.key) {
          case '0': case '1': case '2': case '3': case '4':
          case '5': case '6': case '7': case '8': case '9':
            e.preventDefault();
            inputNumber(e.key);
            break;
          case '.':
            e.preventDefault();
            inputDecimal();
            break;
          case '+':
            e.preventDefault();
            performOperation('+');
            break;
          case '-':
            e.preventDefault();
            performOperation('−');
            break;
          case '*':
            e.preventDefault();
            performOperation('×');
            break;
          case '/':
            e.preventDefault();
            performOperation('÷');
            break;
          case 'Enter':
          case '=':
            e.preventDefault();
            equals();
            break;
          case 'Escape':
          case 'c':
          case 'C':
            e.preventDefault();
            clear();
            break;
          case '%':
            e.preventDefault();
            percentage();
            break;
        }
      } else if (calculatorMode === 'cross') {
        switch(e.key) {
          case '0': case '1': case '2': case '3': case '4':
          case '5': case '6': case '7': case '8': case '9':
            e.preventDefault();
            inputCrossNumber(e.key);
            break;
          case '.':
            e.preventDefault();
            inputCrossDecimal();
            break;
          case 'Tab':
            e.preventDefault();
            const fields = ['A', 'C', 'B', 'D'];
            const currentIndex = fields.indexOf(activeField);
            const nextIndex = (currentIndex + 1) % fields.length;
            setActiveField(fields[nextIndex]);
            break;
          case 'Enter':
          case '=':
            e.preventDefault();
            calculateCross();
            break;
          case 'Escape':
          case 'c':
          case 'C':
            e.preventDefault();
            clearCross();
            break;
          case 'Backspace':
            e.preventDefault();
            backspaceCross();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, activeField, previousValue, operation, crossValues, calculatorMode, waitingForNewValue]);

  return (
    <div className="calculator-page page-container">
      {/* Responsive Toolbar with Mode Toggle */}
      <div className={`board-toolbar board-toolbar-${deviceMode}`}>
        {/* Calculator Mode Toggle - Segmented Button */}
        <div className="calculator-toggle-group">
          <button 
            className={`toggle-segment ${calculatorMode === 'standard' ? 'active' : ''}`}
            onClick={() => setCalculatorMode('standard')}
            title="Standard Calculator"
          >
            <CalculatorIcon size={deviceMode === 'mobile' ? 16 : 18} />
            <span>Standard</span>
          </button>
          <button 
            className={`toggle-segment ${calculatorMode === 'cross' ? 'active' : ''}`}
            onClick={() => setCalculatorMode('cross')}
            title="Cross Multiplication"
          >
            <Grid3X3 size={deviceMode === 'mobile' ? 16 : 18} />
            <span>Cross Multiply</span>
          </button>
          <button 
            className={`toggle-segment ${calculatorMode === 'bmi' ? 'active' : ''}`}
            onClick={() => setCalculatorMode('bmi')}
            title="BMI Calculator"
          >
            <Heart size={deviceMode === 'mobile' ? 16 : 18} />
            <span>BMI</span>
          </button>
          <button 
            className={`toggle-segment ${calculatorMode === 'abw' ? 'active' : ''}`}
            onClick={() => setCalculatorMode('abw')}
            title="ABW Calculator"
          >
            <Weight size={deviceMode === 'mobile' ? 16 : 18} />
            <span>ABW</span>
          </button>
        </div>
      </div>
      
      <div className="calculator-content">
        <div className="calculator-dashboard">
            
          <div className="calculator-wrapper">
            {/* Standard Calculator */}
            {calculatorMode === 'standard' && (
              <>
            <div className="calculator-display">
              <div className="display-value">{formatDisplay(display)}</div>
            </div>
            
            <div className="calculator-keypad">
              <button className="calc-btn function" onClick={clear}>
                {display === '0' && !previousValue ? 'AC' : 'C'}
              </button>
              <button className="calc-btn function" onClick={toggleSign}>
                +/−
              </button>
              <button className="calc-btn function" onClick={percentage}>
                %
              </button>
              <button 
                className={`calc-btn operation ${operation === '÷' ? 'active' : ''}`} 
                onClick={() => performOperation('÷')}
              >
                ÷
              </button>
              
              <button className="calc-btn number" onClick={() => inputNumber(7)}>7</button>
              <button className="calc-btn number" onClick={() => inputNumber(8)}>8</button>
              <button className="calc-btn number" onClick={() => inputNumber(9)}>9</button>
              <button 
                className={`calc-btn operation ${operation === '×' ? 'active' : ''}`} 
                onClick={() => performOperation('×')}
              >
                ×
              </button>
              
              <button className="calc-btn number" onClick={() => inputNumber(4)}>4</button>
              <button className="calc-btn number" onClick={() => inputNumber(5)}>5</button>
              <button className="calc-btn number" onClick={() => inputNumber(6)}>6</button>
              <button 
                className={`calc-btn operation ${operation === '−' ? 'active' : ''}`} 
                onClick={() => performOperation('−')}
              >
                −
              </button>
              
              <button className="calc-btn number" onClick={() => inputNumber(1)}>1</button>
              <button className="calc-btn number" onClick={() => inputNumber(2)}>2</button>
              <button className="calc-btn number" onClick={() => inputNumber(3)}>3</button>
              <button 
                className={`calc-btn operation ${operation === '+' ? 'active' : ''}`} 
                onClick={() => performOperation('+')}
              >
                +
              </button>
              
              <button className="calc-btn number zero" onClick={() => inputNumber(0)}>0</button>
              <button className="calc-btn number" onClick={inputDecimal}>.</button>
              <button className="calc-btn equals" onClick={equals}>=</button>
            </div>
          </>
        )}

        {/* Cross Multiplication Calculator */}
        {calculatorMode === 'cross' && (
          <>
            <div className="cross-mode-display">
              <div className="cross-equation">
                <div className="fraction">
                  <input
                    type="text"
                    value={crossValues.A}
                    onClick={() => setActiveField('A')}
                    className={`fraction-input ${activeField === 'A' ? 'active' : ''}`}
                    placeholder="A"
                    readOnly
                  />
                  <div className="fraction-bar"></div>
                  <input
                    type="text"
                    value={crossValues.B}
                    onClick={() => setActiveField('B')}
                    className={`fraction-input ${activeField === 'B' ? 'active' : ''}`}
                    placeholder="B"
                    readOnly
                  />
                </div>
                
                <div className="equals-symbol">=</div>
                
                <div className="fraction">
                  <input
                    type="text"
                    value={crossValues.C}
                    onClick={() => setActiveField('C')}
                    className={`fraction-input ${activeField === 'C' ? 'active' : ''}`}
                    placeholder="C"
                    readOnly
                  />
                  <div className="fraction-bar"></div>
                  <input
                    type="text"
                    value={crossValues.D}
                    onClick={() => setActiveField('D')}
                    className={`fraction-input ${activeField === 'D' ? 'active' : ''}`}
                    placeholder="D"
                    readOnly
                  />
                </div>
              </div>
            </div>
            
            <div className="calculator-keypad">
              <button className="calc-btn function" onClick={clearCross}>AC</button>
              <button className="calc-btn function" onClick={() => {
                const fields = ['A', 'C', 'B', 'D'];
                const currentIndex = fields.indexOf(activeField);
                const nextIndex = (currentIndex + 1) % fields.length;
                setActiveField(fields[nextIndex]);
              }}>Tab</button>
              <button className="calc-btn function" onClick={backspaceCross}>←</button>
              <button className="calc-btn function" disabled>−</button>
              
              <button className="calc-btn number" onClick={() => inputCrossNumber('7')}>7</button>
              <button className="calc-btn number" onClick={() => inputCrossNumber('8')}>8</button>
              <button className="calc-btn number" onClick={() => inputCrossNumber('9')}>9</button>
              <button className="calc-btn function" disabled>×</button>
              
              <button className="calc-btn number" onClick={() => inputCrossNumber('4')}>4</button>
              <button className="calc-btn number" onClick={() => inputCrossNumber('5')}>5</button>
              <button className="calc-btn number" onClick={() => inputCrossNumber('6')}>6</button>
              <button className="calc-btn function" disabled>−</button>
              
              <button className="calc-btn number" onClick={() => inputCrossNumber('1')}>1</button>
              <button className="calc-btn number" onClick={() => inputCrossNumber('2')}>2</button>
              <button className="calc-btn number" onClick={() => inputCrossNumber('3')}>3</button>
              <button className="calc-btn function" disabled>+</button>
              
              <button className="calc-btn number zero" onClick={() => inputCrossNumber('0')}>0</button>
              <button className="calc-btn number" onClick={inputCrossDecimal}>.</button>
              <button className="calc-btn equals" onClick={calculateCross}>=</button>
            </div>
          </>
        )}

        {/* BMI Calculator */}
        {calculatorMode === 'bmi' && (
          <div className="special-calculator">
            <div className="calc-header">
              <h3>Body Mass Index (BMI) Calculator</h3>
            </div>
            
            <div className="calc-inputs">
              <div className="input-group">
                <label>Weight</label>
                <div className="input-with-toggle">
                  <input
                    type="number"
                    value={bmiValues.weight}
                    onChange={(e) => setBmiValues(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="Enter weight"
                    className="calc-input"
                  />
                  <div className="unit-toggle">
                    <button 
                      className={`unit-btn ${bmiValues.weightUnit === 'kg' ? 'active' : ''}`}
                      onClick={() => setBmiValues(prev => ({ ...prev, weightUnit: 'kg' }))}
                    >
                      kg
                    </button>
                    <button 
                      className={`unit-btn ${bmiValues.weightUnit === 'lb' ? 'active' : ''}`}
                      onClick={() => setBmiValues(prev => ({ ...prev, weightUnit: 'lb' }))}
                    >
                      lb
                    </button>
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Height</label>
                <div className="input-with-toggle">
                  <input
                    type="number"
                    value={bmiValues.height}
                    onChange={(e) => setBmiValues(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="Enter height"
                    className="calc-input"
                  />
                  <div className="unit-toggle">
                    <button 
                      className={`unit-btn ${bmiValues.heightUnit === 'm' ? 'active' : ''}`}
                      onClick={() => setBmiValues(prev => ({ ...prev, heightUnit: 'm' }))}
                    >
                      m
                    </button>
                    <button 
                      className={`unit-btn ${bmiValues.heightUnit === 'in' ? 'active' : ''}`}
                      onClick={() => setBmiValues(prev => ({ ...prev, heightUnit: 'in' }))}
                    >
                      in
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {bmiResult && (
              <div className="calc-results">
                <div className="result-card highlight-neon">
                  <div className="result-label">BMI</div>
                  <div className="result-value">{bmiResult.bmi}</div>
                  <div className="result-category">{bmiResult.category}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABW Calculator */}
        {calculatorMode === 'abw' && (
          <div className="special-calculator">
            <div className="calc-header">
              <h3>Adjusted Body Weight (ABW) Calculator</h3>
            </div>
            
            <div className="calc-inputs">
              <div className="input-group">
                <label>Gender</label>
                <div className="gender-toggle">
                  <button 
                    className={`gender-btn ${abwValues.gender === 'male' ? 'active' : ''}`}
                    onClick={() => setAbwValues(prev => ({ ...prev, gender: 'male' }))}
                  >
                    Male
                  </button>
                  <button 
                    className={`gender-btn ${abwValues.gender === 'female' ? 'active' : ''}`}
                    onClick={() => setAbwValues(prev => ({ ...prev, gender: 'female' }))}
                  >
                    Female
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Height (inches)</label>
                <input
                  type="number"
                  value={abwValues.height}
                  onChange={(e) => setAbwValues(prev => ({ ...prev, height: e.target.value }))}
                  placeholder="Enter height in inches"
                  className="calc-input"
                />
              </div>

              <div className="input-group">
                <label>Actual Body Weight (kg)</label>
                <input
                  type="number"
                  value={abwValues.actualWeight}
                  onChange={(e) => setAbwValues(prev => ({ ...prev, actualWeight: e.target.value }))}
                  placeholder="Enter actual weight in kg"
                  className="calc-input"
                />
              </div>
            </div>

            {abwResults.ibw !== null && abwResults.abw !== null && (
              <div className="calc-results">
                <div className="result-card">
                  <div className="result-label">Ideal Body Weight (IBW)</div>
                  <div className="result-value">{abwResults.ibw} kg</div>
                </div>
                <div className="result-card highlight-neon">
                  <div className="result-label">Adjusted Body Weight (ABW)</div>
                  <div className="result-value">{abwResults.abw} kg</div>
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;