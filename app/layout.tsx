import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'CircuitLab \u2014 Learn Electronics in 3D',
  description:
    'An interactive hardware learning platform for first and second year electronics students: an AI hardware instructor, a component library, and a 3D spatial lab to build circuits.',
}

export const viewport = {
  themeColor: '#0a0a0a',
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
