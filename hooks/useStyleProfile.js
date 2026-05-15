// hooks/useStyleProfile.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

/**
 * Hook para leer y actualizar el perfil de estilo del usuario.
 * Crea el perfil automáticamente si no existe.
 */
export function useStyleProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── FETCH ──────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('user_style_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code === 'PGRST116') {
      // No existe → crear perfil vacío
      const { data: created, error: createError } = await supabase
        .from('user_style_profiles')
        .insert([{ user_id: user.id }])
        .select()
        .single()

      if (createError) setError(createError.message)
      else setProfile(created)
    } else if (fetchError) {
      setError(fetchError.message)
    } else {
      setProfile(data)
    }

    setLoading(false)
  }, [user])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  // ── UPDATE ─────────────────────────────────────────────────
  const updateProfile = useCallback(async (updates) => {
    if (!user || !profile) return { error: 'Sin perfil' }

    const { data, error: updateError } = await supabase
      .from('user_style_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) return { error: updateError.message }

    setProfile(data)
    return { data, error: null }
  }, [user, profile])

  // ── UPDATE JSONB FIELDS (merge inteligente) ───────────────
  const mergeProfileFields = useCallback(async (jsonbUpdates) => {
    if (!user) return { error: 'Sin usuario' }

    // Para cada campo JSONB, usamos la función de Supabase para merge
    // en lugar de sobrescribir, usando el operador ||
    const setClause = Object.entries(jsonbUpdates)
      .filter(([key]) => [
        'liked_colors', 'disliked_colors', 'liked_color_families',
        'liked_formality', 'liked_warmth', 'liked_accessories',
        'liked_seasons', 'confidence_scores', 'style_evolution',
      ].includes(key))

    if (setClause.length === 0) return { error: 'Sin campos válidos' }

    // Construir el update con merge de JSONB usando Supabase RPC
    const { data, error: rpcError } = await supabase.rpc('merge_style_profile', {
      p_user_id: user.id,
      p_updates: jsonbUpdates,
    })

    if (rpcError) {
      // Fallback: update directo (sobrescribe, no merge)
      return updateProfile(jsonbUpdates)
    }

    setProfile((prev) => ({ ...prev, ...jsonbUpdates }))
    return { data, error: null }
  }, [user, updateProfile])

  // ── MARK AS NEEDING INSIGHT REFRESH ──────────────────────
  const markInsightStale = useCallback(async () => {
    return updateProfile({ needs_insight_refresh: true })
  }, [updateProfile])

  return {
    profile,
    loading,
    error,
    updateProfile,
    mergeProfileFields,
    markInsightStale,
    refetch: fetchProfile,
  }
}