// context/AuthContext.jsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import supabase from '@/lib/supabase'

// -----------------------------------------------------------
// Crear el contexto
// -----------------------------------------------------------
const AuthContext = createContext({
  user:        null,
  session:     null,
  loading:     true,
  signUp:      async () => {},
  signIn:      async () => {},
  signOut:     async () => {},
})

// -----------------------------------------------------------
// Provider
// -----------------------------------------------------------
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Inicializar: leer sesión existente y suscribirse a cambios
  useEffect(() => {
    // 1. Obtener sesión actual al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Escuchar cambios de auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // -----------------------------------------------------------
  // Registro con email y contraseña
  // -----------------------------------------------------------
  const signUp = useCallback(async ({ email, password, nombre }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre }, // metadata del usuario
      },
    })
    return { data, error }
  }, [])

  // -----------------------------------------------------------
  // Login con email y contraseña
  // -----------------------------------------------------------
  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }, [])

  // -----------------------------------------------------------
  // Logout
  // -----------------------------------------------------------
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// -----------------------------------------------------------
// Hook de consumo
// -----------------------------------------------------------
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return context
}