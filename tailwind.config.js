/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Bricolage Grotesque"', '"Instrument Sans"', 'sans-serif'],
      },
      colors: {
        arc: {
          bg: 'var(--bg)',
          card: 'var(--card)',
          card2: 'var(--card2)',
          ink: 'var(--ink)',
          ink2: 'var(--ink2)',
          ink3: 'var(--ink3)',
          ice: 'var(--ice)',
          done: 'var(--done)',
          ember: 'var(--ember)',
          miss: 'var(--miss)',
        },
      },
    },
  },
  plugins: [],
}
