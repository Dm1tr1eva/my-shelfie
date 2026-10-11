// Tailwind v3 only. On v4 use tailwind-theme.css instead.
// Merge into tailwind.config.js -> theme.extend

module.exports = {
  theme: {
    extend: {
      colors: {
        page: '#ECE4E5',
        card: '#F6F1F1',
        ink: { DEFAULT: '#2E1819', soft: '#5A4546' },
        muted: '#6B5557',
        navy: '#192B51',
        burgundy: '#72251F',
        beige: '#E0D1CA',
        mist: '#C6D0DD',
        slate: '#8090A8',
        field: '#6F7C93',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        control: '8px',
        cover: '3px 6px 6px 3px',
      },
      boxShadow: {
        cover: '0 1px 2px rgb(46 24 25 / .20), 0 12px 18px -12px rgb(46 24 25 / .55), inset 5px 0 0 rgb(236 228 229 / .14)',
        shelf: '0 10px 14px -10px rgb(46 24 25 / .5)',
        pop: '0 18px 32px -16px rgb(46 24 25 / .45)',
      },
    },
  },
};

// app/layout.tsx
// import { Inter, Playfair_Display } from 'next/font/google';
// const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });
// const playfair = Playfair_Display({ subsets: ['latin', 'cyrillic'], style: ['normal', 'italic'], weight: ['500', '600', '700'], variable: '--font-playfair' });
// <html className={`${inter.variable} ${playfair.variable}`}>
