// app/(auth)/login/page.js
import LoginForm from '@/components/auth/LoginForm'
import Link from 'next/link'

export const metadata = { title: 'Iniciar sesión — Virtual Wardrobe' }

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Wardrobe</h1>
          <p className="text-gray-500 text-sm mt-1">Tu armario inteligente</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Bienvenido de vuelta</h2>
          <LoginForm />
        </div>

      </div>
    </main>
  )
}