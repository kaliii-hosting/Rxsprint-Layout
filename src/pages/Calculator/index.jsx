import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, Trash2, Clock } from 'lucide-react';
import { useCalculator } from '../../contexts/CalculatorContext';
import './Calculator.css';

const Calculator = () => {
  const { activeTab, setActiveTab } = useCalculator();
  const [showHistory, setShowHistory] = useState(true);
  
  // Standard calculator state
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [history, setHistory] = useState([]);

  // Cross multiplication state
  const [crossValues, setCrossValues] = useState({ A: '', B: '', C: '', D: '' });
  const [activeField, setActiveField] = useState('A');
  
  // Get current expression for display
  const getCurrentExpression = () => {
    if (previousValue !== null && operation) {
      if (waitingForNewValue) {
        return `${previousValue}${operation}`;
      }
      return `${previousValue}${operation}${display}`;
    }
    return display !== '0' ? display : '';
  };

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
  };

  const clearHistory = () => {
    setHistory([{ type: 'date', value: 'Today' }]);
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
      
      if (nextOperation === '=') {
        const historyEntry = {
          type: 'calc',
          label: `${currentValue}${operation}${inputValue}`,
          value: String(newValue)
        };
        setHistory([...history, historyEntry]);
        setPreviousValue(null);
        setOperation(null);
        return;
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

      if (activeTab === 'calculator') {
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
      } else if (activeTab === 'cross') {
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
  }, [activeTab, display, activeField, previousValue, operation, crossValues]);

  return (
    <div className="calculator-page">
      <div className="calculator-wrapper">
        {activeTab === 'calculator' ? (
          <div className="calculator-main">
            <div className="calc-main-content">
              <div className="calc-display">{display}</div>
              
              <div className="calc-keypad">
                <button className="calc-btn number" onClick={() => inputNumber(7)}>7</button>
                <button className="calc-btn number" onClick={() => inputNumber(8)}>8</button>
                <button className="calc-btn number" onClick={() => inputNumber(9)}>9</button>
                <button className="calc-btn function" onClick={clear}>C</button>
                <button className="calc-btn operation" onClick={() => performOperation('÷')}>÷</button>
                
                <button className="calc-btn number" onClick={() => inputNumber(4)}>4</button>
                <button className="calc-btn number" onClick={() => inputNumber(5)}>5</button>
                <button className="calc-btn number" onClick={() => inputNumber(6)}>6</button>
                <button className="calc-btn function"></button>
                <button className="calc-btn operation" onClick={() => performOperation('×')}>×</button>
                
                <button className="calc-btn number" onClick={() => inputNumber(1)}>1</button>
                <button className="calc-btn number" onClick={() => inputNumber(2)}>2</button>
                <button className="calc-btn number" onClick={() => inputNumber(3)}>3</button>
                <button className="calc-btn function" onClick={() => performOperation('%')}>%</button>
                <button className="calc-btn operation" onClick={() => performOperation('-')}>−</button>
                
                <button className="calc-btn special" onClick={() => setActiveTab('cross')}>
                  <CalcIcon size={20} />
                </button>
                <button className="calc-btn number" onClick={() => inputNumber(0)}>0</button>
                <button className="calc-btn number" onClick={inputDecimal}>.</button>
                <button className="calc-btn equals" onClick={() => performOperation('=')}>=</button>
                <button className="calc-btn operation" onClick={() => performOperation('+')}>+</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="cross-multiplication">
            <div className="cross-main-content">
              <div className="cross-display">
                <div className="cross-equation">
                  <div className="fraction">
                    <input
                      type="text"
                      value={crossValues.A}
                      onClick={() => setActiveField('A')}
                      className={`cross-input ${activeField === 'A' ? 'active' : ''}`}
                      placeholder="A"
                      readOnly
                    />
                    <div className="fraction-line"></div>
                    <input
                      type="text"
                      value={crossValues.B}
                      onClick={() => setActiveField('B')}
                      className={`cross-input ${activeField === 'B' ? 'active' : ''}`}
                      placeholder="B"
                      readOnly
                    />
                  </div>
                  <div className="equals">=</div>
                  <div className="fraction">
                    <input
                      type="text"
                      value={crossValues.C}
                      onClick={() => setActiveField('C')}
                      className={`cross-input ${activeField === 'C' ? 'active' : ''}`}
                      placeholder="C"
                      readOnly
                    />
                    <div className="fraction-line"></div>
                    <input
                      type="text"
                      value={crossValues.D}
                      onClick={() => setActiveField('D')}
                      className={`cross-input ${activeField === 'D' ? 'active' : ''}`}
                      placeholder="D"
                      readOnly
                    />
                  </div>
                </div>
              </div>
              
              <div className="cross-keypad">
                <button className="calc-btn number" onClick={() => inputCrossNumber('7')}>7</button>
                <button className="calc-btn number" onClick={() => inputCrossNumber('8')}>8</button>
                <button className="calc-btn number" onClick={() => inputCrossNumber('9')}>9</button>
                <button className="calc-btn function" onClick={clearCross}>⌫</button>
                <button className="calc-btn operation" onClick={resetCross}>C</button>
                
                <button className="calc-btn number" onClick={() => inputCrossNumber('4')}>4</button>
                <button className="calc-btn number" onClick={() => inputCrossNumber('5')}>5</button>
                <button className="calc-btn number" onClick={() => inputCrossNumber('6')}>6</button>
                <button className="calc-btn function disabled">+/-</button>
                <button className="calc-btn operation disabled">×</button>
                
                <button className="calc-btn number" onClick={() => inputCrossNumber('1')}>1</button>
                <button className="calc-btn number" onClick={() => inputCrossNumber('2')}>2</button>
                <button className="calc-btn number" onClick={() => inputCrossNumber('3')}>3</button>
                <button className="calc-btn function disabled">%</button>
                <button className="calc-btn operation disabled">−</button>
                
                <button className="calc-btn special" onClick={() => setActiveTab('calculator')}>
                  <CalcIcon size={20} />
                </button>
                <button className="calc-btn number" onClick={() => inputCrossNumber('0')}>0</button>
                <button className="calc-btn number" onClick={inputCrossDecimal}>.</button>
                <button className="calc-btn equals" onClick={calculateCross}>=</button>
                <button className="calc-btn operation disabled">+</button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {activeTab === 'calculator' && showHistory && (
        <div className="calc-sidebar">
          <div className="sidebar-header">
            <h3 className="history-title">History</h3>
            <button className="delete-icon-btn" onClick={clearHistory}>
              <Trash2 size={18} />
            </button>
          </div>
          <div className="history-list">
            {getCurrentExpression() && (
              <div className="history-item current-input">
                <div className="calc-label">Current</div>
                <div className="calc-result current">{getCurrentExpression()}</div>
              </div>
            )}
            {history.length === 0 && !getCurrentExpression() ? (
              <div className="empty-history">
                <p>No calculations yet</p>
                <p className="empty-hint">Your calculation history will appear here</p>
              </div>
            ) : (
              history.map((item, index) => (
                <div key={index} className={`history-item ${item.type}`}>
                  {item.type === 'date' ? (
                    <div className="date-label">{item.value}</div>
                  ) : (
                    <>
                      <div className="calc-label">{item.label}</div>
                      <div className="calc-result">{item.value}</div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;