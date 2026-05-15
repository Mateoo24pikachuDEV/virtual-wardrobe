// hooks/usePersonalization.js
'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useStyleProfile } from './useStyleProfile'
import {
  calcularScorePersonalizado,
  ordenarOutfitsPersonalizados,
} from '@/lib/personalization/scoringEngine'
import { findSimilarOutfits } from '@/lib/personalization/similarityEngine'

/**
 * Hook de personalización completa.
 * Expone: score personalizado, ordenamiento, "more like this",
 *         y acceso a los outfits guardados con feedback positivo.
 */
export function usePersonalization() {
  const { user }          = useAuth()
  const { profile }       = useStyleProfile()
  const [recentlyLiked, setRecentlyLiked] = useState([])

  // ── Cargar outfits con feedback positivo reciente ──────────
  useEffect(() => {
    if (!user) return

    async function loadRecentlyLiked() {
      const { data } = await supabase
        .from('outfit_feedback')
        .select(`
          outfit_id,
          action,
          outfit:outfit_id (
            id, score, seasons, nivel_termico, top_id, bottom_id, shoes_id, outerwear_id,
            outfit_items (
              slot, position,
              prenda:prenda_id ( id, nombre, categoria, color, color_familia, formalidad, formalidades, warmth, imagen_url )
            )
          )
        `)
        .eq('user_id', user.id)
        .in('action', ['like', 'save', 'worn', 'share'])
        .order('created_at', { ascending: false })
        .limit(15)

      if (data) {
        const outfits = data
          .filter((r) => r.outfit)
          .map((r) => {
            const o    = r.outfit
            const items = o.outfit_items ?? []
            const bySlot = (slot) => items.find((i) => i.slot === slot)?.prenda ?? null
            return {
              ...o,
              _top:         bySlot('top'),
              _bottom:      bySlot('bottom'),
              _shoes:       bySlot('shoes'),
              _outerwear:   bySlot('outerwear'),
              _accessories: items.filter((i) => i.slot === 'accessory').map((i) => i.prenda),
            }
          })
        setRecentlyLiked(outfits)
      }
    }

    loadRecentlyLiked()
  }, [user])

  // ── Score de un outfit individual ─────────────────────────
  const scoreOutfit = useCallback((outfit) => {
    return calcularScorePersonalizado(outfit, profile, recentlyLiked)
  }, [profile, recentlyLiked])

  // ── Ordenar lista de outfits ───────────────────────────────
  const sortOutfits = useCallback((outfits) => {
    if (!outfits?.length) return []
    return ordenarOutfitsPersonalizados(outfits, profile, recentlyLiked)
  }, [profile, recentlyLiked])

  // ── More Like This ─────────────────────────────────────────
  const findSimilar = useCallback((targetOutfit, candidates, opts) => {
    return findSimilarOutfits(targetOutfit, candidates, opts)
  }, [])

  // ── Información del perfil ─────────────────────────────────
  const isPersonalized = useMemo(() => {
    return ((profile?.total_likes ?? 0) + (profile?.total_saves ?? 0)) >= 3
  }, [profile])

  const needsOnboarding = useMemo(() => {
    return !(profile?.onboarding_completed ?? false)
  }, [profile])

  return {
    profile,
    recentlyLiked,
    scoreOutfit,
    sortOutfits,
    findSimilar,
    isPersonalized,
    needsOnboarding,
  }
}