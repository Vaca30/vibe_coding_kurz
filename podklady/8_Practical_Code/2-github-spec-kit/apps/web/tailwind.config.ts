import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(220 13% 8%)',
        muted: 'hsl(210 12% 96%)',
        accent: 'hsl(16 100% 67%)',
        accentForeground: 'hsl(0 0% 100%)',
        border: 'hsl(220 13% 91%)',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
