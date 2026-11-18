/**
 * "Coconut Cream" theme: cream backgrounds (#FBEFDD) with Borahae Purple accents.
 *
 * - `slate` is a warm cream → deep-plum neutral scale (50 = page cream, 900 = body text)
 * - `surface` is the card / panel colour, a lighter cream
 * - `brand` (primary accent) is Borahae Purple, and the green scales (`emerald`, `green`) are
 *   mapped to it too, so success/online/active states share the accent
 */
/**
 * Borahae Purple (Pantone 13-0613 TCX, ~#B7A5DB). Step 600 is the swatch itself and is
 * used for fills (buttons, toggles, badges) with dark plum text on top; 700–950 are deeper
 * shades of the same hue for purple text and links so they stay readable on cream.
 */
const borahae = {
  50: '#F7F4FC',
  100: '#EFE9F8',
  200: '#E0D7F1',
  300: '#CFC2E8',
  400: '#D3C8EB',
  500: '#C5B6E2',
  600: '#B7A5DB',
  700: '#5E479E',
  800: '#4A3880',
  900: '#362961',
  950: '#221A40',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#FBEFDD',
          100: '#F4E4CC',
          200: '#E9D6BA',
          300: '#D9C2A3',
          400: '#A08C7A',
          500: '#76665A',
          600: '#5E4F49',
          700: '#463A3A',
          800: '#33283A',
          900: '#2A1B3D',
          950: '#1A1026',
        },
        surface: '#FFF8EE',
        brand: borahae,
        emerald: borahae,
        green: borahae,
        violet: borahae,
      },
      ringOffsetColor: {
        DEFAULT: '#FBEFDD',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(42 27 61 / 0.05), 0 1px 3px 0 rgb(42 27 61 / 0.08)',
      },
    },
  },
  plugins: [],
};
