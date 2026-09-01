/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        prism: {
          bg:       '#0a0a0f',
          surface:  '#111118',
          elevated: '#1a1a24',
          border:   '#2a2a38',
          accent:   '#7c3aed',
          'accent-light': '#a855f7',
          highlight: '#06b6d4',
          success:  '#10b981',
          warning:  '#f59e0b',
          error:    '#ef4444',
          text: {
            primary:   '#f8fafc',
            secondary: '#94a3b8',
            muted:     '#475569',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}