// Theme color definitions
export type ThemeName = 'default-light' | 'default-dark' | 'nord' | 'dracula' | 'solarized'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
}

export const themes: Record<ThemeName, ThemeColors> = {
  'default-light': {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#06b6d4',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#16a34a',
    warning: '#ea8c55',
    error: '#dc2626',
  },
  'default-dark': {
    primary: '#3b82f6',
    secondary: '#94a3b8',
    accent: '#06b6d4',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    border: '#334155',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444',
  },
  nord: {
    primary: '#88c0d0',
    secondary: '#81a1c1',
    accent: '#8fbcbb',
    background: '#2e3440',
    surface: '#3b4252',
    text: '#eceff4',
    textSecondary: '#d8dee9',
    border: '#4c566a',
    success: '#a3be8c',
    warning: '#ebcb8b',
    error: '#bf616a',
  },
  dracula: {
    primary: '#bd93f9',
    secondary: '#6272a4',
    accent: '#50fa7b',
    background: '#282a36',
    surface: '#44475a',
    text: '#f8f8f2',
    textSecondary: '#f1f1f0',
    border: '#6272a4',
    success: '#50fa7b',
    warning: '#f1fa8c',
    error: '#ff5555',
  },
  solarized: {
    primary: '#268bd2',
    secondary: '#2aa198',
    accent: '#b58900',
    background: '#fdf6e3',
    surface: '#eee8d5',
    text: '#657b83',
    textSecondary: '#93a1a1',
    border: '#d6d0c8',
    success: '#859900',
    warning: '#b58900',
    error: '#dc322f',
  },
}

export function getTheme(name: ThemeName): ThemeColors {
  return themes[name] || themes['default-light']
}

export function getThemeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[]
}

export function getCSSVariables(colors: ThemeColors): string {
  return `
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-accent: ${colors.accent};
    --color-background: ${colors.background};
    --color-surface: ${colors.surface};
    --color-text: ${colors.text};
    --color-text-secondary: ${colors.textSecondary};
    --color-border: ${colors.border};
    --color-success: ${colors.success};
    --color-warning: ${colors.warning};
    --color-error: ${colors.error};
  `
}
