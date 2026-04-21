import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bluefishing Agents',
  description: 'Sistema de gestión de remesas — Bluefishing.cl',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
