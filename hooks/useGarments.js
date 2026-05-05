// hooks/useGarments.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { detectarFamiliaColor } from '@/lib/outfitEngine'
import { v4 as uuidv4 } from 'uuid'

/**
 * Hook para gestionar las prendas del usuario.
 * Provee: prendas, loading, error, addGarment, deleteGarment, refetch
 */
export function useGarments() {
  const { user } = useAuth()
  const [prendas,  setPrendas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // -----------------------------------------------------------
  // Cargar todas las prendas del usuario actual
  // -----------------------------------------------------------
  const fetchPrendas = useCallback(async () => {
    if (!user) {
      setPrendas([])
      setLoading(false)
      return
    }

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

  useEffect(() => {
    fetchPrendas()
  }, [fetchPrendas])

  // -----------------------------------------------------------
  // Añadir una prenda nueva (con foto)
  // -----------------------------------------------------------
  /**
   * @param {Object} formData
   * @param {string} formData.nombre
   * @param {string} formData.categoria    - top | bottom | shoes | outerwear
   * @param {string} formData.color        - nombre del color (ej: "azul marino")
   * @param {string} formData.formalidad   - casual | smart | formal
   * @param {File}   formData.imagenFile   - archivo de imagen (puede ser null)
   */
  const addGarment = useCallback(async (formData) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    setLoading(true)
    setError(null)

    let imagen_url   = null
    let storage_path = null

    try {
      // ── 1. Subir imagen a Supabase Storage (si hay archivo) ──
      if (formData.imagenFile) {
        const ext       = formData.imagenFile.name.split('.').pop()
        const fileName  = `${uuidv4()}.${ext}`
        // La carpeta es el user_id para que la política de storage funcione
        const filePath  = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('garments')
          .upload(filePath, formData.imagenFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`)

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('garments')
          .getPublicUrl(filePath)

        imagen_url   = urlData.publicUrl
        storage_path = filePath
      }

      // ── 2. Detectar familia de color automáticamente ──────────
      const color_familia = detectarFamiliaColor(formData.color)

      // ── 3. Insertar prenda en la base de datos ────────────────
      const { data, error: insertError } = await supabase
        .from('prendas')
        .insert([
          {
            user_id:      user.id,
            nombre:       formData.nombre.trim(),
            categoria:    formData.categoria,
            color:        formData.color.trim().toLowerCase(),
            color_familia,
            formalidad:   formData.formalidad,
            imagen_url,
            storage_path,
          },
        ])
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      // ── 4. Actualizar estado local optimístamente ──────────────
      setPrendas((prev) => [data, ...prev])

      setLoading(false)
      return { data, error: null }

    } catch (err) {
      setError(err.message)
      setLoading(false)
      return { data: null, error: err.message }
    }
  }, [user])

  // -----------------------------------------------------------
  // Eliminar una prenda (y su imagen en Storage)
  // -----------------------------------------------------------
  const deleteGarment = useCallback(async (prendaId) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    // Buscar la prenda en el estado local para obtener storage_path
    const prenda = prendas.find((p) => p.id === prendaId)

    try {
      // ── 1. Eliminar imagen de Storage si existe ────────────────
      if (prenda?.storage_path) {
        await supabase.storage
          .from('garments')
          .remove([prenda.storage_path])
        // No lanzamos error si falla el storage, continuamos
      }

      // ── 2. Eliminar registro de la BD ─────────────────────────
      const { error: deleteError } = await supabase
        .from('prendas')
        .delete()
        .eq('id', prendaId)
        .eq('user_id', user.id)

      if (deleteError) throw new Error(deleteError.message)

      // ── 3. Actualizar estado local ────────────────────────────
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
    deleteGarment,
    refetch: fetchPrendas,
  }
}