import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './DigitalClock.css';

const DigitalClock = ({ isOpen, onClose }) => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isOpen]);

  // Weather fetching
  useEffect(() => {
    if (!isOpen) return;

    const fetchWeather = async () => {
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const locationInfo = await ipResponse.json();
        const { latitude, longitude, city } = locationInfo;

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
        );
        const weatherData = await weatherResponse.json();
        
        if (weatherData.current) {
          setWeather({
            temperature: Math.round(weatherData.current.temperature_2m),
            condition: getWeatherText(weatherData.current.weather_code),
            city: city || 'Local'
          });
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeather({
          temperature: 72,
          condition: 'Clear',
          city: 'New York'
        });
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600000);
    return () => clearInterval(weatherInterval);
  }, [isOpen]);

  const getWeatherText = (code) => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code >= 45 && code <= 48) return 'Foggy';
    if (code >= 51 && code <= 67) return 'Rainy';
    if (code >= 71 && code <= 77) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Cloudy';
  };

  const formatMainTime = () => {
    let hours = time.getHours();
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const seconds = String(time.getSeconds()).padStart(2, '0');
    
    // Convert to 12-hour format
    hours = hours % 12 || 12;
    
    return { hours, minutes, seconds };
  };

  const getDateString = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = time.toLocaleDateString('en-US', options);
    // Convert to sentence case (first letter caps only)
    return dateString.charAt(0).toUpperCase() + dateString.slice(1).toLowerCase();
  };

  if (!isOpen) return null;

  const timeDisplay = formatMainTime();

  return (
    <div className="clock-fullscreen">
      {/* Animated background iframe */}
      <iframe 
        src="/clock-animation.html" 
        className="clock-animation-frame"
        title="Clock Animation Background"
      />
      
      <button className="clock-close-btn" onClick={onClose}>
        <X size={24} />
      </button>

      <div className="clock-container">
        <div className="clock-content">
          {/* Logo at the top */}
          <div className="clock-logo">
            <img src="https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii/RXSPRINT%20SVG%20LOGO.svg" alt="RxSprint" />
          </div>
          
          {/* Time display */}
          <div className="time-wrapper">
            <div className="time-display">
              <span className="time-hours">{timeDisplay.hours}</span>
              <span className="time-colon">:</span>
              <span className="time-minutes">{timeDisplay.minutes}</span>
              <span className="time-colon">:</span>
              <span className="time-seconds">{timeDisplay.seconds}</span>
            </div>
          </div>

          {/* Combined date and weather display */}
          <div className="info-banner">
            <span className="date-text">{getDateString()}</span>
            {weather && (
              <>
                <span className="info-divider">|</span>
                <span className="weather-temp">{weather.temperature}°F</span>
                <span className="info-divider">|</span>
                <span className="weather-condition">{weather.condition}</span>
                <span className="info-divider">|</span>
                <span className="weather-location">{weather.city}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalClock;