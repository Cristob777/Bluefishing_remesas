import type { Metadata } from 'next'
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Agentes de Importación · Bluefishing',
  description: 'Operaciones de importación con IA — recepción de facturas, provisión aduanera, costo total y reconciliación.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif4.variable}`}>
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
