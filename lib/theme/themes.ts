// Theme color definitions
export type ThemeName =
  | 'default-light'
  | 'default-dark'
  | 'nord'
  | 'dracula'
  | 'solarized'
  | 'gruvbox-dark'
  | 'tokyo-night'
  | 'one-dark'
  | 'monokai'
  | 'ayu-mirage'
  | 'catppuccin-mocha'

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
  info: string
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
    info: '#3b82f6',
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
    info: '#60a5fa',
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
    info: '#5e81ac',
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
    info: '#8be9fd',
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
    info: '#268bd2',
  },
  // Sourced from morhetz/gruvbox colors/gruvbox.vim (dark variant)
  'gruvbox-dark': {
    primary: '#83a598',
    secondary: '#d3869b',
    accent: '#8ec07c',
    background: '#282828',
    surface: '#3c3836',
    text: '#ebdbb2',
    textSecondary: '#a89984',
    border: '#665c54',
    success: '#b8bb26',
    warning: '#fabd2f',
    error: '#fb4934',
    info: '#83a598',
  },
  // Sourced from folke/tokyonight.nvim lua/tokyonight/colors/storm.lua
  'tokyo-night': {
    primary: '#7aa2f7',
    secondary: '#9d7cd8',
    accent: '#7dcfff',
    background: '#24283b',
    surface: '#292e42',
    text: '#c0caf5',
    textSecondary: '#565f89',
    border: '#414868',
    success: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
    info: '#2ac3de',
  },
  // Sourced from joshdick/onedark.vim color reference table (measured in Atom)
  'one-dark': {
    primary: '#61afef',
    secondary: '#c678dd',
    accent: '#56b6c2',
    background: '#282c34',
    surface: '#282c34',
    text: '#abb2bf',
    textSecondary: '#5c6370',
    border: '#4b5263',
    success: '#98c379',
    warning: '#e5c07b',
    error: '#e06c75',
    info: '#61afef',
  },
  // Sourced from the official VS Code Monokai theme (microsoft/vscode)
  monokai: {
    primary: '#66d9ef',
    secondary: '#ae81ff',
    accent: '#f92672',
    background: '#272822',
    surface: '#1e1f1c',
    text: '#f8f8f2',
    textSecondary: '#75715e',
    border: '#34352f',
    success: '#a6e22e',
    warning: '#fd971f',
    error: '#f44747',
    info: '#66d9ef',
  },
  // Sourced from ayu-theme/ayu-colors themes/mirage.yaml
  'ayu-mirage': {
    primary: '#73d0ff',
    secondary: '#dfbfff',
    accent: '#ffcc66',
    background: '#242936',
    surface: '#282e3b',
    text: '#cccac2',
    textSecondary: '#707a8c',
    border: '#6e7c8f',
    success: '#87d96c',
    warning: '#ffcd66',
    error: '#ff6666',
    info: '#5ccfe6',
  },
  // Sourced from catppuccin/palette palette.json (mocha variant)
  'catppuccin-mocha': {
    primary: '#89b4fa',
    secondary: '#cba6f7',
    accent: '#74c7ec',
    background: '#1e1e2e',
    surface: '#313244',
    text: '#cdd6f4',
    textSecondary: '#a6adc8',
    border: '#45475a',
    success: '#a6e3a1',
    warning: '#f9e2af',
    error: '#f38ba8',
    info: '#89dceb',
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
    --color-info: ${colors.info};
  `
}
