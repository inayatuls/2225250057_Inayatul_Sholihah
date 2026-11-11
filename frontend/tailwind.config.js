/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#EEF0FA', 100: '#DDE1F4', 500: '#5463BD', 600: '#4351A8', 700: '#36428F', 800: '#2B3574' },
        accent: { 400: '#F98AA8', 500: '#F5678D', 600: '#E44D77' },
        teal: { 400: '#4FD1C5' },
        backdrop: '#F2E4EA',
        ok: { 50: '#ECFDF3', 500: '#22C55E', 700: '#15803D' },
        bad: { 50: '#FFF1F3', 500: '#F43F5E', 700: '#BE123C' },
        axisx: '#2563EB',
        axisy: '#DC2626',
        point: '#F97316',
        line: '#16A34A',
        ink: { DEFAULT: '#1E2340', muted: '#6B7190', soft: '#9AA0BC' },
        hl: '#FEF08A',
      },
      fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '20px' },
      boxShadow: { card: '0 10px 30px -12px rgba(30, 35, 64, 0.25)' },
    },
  },
  plugins: [],
};
