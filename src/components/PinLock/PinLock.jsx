import React, { useState, useEffect, useRef } from 'react';
import { Lock, X } from 'lucide-react';
import { gsap } from 'gsap';
import './PinLock.css';

const PinLock = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPin = '2112';
  
  // Animation refs
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const heartPulseRef = useRef(null);
  const heartGlowRef = useRef(null);
  const ecgPathRef = useRef(null);
  const ecgGlowRef = useRef(null);
  const particlesRef = useRef([]);
  const pinContainerRef = useRef(null);

  // Animation setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const logo = logoRef.current;
    const heartPulse = heartPulseRef.current;
    const heartGlow = heartGlowRef.current;
    const ecgPath = ecgPathRef.current;
    const ecgGlow = ecgGlowRef.current;
    const pinContainer = pinContainerRef.current;

    // Create particles
    const particlesContainer = container.querySelector('.particles-container');
    if (particlesContainer) {
      const containerRect = container.getBoundingClientRect();
      
      for (let i = 0; i < 60; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particlesContainer.appendChild(particle);
        particlesRef.current.push(particle);
        
        // Random position across full container
        gsap.set(particle, {
          left: Math.random() * containerRect.width + 'px',
          top: Math.random() * containerRect.height + 'px',
          scale: Math.random() * 0.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.3
        });
      }

      // Animate particles
      particlesRef.current.forEach((particle, i) => {
        gsap.to(particle, {
          x: `+=${Math.random() * 200 - 100}`,
          y: `+=${Math.random() * 200 - 100}`,
          duration: Math.random() * 10 + 10,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: Math.random() * 5
        });
      });
    }

    // Heart beat animation timeline
    const heartbeatTL = gsap.timeline({ repeat: -1 });
    
    if (logo) {
      heartbeatTL
        .to(logo, { scale: 1.1, duration: 0.1, ease: "power2.in" })
        .to(logo, { scale: 0.95, duration: 0.15, ease: "power2.out" })
        .to(logo, { scale: 1.05, duration: 0.1, ease: "power2.in" })
        .to(logo, { scale: 1, duration: 0.15, ease: "power2.out" })
        .to(logo, { scale: 1, duration: 0.5 });
    }

    // Heart pulse effect
    if (heartPulse) {
      const pulseTL = gsap.timeline({ repeat: -1 });
      pulseTL
        .to(heartPulse, {
          scale: 1.5,
          opacity: 0,
          duration: 1,
          ease: "power2.out"
        })
        .set(heartPulse, { scale: 1, opacity: 0.8 });
    }

    // Heart glow effect
    if (heartGlow) {
      gsap.to(heartGlow, {
        scale: 1.1,
        opacity: 0.6,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

    // ECG line animation
    if (ecgPath && ecgGlow) {
      const pathLength = ecgPath.getTotalLength();
      
      gsap.set([ecgPath, ecgGlow], {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength
      });

      // Continuous ECG drawing
      const ecgTL = gsap.timeline({ repeat: -1 });
      ecgTL.to([ecgPath, ecgGlow], {
        strokeDashoffset: -pathLength,
        duration: 3,
        ease: "none"
      });

      // ECG glow intensity synced with heartbeat
      const glowTL = gsap.timeline({ repeat: -1 });
      glowTL
        .to(ecgPath, {
          filter: "drop-shadow(0 0 20px rgba(255, 85, 0, 1)) drop-shadow(0 0 40px rgba(255, 85, 0, 0.8))",
          duration: 0.1
        })
        .to(ecgPath, {
          filter: "drop-shadow(0 0 10px rgba(255, 85, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 85, 0, 0.5))",
          duration: 0.15
        })
        .to(ecgPath, {
          filter: "drop-shadow(0 0 15px rgba(255, 85, 0, 0.9)) drop-shadow(0 0 30px rgba(255, 85, 0, 0.7))",
          duration: 0.1
        })
        .to(ecgPath, {
          filter: "drop-shadow(0 0 10px rgba(255, 85, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 85, 0, 0.5))",
          duration: 0.65
        });
    }

    // Background gradient animation
    const bgGradient = container.querySelector('.bg-gradient');
    if (bgGradient) {
      gsap.to(bgGradient, {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: "none"
      });
    }

    // PIN container entrance animation
    if (pinContainer) {
      gsap.fromTo(pinContainer, 
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, delay: 0.5, ease: "power2.out" }
      );
    }

    // Cleanup
    return () => {
      gsap.killTweensOf([logo, heartPulse, heartGlow, ecgPath, ecgGlow, bgGradient, pinContainer]);
      particlesRef.current.forEach(particle => {
        gsap.killTweensOf(particle);
      });
    };
  }, []);

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

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        setTimeout(() => checkPin(newPin), 300);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const checkPin = (pinToCheck = pin) => {
    if (pinToCheck === correctPin) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  };

  // ECG path data - realistic heartbeat pattern extended
  const ecgPath = "M -200,200 L 0,200 L 100,200 L 120,200 L 130,180 L 140,220 L 150,200 L 200,200 L 250,200 L 260,120 L 270,280 L 280,200 L 350,200 L 400,200 L 420,200 L 430,180 L 440,220 L 450,200 L 500,200 L 550,200 L 560,120 L 570,280 L 580,200 L 650,200 L 700,200 L 720,200 L 730,180 L 740,220 L 750,200 L 800,200 L 850,200 L 860,120 L 870,280 L 880,200 L 950,200 L 1000,200 L 1100,200 L 1120,200 L 1130,180 L 1140,220 L 1150,200 L 1200,200";

  return (
    <div className="pin-lock-overlay" ref={containerRef}>
      <div className="animation-wrapper">
        <div className="bg-gradient"></div>
        <div className="particles-container"></div>
        
        <svg className="ecg-svg" viewBox="-200 0 1400 400" preserveAspectRatio="xMidYMid slice">
          <path
            ref={ecgGlowRef}
            className="ecg-glow"
            d={ecgPath}
          />
          <path
            ref={ecgPathRef}
            className="ecg-line"
            d={ecgPath}
          />
        </svg>
        
        <div className="logo-container">
          <div className="logo-wrapper">
            <div className="heart-glow" ref={heartGlowRef}></div>
            <div className="heart-pulse" ref={heartPulseRef}></div>
            <img 
              ref={logoRef}
              src="https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//Rxsprint%20logo.png" 
              alt="Rxsprint Logo" 
              className="logo-image"
            />
          </div>
        </div>
      </div>
      
      <div className="pin-lock-container" ref={pinContainerRef}>
        <div className="pin-lock-icon">
          <Lock size={32} />
        </div>
        
        <h1 className="pin-lock-title">SECURE ACCESS</h1>
        <p className="pin-lock-subtitle">Enter your 4-digit authorization code</p>
        
        <div className={`pin-dots ${error ? 'error' : ''}`}>
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index} 
              className={`pin-dot ${index < pin.length ? 'filled' : ''}`}
            />
          ))}
        </div>
        
        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="pin-button number"
              onClick={() => handleNumberClick(num.toString())}
              type="button"
            >
              {num}
            </button>
          ))}
          
          <button
            className="pin-button pin-button-empty"
            disabled
            type="button"
          >
          </button>
          
          <button
            className="pin-button number pin-button-zero"
            onClick={() => handleNumberClick('0')}
            type="button"
          >
            0
          </button>
          
          <button
            className="pin-button pin-button-delete"
            onClick={handleDelete}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="system-status">
          <span className="status-dot"></span>
          <span className="status-text">SYSTEM ONLINE</span>
        </div>
      </div>
    </div>
  );
};

export default PinLock;