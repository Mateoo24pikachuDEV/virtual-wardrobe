// app/wardrobe/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useGarments } from '@/hooks/useGarments'
import { useOutfits } from '@/hooks/useOutfits'
import Navbar from '@/components/ui/Navbar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import GarmentGrid from '@/components/wardrobe/GarmentGrid'
import AddGarmentForm from '@/components/wardrobe/AddGarmentForm'

export default function WardrobePage() {
  const router                         = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    prendas, loading, error,
    addGarment, updateGarment, deleteGarment,
  } = useGarments()
  const { syncTopOutfits } = useOutfits(prendas)

  // ── Modales ────────────────────────────────────────────────
  const [addModalOpen,  setAddModalOpen]  = useState(false)
  const [editingPrenda, setEditingPrenda] = useState(null)  // prenda en edición o null

  // ── Filtros ────────────────────────────────────────────────
  const [filtroCategoria,  setFiltroCategoria]  = useState('all')
  const [filtroFormalidad, setFiltroFormalidad] = useState('all')

  // ── Toasts ─────────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'success' })

  const showToast = (msg, type = 'success') => {
    setToast({ visible: true, msg, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000)
  }

  // Redirigir si no hay sesión
  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  // ── Handlers ───────────────────────────────────────────────

  /**
   * Crear prenda nueva
   */
  const handleAddGarment = async (formData) => {
    const { data, error } = await addGarment(formData)
    if (error) return { error }

    syncTopOutfits()
    setAddModalOpen(false)
    showToast(`"${data.nombre}" añadida correctamente 🎉`)
    return { data, error: null }
  }

  /**
   * Abrir modal de edición con la prenda preseleccionada
   */
  const handleOpenEdit = (prenda) => {
    setEditingPrenda(prenda)
  }

  /**
   * Guardar cambios de edición
   */
  const handleUpdateGarment = async (formData) => {
    if (!editingPrenda) return { error: 'No hay prenda seleccionada' }

    const { data, error } = await updateGarment(editingPrenda.id, formData)
    if (error) return { error }

    syncTopOutfits()
    setEditingPrenda(null)
    showToast(`"${data.nombre}" actualizada correctamente ✏️`)
    return { data, error: null }
  }

  /**
   * Eliminar prenda
   */
  const handleDeleteGarment = async (id) => {
    await deleteGarment(id)
    syncTopOutfits()
  }

  const nombreUsuario = user?.user_metadata?.nombre
    || user?.email?.split('@')[0]
    || 'Usuario'

  // ── UI ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hola, {nombreUsuario} 👋
            </h1>
            <p className="text-gray-500 mt-1">
              Tu armario tiene{' '}
              <span className="font-semibold text-purple-600">{prendas.length}</span>{' '}
              {prendas.length === 1 ? 'prenda' : 'prendas'}
            </p>
          </div>

          <Button onClick={() => setAddModalOpen(true)} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Añadir prenda
          </Button>
        </div>

        {/* Toast */}
        {toast.visible && (
          <div
            className={`
              mb-6 p-4 rounded-xl text-sm flex items-center gap-2
              border transition-all duration-300
              ${toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
              }
            `}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {toast.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              )}
            </svg>
            {toast.msg}
          </div>
        )}

        {/* Error de hook */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {/* Estadísticas rápidas */}
        {prendas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {[
              { cat: 'top',       emoji: '👕', label: 'Tops'       },
              { cat: 'bottom',    emoji: '👖', label: 'Bottoms'    },
              { cat: 'shoes',     emoji: '👟', label: 'Zapatos'    },
              { cat: 'outerwear', emoji: '🧥', label: 'Abrigos'    },
              { cat: 'accessory', emoji: '👜', label: 'Accesorios' },
            ].map(({ cat, emoji, label }) => {
              const count  = prendas.filter((p) => p.categoria === cat).length
              const active = filtroCategoria === cat
              return (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoria(active ? 'all' : cat)}
                  className={`
                    card p-4 text-center transition-all duration-150 hover:shadow-sm
                    ${active ? 'ring-2 ring-purple-500 ring-offset-1' : ''}
                    ${count === 0 ? 'opacity-50' : ''}
                  `}
                >
                  <div className="text-2xl mb-1">{emoji}</div>
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* Grid de prendas */}
        <GarmentGrid
          prendas={prendas}
          loading={loading}
          onDelete={handleDeleteGarment}
          onEdit={handleOpenEdit}
          filtroCategoria={filtroCategoria}
          setFiltroCategoria={setFiltroCategoria}
          filtroFormalidad={filtroFormalidad}
          setFiltroFormalidad={setFiltroFormalidad}
        />
      </main>

      {/* ── MODAL: Añadir prenda ──────────────────────────────── */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Añadir nueva prenda"
        size="md"
      >
        <AddGarmentForm
          onSubmit={handleAddGarment}
          onCancel={() => setAddModalOpen(false)}
          isEditing={false}
        />
      </Modal>

      {/* ── MODAL: Editar prenda ──────────────────────────────── */}
      <Modal
        isOpen={!!editingPrenda}
        onClose={() => setEditingPrenda(null)}
        title={editingPrenda ? `Editar — ${editingPrenda.nombre}` : 'Editar prenda'}
        size="md"
      >
        {editingPrenda && (
          <EditGarmentContent
            prenda={editingPrenda}
            onSubmit={handleUpdateGarment}
            onCancel={() => setEditingPrenda(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: contenido del modal de edición
// Renderizado solo cuando editingPrenda no es null → evita
// que AddGarmentForm monte/desmonte con estados obsoletos.
// ─────────────────────────────────────────────────────────────
function EditGarmentContent({ prenda, onSubmit, onCancel }) {
  return (
    <div className="flex flex-col gap-0">
      {/* Info de la prenda actual */}
      <div className="flex items-center gap-3 p-3 mb-2 bg-gray-50 rounded-xl border border-gray-100">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          {prenda.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prenda.imagen_url}
              alt={prenda.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
              👕
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{prenda.nombre}</p>
          <p className="text-xs text-gray-400 capitalize">
            {prenda.categoria}
            {prenda.subcategoria && ` · ${prenda.subcategoria}`}
          </p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            Editando
          </span>
        </div>
      </div>

      <AddGarmentForm
        initialData={prenda}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isEditing={true}
      />
    </div>
  )
}