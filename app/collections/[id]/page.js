// app/collections/[id]/page.js
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useCollections } from '@/hooks/useCollections'
import { useOutfits } from '@/hooks/useOutfits'
import { useGarments } from '@/hooks/useGarments'
import Navbar from '@/components/ui/Navbar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import OutfitGrid from '@/components/outfits/OutfitGrid'
import ManualOutfitBuilder from '@/components/outfits/ManualOutfitBuilder'

export default function CollectionDetailPage() {
  const { id: collectionId }           = useParams()
  const router                         = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { prendas }                    = useGarments()

  const {
    collections,
    fetchCollectionOutfits,
    removeOutfitFromCollection,
    updateCollection,
  } = useCollections()

  const { updateOutfit } = useOutfits(prendas)

  // Estado local de esta página
  const [outfits,      setOutfits]      = useState([])
  const [loadingOuts,  setLoadingOuts]  = useState(true)
  const [editingOutfit, setEditingOutfit] = useState(null)
  const [toast,         setToast]        = useState({ visible: false, msg: '' })

  // Colección actual (desde el hook de collections)
  const collection = collections.find((c) => c.id === collectionId)

  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  const showToast = (msg) => {
    setToast({ visible: true, msg })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500)
  }

  // Cargar outfits de esta colección
  useEffect(() => {
    if (!collectionId) return
    setLoadingOuts(true)
    fetchCollectionOutfits(collectionId).then(({ data }) => {
      setOutfits(data || [])
      setLoadingOuts(false)
    })
  }, [collectionId])

  // Quitar outfit de la colección (NO elimina el outfit del armario)
  const handleRemove = async (outfitId) => {
    const { error } = await removeOutfitFromCollection(outfitId, collectionId)
    if (!error) {
      setOutfits((prev) => prev.filter((o) => o.id !== outfitId))
      showToast('Outfit quitado de la colección')
    }
  }

  // Editar outfit desde esta vista
  const handleUpdateOutfit = async (outfitData) => {
    if (!editingOutfit) return { error: 'Sin outfit seleccionado' }
    const { data, error } = await updateOutfit(editingOutfit.id, outfitData)
    if (error) return { error }
    // Actualizar lista local
    setOutfits((prev) => prev.map((o) => o.id === editingOutfit.id ? data : o))
    showToast(`Outfit actualizado · ${outfitData.score}/100`)
    setEditingOutfit(null)
    return { error: null }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/collections" className="hover:text-purple-600 transition-colors">
            Colecciones
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
          <span className="text-gray-700 font-medium">
            {collection?.nombre || '...'}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {collection?.nombre || 'Colección'}
            </h1>
            {collection?.descripcion && (
              <p className="text-gray-500 mt-1 text-sm max-w-xl">
                {collection.descripcion}
              </p>
            )}
            <p className="text-gray-400 text-sm mt-1">
              {outfits.length} outfit{outfits.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Link href="/collections">
            <Button variant="secondary" size="md">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Volver
            </Button>
          </Link>
        </div>

        {/* Toast */}
        {toast.visible && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm
                          text-green-700 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {toast.msg}
          </div>
        )}

        {/* OutfitGrid con "quitar de colección" como acción de borrado */}
        <OutfitGrid
          outfits={outfits}
          loading={loadingOuts}
          onSave={() => {}}
          onDelete={handleRemove}
          onEdit={(outfit) => setEditingOutfit(outfit)}
          savedIds={outfits.map((o) => o.id)}
          emptyMessage="Esta colección está vacía"
          emptySubMessage='Ve a "Outfits", guarda alguno y añádelo a esta colección con el botón 📁.'
        />
      </main>

      {/* Modal: Editar outfit */}
      <Modal
        isOpen={!!editingOutfit}
        onClose={() => setEditingOutfit(null)}
        title={editingOutfit ? `Editando outfit · ${editingOutfit.score}/100` : 'Editar outfit'}
        size="lg"
        closeOnBackdrop={false}
      >
        {editingOutfit && (
          <ManualOutfitBuilder
            prendas={prendas}
            onSave={handleUpdateOutfit}
            onCancel={() => setEditingOutfit(null)}
            initialOutfit={editingOutfit}
            isEditing
          />
        )}
      </Modal>
    </div>
  )
}