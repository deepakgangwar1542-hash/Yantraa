import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'YANTRAA \u2014 Learn Electronics in 3D',
  description:
    'YANTRAA is a flagship interactive electronics-learning platform for 1st & 2nd year engineering students: an AI hardware tutor, a component library with 3D viewing, and a spatial 3D circuit-building lab. No hardware required.',
  keywords: [
    'electronics',
    'learn electronics',
    '3D circuit lab',
    'breadboard simulator',
    'AI tutor',
    'engineering students',
    'YANTRAA',
  ],
  openGraph: {
    title: 'YANTRAA \u2014 Learn Electronics in 3D',
    description:
      'Build circuits in a spatial 3D lab, explore components in 3D, and learn from an AI hardware tutor. No hardware required.',
    type: 'website',
  },
}

export const viewport = {
  themeColor: '#0B0B0D',
  colorScheme: 'dark light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
