'use client';

import { useState, useEffect } from 'react';

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
  const apiKey = '3fff7f43a0c2b97db42e523534b8554d';
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
    if (date !== today) { // Exclude today's forecast
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


export default function Home() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

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
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            setError('Location permission denied or unavailable');
          }
        );
      } else {
        setError('Geolocation not supported by your browser');
      }
    };

    fetchCurrentLocationWeather();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setError('');
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
        return 'bg-tornado'
        
      default:
        return 'bg-default';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      {/* Toggle Button */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-4 right-4 px-3 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg text-sm sm:text-base"
      >
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </button>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-md flex flex-col sm:flex-row items-center mt-8 space-y-4 sm:space-y-0 sm:space-x-4"
      >
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name"
          className="w-full text-lg border-b-2 border-gray-700 dark:border-gray-300 bg-transparent px-2 py-2 text-gray-900 dark:text-gray-200 focus:outline-none focus:border-gray-500 dark:focus:border-gray-400 transition-all duration-200"
        />
        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-2 bg-gray-700 dark:bg-gray-300 text-gray-100 dark:text-gray-800 hover:bg-gray-800 dark:hover:bg-gray-400 rounded-lg shadow-md text-sm tracking-wide transition-all duration-200"
        >
          Search
        </button>
      </form>

      {/* Error Message */}
      {error && <p className="text-sm text-red-500 dark:text-red-400 mt-6">{error}</p>}

      {/* Weather Card */}
      {weather && (
  <>
    <div
      className={`mt-8 w-full max-w-md p-6 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-6 ${getWeatherBackgroundClass(
        weather.weather[0].main
      )} bg-cover bg-center h-[200px] relative`}
    >
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black opacity-40 rounded-lg"></div>

      <div className="flex-1 relative z-10">
        <h4
          className="text-xl sm:text-2xl font-semibold text-white"
          style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)' }}
        >
          {weather.name}
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
    <div className="mt-4 w-full max-w-md px-12 py-6 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md bg-gray-200 dark:bg-gray-800">
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
)}

      {/* 5-Day Forecast */}
      {forecast.length > 0 && (
        <div className="mt-4 w-full max-w-md p-6 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            5-Day Forecast
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {forecast.map((day, index) => (
              <div
              key={index}
              className="flex flex-row items-center justify-between p-2 bg-gray-200 dark:bg-gray-700 rounded-md sm:flex-col"
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
      )}
    </div>
  );
}
