'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme/provider'
import { getThemeNames, ThemeName } from '@/lib/theme/themes'

const MODES = [
  { value: 'light', icon: '☀️', label: 'Light' },
  { value: 'dark', icon: '🌙', label: 'Dark' },
  { value: 'system', icon: '🖥️', label: 'System' },
] as const

function themeLabel(name: string): string {
  return name
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export default function Navigation() {
  const pathname = usePathname()
  const { mode, theme, setMode, setTheme } = useTheme()

  const isActive = (path: string) => pathname === path

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/projects', label: 'Projects' },
    { href: '/agents', label: 'Agents' },
    { href: '/runs', label: 'Runs' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-foreground">
            Phoenix
          </Link>

          <div className="flex items-center gap-8">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-border">
              {MODES.map(({ value, icon, label }) => (
                <button
                  key={value}
                  type="button"
                  title={`${label} mode`}
                  onClick={() => setMode(value)}
                  className={`px-2 py-1 text-sm transition-colors ${
                    mode === value
                      ? 'bg-primary text-white'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeName)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground"
            >
              {getThemeNames().map((name) => (
                <option key={name} value={name}>
                  {themeLabel(name)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </nav>
  )
}
