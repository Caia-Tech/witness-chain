/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  
  theme: {
    extend: {
      colors: {
        // Dark theme optimized for coding environments
        'dashboard': {
          'bg-primary': '#0f172a',    // slate-900
          'bg-secondary': '#1e293b',  // slate-800
          'bg-tertiary': '#334155',   // slate-700
          'text-primary': '#f1f5f9',  // slate-100
          'text-secondary': '#cbd5e1', // slate-300
          'accent-blue': '#3b82f6',   // blue-500
          'accent-green': '#10b981',  // emerald-500
          'accent-red': '#ef4444',    // red-500
          'accent-yellow': '#f59e0b', // amber-500
        }
      },
      
      fontFamily: {
        'mono': ['JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif']
      },
      
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-out'
      },
      
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      },
      
      backdropBlur: {
        'xs': '2px'
      }
    }
  },
  
  plugins: [
    // Add custom utilities
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 #1e293b'
        },
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        '.glass': {
          background: 'rgba(30, 41, 59, 0.8)',
          'backdrop-filter': 'blur(8px)',
          'border': '1px solid rgba(51, 65, 85, 0.3)'
        }
      })
    }
  ],
  
  // Enable dark mode by default
  darkMode: 'class'
}