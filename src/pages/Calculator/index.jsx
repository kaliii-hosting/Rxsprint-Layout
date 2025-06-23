import React, { useState, useEffect } from 'react';
import './Calculator.css';

const Calculator = () => {
  // Calculator mode state
  const [calculatorMode, setCalculatorMode] = useState('standard'); // 'standard' or 'cross'

  // Standard calculator state
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  // Cross multiplication state
  const [crossValues, setCrossValues] = useState({ A: '', B: '', C: '', D: '' });
  const [activeField, setActiveField] = useState('A');

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
      if (currentValue.length < 6) { // Limit input length
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
            const fields = ['A', 'B', 'C', 'D'];
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
    <div className="calculator-page">
      <div className="calculator-content">
        <div className="calculator-dashboard">
          <div className="calculator-wrapper">
            {/* Mode Selector */}
            <div className="mode-selector">
              <button
                className={`mode-btn ${calculatorMode === 'standard' ? 'active' : ''}`}
                onClick={() => setCalculatorMode('standard')}
              >
                Standard
              </button>
              <button
                className={`mode-btn ${calculatorMode === 'cross' ? 'active' : ''}`}
                onClick={() => setCalculatorMode('cross')}
              >
                Cross Multiplication
              </button>
            </div>

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
                const fields = ['A', 'B', 'C', 'D'];
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;