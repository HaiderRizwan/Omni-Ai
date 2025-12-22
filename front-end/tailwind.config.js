/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Syne', 'sans-serif'],
      },
      colors: {
        noir: {
          900: '#000000', // Void Black
          800: '#0A0A0A', // Deep Charcoal
          700: '#141414', // Soft Black
          600: '#1F1F1F', // Dark Grey
        },
        lime: {
          400: '#CCFF00', // Hyper-Lime
          500: '#B3E600',
        },
        neon: {
          blue: '#4D4DFF',
          purple: '#9D00FF',
          pink: '#FF00C7',
          cyan: '#00FFFF',
        }
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'stagger': 'stagger-reveal 0.4s ease-out forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
      }
    }
  },
  plugins: []
};


