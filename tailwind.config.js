/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Dark-first gray palette ──────────────────────────────────────────
        // Scale is inverted from the Tailwind default: 50 = darkest, 950 = white.
        // This means all existing utility classes (text-gray-900, bg-gray-50,
        // hover:bg-gray-100, border-gray-200, etc.) automatically render
        // correctly in the dark glassmorphism theme without touching page files.
        gray: {
          50:  '#0d1220',  // darkest — base/body level
          100: '#131a2e',  // elevated surfaces, table headers, hover states
          200: '#1c2840',  // borders, separators
          300: '#273654',  // muted borders
          400: '#3d5270',  // placeholder icons
          500: '#5e7899',  // muted text
          600: '#8ba3bd',  // secondary text ← pages use text-gray-600 a lot
          700: '#b3c8dc',  // label/caption text
          800: '#d2e2f0',  // body text
          900: '#eef4fa',  // primary text (near-white) ← pages use text-gray-900
          950: '#ffffff',  // pure white
        },

        // ── Apple System Blue ────────────────────────────────────────────────
        primary: {
          50:  'rgba(10,132,255,0.06)',
          100: 'rgba(10,132,255,0.12)',
          200: 'rgba(10,132,255,0.22)',
          300: 'rgba(10,132,255,0.38)',
          400: '#0066cc',
          500: '#0A84FF',
          600: '#0A84FF',  // ← pages use text-primary-600 / bg-primary-600
          700: '#3399ff',  // active nav item text
          800: '#66b3ff',
          900: '#99ccff',
        },

        // ── Apple System Green ───────────────────────────────────────────────
        success: {
          50:  'rgba(48,209,88,0.06)',
          100: 'rgba(48,209,88,0.12)',
          200: 'rgba(48,209,88,0.22)',
          300: 'rgba(48,209,88,0.38)',
          400: '#1e8a38',
          500: '#25a845',
          600: '#30D158',  // ← Apple green — text-success-600 for gains
          700: '#52db72',
          800: '#7de89a',
          900: '#adf5c0',
        },

        // ── Apple System Red ─────────────────────────────────────────────────
        danger: {
          50:  'rgba(255,69,58,0.06)',
          100: 'rgba(255,69,58,0.12)',
          200: 'rgba(255,69,58,0.22)',
          300: 'rgba(255,69,58,0.38)',
          400: '#cc3630',
          500: '#e63c31',
          600: '#FF453A',  // ← Apple red — text-danger-600 for losses
          700: '#ff6b62',
          800: '#ff9990',
          900: '#ffccc9',
        },
      },

      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text',
          'Segoe UI', 'system-ui', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },

      boxShadow: {
        'apple':    '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)',
        'apple-lg': '0 20px 60px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.10)',
        'glow-green': '0 0 24px rgba(48,209,88,0.28)',
        'glow-red':   '0 0 24px rgba(255,69,58,0.28)',
        'glow-blue':  '0 0 24px rgba(10,132,255,0.28)',
      },

      borderRadius: {
        'apple':    '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
      },

      animation: {
        'fade-in':  'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',      opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
