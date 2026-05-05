// app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Virtual Wardrobe — Tu Armario Inteligente',
  description: 'Organiza tu ropa y genera outfits automáticamente con IA de color.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        {/* AuthProvider envuelve TODA la app para que cualquier
            componente pueda acceder al estado de sesión */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}