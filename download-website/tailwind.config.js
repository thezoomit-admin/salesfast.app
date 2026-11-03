/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F2461C',
          muted: '#D93B14',
          soft: '#FBD2C2',
        },
        ink: '#15202C',
        wash: '#F7F7F7',
        'navy-soft': '#2A3A4D',
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px)' },
        },
      },
      animation: {
        rise: 'rise 0.8s ease-out both',
        float: 'float 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
