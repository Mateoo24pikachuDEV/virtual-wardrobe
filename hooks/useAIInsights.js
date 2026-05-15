// hooks/useAIInsights.js
'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import supabase from '@/lib/supabase'

/**
 * Hook para los endpoints de AI Insights.
 * Incluye: cache check local, loading states, fallback sin IA.
 */
export function useAIInsights() {
  const { user }              = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const _call = useCallback(async (endpoint, body) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Analizar estilo completo ──────────────────────────────
  const analyzeStyle = useCallback(async (force = false) => {
    if (!user) return { error: 'Sin usuario' }
    return _call('/api/ai/analyze-style', { user_id: user.id, force })
  }, [user, _call])

  // ── Taggear outfit ────────────────────────────────────────
  const tagOutfit = useCallback(async (outfitId, force = false) => {
    if (!user || !outfitId) return { error: 'Datos inválidos' }
    return _call('/api/ai/tag-outfit', { outfit_id: outfitId, user_id: user.id, force })
  }, [user, _call])

  // ── More Like This ────────────────────────────────────────
  const moreLikeThis = useCallback(async (outfitId, topN = 6) => {
    if (!user || !outfitId) return { error: 'Datos inválidos' }
    return _call('/api/ai/more-like-this', { outfit_id: outfitId, user_id: user.id, top_n: topN })
  }, [user, _call])

  // ── Leer insight cacheado ─────────────────────────────────
  const getCachedInsight = useCallback(async (insightType = 'full_analysis') => {
    if (!user) return { data: null }
    const { data } = await supabase
      .from('style_insights')
      .select('content, created_at')
      .eq('user_id', user.id)
      .eq('insight_type', insightType)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return { data: data?.content ?? null }
  }, [user])

  return {
    loading,
    error,
    analyzeStyle,
    tagOutfit,
    moreLikeThis,
    getCachedInsight,
  }
}