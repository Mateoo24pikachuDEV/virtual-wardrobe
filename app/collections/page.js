// app/collections/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useCollections } from '@/hooks/useCollections'
import Navbar from '@/components/ui/Navbar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import CollectionGrid from '@/components/collections/CollectionGrid'
import CollectionForm from '@/components/collections/CollectionForm'

export default function CollectionsPage() {
  const router                         = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    collections, loading, error,
    createCollection, updateCollection, deleteCollection,
  } = useCollections()

  const [createOpen,    setCreateOpen]    = useState(false)
  const [editingCol,    setEditingCol]    = useState(null)  // collection en edición
  const [toast,         setToast]         = useState({ visible: false, msg: '' })

  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  const showToast = (msg) => {
    setToast({ visible: true, msg })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500)
  }

  const handleCreate = async (formData) => {
    const { data, error } = await createCollection(formData)
    if (error) return { error }
    showToast(`"${data.nombre}" creada 📁`)
    setCreateOpen(false)
    return { error: null }
  }

  const handleUpdate = async (formData) => {
    if (!editingCol) return { error: 'Sin colección seleccionada' }
    const { error } = await updateCollection(editingCol.id, formData)
    if (error) return { error }
    showToast(`"${formData.nombre}" actualizada ✓`)
    setEditingCol(null)
    return { error: null }
  }

  const handleDelete = async (collectionId) => {
    const col = collections.find((c) => c.id === collectionId)
    const { error } = await deleteCollection(collectionId)
    if (!error && col) showToast(`"${col.nombre}" eliminada`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Colecciones</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {collections.length > 0
                ? `${collections.length} colección${collections.length !== 1 ? 'es' : ''} · ${
                    collections.reduce((s, c) => s + c.outfit_count, 0)
                  } outfits organizados`
                : 'Organiza tus outfits en colecciones temáticas'
              }
            </p>
          </div>

          <Button onClick={() => setCreateOpen(true)} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Nueva colección
          </Button>
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {/* Grid de colecciones */}
        <CollectionGrid
          collections={collections}
          loading={loading}
          onEdit={(col) => setEditingCol(col)}
          onDelete={handleDelete}
        />
      </main>

      {/* Modal: Nueva colección */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva colección"
        size="sm"
      >
        <CollectionForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Modal: Editar colección */}
      <Modal
        isOpen={!!editingCol}
        onClose={() => setEditingCol(null)}
        title={editingCol ? `Editar — ${editingCol.nombre}` : 'Editar colección'}
        size="sm"
      >
        {editingCol && (
          <CollectionForm
            initialData={editingCol}
            onSubmit={handleUpdate}
            onCancel={() => setEditingCol(null)}
            isEditing
          />
        )}
      </Modal>
    </div>
  )
}