import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agentes de Importación · Bluefishing',
  description: 'Operaciones de importación con IA — recepción de facturas, provisión aduanera, costo total y reconciliación.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '13px',
              borderRadius: '10px',
              border: '1px solid #E7E5E4',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
          }}
        />
      </body>
    </html>
  )
}
