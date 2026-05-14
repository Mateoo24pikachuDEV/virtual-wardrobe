// components/collections/AddToCollectionModal.jsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Button from '@/components/ui/Button'
import CollectionForm from './CollectionForm'

/**
 * Modal para añadir/quitar un outfit de una o más colecciones.
 *
 * @prop {Object}    outfit                    - outfit a gestionar
 * @prop {Object[]}  collections               - todas las colecciones del usuario
 * @prop {Function}  getOutfitCollectionIds    - async (outfitId) => { data: string[] }
 * @prop {Function}  addOutfitToCollection     - async (outfitId, collectionId) => { error }
 * @prop {Function}  removeOutfitFromCollection- async (outfitId, collectionId) => { error }
 * @prop {Function}  createCollection          - async ({ nombre, descripcion }) => { data, error }
 * @prop {Function}  onClose
 */
export default function AddToCollectionModal({
  outfit,
  collections,
  getOutfitCollectionIds,
  addOutfitToCollection,
  removeOutfitFromCollection,
  createCollection,
  onClose,
}) {
  // IDs de colecciones que ACTUALMENTE contienen el outfit (cargados al montar)
  const [initialIds,    setInitialIds]    = useState(new Set())
  // IDs seleccionados por el usuario (puede diferir de initialIds)
  const [selectedIds,   setSelectedIds]   = useState(new Set())
  const [loadingInit,   setLoadingInit]   = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [showNewForm,   setShowNewForm]   = useState(false)

  // Cargar membership actual al abrir el modal
  useEffect(() => {
    if (!outfit?.id) return

    setLoadingInit(true)
    getOutfitCollectionIds(outfit.id).then(({ data }) => {
      const ids = new Set(data || [])
      setInitialIds(ids)
      setSelectedIds(new Set(ids)) // copia para que el usuario pueda modificar
      setLoadingInit(false)
    })
  }, [outfit?.id])

  const toggle = (collectionId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(collectionId) ? next.delete(collectionId) : next.add(collectionId)
      return next
    })
    setError('')
  }

  // Calcular diff entre estado inicial y selección actual
  const toAdd    = [...selectedIds].filter((id) => !initialIds.has(id))
  const toRemove = [...initialIds].filter((id) => !selectedIds.has(id))
  const hasChanges = toAdd.length > 0 || toRemove.length > 0

  const handleSave = async () => {
    if (!hasChanges) { onClose(); return }

    setSaving(true)
    setError('')

    const ops = [
      ...toAdd.map((id)    => addOutfitToCollection(outfit.id, id)),
      ...toRemove.map((id) => removeOutfitFromCollection(outfit.id, id)),
    ]

    const results = await Promise.all(ops)
    const firstError = results.find((r) => r.error)

    if (firstError) {
      setError(firstError.error)
      setSaving(false)
      return
    }

    setSaving(false)
    onClose()
  }

  const handleCreateAndAdd = async ({ nombre, descripcion }) => {
    const { data: nuevaCol, error: createError } = await createCollection({ nombre, descripcion })
    if (createError) return { error: createError }

    // Auto-seleccionar la nueva colección
    setSelectedIds((prev) => new Set([...prev, nuevaCol.id]))
    setShowNewForm(false)
    return { error: null }
  }

  return (
    <div className="flex flex-col gap-4 min-h-[200px]">

      {/* Header info outfit */}
      {outfit && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
            {outfit._top?.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={outfit._top.imagen_url} alt="" className="w-full h-full object-cover"/>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">👕</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">
              {outfit._top?.nombre} + {outfit._bottom?.nombre}
            </p>
            <p className="text-xs text-gray-400">Score: {outfit.score}/100</p>
          </div>
        </div>
      )}

      {/* Lista de colecciones */}
      {loadingInit ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl"/>
          ))}
        </div>
      ) : collections.length === 0 && !showNewForm ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          No tienes colecciones todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {collections.map((col) => {
            const isSelected = selectedIds.has(col.id)
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggle(col.id)}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border text-left
                  transition-all duration-150 w-full
                  ${isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'}
                `}
              >
                {/* Checkbox visual */}
                <div className={`
                  w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
                  transition-colors
                  ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}
                `}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                    {col.nombre}
                  </p>
                  <p className="text-xs text-gray-400">{col.outfit_count} outfits</p>
                </div>

                {/* Badge "en esta colección" */}
                {initialIds.has(col.id) && !isSelected && (
                  <span className="text-xs text-red-400 flex-shrink-0">Quitar</span>
                )}
                {!initialIds.has(col.id) && isSelected && (
                  <span className="text-xs text-purple-500 flex-shrink-0">Añadir</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Formulario nueva colección (inline) */}
      {showNewForm ? (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-2">Nueva colección</p>
          <CollectionForm
            onSubmit={handleCreateAndAdd}
            onCancel={() => setShowNewForm(false)}
            compact
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 text-sm text-purple-600 font-medium
                     hover:text-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Crear nueva colección
        </button>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button size="md" loading={saving} onClick={handleSave} className="flex-1">
          {hasChanges
            ? `Guardar (${toAdd.length > 0 ? `+${toAdd.length}` : ''}${toRemove.length > 0 ? ` -${toRemove.length}` : ''})`
            : 'Listo'
          }
        </Button>
      </div>
    </div>
  )
}