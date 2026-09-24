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
          DEFAULT: '#00236f',
          container: '#1e3a8a',
          fixed: '#dce1ff',
          'fixed-dim': '#b6c4ff',
          'on-container': '#90a8ff',
        },
        secondary: {
          DEFAULT: '#006398',
          container: '#5bb8fe',
          fixed: '#cce5ff',
          'fixed-dim': '#93ccff',
          'on-container': '#00476e',
        },
        tertiary: {
          DEFAULT: '#003120',
          container: '#004a32',
          fixed: '#85f8c4',
          'fixed-dim': '#68dba9',
          'on-container': '#4ac08f',
        },
        surface: {
          DEFAULT: '#f8f9ff',
          bright: '#f8f9ff',
          dim: '#ccdbf4',
          variant: '#d5e3fd',
          'container-lowest': '#ffffff',
          'container-low': '#eff4ff',
          container: '#e6eeff',
          'container-high': '#dde9ff',
          'container-highest': '#d5e3fd',
          tint: '#4059aa',
        },
        'on-surface': '#0d1c2f',
        'on-surface-variant': '#444651',
        'on-primary': '#ffffff',
        'on-secondary': '#ffffff',
        'on-tertiary': '#ffffff',
        'on-background': '#0d1c2f',
        background: '#f8f9ff',
        outline: {
          DEFAULT: '#757682',
          variant: '#c5c5d3',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          'on-container': '#93000a',
        },
        success: {
          DEFAULT: '#059669',
          light: '#dcfce7',
          dark: '#15803d',
        },
        warning: {
          DEFAULT: '#d97706',
          light: '#fef3c7',
          dark: '#b45309',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        card: '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        modal: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
      }
    },
  },
  plugins: [],
};
