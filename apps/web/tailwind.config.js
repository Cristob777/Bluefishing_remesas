/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#4F46E5',
          hover:   '#4338CA',
          light:   '#6366F1',
          bg:      '#EEF2FF',
          border:  '#C7D2FE',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F5F4',
        },
        ink: {
          primary:   '#0A0A0A',
          secondary: '#525252',
          tertiary:  '#A3A3A3',
        },
        stone: {
          border: '#E7E5E4',
        },
      },
      boxShadow: {
        subtle:   '0 1px 2px rgba(0,0,0,0.04)',
        card:     '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        elevated: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        glass:    '0 8px 32px rgba(15,23,42,0.1), 0 1px 0 rgba(255,255,255,0.6) inset',
      },
      animation: {
        'fade-up':    'fadeUp 0.3s ease-out both',
        'fade-in':    'fadeIn 0.25s ease-out both',
        'pulse-dot':  'pulse-dot 2s ease-in-out infinite',
        'spin-fast':  'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}
