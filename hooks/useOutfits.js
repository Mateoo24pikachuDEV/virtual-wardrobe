// hooks/useOutfits.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { generarOutfits } from '@/lib/outfitEngine'

/**
 * Hook para gestionar los outfits generados.
 * - Genera outfits localmente con el motor de reglas
 * - Persiste los mejores outfits en Supabase
 * - Lee outfits guardados previamente
 */
export function useOutfits(prendas = []) {
  const { user } = useAuth()
  const [outfits,          setOutfits]          = useState([])
  const [outfitsGuardados, setOutfitsGuardados] = useState([])
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState(null)

  // -----------------------------------------------------------
  // Generar outfits en memoria cada vez que cambian las prendas
  // -----------------------------------------------------------
  useEffect(() => {
    if (!prendas || prendas.length === 0) {
      setOutfits([])
      return
    }

  const sugerencias = generarOutfits(prendas)

    console.log('PRENDAS:', prendas)
    console.log('OUTFITS GENERADOS:', sugerencias)

  setOutfits(sugerencias)
  }, [prendas])

  // -----------------------------------------------------------
  // Cargar outfits guardados en la BD
  // -----------------------------------------------------------
  const fetchOutfitsGuardados = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('outfits')
      .select(`
        *,
        top:top_id         ( id, nombre, categoria, color, color_familia, formalidad, imagen_url ),
        bottom:bottom_id   ( id, nombre, categoria, color, color_familia, formalidad, imagen_url ),
        shoes:shoes_id     ( id, nombre, categoria, color, color_familia, formalidad, imagen_url ),
        outerwear:outerwear_id ( id, nombre, categoria, color, color_familia, formalidad, imagen_url )
      `)
      .eq('user_id', user.id)
      .order('score', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      // Normalizar nombres para que la UI use _top, _bottom, etc.
      const normalizados = (data || []).map((o) => ({
        ...o,
        _top:       o.top,
        _bottom:    o.bottom,
        _shoes:     o.shoes,
        _outerwear: o.outerwear,
      }))
      setOutfitsGuardados(normalizados)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchOutfitsGuardados()
  }, [fetchOutfitsGuardados])

  // -----------------------------------------------------------
  // Guardar un outfit específico en la BD
  // -----------------------------------------------------------
  const saveOutfit = useCallback(async (outfit) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const { data, error: insertError } = await supabase
      .from('outfits')
      .insert([{
        user_id:      user.id,
        top_id:       outfit.top_id,
        bottom_id:    outfit.bottom_id,
        shoes_id:     outfit.shoes_id,
        outerwear_id: outfit.outerwear_id || null,
        score:        outfit.score,
      }])
      .select()
      .single()

    if (insertError) return { error: insertError.message }

    // Actualizar estado con el outfit guardado (con sus relaciones)
    const outfitCompleto = {
      ...data,
      _top:       outfit._top,
      _bottom:    outfit._bottom,
      _shoes:     outfit._shoes,
      _outerwear: outfit._outerwear,
    }

    setOutfitsGuardados((prev) => [outfitCompleto, ...prev])
    return { data: outfitCompleto, error: null }
  }, [user])

  // -----------------------------------------------------------
  // Eliminar un outfit guardado
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
  // Sincronizar: guardar automáticamente el TOP 5 al regenerar
  // -----------------------------------------------------------
  const syncTopOutfits = useCallback(async () => {
    if (!user || outfits.length === 0) return

    setLoading(true)

    // Borrar outfits anteriores del usuario
    await supabase
      .from('outfits')
      .delete()
      .eq('user_id', user.id)

    // Insertar el top 5 nuevos
    const top5 = outfits.slice(0, 5)

    const inserts = top5.map((o) => ({
      user_id:      user.id,
      top_id:       o.top_id,
      bottom_id:    o.bottom_id,
      shoes_id:     o.shoes_id,
      outerwear_id: o.outerwear_id || null,
      score:        o.score,
    }))

    const { error: insertError } = await supabase
      .from('outfits')
      .insert(inserts)

    if (!insertError) {
      await fetchOutfitsGuardados()
    } else {
      setError(insertError.message)
    }

    setLoading(false)
  }, [user, outfits, fetchOutfitsGuardados])

  return {
    outfits,           // todos los outfits generados en memoria
    outfitsGuardados,  // outfits persistidos en la BD
    loading,
    error,
    saveOutfit,
    deleteOutfit,
    syncTopOutfits,
    refetch: fetchOutfitsGuardados,
  }
}