// components/auth/LoginForm.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginForm() {
  const router     = useRouter()
  const { signIn } = useAuth()

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // Actualizar campo
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setApiError('')
  }

  // Validación local
  const validate = () => {
    const newErrors = {}
    if (!form.email)    newErrors.email    = 'El email es obligatorio'
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email no válido'
    if (!form.password) newErrors.password = 'La contraseña es obligatoria'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setLoading(true)
    const { error } = await signIn({ email: form.email, password: form.password })
    setLoading(false)

    if (error) {
      // Mensajes más amigables
      if (error.message.includes('Invalid login')) {
        setApiError('Email o contraseña incorrectos.')
      } else if (error.message.includes('Email not confirmed')) {
        setApiError('Confirma tu email antes de entrar. Revisa tu bandeja de entrada.')
      } else {
        setApiError(error.message)
      }
      return
    }

    router.push('/wardrobe')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Error de API */}
      {apiError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {apiError}
        </div>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="tu@email.com"
        value={form.email}
        onChange={handleChange}
        error={errors.email}
        required
        autoComplete="email"
        leftIcon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
          </svg>
        }
      />

      <Input
        label="Contraseña"
        name="password"
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={handleChange}
        error={errors.password}
        required
        autoComplete="current-password"
        leftIcon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        }
      />

      <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
        Iniciar sesión
      </Button>

      <p className="text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-purple-600 font-medium hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </form>
  )
}