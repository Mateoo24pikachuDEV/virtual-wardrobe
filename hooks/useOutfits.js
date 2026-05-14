// hooks/useOutfits.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { generarOutfits, calcularDatosTermicos } from '@/lib/outfitEngine'
import {
  PRENDA_FIELDS,
  OUTFIT_SELECT_FRAGMENT,
  normalizarOutfit,
  buildOutfitItems,
  esMigrado,
} from '@/lib/outfitAdapter'

export function useOutfits(prendas = []) {
  const { user } = useAuth()

  const [outfits,          setOutfits]          = useState([])
  const [outfitsGuardados, setOutfitsGuardados] = useState([])
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState(null)

  // -----------------------------------------------------------
  // Generar outfits en memoria al cambiar las prendas
  // -----------------------------------------------------------
  useEffect(() => {
    if (!prendas || prendas.length === 0) { setOutfits([]); return }
    setOutfits(generarOutfits(prendas))
  }, [prendas])

  // -----------------------------------------------------------
  // FETCH outfits guardados
  // Usa OUTFIT_SELECT_FRAGMENT que incluye outfit_items + fallbacks
  // -----------------------------------------------------------
  const fetchOutfitsGuardados = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('outfits')
      .select(`*, ${OUTFIT_SELECT_FRAGMENT}`)
      .eq('user_id', user.id)
      .order('score', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOutfitsGuardados((data || []).map(normalizarOutfit))
    }

    setLoading(false)
  }, [user])

  useEffect(() => { fetchOutfitsGuardados() }, [fetchOutfitsGuardados])

  // -----------------------------------------------------------
  // SAVE outfit
  // Dual-write: inserta en `outfits` (compat) + `outfit_items` (nuevo)
  // Ya NO escribe en outfit_accessories (deprecado desde Fase 8)
  // -----------------------------------------------------------
  const saveOutfit = useCallback(async (outfit) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    try {
      // ── 1. Calcular datos térmicos ───────────────────────
      const { nivel_termico, seasons } = outfit._top
        ? calcularDatosTermicos(
            outfit._top,
            outfit._bottom,
            outfit._shoes,
            outfit._outerwear   || null,
            outfit._accessories || []
          )
        : { nivel_termico: null, seasons: [] }

      // ── 2. INSERT en outfits (columnas antiguas por compat) ──
      const { data: outfitRecord, error: insertError } = await supabase
        .from('outfits')
        .insert([{
          user_id:       user.id,
          top_id:        outfit.top_id,
          bottom_id:     outfit.bottom_id,
          shoes_id:      outfit.shoes_id,
          outerwear_id:  outfit.outerwear_id || null,
          score:         outfit.score,
          source:        outfit.source || 'generated',
          nivel_termico,
          seasons,
        }])
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      // ── 3. INSERT en outfit_items (nuevo formato) ────────
      const items = buildOutfitItems(outfitRecord.id, {
        top:         outfit._top,
        bottom:      outfit._bottom,
        shoes:       outfit._shoes,
        outerwear:   outfit._outerwear    || null,
        accessories: outfit._accessories || [],
      })

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('outfit_items')
          .insert(items)

        if (itemsError) {
          console.warn('outfit_items insert warning:', itemsError.message)
          // No lanzamos: el outfit se guardó, solo falta la nueva tabla
        }
      }

      // ── 4. Actualizar estado local ───────────────────────
      const outfitCompleto = normalizarOutfit({
        ...outfitRecord,
        nivel_termico,
        seasons,
        outfit_items: items.map((item) => ({
          ...item,
          prenda: item.slot === 'top'       ? outfit._top
                : item.slot === 'bottom'    ? outfit._bottom
                : item.slot === 'shoes'     ? outfit._shoes
                : item.slot === 'outerwear' ? outfit._outerwear
                : (outfit._accessories || []).find((a) => a.id === item.prenda_id) || null,
        })),
      })

      setOutfitsGuardados((prev) => [outfitCompleto, ...prev])
      return { data: outfitCompleto, error: null }

    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    }
  }, [user])

  // -----------------------------------------------------------
  // CREATE MANUAL OUTFIT
  // -----------------------------------------------------------
  const createManualOutfit = useCallback(async (outfit) => {
    return saveOutfit({ ...outfit, source: 'manual' })
  }, [saveOutfit])

  // -----------------------------------------------------------
  // UPDATE outfit completo (prendas + accesorios + score)
  // Reemplaza outfit_items por completo (delete + insert)
  // -----------------------------------------------------------
  const updateOutfit = useCallback(async (outfitId, outfitData) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    try {
      // ── 0. Recalcular datos térmicos ─────────────────────
      const { nivel_termico, seasons } = outfitData._top
        ? calcularDatosTermicos(
            outfitData._top,
            outfitData._bottom,
            outfitData._shoes,
            outfitData._outerwear    || null,
            outfitData._accessories  || []
          )
        : { nivel_termico: null, seasons: [] }

      // ── 1. Actualizar fila principal ─────────────────────
      const { data: outfitRecord, error: updateError } = await supabase
        .from('outfits')
        .update({
          top_id:        outfitData.top_id,
          bottom_id:     outfitData.bottom_id,
          shoes_id:      outfitData.shoes_id,
          outerwear_id:  outfitData.outerwear_id || null,
          score:         outfitData.score,
          nivel_termico,
          seasons,
        })
        .eq('id', outfitId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)

      // ── 2. Reemplazar outfit_items ───────────────────────
      const { error: deleteItemsError } = await supabase
        .from('outfit_items')
        .delete()
        .eq('outfit_id', outfitId)

      if (deleteItemsError) throw new Error(deleteItemsError.message)

      const newItems = buildOutfitItems(outfitId, {
        top:         outfitData._top,
        bottom:      outfitData._bottom,
        shoes:       outfitData._shoes,
        outerwear:   outfitData._outerwear    || null,
        accessories: outfitData._accessories  || [],
      })

      if (newItems.length > 0) {
        const { error: insertItemsError } = await supabase
          .from('outfit_items')
          .insert(newItems)
        if (insertItemsError) throw new Error(insertItemsError.message)
      }

      // ── 3. (Compat) Reemplazar outfit_accessories ────────
      // Se mantiene para evitar datos huérfanos mientras existan
      // lectores que aún usen el formato antiguo.
      await supabase.from('outfit_accessories').delete().eq('outfit_id', outfitId)

      const accIds = (outfitData._accessories || []).map((a) => a.id)
      if (accIds.length > 0) {
        await supabase.from('outfit_accessories').insert(
          accIds.map((pid) => ({ outfit_id: outfitId, prenda_id: pid }))
        )
      }

      // ── 4. Actualizar estado local ───────────────────────
      const outfitActualizado = normalizarOutfit({
        ...outfitRecord,
        nivel_termico,
        seasons,
        outfit_items: newItems.map((item) => {
          const findPrenda = () => {
            if (item.slot === 'top')       return outfitData._top
            if (item.slot === 'bottom')    return outfitData._bottom
            if (item.slot === 'shoes')     return outfitData._shoes
            if (item.slot === 'outerwear') return outfitData._outerwear
            return (outfitData._accessories || []).find((a) => a.id === item.prenda_id)
          }
          return { ...item, prenda: findPrenda() }
        }),
      })

      setOutfitsGuardados((prev) =>
        prev.map((o) => o.id === outfitId ? outfitActualizado : o)
      )

      return { data: outfitActualizado, error: null }

    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    }
  }, [user])

  // -----------------------------------------------------------
  // UPDATE solo accesorios de un outfit guardado
  // (mantenido por compatibilidad con Fase 2 — usa outfit_items)
  // -----------------------------------------------------------
  const updateOutfitAccessories = useCallback(async (
    outfitId,
    newAccessoryIds,
    newAccessoryObjs,
    newScore
  ) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    try {
      // Borrar accesorios actuales en outfit_items
      const { error: deleteError } = await supabase
        .from('outfit_items')
        .delete()
        .eq('outfit_id', outfitId)
        .eq('slot', 'accessory')

      if (deleteError) throw new Error(deleteError.message)

      // Insertar nuevos
      if (newAccessoryIds.length > 0) {
        const rows = newAccessoryIds.map((pid, idx) => ({
          outfit_id: outfitId, prenda_id: pid, slot: 'accessory', position: idx,
        }))
        const { error: insertError } = await supabase
          .from('outfit_items').insert(rows)
        if (insertError) throw new Error(insertError.message)
      }

      // Actualizar score
      const { error: updateError } = await supabase
        .from('outfits')
        .update({ score: newScore })
        .eq('id', outfitId)
        .eq('user_id', user.id)

      if (updateError) throw new Error(updateError.message)

      // Estado local
      setOutfitsGuardados((prev) =>
        prev.map((o) =>
          o.id === outfitId
            ? {
                ...o,
                score:         newScore,
                _accessories:  newAccessoryObjs,
                accessory_ids: newAccessoryIds,
                outfit_items: [
                  ...(o.outfit_items || []).filter((i) => i.slot !== 'accessory'),
                  ...newAccessoryIds.map((pid, idx) => ({
                    outfit_id: outfitId, prenda_id: pid, slot: 'accessory', position: idx,
                    prenda: newAccessoryObjs.find((a) => a.id === pid) || null,
                  })),
                ],
              }
            : o
        )
      )

      return { error: null }
    } catch (err) {
      setError(err.message)
      return { error: err.message }
    }
  }, [user])

  // -----------------------------------------------------------
  // DELETE outfit (outfit_items se borra en cascada por FK)
  // -----------------------------------------------------------
  const deleteOutfit = useCallback(async (outfitId) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const { error: deleteError } = await supabase
      .from('outfits')
      .delete()
      .eq('id', outfitId)
      .eq('user_id', user.id)

    if (deleteError) return { error: deleteError.message }

    setOutfitsGuardados((prev) => prev.filter((o) => o.id !== outfitId))
    return { error: null }
  }, [user])

  // -----------------------------------------------------------
  // SYNC top N automáticos
  // (solo borra source='generated', respeta manuales)
  // -----------------------------------------------------------
  const syncTopOutfits = useCallback(async (topN = 5) => {
    if (!user || outfits.length === 0) return

    setLoading(true)

    // Borrar solo generados (outfit_items en cascada)
    await supabase
      .from('outfits')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'generated')

    // Guardar top N con el nuevo save (dual-write automático)
    for (const outfit of outfits.slice(0, topN)) {
      await saveOutfit({ ...outfit, source: 'generated' })
    }

    setLoading(false)
  }, [user, outfits, saveOutfit])

  // -----------------------------------------------------------
  // RE-MIGRAR un outfit concreto al nuevo formato
  // Útil si algún outfit quedó sin outfit_items por algún error.
  // -----------------------------------------------------------
  const remigrarOutfit = useCallback(async (outfit) => {
    if (!outfit.id) return { error: 'Outfit sin ID' }

    const items = buildOutfitItems(outfit.id, {
      top:         outfit._top,
      bottom:      outfit._bottom,
      shoes:       outfit._shoes,
      outerwear:   outfit._outerwear    || null,
      accessories: outfit._accessories  || [],
    })

    if (items.length === 0) return { error: 'Sin prendas en el outfit' }

    // Borrar existentes primero (idempotente)
    await supabase.from('outfit_items').delete().eq('outfit_id', outfit.id)

    const { error: insertError } = await supabase
      .from('outfit_items')
      .insert(items)

    if (insertError) return { error: insertError.message }

    // Actualizar estado local
    setOutfitsGuardados((prev) =>
      prev.map((o) =>
        o.id === outfit.id
          ? { ...o, outfit_items: items.map((i) => ({
                ...i, prenda: i.slot === 'top'       ? outfit._top
                            : i.slot === 'bottom'    ? outfit._bottom
                            : i.slot === 'shoes'     ? outfit._shoes
                            : i.slot === 'outerwear' ? outfit._outerwear
                            : (outfit._accessories || []).find((a) => a.id === i.prenda_id),
              })), _source_format: 'outfit_items' }
          : o
      )
    )

    return { error: null }
  }, [])

  return {
    outfits,
    outfitsGuardados,
    loading,
    error,
    saveOutfit,
    createManualOutfit,
    updateOutfit,
    deleteOutfit,
    updateOutfitAccessories,
    syncTopOutfits,
    remigrarOutfit,            // ← nuevo: herramienta de migración
    refetch: fetchOutfitsGuardados,
  }
}