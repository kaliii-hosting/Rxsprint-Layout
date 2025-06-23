import React, { useState, useEffect } from 'react';
import { Calculator as CalculatorIcon, X, Divide, Plus, Minus, Percent, Hash, Delete } from 'lucide-react';
import './Calculator.css';

const Calculator = () => {
  // Calculator mode state
  const [calculatorMode, setCalculatorMode] = useState('standard'); // 'standard' or 'cross'

  // Standard calculator state
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [calculationDisplay, setCalculationDisplay] = useState('');

  // Cross multiplication state
  const [crossValues, setCrossValues] = useState({ A: '', B: '', C: '', D: '' });
  const [activeField, setActiveField] = useState('A');
  

  // Standard calculator functions
  const inputNumber = (num) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
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
    setCalculationDisplay('');
  };


  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    // Handle percentage conversion
    if (nextOperation === '%') {
      if (operation === '×' || operation === '÷') {
        // Convert current value to percentage (divide by 100)
        const percentValue = inputValue / 100;
        setDisplay(String(percentValue));
        // Don't return here - let it continue to perform the operation
      } else if (operation === '+' || operation === '-') {
        // For addition/subtraction, calculate percentage of the first value
        const percentValue = (previousValue * inputValue) / 100;
        setDisplay(String(percentValue));
        // Don't return here - let it continue to perform the operation
      } else {
        // No operation pending, just convert to percentage
        const percentValue = inputValue / 100;
        setDisplay(String(percentValue));
        return;
      }
      return; // Return after setting display
    }

    if (previousValue === null) {
      setPreviousValue(inputValue);
      if (nextOperation !== '=') {
        setCalculationDisplay(`${inputValue} ${nextOperation}`);
      }
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
      
      if (nextOperation === '=') {
        setCalculationDisplay(`${currentValue} ${operation} ${inputValue} =`);
        setPreviousValue(null);
        setOperation(null);
        return;
      } else {
        setCalculationDisplay(`${newValue} ${nextOperation}`);
      }
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '%':
        return (firstValue * secondValue) / 100;
      default:
        return secondValue;
    }
  };

  // Cross multiplication functions
  const inputCrossNumber = (num) => {
    if (activeField) {
      setCrossValues(prev => ({
        ...prev,
        [activeField]: prev[activeField] + num
      }));
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
      
      if (result !== undefined && !isNaN(result)) {
        setCrossValues(prev => ({
          ...prev,
          [resultField]: result.toFixed(2).replace(/\.?0+$/, '')
        }));
      }
    }
  };

  const resetCross = () => {
    setCrossValues({ A: '', B: '', C: '', D: '' });
    setActiveField('A');
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default behavior for calculator keys
      if (['0','1','2','3','4','5','6','7','8','9','.','/','-','+','*','%','Enter','=','Escape','Backspace','Delete'].includes(e.key)) {
        e.preventDefault();
      }

      // Only handle keyboard input for active calculator mode
      if (calculatorMode === 'standard') {
        // Standard calculator keyboard handling
        switch(e.key) {
          case '0': case '1': case '2': case '3': case '4':
          case '5': case '6': case '7': case '8': case '9':
            inputNumber(e.key);
            break;
          case '.':
            inputDecimal();
            break;
          case '+':
            performOperation('+');
            break;
          case '-':
            performOperation('-');
            break;
          case '*':
            performOperation('×');
            break;
          case '/':
            performOperation('÷');
            break;
          case '%':
            performOperation('%');
            break;
          case 'Enter':
          case '=':
            performOperation('=');
            break;
          case 'Escape':
          case 'c':
          case 'C':
            clear();
            break;
          case 'Backspace':
          case 'Delete':
            if (display.length > 1) {
              setDisplay(display.slice(0, -1));
            } else {
              setDisplay('0');
            }
            break;
        }
      } else if (calculatorMode === 'cross') {
        // Cross multiplication keyboard handling
        switch(e.key) {
          case '0': case '1': case '2': case '3': case '4':
          case '5': case '6': case '7': case '8': case '9':
            inputCrossNumber(e.key);
            break;
          case '.':
            inputCrossDecimal();
            break;
          case 'Tab':
            e.preventDefault();
            // Cycle through fields A -> B -> C -> D -> A
            const fields = ['A', 'B', 'C', 'D'];
            const currentIndex = fields.indexOf(activeField);
            const nextIndex = (currentIndex + 1) % fields.length;
            setActiveField(fields[nextIndex]);
            break;
          case 'Enter':
          case '=':
            calculateCross();
            break;
          case 'Escape':
          case 'c':
          case 'C':
            resetCross();
            break;
          case 'Backspace':
          case 'Delete':
            clearCross();
            break;
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [display, activeField, previousValue, operation, crossValues, calculatorMode]);

  return (
    <div className="calculator-page page-container">
      <div className="calculator-content">
        <div className="calculator-dashboard">
          {/* Calculator Mode Selector Card */}
          <div className="dashboard-card mode-selector-card">
            <div className="card-header">
              <h3>Calculator Mode</h3>
              <CalculatorIcon size={20} />
            </div>
            <div className="card-body">
              <div className="mode-selector-grid">
                <button
                  className={`mode-selector-btn ${calculatorMode === 'standard' ? 'active' : ''}`}
                  onClick={() => setCalculatorMode('standard')}
                >
                  <CalculatorIcon size={24} />
                  <span>Standard</span>
                </button>
                <button
                  className={`mode-selector-btn ${calculatorMode === 'cross' ? 'active' : ''}`}
                  onClick={() => setCalculatorMode('cross')}
                >
                  <Hash size={24} />
                  <span>Cross Multiplication</span>
                </button>
              </div>
            </div>
          </div>

          {/* Standard Calculator Card */}
          {calculatorMode === 'standard' && (
            <div className="dashboard-card calculator-card">
              <div className="card-header">
                <h3>Standard Calculator</h3>
                <CalculatorIcon size={20} />
              </div>
              <div className="card-body">
                <div className="calculator-display-section">
                  <div className="calculation-preview">{calculationDisplay || '\u00A0'}</div>
                  <div className="main-display">{display}</div>
                </div>
                
                <div className="calculator-keypad">
                  <button className="calc-key clear" onClick={clear}>C</button>
                  <button className="calc-key function" onClick={() => performOperation('%')}>
                    <Percent size={18} />
                  </button>
                  <button className="calc-key function" onClick={() => {
                    if (display.length > 1) {
                      setDisplay(display.slice(0, -1));
                    } else {
                      setDisplay('0');
                    }
                  }}>
                    <Delete size={18} />
                  </button>
                  <button className="calc-key operation" onClick={() => performOperation('÷')}>
                    <Divide size={18} />
                  </button>
                  
                  <button className="calc-key number" onClick={() => inputNumber(7)}>7</button>
                  <button className="calc-key number" onClick={() => inputNumber(8)}>8</button>
                  <button className="calc-key number" onClick={() => inputNumber(9)}>9</button>
                  <button className="calc-key operation" onClick={() => performOperation('×')}>
                    <X size={18} />
                  </button>
                  
                  <button className="calc-key number" onClick={() => inputNumber(4)}>4</button>
                  <button className="calc-key number" onClick={() => inputNumber(5)}>5</button>
                  <button className="calc-key number" onClick={() => inputNumber(6)}>6</button>
                  <button className="calc-key operation" onClick={() => performOperation('-')}>
                    <Minus size={18} />
                  </button>
                  
                  <button className="calc-key number" onClick={() => inputNumber(1)}>1</button>
                  <button className="calc-key number" onClick={() => inputNumber(2)}>2</button>
                  <button className="calc-key number" onClick={() => inputNumber(3)}>3</button>
                  <button className="calc-key operation" onClick={() => performOperation('+')}>
                    <Plus size={18} />
                  </button>
                  
                  <button className="calc-key number zero" onClick={() => inputNumber(0)}>0</button>
                  <button className="calc-key number" onClick={inputDecimal}>.</button>
                  <button className="calc-key equals" onClick={() => performOperation('=')}>=</button>
                </div>
              </div>
            </div>
          )}

          {/* Cross Multiplication Calculator Card */}
          {calculatorMode === 'cross' && (
            <div className="dashboard-card calculator-card">
              <div className="card-header">
                <h3>Cross Multiplication Calculator</h3>
                <Hash size={20} />
              </div>
              <div className="card-body">
                <div className="cross-multiplication-display">
                  <div className="cross-equation">
                    <div className="fraction-container">
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
                    
                    <div className="equation-equals">=</div>
                    
                    <div className="fraction-container">
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
                  
                  <div className="active-field-indicator">
                    Active Field: <span className="field-label">{activeField}</span>
                  </div>
                </div>
                
                <div className="calculator-keypad cross-keypad">
                  <button className="calc-key clear" onClick={resetCross}>C</button>
                  <button className="calc-key function" onClick={() => {
                    const fields = ['A', 'B', 'C', 'D'];
                    const currentIndex = fields.indexOf(activeField);
                    const nextIndex = (currentIndex + 1) % fields.length;
                    setActiveField(fields[nextIndex]);
                  }}>Tab</button>
                  <button className="calc-key function" onClick={clearCross}>
                    <Delete size={18} />
                  </button>
                  <button className="calc-key disabled" disabled>÷</button>
                  
                  <button className="calc-key number" onClick={() => inputCrossNumber('7')}>7</button>
                  <button className="calc-key number" onClick={() => inputCrossNumber('8')}>8</button>
                  <button className="calc-key number" onClick={() => inputCrossNumber('9')}>9</button>
                  <button className="calc-key disabled" disabled>×</button>
                  
                  <button className="calc-key number" onClick={() => inputCrossNumber('4')}>4</button>
                  <button className="calc-key number" onClick={() => inputCrossNumber('5')}>5</button>
                  <button className="calc-key number" onClick={() => inputCrossNumber('6')}>6</button>
                  <button className="calc-key disabled" disabled>−</button>
                  
                  <button className="calc-key number" onClick={() => inputCrossNumber('1')}>1</button>
                  <button className="calc-key number" onClick={() => inputCrossNumber('2')}>2</button>
                  <button className="calc-key number" onClick={() => inputCrossNumber('3')}>3</button>
                  <button className="calc-key disabled" disabled>+</button>
                  
                  <button className="calc-key number zero" onClick={() => inputCrossNumber('0')}>0</button>
                  <button className="calc-key number" onClick={inputCrossDecimal}>.</button>
                  <button className="calc-key equals" onClick={calculateCross}>=</button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions Card */}
          <div className="dashboard-card instructions-card">
            <div className="card-header">
              <h3>Instructions</h3>
            </div>
            <div className="card-body">
              <div className="instructions-content">
                {calculatorMode === 'standard' ? (
                  <div className="instruction-list">
                    <h4>Standard Calculator</h4>
                    <ul>
                      <li>Use number keys (0-9) to input numbers</li>
                      <li>Press operation buttons (+, −, ×, ÷) to perform calculations</li>
                      <li>Press = to get the result</li>
                      <li>Press C to clear all</li>
                      <li>Use % for percentage calculations</li>
                      <li>Keyboard shortcuts are supported</li>
                    </ul>
                  </div>
                ) : (
                  <div className="instruction-list">
                    <h4>Cross Multiplication</h4>
                    <ul>
                      <li>Click on any field (A, B, C, D) to select it</li>
                      <li>Enter values in 3 out of 4 fields</li>
                      <li>Press = to calculate the missing value</li>
                      <li>Press Tab to move between fields</li>
                      <li>Press C to clear all values</li>
                      <li>Formula: A/B = C/D</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;