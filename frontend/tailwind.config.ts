import type { Config } from 'tailwindcss';

// JavaCafe 咖啡主题 —— 暖棕 + 奶油白 + 活力橙
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brown: {
          900: '#3E2723',
          700: '#5D4037',
          500: '#8D6E63',
          300: '#BCAAA4',
          100: '#EFEBE9',
        },
        cream: {
          DEFAULT: '#FFFAF5',
          dark: '#F5F0E8',
        },
        accent: {
          DEFAULT: '#FF7043',
          light: '#FFAB91',
          dark: '#E64A19',
        },
        success: '#66BB6A',
        warning: '#FFA726',
        error: '#EF5350',
        info: '#42A5F5',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        float: 'float 3s ease-in-out infinite',
        steam: 'steam 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'latte-heart': 'latteHeart 1.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        steam: {
          '0%': { opacity: '0.8', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-20px) scale(1.5)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        latteHeart: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.5)' },
          '20%': { opacity: '1', transform: 'translateY(0) scale(1.15)' },
          '35%': { transform: 'translateY(-2px) scale(1)' },
          '70%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-18px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
