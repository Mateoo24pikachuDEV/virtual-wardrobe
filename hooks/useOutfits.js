// hooks/useOutfits.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {generarOutfits, calcularDatosTermicos } from '@/lib/outfitEngine'

// Campos que seleccionamos de cada prenda en los joins
const PRENDA_FIELDS = [
  'id', 'nombre', 'categoria', 'subcategoria',
  'color', 'color_familia', 'formalidad', 'formalidades',
  'imagen_url', 'warmth',
].join(', ')

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
    const sugerencias = generarOutfits(prendas)
    setOutfits(sugerencias)
  }, [prendas])

  // -----------------------------------------------------------
  // Normalizar fila de BD → estructura que usa la UI
  // Convierte los joins de Supabase a _top, _bottom, etc.
  // -----------------------------------------------------------
  const normalizarOutfit = useCallback((row) => {
    // outfit_accessories viene como [{ prenda: {...} }, ...]
    const accessories = (row.outfit_accessories || [])
      .map((oa) => oa.prenda)
      .filter(Boolean)

    return {
      ...row,
      _top:         row.top,
      _bottom:      row.bottom,
      _shoes:       row.shoes,
      _outerwear:   row.outerwear    || null,
      _accessories: accessories,
      accessory_ids: accessories.map((a) => a.id),
    }
  }, [])

  // -----------------------------------------------------------
  // FETCH outfits guardados
  // -----------------------------------------------------------
  const fetchOutfitsGuardados = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('outfits')
      .select(`
        *,
        top:top_id              ( ${PRENDA_FIELDS} ),
        bottom:bottom_id        ( ${PRENDA_FIELDS} ),
        shoes:shoes_id          ( ${PRENDA_FIELDS} ),
        outerwear:outerwear_id  ( ${PRENDA_FIELDS} ),
        outfit_accessories (
          prenda:prenda_id      ( ${PRENDA_FIELDS} )
        )
      `)
      .eq('user_id', user.id)
      .order('score', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOutfitsGuardados((data || []).map(normalizarOutfit))
    }

    setLoading(false)
  }, [user, normalizarOutfit])

  useEffect(() => { fetchOutfitsGuardados() }, [fetchOutfitsGuardados])

  // -----------------------------------------------------------
  // SAVE outfit (generado o manual)
  // -----------------------------------------------------------
  /**
   * @param {Object} outfit  - objeto con _top, _bottom, _shoes, etc.
   */
  const saveOutfit = useCallback(async (outfit) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    try {
// 1. Calcular datos térmicos a partir de las referencias de prenda
      //    (siempre frescos, nunca stale)
      const { nivel_termico, seasons } = outfit._top
        ? calcularDatosTermicos(
            outfit._top,
            outfit._bottom,
            outfit._shoes,
            outfit._outerwear    || null,
            outfit._accessories  || []
          )
        : { nivel_termico: null, seasons: [] }

      // 2. Insertar fila en outfits
      const { data: outfitData, error: insertError } = await supabase
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

      // 2. Insertar accesorios en outfit_accessories (si los hay)
      const accIds = outfit.accessory_ids || []
      if (accIds.length > 0) {
        const rows = accIds.map((prendaId) => ({
          outfit_id: outfitData.id,
          prenda_id: prendaId,
        }))

        const { error: accError } = await supabase
          .from('outfit_accessories')
          .insert(rows)

        if (accError) {
          // No bloqueamos: el outfit quedó guardado, solo faltan accesorios
          console.warn('Error guardando accesorios:', accError.message)
        }
      }

      // 3. Construir objeto completo para actualizar el estado
      const outfitCompleto = normalizarOutfit({
        ...outfitData,
        top:               outfit._top,
        bottom:            outfit._bottom,
        shoes:             outfit._shoes,
        outerwear:         outfit._outerwear || null,
        outfit_accessories: (outfit._accessories || []).map((a) => ({ prenda: a })),
      })

      setOutfitsGuardados((prev) => [outfitCompleto, ...prev])
      return { data: outfitCompleto, error: null }

    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    }
  }, [user, normalizarOutfit])

  // -----------------------------------------------------------
  // UPDATE accesorios de un outfit guardado
  // -----------------------------------------------------------
  /**
   * @param {string}   outfitId
   * @param {string[]} newAccessoryIds  - array completo de IDs (reemplaza el anterior)
   * @param {Object[]} newAccessoryObjs - objetos completos para actualizar la UI
   * @param {number}   newScore
   */
  const updateOutfitAccessories = useCallback(async (
    outfitId,
    newAccessoryIds,
    newAccessoryObjs,
    newScore
  ) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    try {
      // 1. Borrar accesorios actuales del outfit
      const { error: deleteAccError } = await supabase
        .from('outfit_accessories')
        .delete()
        .eq('outfit_id', outfitId)

      if (deleteAccError) throw new Error(deleteAccError.message)

      // 2. Insertar los nuevos
      if (newAccessoryIds.length > 0) {
        const rows = newAccessoryIds.map((prendaId) => ({
          outfit_id: outfitId,
          prenda_id: prendaId,
        }))
        const { error: insertAccError } = await supabase
          .from('outfit_accessories')
          .insert(rows)

        if (insertAccError) throw new Error(insertAccError.message)
      }

      // 3. Actualizar score en outfits
      const { error: updateError } = await supabase
        .from('outfits')
        .update({ score: newScore })
        .eq('id', outfitId)
        .eq('user_id', user.id)

      if (updateError) throw new Error(updateError.message)

      // 4. Actualizar estado local
      setOutfitsGuardados((prev) =>
        prev.map((o) =>
          o.id === outfitId
            ? {
                ...o,
                score:        newScore,
                _accessories: newAccessoryObjs,
                accessory_ids: newAccessoryIds,
                outfit_accessories: newAccessoryObjs.map((a) => ({ prenda: a })),
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
  // UPDATE outfit completo (prendas + accesorios + score)
  // -----------------------------------------------------------
  /**
   * Reemplaza todas las prendas y accesorios de un outfit existente
   * y recalcula su score en la BD.
   *
   * @param {string} outfitId
   * @param {Object} outfitData  - misma estructura que saveOutfit
   */
  const updateOutfit = useCallback(async (outfitId, outfitData) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    try {
// ── 0. Recalcular datos térmicos con las nuevas prendas ──
      const { nivel_termico, seasons } = outfitData._top
        ? calcularDatosTermicos(
            outfitData._top,
            outfitData._bottom,
            outfitData._shoes,
            outfitData._outerwear    || null,
            outfitData._accessories  || []
          )
        : { nivel_termico: null, seasons: [] }

      // ── 1. Actualizar prenda principal ───────────────────
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

      // ── 2. Reemplazar accesorios (delete + insert) ───────
      const { error: deleteAccError } = await supabase
        .from('outfit_accessories')
        .delete()
        .eq('outfit_id', outfitId)

      if (deleteAccError) throw new Error(deleteAccError.message)

      const accIds = outfitData.accessory_ids || []
      if (accIds.length > 0) {
        const rows = accIds.map((prendaId) => ({
          outfit_id: outfitId,
          prenda_id: prendaId,
        }))
        const { error: insertAccError } = await supabase
          .from('outfit_accessories')
          .insert(rows)
        if (insertAccError) throw new Error(insertAccError.message)
      }

      // ── 3. Reconstruir objeto para el estado local ───────
      const outfitActualizado = normalizarOutfit({
        ...outfitRecord,
        top:              outfitData._top,
        bottom:           outfitData._bottom,
        shoes:            outfitData._shoes,
        outerwear:        outfitData._outerwear || null,
        outfit_accessories: (outfitData._accessories || []).map((a) => ({ prenda: a })),
      })

      setOutfitsGuardados((prev) =>
        prev.map((o) => o.id === outfitId ? outfitActualizado : o)
      )

      return { data: outfitActualizado, error: null }

    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    }
  }, [user, normalizarOutfit])

  // -----------------------------------------------------------
  // DELETE outfit
  // -----------------------------------------------------------
  const deleteOutfit = useCallback(async (outfitId) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    // outfit_accessories se borra en cascada por FK ON DELETE CASCADE
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
  // SYNC: guarda el top N automáticamente
  // -----------------------------------------------------------
  const syncTopOutfits = useCallback(async (topN = 5) => {
    if (!user || outfits.length === 0) return

    setLoading(true)

    // 1. Borrar outfits GENERADOS anteriores (no borra manuales: Fase 4)
    await supabase
      .from('outfits')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'generated')   // solo los automáticos

    // 2. Insertar los top N
    const topOutfits = outfits.slice(0, topN)

    for (const outfit of topOutfits) {
      await saveOutfit({ ...outfit, source: 'generated' })
    }

    setLoading(false)
  }, [user, outfits, saveOutfit])

  // -----------------------------------------------------------
  // CREATE MANUAL OUTFIT — wrapper explícito sobre saveOutfit
  // -----------------------------------------------------------
  /**
   * Crea un outfit marcado como 'manual'.
   * Garantiza que source siempre sea 'manual' sin depender del caller.
   *
   * @param {Object} outfit - misma estructura que saveOutfit
   */
  const createManualOutfit = useCallback(async (outfit) => {
    return saveOutfit({ ...outfit, source: 'manual' })
  }, [saveOutfit])

  return {
    outfits,
    outfitsGuardados,
    loading,
    error,
    saveOutfit,
    createManualOutfit,
    updateOutfit,            // ← nuevo Fase 5
    deleteOutfit,
    updateOutfitAccessories,
    syncTopOutfits,
    refetch: fetchOutfitsGuardados,
  }
}