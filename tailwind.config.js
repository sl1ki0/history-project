/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0a0908',
          900: '#11100e',
          800: '#1a1814',
          700: '#26231d',
          500: '#574f3e',
        },
        parchment: {
          50: '#f7f1e6',
          100: '#efe5d2',
          200: '#e3d3b1',
          300: '#cfb787',
        },
        accent: {
          gold: '#c9a25a',
          rust: '#a44b2a',
          royal: '#4a1f1f',
          deep: '#1c2541',
        },
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-out forwards',
        'scale-in': 'scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        scaleIn: { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
