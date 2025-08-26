import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './DigitalClock.css';

const DigitalClock = ({ isOpen, onClose }) => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Progress bar effect - cycles every 10 seconds
  useEffect(() => {
    if (!isOpen) return;

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          return 0; // Reset to 0 when reaching 100%
        }
        return prev + 1; // Increment by 1% every 100ms (10 seconds total)
      });
    }, 100);

    return () => clearInterval(progressTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchWeather = async () => {
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        const locationData = await ipResponse.json();
        
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${locationData.latitude}&longitude=${locationData.longitude}&current_weather=true&temperature_unit=fahrenheit`
        );
        const weatherData = await weatherResponse.json();
        
        setWeather({
          temperature: Math.round(weatherData.current_weather.temperature),
          location: `${locationData.city}, ${locationData.region}`,
          condition: getWeatherCondition(weatherData.current_weather.weathercode)
        });
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeather({
          temperature: '--',
          location: 'Location unavailable',
          condition: ''
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 600000); // Update every 10 minutes

    return () => clearInterval(weatherInterval);
  }, [isOpen]);

  const getWeatherCondition = (code) => {
    const conditions = {
      0: '☀️',
      1: '🌤️',
      2: '⛅',
      3: '☁️',
      45: '🌫️',
      48: '🌫️',
      51: '🌦️',
      61: '🌧️',
      71: '🌨️',
      95: '⛈️'
    };
    
    if (code <= 3) return conditions[code];
    if (code >= 45 && code <= 48) return conditions[45];
    if (code >= 51 && code <= 57) return conditions[51];
    if (code >= 61 && code <= 67) return conditions[61];
    if (code >= 71 && code <= 77) return conditions[71];
    if (code >= 95) return conditions[95];
    return '☀️';
  };

  const formatTime = () => {
    let hours = time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = hours.toString().padStart(2, '0');
    
    return { hours: formattedHours, minutes, seconds, ampm };
  };

  const formatDayOfWeek = () => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[time.getDay()];
  };

  const formatDate = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[time.getMonth()];
    const date = time.getDate();
    const year = time.getFullYear();
    return `${month} ${date}, ${year}`;
  };

  if (!isOpen) return null;

  const { hours, minutes, seconds, ampm } = formatTime();

  return (
    <div className="digital-clock-overlay">
      <div className="digital-clock-modal">
        <button className="digital-clock-close" onClick={onClose} aria-label="Close">
          <X size={32} />
        </button>

        <div className="clock-container">
          <div className="digital-clock-content">
            <div className="clock-time-wrapper">
              <div className="clock-time">
                <span className="time-hours">{hours}</span>
                <span className="time-separator">:</span>
                <span className="time-minutes">{minutes}</span>
                <span className="time-separator">:</span>
                <span className="time-seconds">{seconds}</span>
                <span className="time-ampm">{ampm}</span>
              </div>
            </div>

            {/* Terminal Loading Bar */}
            <div className="terminal-loading">
              {'['}{'█'.repeat(Math.floor(progress / 5))}{'░'.repeat(20 - Math.floor(progress / 5))}{']'}
            </div>

            {/* Combined Date, Day and Weather Display */}
            <div className="info-container">
              <span className="day-value">{formatDayOfWeek()}</span>
              <span className="info-divider">|</span>
              <span className="date-value">{formatDate()}</span>
              {weather && (
                <>
                  <span className="info-divider">|</span>
                  <span className="weather-compact">
                    <span className="weather-icon">{weather.condition}</span>
                    <span className="weather-temp">{weather.temperature}°F</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalClock;