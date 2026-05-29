/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // supports explicit light/dark mode toggling
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#080C14',        // Deepest space slate
          panel: '#0F1626',     // Futuristic glass surface
          card: '#152035',      // Active overlay card
          accent: 'var(--color-brand-accent, #3B82F6)', // Dynamic CSS var
          glow: '#60A5FA',      // Soft glow aura
          success: '#10B981',   // Fluent active/published state
          warning: '#F59E0B',   // Max limits/offline alerts
          danger: '#EF4444',    // Destructive/delete markers
          comment: '#818CF8',   // Indigo comment marker
        },
        cream: {
          bg: '#FAF8F5',        // Soft paper cream
          panel: '#FFFFFF',     // Clean white surface
          border: '#E8E5DF',    // Understated boundary line
          text: '#2C2B29',      // Ink black
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
