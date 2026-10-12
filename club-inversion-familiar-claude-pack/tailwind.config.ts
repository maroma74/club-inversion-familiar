// tailwind.config.ts / theme tokens
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0E2138',
          'navy-card': '#162E4A',
          emerald: '#10B981',
          'emerald-light': '#34D399',
          amber: '#E5A016',
          slate: '#64748B',
          bg: '#0E2138',
          card: '#162E4A',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
