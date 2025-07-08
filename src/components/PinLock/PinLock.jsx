import React, { useState, useEffect, useRef } from 'react';
import { X, Pill } from 'lucide-react';
import './PinLock.css';

const PinLock = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPin = '2112';
  
  // Animation refs
  const pinContainerRef = useRef(null);
  const pinDotsRef = useRef([]);
  const creatureRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  // Keyboard handling
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key >= '0' && e.key <= '9' && pin.length < 4) {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      } else if (e.key === 'Enter' && pin.length === 4) {
        checkPin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pin]);

  // Creature animation setup - Exact recreation with anime.js
  useEffect(() => {
    // Load anime.js library
    const loadAnimeJS = async () => {
      if (window.anime) return; // Already loaded
      
      const script = document.createElement('script');
      script.type = 'module';
      script.innerHTML = `
        import { animate, createTimeline, createTimer, stagger, utils } from 'https://esm.sh/animejs';
        window.animeUtils = { animate, createTimeline, createTimer, stagger, utils };
      `;
      document.head.appendChild(script);
      
      // Wait for the library to load
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (window.animeUtils) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    };

    const initAnimation = async () => {
      await loadAnimeJS();
      
      const { animate, createTimeline, createTimer, stagger, utils } = window.animeUtils;
      
      const creatureEl = document.querySelector('#creature');
      if (!creatureEl) return;

      const viewport = { w: window.innerWidth * .5, h: window.innerHeight * .5 };
      const cursor = { x: 0, y: 0 };
      const rows = 13;
      const grid = [rows, rows];
      const from = 'center';
      const scaleStagger = stagger([2, 5], { ease: 'inQuad', grid, from });
      const opacityStagger = stagger([1, .1], { grid, from });

      // Create particles exactly as in original
      for (let i = 0; i < (rows * rows); i++) {
        creatureEl.appendChild(document.createElement('div'));
      }

      const particuleEls = creatureEl.querySelectorAll('div');

      utils.set(creatureEl, {
        width: rows * 10 + 'em',
        height: rows * 10 + 'em'
      });

      utils.set(particuleEls, {
        x: 0,
        y: 0,
        scale: scaleStagger,
        opacity: opacityStagger,
        background: stagger([80, 20], { grid, from,
          modifier: v => `hsl(4, 70%, ${v}%)`,
        }),
        boxShadow: stagger([8, 1], { grid, from,
          modifier: v => `0px 0px ${utils.round(v, 0)}em 0px var(--red)`,
        }),
        zIndex: stagger([rows * rows, 1], { grid, from, modifier: utils.round(0) }),
      });

      const pulse = () => {
        animate(particuleEls, {
          keyframes: [
            {
              scale: 5,
              opacity: 1,
              delay: stagger(90, { start: 1650, grid, from }),
              duration: 150,
            }, {
              scale: scaleStagger,
              opacity: opacityStagger,
              ease: 'inOutQuad',
              duration: 600
            }
          ],
        });
      }

      const mainLoop = createTimer({
        frameRate: 15, // Animate to the new cursor position every 250ms
        onUpdate: () => {
          animate(particuleEls, {
            x: cursor.x,
            y: cursor.y,
            delay: stagger(40, { grid, from }),
            duration: stagger(120, { start: 750, ease: 'inQuad', grid, from }),
            ease: 'inOut',
            composition: 'blend', // This allows the animations to overlap nicely
          });
        }
      });

      const autoMove = createTimeline()
      .add(cursor, {
        x: [-viewport.w * .45, viewport.w * .45],
        modifier: x => x + Math.sin(mainLoop.currentTime * .0007) * viewport.w * .5,
        duration: 3000,
        ease: 'inOutExpo',
        alternate: true,
        loop: true,
        onBegin: pulse,
        onLoop: pulse,
      }, 0)
      .add(cursor, {
        y: [-viewport.h * .45, viewport.h * .45],
        modifier: y => y + Math.cos(mainLoop.currentTime * .00012) * viewport.h * .5,
        duration: 1000,
        ease: 'inOutQuad',
        alternate: true,
        loop: true,
      }, 0);

      const manualMovementTimeout = createTimer({
        duration: 1500,
        onComplete: () => autoMove.play(),
      });

      const followPointer = e => {
        const event = e.type === 'touchmove' ? e.touches[0] : e;
        cursor.x = event.pageX - viewport.w;
        cursor.y = event.pageY - viewport.h;
        autoMove.pause();
        manualMovementTimeout.restart();
      }

      document.addEventListener('mousemove', followPointer);
      document.addEventListener('touchmove', followPointer);

      // Store cleanup functions
      return () => {
        document.removeEventListener('mousemove', followPointer);
        document.removeEventListener('touchmove', followPointer);
        
        // Clean up particles
        particuleEls.forEach(particle => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        });
      };
    };

    let cleanup;
    initAnimation().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      // Add animation to the dot
      const dotIndex = pin.length;
      if (pinDotsRef.current[dotIndex]) {
        pinDotsRef.current[dotIndex].classList.add('animate-fill');
      }
      
      if (newPin.length === 4) {
        setTimeout(() => checkPin(newPin), 300);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      // Remove animation from the last dot
      const dotIndex = pin.length - 1;
      if (pinDotsRef.current[dotIndex]) {
        pinDotsRef.current[dotIndex].classList.remove('animate-fill');
      }
      
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  const checkPin = (pinToCheck = pin) => {
    if (pinToCheck === correctPin) {
      // Success animation
      pinDotsRef.current.forEach((dot, index) => {
        if (dot) {
          setTimeout(() => {
            dot.classList.add('success');
          }, index * 50);
        }
      });
      
      setTimeout(onUnlock, 600);
    } else {
      // Error handling
      setError(true);
      
      // Shake animation
      const container = pinContainerRef.current;
      if (container) {
        container.classList.add('shake');
        
        // Add error state to dots
        pinDotsRef.current.forEach(dot => {
          if (dot && dot.classList.contains('filled')) {
            dot.classList.add('error');
          }
        });
        
        setTimeout(() => {
          container.classList.remove('shake');
          // Clear dots
          pinDotsRef.current.forEach(dot => {
            if (dot) {
              dot.classList.remove('filled', 'error', 'animate-fill');
            }
          });
          setPin('');
          setError(false);
        }, 600);
      }
    }
  };

  const clearPin = () => {
    setPin('');
    setError(false);
    pinDotsRef.current.forEach(dot => {
      if (dot) {
        dot.classList.remove('filled', 'error', 'animate-fill', 'success');
      }
    });
  };

  return (
    <div className="pin-lock-overlay">
      {/* Creature Animation Background */}
      <div id="creature-wrapper">
        <div id="creature"></div>
      </div>
      
      {/* Background container to prevent animation showing through */}
      <div className="pin-lock-container-bg">
        <div className="pin-lock-wrapper">
          <div className="pin-lock-container" ref={pinContainerRef}>
            <div className="pin-header">
              <div className="pin-logo">
                <img 
                  src="https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//RXSPRINT%20SVG%20LOGO.svg" 
                  alt="RxSprint Logo" 
                  className="pin-logo-image"
                />
              </div>
              <h1 className="pin-title">Enter Passcode</h1>
            </div>
            
            <div className="pin-dots-container">
              <div className="pin-dots">
                {[0, 1, 2, 3].map((index) => (
                  <div 
                    key={index}
                    ref={el => pinDotsRef.current[index] = el}
                    className={`pin-dot ${index < pin.length ? 'filled' : ''}`}
                  >
                    <div className="pin-dot-inner"></div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pin-pad">
              <div className="pin-pad-numbers">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    className="pin-button"
                    onClick={() => handleNumberClick(num.toString())}
                    type="button"
                  >
                    <span className="pin-button-number">{num}</span>
                    <span className="pin-button-letters">
                      {num === 2 && 'ABC'}
                      {num === 3 && 'DEF'}
                      {num === 4 && 'GHI'}
                      {num === 5 && 'JKL'}
                      {num === 6 && 'MNO'}
                      {num === 7 && 'PQRS'}
                      {num === 8 && 'TUV'}
                      {num === 9 && 'WXYZ'}
                    </span>
                  </button>
                ))}
                
                <button
                  className="pin-button pin-button-clear"
                  onClick={clearPin}
                  type="button"
                >
                  Clear
                </button>
                
                <button
                  className="pin-button"
                  onClick={() => handleNumberClick('0')}
                  type="button"
                >
                  <span className="pin-button-number">0</span>
                </button>
                
                <button
                  className="pin-button pin-button-delete"
                  onClick={handleDelete}
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="18" y1="9" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="9" x2="18" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinLock;