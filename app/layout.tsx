import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
