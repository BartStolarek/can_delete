import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hexagon Grid Animation',
  description: 'A hypnotic hexagonal grid with flickering and wave effects',
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
