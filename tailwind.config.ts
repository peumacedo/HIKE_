import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          975: '#0A0E16'
        }
      },
      boxShadow: {
        executive: '0 2px 12px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
