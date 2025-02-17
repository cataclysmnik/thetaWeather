'use client';

import { useState, useEffect, useRef } from 'react';

// Sun Icon (Light Mode)
const SunIcon = ({ isDarkMode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-5 w-5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
      clipRule="evenodd"
    />
  </svg>
);

// Moon Icon (Dark Mode)
const MoonIcon = ({ isDarkMode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-5 w-5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

// Skeleton Loader Component
const SkeletonLoader = () => (
  <div className="w-full max-w-md pt-8"> {/* Added top padding */}
    {/* Weather Card Skeleton */}
    <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-48 rounded-lg mb-4"></div>
    {/* Additional Details Skeleton */}
    <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-24 rounded-lg mb-4"></div>
    {/* Forecast Skeleton */}
    <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-32 rounded-lg"></div>
  </div>
);

async function fetchWeather(city) {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('City not found');
  }
  return response.json();
}

async function fetchAirQuality(lat, lon) {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch air quality data');
  }
  return response.json();
}

async function fetchForecast(city) {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('City not found');
  }
  const data = await response.json();

  // Group data by day
  const groupedData = {};
  data.list.forEach((item) => {
    const date = item.dt_txt.split(' ')[0]; // Extract date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) {
      // Exclude today's forecast
      if (!groupedData[date]) {
        groupedData[date] = [];
      }
      groupedData[date].push(item);
    }
  });

  // Calculate max, min temperatures, and select an icon for each day
  const dailyForecast = Object.keys(groupedData).map((date) => {
    const dayData = groupedData[date];
    const temps = dayData.map((item) => item.main.temp);
    return {
      date,
      maxTemp: temps?.length > 0 ? Math.max(...temps) : null,
      minTemp: temps?.length > 0 ? Math.min(...temps) : null,
      icon: dayData[0].weather[0].icon, // Use the icon from the first entry of the day
    };
  });

  return dailyForecast.slice(0, 5); // Limit to the next 5 days
}

async function fetchCitySuggestions(query) {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/find?q=${query}&type=like&sort=population&cnt=5&appid=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }
  const data = await response.json();
  // Deduplicate suggestions by city name and country
  const uniqueSuggestions = Array.from(
    new Set(data.list.map((city) => `${city.name}, ${city.sys.country}`)
  ));
  return uniqueSuggestions;
}

