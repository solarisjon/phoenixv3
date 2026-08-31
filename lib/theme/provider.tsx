'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { ThemeName, getTheme, getCSSVariables } from './themes'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  mode: ThemeMode
  theme: ThemeName
  setMode: (mode: ThemeMode) => void
  setTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system')
  const [theme, setTheme] = useState<ThemeName>('default-light')
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage
  useEffect(() => {
    const savedMode = (localStorage.getItem('theme-mode') || 'system') as ThemeMode
    const savedTheme = (localStorage.getItem('theme-name') || 'default-light') as ThemeName

    setMode(savedMode)
    setTheme(savedTheme)
    setMounted(true)
  }, [])

  // Determine if dark mode should be active
  useEffect(() => {
    let dark = false

    if (mode === 'dark') {
      dark = true
    } else if (mode === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    setIsDark(dark)

    // Apply theme to DOM
    const root = document.documentElement
    root.classList.toggle('dark', dark)

    const colors = getTheme(theme)
    const cssVars = getCSSVariables(colors)
    root.style.cssText = cssVars
  }, [mode, theme])

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setIsDark(mediaQuery.matches)
      const root = document.documentElement
      root.classList.toggle('dark', mediaQuery.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mode])

  // Save theme preference
  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode)
    localStorage.setItem('theme-mode', newMode)
  }

  const handleSetTheme = (newTheme: ThemeName) => {
    setTheme(newTheme)
    localStorage.setItem('theme-name', newTheme)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme,
        setMode: handleSetMode,
        setTheme: handleSetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
