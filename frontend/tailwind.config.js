/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          text: 'var(--color-accent-text)',
          contrast: 'var(--color-accent-contrast)',
          2: 'var(--color-accent-2)',
          '2-contrast': 'var(--color-accent-2-contrast)',
        }
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', '-apple-system', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(110, 140, 160, 0.15)',
        'glow-md': '0 0 40px rgba(110, 140, 160, 0.25)',
        'glow-lg': '0 0 80px rgba(110, 140, 160, 0.25)',
        'glow-xl': '0 0 120px rgba(110, 140, 160, 0.20)',
        glass: 'var(--shadow-card)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(3%, -4%) scale(1.06)' },
        },
        driftSlow: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-4%, 3%) scale(1.08)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(110, 140, 160, 0.25), 0 0 46px rgba(139, 111, 139, 0.12)' },
          '50%': { boxShadow: '0 0 34px rgba(110, 140, 160, 0.4), 0 0 70px rgba(139, 111, 139, 0.20)' },
        },
        flicker: {
          '0%, 92%, 100%': { opacity: '0' },
          '93%': { opacity: '0.5' },
          '94%': { opacity: '0' },
          '95%': { opacity: '0.7' },
          '96%': { opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%) rotate(8deg)' },
          '100%': { transform: 'translateX(220%) rotate(8deg)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(22px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
      },
      animation: {
        drift: 'drift 16s ease-in-out infinite',
        'drift-slow': 'driftSlow 22s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3.2s ease-in-out infinite',
        flicker: 'flicker 9s ease-in-out infinite',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
        rise: 'rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        scanline: 'scanline 3.4s linear infinite',
      },
    },
  },
  plugins: [],
};
