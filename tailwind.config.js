/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable dark mode with a class
  content: ['./app/**/*.{js,ts,jsx,tsx}'], // Adjust paths if necessary
  theme: {
    extend: {
      backgroundImage: {
        'clear': "url('../resources/clear.jpg')",
        'cloudy': "url('../resources/overcast.jpg')",
        'rainy': "url('../resources/rainy.jpg')",
        'snowy': "url('../resources/snowy.jpg')",
        'thunderstorm': "url('../resources/thunderstorm.jpg')",
        'misty': "url('../resources/foggy.jpg')",
        'smokey': "url('../resources/smoke.jpg')",
        'drizzle': "url('../resources/drizzle.jpg')",
        
      },
    },
  },
  plugins: [],
};

