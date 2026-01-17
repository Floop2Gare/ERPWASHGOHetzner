import type { Config } from 'tailwindcss';

const withOpacity = (variable: string) => ({ opacityValue }: { opacityValue?: string }) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}))`;
  }
  return `rgb(var(${variable}) / ${opacityValue})`;
};

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: withOpacity('--accent-rgb'),
        surface: withOpacity('--surface-rgb'),
        bg: withOpacity('--bg-rgb'),
        border: withOpacity('--border-rgb'),
        text: withOpacity('--text-rgb'),
        muted: withOpacity('--muted-rgb'),
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 2px 8px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        soft: '12px',
      },
    },
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        lg: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
