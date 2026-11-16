/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        'surface-subtle': 'rgb(var(--color-surface-subtle) / <alpha-value>)',
        'surface-panel': 'rgb(var(--color-surface-panel) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        'surface-solid': 'rgb(var(--color-surface-solid) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--color-accent-strong) / <alpha-value>)',
        'on-accent': 'rgb(var(--color-on-accent) / <alpha-value>)',
        applied: 'rgb(var(--color-status-applied) / <alpha-value>)',
        interviewing: 'rgb(var(--color-status-interviewing) / <alpha-value>)',
        offer: 'rgb(var(--color-status-offer) / <alpha-value>)',
        rejected: 'rgb(var(--color-status-rejected) / <alpha-value>)',
        ghosted: 'rgb(var(--color-status-ghosted) / <alpha-value>)',
      },
      boxShadow: {
        glass1: 'var(--shadow-subtle)',
        glass2: 'var(--shadow-panel)',
        glass3: 'var(--shadow-elevated)',
      },
    },
  },
  plugins: [],
}
