// hooks/useOutfitTagging.js
// ============================================================
// Auto-tagging de outfits guardados usando Groq.
// Flujo:
//   1. Carga tags existentes en BD para evitar duplicados
//   2. Identifica outfits sin tags
//   3. Los procesa en batches con delay entre lotes
//   4. Actualiza el estado incrementalmente (streaming UX)
//   5. Cachea en memoria para evitar re-llamadas en la sesión
// ============================================================
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// Cache in-memory (vive mientras la pestaña está abierta)
const TAG_CACHE = new Map() // outfitId → tagsObject

const BATCH_SIZE    = 3      // outfits por lote
const BATCH_DELAY   = 900    // ms entre lotes (evitar rate limit)
const REQUEST_DELAY = 300    // ms entre requests dentro del lote

/**
 * @param {Object[]} savedOutfits   - outfits normalizados del armario
 * @returns {{
 *   outfitsWithTags: Object[],    - outfits con ai_tags mergeados
 *   tagsMap: Object,              - { outfitId: tagsObject }
 *   isTagging: boolean,
 *   tagProgress: { done, total }
 * }}
 */
export function useOutfitTagging(savedOutfits = []) {
  const { user }  = useAuth()
  const [tagsMap, setTagsMap] = useState({})
  const [tagProgress, setTagProgress] = useState({ done: 0, total: 0 })

  // Refs para evitar re-runs y duplicados
  const processedRef = useRef(new Set())
  const isRunningRef = useRef(false)

  // ── Cargar tags existentes en BD ───────────────────────────
  const loadExistingTags = useCallback(async (ids) => {
    if (!ids.length) return {}

    const { data, error } = await supabase
      .from('outfit_ai_tags')
      .select('outfit_id, vibe, energy, mood, aesthetic, occasion, descriptors, silhouette, layering')
      .eq('user_id', user.id)
      .in('outfit_id', ids)

    if (error) return {}

    const map = {}
    for (const row of data ?? []) {
      map[row.outfit_id] = row
      TAG_CACHE.set(row.outfit_id, row)
    }
    return map
  }, [user?.id])

  // ── Taggear un outfit individual ───────────────────────────
  const tagOne = useCallback(async (outfit) => {
    if (!outfit?.id || processedRef.current.has(outfit.id)) return null

    processedRef.current.add(outfit.id)

    try {
      const res = await fetch('/api/ai/tag-outfit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ outfit_id: outfit.id, user_id: user.id }),
      })
      if (!res.ok) return null
      const tags = await res.json()
      TAG_CACHE.set(outfit.id, tags)
      return { id: outfit.id, tags }
    } catch {
      return null
    }
  }, [user?.id])

  // ── Pipeline principal ─────────────────────────────────────
  useEffect(() => {
    if (!user || !savedOutfits.length || isRunningRef.current) return

    const outfitIds = savedOutfits.map((o) => o.id).filter(Boolean)
    if (!outfitIds.length) return

    async function run() {
      isRunningRef.current = true

      // 1. Cargar tags de BD
      const existing = await loadExistingTags(outfitIds)
      if (Object.keys(existing).length) {
        setTagsMap((prev) => ({ ...prev, ...existing }))
      }

      // 2. Filtrar los que YA tienen tags (BD o cache)
      const needsTag = savedOutfits.filter(
        (o) => o.id && !existing[o.id] && !TAG_CACHE.has(o.id)
      )

      if (!needsTag.length) { isRunningRef.current = false; return }

      setTagProgress({ done: 0, total: needsTag.length })

      // 3. Procesar en batches
      for (let i = 0; i < needsTag.length; i += BATCH_SIZE) {
        const batch = needsTag.slice(i, i + BATCH_SIZE)

        const batchResults = []
        for (const outfit of batch) {
          const result = await tagOne(outfit)
          if (result) batchResults.push(result)
          if (batch.indexOf(outfit) < batch.length - 1) {
            await new Promise((r) => setTimeout(r, REQUEST_DELAY))
          }
        }

        // Actualizar estado con el batch
        if (batchResults.length) {
          setTagsMap((prev) => {
            const next = { ...prev }
            for (const { id, tags } of batchResults) next[id] = tags
            return next
          })
        }

        setTagProgress((prev) => ({ ...prev, done: prev.done + batch.length }))

        // Delay entre lotes
        if (i + BATCH_SIZE < needsTag.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY))
        }
      }

      isRunningRef.current = false
    }

    run()
  // Recorrer solo cuando cambian los IDs de los outfits
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, savedOutfits.map((o) => o.id).join(',')])

  // ── Merge tags → outfits ───────────────────────────────────
  const outfitsWithTags = savedOutfits.map((outfit) => ({
    ...outfit,
    ai_tags: tagsMap[outfit.id]
          ?? TAG_CACHE.get(outfit.id)
          ?? outfit.ai_tags
          ?? null,
  }))

  const isTagging = tagProgress.done < tagProgress.total && tagProgress.total > 0

  return { outfitsWithTags, tagsMap, isTagging, tagProgress }
}