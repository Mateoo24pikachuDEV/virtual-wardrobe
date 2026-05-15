// hooks/useFeedback.js
'use client'

import { useCallback, useRef, useState } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  ACTION_WEIGHTS,
  extraerFeatures,
  crearSnapshot,
  calcularActualizacionPerfil,
  getCounterField,
} from '@/lib/personalization/feedbackEngine'
import { useStyleProfile } from './useStyleProfile'

const DEBOUNCE_MS = 400

/**
 * Hook para registrar feedback de outfits.
 * Incluye: debounce, optimistic updates, batching.
 *
 * @returns {{ recordFeedback, pendingActions }}
 */
export function useFeedback() {
  const { user }                               = useAuth()
  const { profile, mergeProfileFields, updateProfile } = useStyleProfile()

  const [pendingActions, setPendingActions]    = useState(new Set())
  const debounceTimers                         = useRef({})
  const inFlightRef                            = useRef(new Set())

  /**
   * Registra una acción de feedback con debounce.
   * Uso: recordFeedback(outfit, 'like', { screen: 'outfits' })
   */
  const recordFeedback = useCallback(async (outfit, action, ctx = {}) => {
    if (!user)                return { error: 'Sin usuario' }
    if (!ACTION_WEIGHTS.hasOwnProperty(action)) return { error: `Acción inválida: ${action}` }

    const key = `${outfit.id}_${action}`

    // Debounce: cancelar llamada anterior si se repite rápido
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key])
    }

    // Prevenir duplicados en vuelo
    if (inFlightRef.current.has(key)) return { error: null }

    // Optimistic: marcar acción como pendiente en la UI
    setPendingActions((prev) => new Set([...prev, key]))

    return new Promise((resolve) => {
      debounceTimers.current[key] = setTimeout(async () => {
        inFlightRef.current.add(key)

        try {
          const weight   = ACTION_WEIGHTS[action]
          const features = extraerFeatures(outfit)
          const snapshot = crearSnapshot(outfit)

          // ── 1. Insertar en outfit_feedback ─────────────────
          const { error: insertError } = await supabase
            .from('outfit_feedback')
            .insert([{
              user_id:         user.id,
              outfit_id:       outfit.id ?? null,
              action,
              weight,
              outfit_snapshot: snapshot,
              context: {
                screen:        ctx.screen  ?? 'unknown',
                source:        ctx.source  ?? 'unknown',
                outfit_source: outfit.source,
              },
            }])

          if (insertError) throw new Error(insertError.message)

          // ── 2. Calcular actualización del perfil ───────────
          const profileUpdates = calcularActualizacionPerfil(
            profile ?? {}, features, weight
          )

          // ── 3. Incrementar contador ────────────────────────
          const counterField = getCounterField(action)
          if (counterField) {
            // Optimistic local
            if (profile) {
              profile[counterField] = (profile[counterField] ?? 0) + 1
            }
            // Async DB
            supabase.rpc('increment_profile_counter', {
              p_user_id: user.id,
              p_field:   counterField,
            }).catch((e) => console.warn('counter increment failed:', e.message))
          }

          // ── 4. Merge del perfil ────────────────────────────
          await mergeProfileFields(profileUpdates)

          // ── 5. Marcar insight stale si es momento ──────────
          const totalEvents =
            (profile?.total_likes    ?? 0) +
            (profile?.total_saves    ?? 0) +
            (profile?.total_dislikes ?? 0) + 1

          if (totalEvents > 0 && totalEvents % 10 === 0) {
            updateProfile({ needs_insight_refresh: true })
              .catch(() => {}) // non-blocking
          }

          resolve({ error: null })

        } catch (err) {
          console.error('[useFeedback]', err.message)
          resolve({ error: err.message })
        } finally {
          inFlightRef.current.delete(key)
          delete debounceTimers.current[key]
          setPendingActions((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
        }
      }, DEBOUNCE_MS)
    })
  }, [user, profile, mergeProfileFields, updateProfile])

  /**
   * Verifica si una acción específica está pendiente/en vuelo.
   */
  const isActionPending = useCallback((outfitId, action) => {
    return pendingActions.has(`${outfitId}_${action}`)
  }, [pendingActions])

  return {
    recordFeedback,
    isActionPending,
    pendingActions,
  }
}