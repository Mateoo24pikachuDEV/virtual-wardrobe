// hooks/useGarments.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { detectarFamiliaColor } from '@/lib/outfitEngine'
import { v4 as uuidv4 } from 'uuid'

export function useGarments() {
  const { user }   = useAuth()
  const [prendas,  setPrendas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // -----------------------------------------------------------
  // FETCH
  // -----------------------------------------------------------
  const fetchPrendas = useCallback(async () => {
    if (!user) { setPrendas([]); setLoading(false); return }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('prendas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setPrendas(data || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchPrendas() }, [fetchPrendas])

  // -----------------------------------------------------------
  // ADD GARMENT
  // -----------------------------------------------------------
  /**
   * @param {Object} formData
   * @param {string}   formData.nombre
   * @param {string}   formData.categoria
   * @param {string}   formData.color
   * @param {string[]} formData.formalidades   ← ARRAY ahora
   * @param {File|null} formData.imagenFile
   */
  const addGarment = useCallback(async (formData) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    setError(null)

    let imagen_url   = null
    let storage_path = null

    try {
      // ── 1. Upload imagen ─────────────────────────────────
      if (formData.imagenFile) {
        const ext      = formData.imagenFile.name.split('.').pop()
        const filePath = `${user.id}/${uuidv4()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('garments')
          .upload(filePath, formData.imagenFile, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('garments').getPublicUrl(filePath)

        imagen_url   = urlData.publicUrl
        storage_path = filePath
      }

      // ── 2. Normalizar formalidades ───────────────────────
      // Acepta array o string por seguridad
      const formalidades = Array.isArray(formData.formalidades)
        ? formData.formalidades
        : [formData.formalidades || formData.formalidad || 'casual']

      const color_familia = detectarFamiliaColor(formData.color)

      // ── 3. Insert ────────────────────────────────────────
      const subcategoria = formData.categoria === 'accessory'
        ? (formData.subcategoria || null)
        : null

const { data, error: insertError } = await supabase
  .from('prendas')
  .insert([{
    user_id:      user.id,
    nombre:       formData.nombre.trim(),
    categoria:    formData.categoria,
    subcategoria,
    color:        formData.color.trim().toLowerCase(),
    color_familia,
    formalidad:   formalidades[0], // temporal compatibilidad vieja
    formalidades,
    imagen_url,
    storage_path,
    warmth:       formData.warmth || null,
  }])
  .select()
  .single()

if (insertError) throw new Error(insertError.message)

setPrendas((prev) => [data, ...prev])

return { data, error: null }

    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    }
  }, [user])

  // -----------------------------------------------------------
  // UPDATE GARMENT (Fase 3 preview — funcional desde ya)
  // -----------------------------------------------------------
  /**
   * @param {string} prendaId
   * @param {Object} formData   - misma estructura que addGarment
   */
  const updateGarment = useCallback(async (prendaId, formData) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const prendaExistente = prendas.find((p) => p.id === prendaId)
    if (!prendaExistente) return { error: 'Prenda no encontrada' }

    setError(null)

    try {
      let imagen_url   = prendaExistente.imagen_url
      let storage_path = prendaExistente.storage_path

      // ── 1. Reemplazar imagen solo si hay nueva ───────────
      if (formData.imagenFile) {
        // Subir nueva imagen
        const ext      = formData.imagenFile.name.split('.').pop()
        const filePath = `${user.id}/${uuidv4()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('garments')
          .upload(filePath, formData.imagenFile, { cacheControl: '3600', upsert: false })

        if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('garments').getPublicUrl(filePath)

        // Eliminar imagen vieja en background (no bloquea)
        if (prendaExistente.storage_path) {
          supabase.storage.from('garments')
            .remove([prendaExistente.storage_path])
            .catch(() => {}) // silenciamos error de cleanup
        }

        imagen_url   = urlData.publicUrl
        storage_path = filePath
      }

      // ── 2. Normalizar formalidades ───────────────────────
      const formalidades = Array.isArray(formData.formalidades)
        ? formData.formalidades
        : [formData.formalidades || formData.formalidad || 'casual']

      const color_familia = detectarFamiliaColor(formData.color)

      // ── 3. Update ────────────────────────────────────────
      // subcategoria solo es válida para accesorios
      const subcategoria = formData.categoria === 'accessory'
        ? (formData.subcategoria || null)
        : null

      const { data, error: updateError } = await supabase
        .from('prendas')
        .update({
          user_id:      user.id,
          nombre:       formData.nombre.trim(),
          categoria:    formData.categoria,
          subcategoria,
          color:        formData.color.trim().toLowerCase(),
          color_familia,
          formalidad:   formalidades[0],
          formalidades,
          imagen_url,
          storage_path,
          warmth:       formData.warmth || null,
        })
        .eq('id', prendaId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw new Error(updateError.message)

      // Actualizar estado local
      setPrendas((prev) => prev.map((p) => p.id === prendaId ? data : p))
      return { data, error: null }

    } catch (err) {
      setError(err.message)
      return { data: null, error: err.message }
    }
  }, [user, prendas])

  // -----------------------------------------------------------
  // DELETE GARMENT
  // -----------------------------------------------------------
  const deleteGarment = useCallback(async (prendaId) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const prenda = prendas.find((p) => p.id === prendaId)

    try {
      if (prenda?.storage_path) {
        await supabase.storage.from('garments').remove([prenda.storage_path])
      }

      const { error: deleteError } = await supabase
        .from('prendas')
        .delete()
        .eq('id', prendaId)
        .eq('user_id', user.id)

      if (deleteError) throw new Error(deleteError.message)

      setPrendas((prev) => prev.filter((p) => p.id !== prendaId))
      return { error: null }

    } catch (err) {
      setError(err.message)
      return { error: err.message }
    }
  }, [user, prendas])

  return {
    prendas,
    loading,
    error,
    addGarment,
    updateGarment,   // ← nuevo
    deleteGarment,
    refetch: fetchPrendas,
  }
}