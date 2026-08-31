import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme/provider'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Phoenix v3',
  description: 'Distributed AI Agent Orchestration Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Navigation />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
