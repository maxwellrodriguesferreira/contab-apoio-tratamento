/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          container: 'rgb(var(--color-primary-container) / <alpha-value>)',
          fixed: 'rgb(var(--color-primary-fixed) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--color-primary-fixed-dim) / <alpha-value>)',
          'on-container': 'rgb(var(--color-primary-on-container) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
          container: 'rgb(var(--color-secondary-container) / <alpha-value>)',
          fixed: 'rgb(var(--color-secondary-fixed) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--color-secondary-fixed-dim) / <alpha-value>)',
          'on-container': 'rgb(var(--color-secondary-on-container) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--color-tertiary) / <alpha-value>)',
          container: 'rgb(var(--color-tertiary-container) / <alpha-value>)',
          fixed: 'rgb(var(--color-tertiary-fixed) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--color-tertiary-fixed-dim) / <alpha-value>)',
          'on-container': 'rgb(var(--color-tertiary-on-container) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          bright: 'rgb(var(--color-surface-bright) / <alpha-value>)',
          dim: 'rgb(var(--color-surface-dim) / <alpha-value>)',
          variant: 'rgb(var(--color-surface-variant) / <alpha-value>)',
          'container-lowest': 'rgb(var(--color-surface-container-lowest) / <alpha-value>)',
          'container-low': 'rgb(var(--color-surface-container-low) / <alpha-value>)',
          container: 'rgb(var(--color-surface-container) / <alpha-value>)',
          'container-high': 'rgb(var(--color-surface-container-high) / <alpha-value>)',
          'container-highest': 'rgb(var(--color-surface-container-highest) / <alpha-value>)',
          tint: 'rgb(var(--color-surface-tint) / <alpha-value>)',
        },
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        'on-secondary': 'rgb(var(--color-on-secondary) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--color-on-tertiary) / <alpha-value>)',
        'on-background': 'rgb(var(--color-on-background) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        outline: {
          DEFAULT: 'rgb(var(--color-outline) / <alpha-value>)',
          variant: 'rgb(var(--color-outline-variant) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--color-error) / <alpha-value>)',
          container: 'rgb(var(--color-error-container) / <alpha-value>)',
          'on-container': 'rgb(var(--color-error-on-container) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          light: 'rgb(var(--color-success-light) / <alpha-value>)',
          dark: 'rgb(var(--color-success-dark) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
          light: 'rgb(var(--color-warning-light) / <alpha-value>)',
          dark: 'rgb(var(--color-warning-dark) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.12), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
};
