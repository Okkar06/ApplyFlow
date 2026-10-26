/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass1: '0 8px 24px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.12)',
        glass2: '0 14px 36px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.14)',
        glass3: '0 24px 48px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.16)',
      },
    },
  },
  plugins: [],
}
