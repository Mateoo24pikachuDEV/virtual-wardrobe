// hooks/useCollections.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import supabase from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  PRENDA_FIELDS,
  OUTFIT_SELECT_FRAGMENT,
  normalizarOutfit,
} from '@/lib/outfitAdapter'

// Para la portada solo necesitamos imagen_url
const COVER_FIELDS = 'id, imagen_url'

export function useCollections() {
  const { user } = useAuth()
  const [collections, setCollections] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  // -----------------------------------------------------------
  // FETCH todas las colecciones del usuario
  // Incluye: count de outfits + thumbnails (primeras 4 imágenes)
  // -----------------------------------------------------------
  const fetchCollections = useCallback(async () => {
    if (!user) { setCollections([]); setLoading(false); return }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('collections')
      .select(`
        id, nombre, descripcion, created_at, updated_at, cover_outfit_id,
        outfit_collections (
          added_at,
          outfit:outfit_id (
            id,
            top:top_id ( ${COVER_FIELDS} )
          )
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setCollections((data || []).map(normalizarCollection))
    }

    setLoading(false)
  }, [user])

  useEffect(() => { fetchCollections() }, [fetchCollections])

  // -----------------------------------------------------------
  // Normalizar fila de BD → estructura UI
  // -----------------------------------------------------------
  function normalizarCollection(c) {
    const outfitsOrdenados = [...(c.outfit_collections || [])]
      .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))

    const thumbnails = outfitsOrdenados
      .slice(0, 4)
      .map((oc) => oc.outfit?.top?.imagen_url || null)

    return {
      ...c,
      outfit_count: c.outfit_collections?.length ?? 0,
      thumbnails,                          // hasta 4 URLs para la portada
      outfit_ids: outfitsOrdenados.map((oc) => oc.outfit?.id).filter(Boolean),
    }
  }

  // -----------------------------------------------------------
  // CREATE colección
  // -----------------------------------------------------------
  const createCollection = useCallback(async ({ nombre, descripcion = '' }) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const { data, error: insertError } = await supabase
      .from('collections')
      .insert([{
        user_id:     user.id,
        nombre:      nombre.trim(),
        descripcion: descripcion.trim() || null,
      }])
      .select()
      .single()

    if (insertError) return { error: insertError.message }

    const nueva = normalizarCollection({ ...data, outfit_collections: [] })
    setCollections((prev) => [nueva, ...prev])
    return { data: nueva, error: null }
  }, [user])

  // -----------------------------------------------------------
  // UPDATE colección (nombre / descripción)
  // -----------------------------------------------------------
  const updateCollection = useCallback(async (collectionId, { nombre, descripcion = '' }) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const { data, error: updateError } = await supabase
      .from('collections')
      .update({
        nombre:      nombre.trim(),
        descripcion: descripcion.trim() || null,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) return { error: updateError.message }

    setCollections((prev) =>
      prev.map((c) => c.id === collectionId ? { ...c, ...data } : c)
    )
    return { data, error: null }
  }, [user])

  // -----------------------------------------------------------
  // DELETE colección (outfit_collections en cascada por FK)
  // -----------------------------------------------------------
  const deleteCollection = useCallback(async (collectionId) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const { error: deleteError } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', user.id)

    if (deleteError) return { error: deleteError.message }

    setCollections((prev) => prev.filter((c) => c.id !== collectionId))
    return { error: null }
  }, [user])

  // -----------------------------------------------------------
  // ADD outfit → colección
  // -----------------------------------------------------------
  const addOutfitToCollection = useCallback(async (outfitId, collectionId) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const { error: insertError } = await supabase
      .from('outfit_collections')
      .insert([{ outfit_id: outfitId, collection_id: collectionId }])

    if (insertError) {
      // Duplicate (outfit ya estaba) → éxito silencioso
      if (insertError.code === '23505') return { error: null }
      return { error: insertError.message }
    }

    // Actualizar count local
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              outfit_count: c.outfit_count + 1,
              outfit_ids:   [...c.outfit_ids, outfitId],
            }
          : c
      )
    )
    return { error: null }
  }, [user])

  // -----------------------------------------------------------
  // REMOVE outfit ← colección
  // -----------------------------------------------------------
  const removeOutfitFromCollection = useCallback(async (outfitId, collectionId) => {
    if (!user) return { error: 'No hay usuario autenticado' }

    const { error: deleteError } = await supabase
      .from('outfit_collections')
      .delete()
      .eq('outfit_id',     outfitId)
      .eq('collection_id', collectionId)

    if (deleteError) return { error: deleteError.message }

    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              outfit_count: Math.max(0, c.outfit_count - 1),
              outfit_ids:   c.outfit_ids.filter((id) => id !== outfitId),
            }
          : c
      )
    )
    return { error: null }
  }, [user])

  // -----------------------------------------------------------
  // GET colecciones que contienen un outfit concreto
  // (para saber qué checkboxes pre-marcar en AddToCollectionModal)
  // -----------------------------------------------------------
  const getOutfitCollectionIds = useCallback(async (outfitId) => {
    if (!user) return { data: [], error: null }

    const { data, error: fetchError } = await supabase
      .from('outfit_collections')
      .select('collection_id')
      .eq('outfit_id', outfitId)

    if (fetchError) return { data: [], error: fetchError.message }
    return { data: (data || []).map((r) => r.collection_id), error: null }
  }, [user])

// -----------------------------------------------------------
  // FETCH outfits de una colección concreta (para página de detalle)
  // Usa OUTFIT_SELECT_FRAGMENT del adapter → soporta outfit_items + fallback
  // -----------------------------------------------------------
  const fetchCollectionOutfits = useCallback(async (collectionId) => {
    const { data, error: fetchError } = await supabase
      .from('outfit_collections')
      .select(`
        added_at,
        outfit:outfit_id (
          *,
          ${OUTFIT_SELECT_FRAGMENT}
        )
      `)
      .eq('collection_id', collectionId)
      .order('added_at', { ascending: false })

    if (fetchError) return { data: [], error: fetchError.message }

    const outfits = (data || [])
      .map((row) => {
        if (!row.outfit) return null
        return {
          ...normalizarOutfit(row.outfit),  // ← usa el adapter centralizado
          added_at: row.added_at,
        }
      })
      .filter(Boolean)

    return { data: outfits, error: null }
  }, [])

  return {
    collections,
    loading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
    addOutfitToCollection,
    removeOutfitFromCollection,
    getOutfitCollectionIds,
    fetchCollectionOutfits,
    refetch: fetchCollections,
  }
}