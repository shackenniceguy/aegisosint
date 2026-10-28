/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#080c14',
          card: '#0f172a',
          cardHover: '#1e293b',
          border: '#1e293b',
          accent: '#00f2fe',
          accentGlow: 'rgba(0, 242, 254, 0.15)',
          neonGreen: '#10b981',
          neonOrange: '#f59e0b',
          neonRed: '#ef4444',
          textPrimary: '#f8fafc',
          textMuted: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
}

