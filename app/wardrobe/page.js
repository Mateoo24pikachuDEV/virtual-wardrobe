// app/wardrobe/page.js
'use client'

import { useState, useEffect } from 'react'
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
  const router                  = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    prendas, loading, error,
    addGarment, deleteGarment,
  } = useGarments()
  const { syncTopOutfits } = useOutfits(prendas)

  const [modalOpen,        setModalOpen]        = useState(false)
  const [filtroCategoria,  setFiltroCategoria]  = useState('all')
  const [filtroFormalidad, setFiltroFormalidad] = useState('all')
  const [successMsg,       setSuccessMsg]       = useState('')

  // Redirigir si no hay sesión
    useEffect(() => {
    if (!authLoading && !user) {
        router.push('/auth/login')
    }
    }, [authLoading, user, router])

  const handleAddGarment = async (formData) => {
    const { data, error } = await addGarment(formData)
    if (error) return { error }

    // Regenerar y sincronizar outfits en background
    syncTopOutfits()

    setModalOpen(false)
    if (data) {
      setSuccessMsg(`"${data.nombre}" añadida correctamente 🎉`)
    } else {
      setSuccessMsg('Prenda añadida correctamente 🎉')
    }
    setTimeout(() => setSuccessMsg(''), 4000)
    return { data, error: null }
  }

  const handleDeleteGarment = async (id) => {
    await deleteGarment(id)
    syncTopOutfits()
  }

  const nombreUsuario = user?.user_metadata?.nombre
    || user?.email?.split('@')[0]
    || 'Usuario'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
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

          <Button onClick={() => setModalOpen(true)} size="md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Añadir prenda
          </Button>
        </div>

        {/* Toast de éxito */}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2 animate-in slide-in-from-top duration-300">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {successMsg}
          </div>
        )}

        {/* Error */}
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
              const count = prendas.filter((p) => p?.categoria === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoria(cat === filtroCategoria ? 'all' : cat)}
                  className={`
                    card p-4 text-center transition-all duration-150 hover:shadow-sm
                    ${filtroCategoria === cat ? 'ring-2 ring-purple-500 ring-offset-1' : ''}
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
          filtroCategoria={filtroCategoria}
          setFiltroCategoria={setFiltroCategoria}
          filtroFormalidad={filtroFormalidad}
          setFiltroFormalidad={setFiltroFormalidad}
        />
      </main>

      {/* Modal para añadir prenda */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Añadir nueva prenda"
        size="md"
      >
        <AddGarmentForm
          onSubmit={handleAddGarment}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  )
}