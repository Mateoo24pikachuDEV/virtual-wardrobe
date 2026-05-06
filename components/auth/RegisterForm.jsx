'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function RegisterForm() {
  const router     = useRouter()
  const { signUp } = useAuth()

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors]     = useState({})
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setApiError('')
  }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.email) e.email = 'El email es obligatorio'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email no válido'
    if (!form.password) e.password = 'La contraseña es obligatoria'
    else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Las contraseñas no coinciden'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const newErrors = validate()
    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    // ✅ IMPORTANTE: ahora usamos data también
    const { data, error } = await signUp({
      email: form.email,
      password: form.password,
      nombre: form.nombre.trim(),
    })

    setLoading(false)

    if (error) {
      if (error.message.includes('already registered')) {
        setApiError('Este email ya está registrado. ¿Quieres iniciar sesión?')
      } else {
        setApiError(error.message)
      }
      return
    }

    // ✅ REDIRECT INTELIGENTE
    if (data?.session) {
      router.push('/wardrobe')
      router.refresh()
    } else {
      // Caso: confirmación por email activada
      setSuccess(true)
    }
  }

  // ── Pantalla de éxito ─────────────────────────────
  if (success) {
    return (
      <div className="text-center flex flex-col items-center gap-4 py-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 text-lg">¡Cuenta creada!</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            Te hemos enviado un email de confirmación a{' '}
            <strong>{form.email}</strong>. Confírmalo para acceder.
          </p>
        </div>

        <Link href="/login">
          <Button variant="outline" size="md">
            Ir al inicio de sesión
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {apiError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {apiError}
        </div>
      )}

      <Input
        label="Nombre"
        name="nombre"
        type="text"
        placeholder="Tu nombre"
        value={form.nombre}
        onChange={handleChange}
        error={errors.nombre}
        required
        autoComplete="name"
      />

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
      />

      <Input
        label="Contraseña"
        name="password"
        type="password"
        placeholder="Mínimo 6 caracteres"
        value={form.password}
        onChange={handleChange}
        error={errors.password}
        required
        autoComplete="new-password"
        hint="Al menos 6 caracteres"
      />

      <Input
        label="Confirmar contraseña"
        name="confirmPassword"
        type="password"
        placeholder="Repite tu contraseña"
        value={form.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required
        autoComplete="new-password"
      />

      <Button type="submit" loading={loading} size="lg" className="mt-1 w-full">
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-purple-600 font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}