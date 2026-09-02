import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Plain var() references (not the rgb(var(...) / <alpha-value>) pattern) -
      // lib/theme/themes.ts emits full hex/color strings, not RGB channel triples,
      // so Tailwind opacity modifiers (e.g. bg-primary/50) aren't available here.
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-text)',
        surface: 'var(--color-surface)',
        muted: 'var(--color-text-secondary)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
    },
  },
  plugins: [],
}
export default config