export default function Home() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('weather');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null); // Ref for the search input and suggestions box

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Apply dark mode class to the document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch weather for the current location on initial render
  useEffect(() => {
    const fetchCurrentLocationWeather = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              setError('');
              setIsLoading(true);
              const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}&units=metric`;
              const response = await fetch(url);
              if (!response.ok) {
                throw new Error('Failed to fetch weather for current location');
              }
              const currentWeather = await response.json();
              const forecastData = await fetchForecast(currentWeather.name);

              // Fetch air quality
              const airQualityData = await fetchAirQuality(latitude, longitude);

              setWeather({ ...currentWeather, airQuality: airQualityData });
              setForecast(forecastData);
            } catch (err) {
              setError('Could not fetch weather for your location');
              setWeather(null);
              setForecast([]);
            } finally {
              setIsLoading(false);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            setError('Location permission denied or unavailable');
            setIsLoading(false);
          }
        );
      } else {
        setError('Geolocation not supported by your browser');
        setIsLoading(false);
      }
    };

    fetchCurrentLocationWeather();
  }, []);

  // Fetch city suggestions as the user types
  useEffect(() => {
    if (city.length > 2) {
      const fetchSuggestions = async () => {
        try {
          const suggestions = await fetchCitySuggestions(city);
          setSuggestions(suggestions);
        } catch (err) {
          console.error('Failed to fetch suggestions:', err);
          setSuggestions([]);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [city]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault(); // Optional chaining in case handleSearch is called without an event
    try {
      setError('');
      setIsLoading(true);
      const currentWeather = await fetchWeather(city);
      const forecastData = await fetchForecast(city);

      // Fetch air quality using the latitude and longitude
      const { coord } = currentWeather;
      const airQualityData = await fetchAirQuality(coord.lat, coord.lon);

      setWeather({ ...currentWeather, airQuality: airQualityData });
      setForecast(forecastData);
    } catch (err) {
      setError('City not found');
      setWeather(null);
      setForecast([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine dynamic class for background
  const getWeatherBackgroundClass = (condition) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return 'bg-clear';
      case 'clouds':
        return 'bg-cloudy';
      case 'rain':
        return 'bg-rainy';
      case 'drizzle':
        return 'bg-drizzle';
      case 'snow':
        return 'bg-snowy';
      case 'thunderstorm':
        return 'bg-thunderstorm';
      case 'smoke':
        return 'bg-smokey';
      case 'mist':
        return 'bg-misty';
      case 'haze':
        return 'bg-misty';
      case 'fog':
        return 'bg-misty';
      case 'tornado':
        return 'bg-tornado';
      default:
        return 'bg-default';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center p-4 sm:p-6 lg:p-8 pb-20 sm:pb-4">
      {/* Top Bar (Desktop) */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        {/* Logo */}
        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">
          thetaWeather
        </div>

        {/* Tabs (Desktop) */}
        <div className="hidden sm:flex space-x-4">
          <button
            onClick={() => setActiveTab('weather')}
            className={`px-4 py-2 text-sm font-medium hover:scale-105 transition-transform duration-200 ${
              activeTab === 'weather'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Weather
          </button>
          <button
            onClick={() => setActiveTab('solarStorm')}
            className={`px-4 py-2 text-sm font-medium hover:scale-105 transition-transform duration-200 ${
              activeTab === 'solarStorm'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Solar Storm
          </button>
        </div>

        {/* Dark Mode Toggle Slider */}
        <div className="flex items-center space-x-2">
          <SunIcon isDarkMode={isDarkMode} />
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={toggleDarkMode}
              className="sr-only"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full dark:bg-gray-700 transition-colors duration-200">
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
          <MoonIcon isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-md flex flex-col sm:flex-row items-center mt-0 space-y-4 sm:space-y-0 sm:space-x-4 relative"
        ref={searchRef}
      >
        <div className="w-full relative">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name"
            className="w-full text-lg border-b-2 border-gray-700 dark:border-gray-300 bg-transparent px-2 py-2 text-gray-900 dark:text-gray-200 focus:outline-none focus:border-gray-500 dark:focus:border-gray-400 transition-all duration-200"
          />
          {/* Suggestions Box */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg mt-1 z-50">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCity(suggestion);
                    setSuggestions([]);
                    handleSearch(); // Trigger search immediately
                  }}
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-2 bg-gray-700 dark:bg-gray-300 text-gray-100 dark:text-gray-800 hover:bg-gray-800 dark:hover:bg-gray-400 rounded-lg shadow-md text-sm tracking-wide transition-all duration-200 hover:scale-105"
        >
          Search
        </button>
      </form>

      {/* Error Message */}
      {error && <p className="text-sm text-red-500 dark:text-red-400 mt-6">{error}</p>}

      {/* Weather and Forecast Content */}
      {activeTab === 'weather' && (
        <>
          {/* Weather Card */}
          {isLoading ? (
            <SkeletonLoader />
          ) : (
            weather && (
              <>
                <div
                  className={`mt-8 w-full max-w-md p-6 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-6 ${getWeatherBackgroundClass(
                    weather.weather[0].main
                  )} bg-cover bg-center h-[200px] relative transition-transform duration-200`}
                >
                  {/* Semi-transparent overlay */}
                  <div className="absolute inset-0 bg-black opacity-40 rounded-lg"></div>

                  <div className="flex-1 relative z-10">
                    <h4
                      className="text-xl sm:text-2xl font-semibold text-white"
                      style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)' }}
                    >
                      {weather.name}, <span className="text-sm">{weather.sys.country}</span>
                    </h4>
                    <div className="flex items-center space-x-4 mt-2">
                      {/* Main Temperature */}
                      <p
                        className="text-3xl font-bold text-white"
                        style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)' }}
                      >
                        {weather.main.temp.toFixed(1)}°C
                      </p>
                      {/* Min/Max Temperatures */}
                      <div
                        className="text-sm text-white"
                        style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)' }}
                      >
                        {weather.main.temp_min.toFixed(1)}°C / {weather.main.temp_max.toFixed(1)}°C
                      </div>
                    </div>
                    <p
                      className="text-lg text-white capitalize mt-2"
                      style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)' }}
                    >
                      {weather.weather[0].description}.
                    </p>
                  </div>
                </div>

                {/* Additional Weather Details Card */}
                <div className="mt-4 w-full max-w-md px-12 py-6 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md bg-gray-200 dark:bg-gray-800 transition-transform duration-200">
                  <div className="flex flex-col space-y-2">
                    {/* Feels Like */}
                    <div className="flex justify-between text-gray-800 dark:text-gray-200">
                      <span>Feels Like:</span>
                      <span>{weather.main.feels_like.toFixed(1)}°C</span>
                    </div>
                    {/* Humidity */}
                    <div className="flex justify-between text-gray-800 dark:text-gray-200">
                      <span>Humidity:</span>
                      <span>{weather.main.humidity}%</span>
                    </div>
                    {/* Wind Speed */}
                    <div className="flex justify-between text-gray-800 dark:text-gray-200">
                      <span>Wind Speed:</span>
                      <span>{weather.wind.speed} m/s</span>
                    </div>
                    {/* Air Quality*/}
                    <div className="flex justify-between text-gray-800 dark:text-gray-200">
                      <span>Air Quality:</span>
                      <span>
                        {weather.airQuality
                          ? `AQI ${weather.airQuality.list[0].main.aqi}`
                          : 'Loading...'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )
          )}

          {/* 5-Day Forecast */}
          {isLoading ? (
            <SkeletonLoader />
          ) : (
            forecast.length > 0 && (
              <div className="mt-4 w-full max-w-md p-6 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  5-Day Forecast
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {forecast.map((day, index) => (
                    <div
                      key={index}
                      className="flex flex-row items-center justify-between p-2 bg-gray-200 dark:bg-gray-700 rounded-md sm:flex-col hover:scale-105 transition-transform duration-200"
                    >
                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                        alt="Weather Icon"
                        className="w-12 h-12 object-contain"
                      />
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 ml-2 sm:ml-0">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <div className="flex flex-col items-end ml-2 sm:ml-0 pr-1">
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {day.maxTemp?.toFixed(1) ?? 'N/A'}°C
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {day.minTemp?.toFixed(1) ?? 'N/A'}°C
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Solar Storm View */}
      {activeTab === 'solarStorm' && (
        <div className="mt-8 w-full max-w-md p-6 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md bg-gray-200 dark:bg-gray-800 hover:scale-105 transition-transform duration-200">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Upcoming Solar Storm
          </h3>
          <p className="text-gray-800 dark:text-gray-200">
            Solar storm data will be displayed here.
          </p>
        </div>
      )}

      {/* Bottom Tabs (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 sm:hidden">
        <div className="flex justify-around p-2">
          <button
            onClick={() => setActiveTab('weather')}
            className={`flex-1 py-2 px-4 text-center hover:scale-105 transition-transform duration-200 ${
              activeTab === 'weather'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Weather
          </button>
          <button
            onClick={() => setActiveTab('solarStorm')}
            className={`flex-1 py-2 px-4 text-center hover:scale-105 transition-transform duration-200 ${
              activeTab === 'solarStorm'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Solar Storm
          </button>
        </div>
      </div>
    </div>
  );
}