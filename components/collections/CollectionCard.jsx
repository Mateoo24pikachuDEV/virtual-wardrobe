// components/collections/CollectionCard.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/ui/Button'

// Colores de gradiente rotativos para la portada cuando no hay imágenes
const GRADIENTS = [
  'from-purple-400 to-pink-400',
  'from-blue-400 to-cyan-400',
  'from-orange-400 to-yellow-400',
  'from-green-400 to-teal-400',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-400',
]

function CoverGrid({ thumbnails, nombre, gradientIdx }) {
  const gradient = GRADIENTS[gradientIdx % GRADIENTS.length]
  const filled   = thumbnails.filter(Boolean)

  if (filled.length === 0) {
    return (
      <div className={`w-full aspect-video bg-gradient-to-br ${gradient}
                       flex items-center justify-center`}>
        <span className="text-4xl opacity-80">👗</span>
      </div>
    )
  }

  if (filled.length === 1) {
    return (
      <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
        <Image src={filled[0]} alt={nombre} fill sizes="400px" className="object-cover"/>
      </div>
    )
  }

  // 2-4 imágenes: cuadrícula 2x2
  const slots = Array.from({ length: 4 }, (_, i) => filled[i] || null)

  return (
    <div className="w-full aspect-video grid grid-cols-2 grid-rows-2 overflow-hidden">
      {slots.map((url, i) => (
        <div key={i} className={`relative overflow-hidden bg-gray-100 ${
          !url ? `bg-gradient-to-br ${gradient} opacity-60` : ''
        }`}>
          {url && (
            <Image src={url} alt="" fill sizes="200px" className="object-cover"/>
          )}
        </div>
      ))}
    </div>
  )
}

export default function CollectionCard({ collection, index = 0, onEdit, onDelete }) {
  const [deleting,    setDeleting]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(collection.id)
    setDeleting(false)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="card group relative flex flex-col hover:shadow-md transition-shadow duration-200 overflow-hidden">

      {/* Portada — clic navega a detalle */}
      <Link href={`/collections/${collection.id}`} className="block">
        <CoverGrid
          thumbnails={collection.thumbnails || []}
          nombre={collection.nombre}
          gradientIdx={index}
        />
      </Link>

      {/* Botones de acción (top-right overlay) */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button
          onClick={() => onEdit(collection)}
          className="p-1.5 rounded-lg bg-white/90 text-gray-400 hover:text-purple-600
                     hover:bg-purple-50 shadow-sm transition-colors"
          title="Editar colección"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                 m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="p-1.5 rounded-lg bg-white/90 text-gray-400 hover:text-red-500
                     hover:bg-red-50 shadow-sm transition-colors"
          title="Eliminar colección"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7
                 m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>

      {/* Info */}
      <Link href={`/collections/${collection.id}`} className="block p-4 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2">
            {collection.nombre}
          </h3>
          <span className="flex-shrink-0 text-xs font-medium text-gray-500 bg-gray-100
                           px-2 py-0.5 rounded-full">
            {collection.outfit_count} outfit{collection.outfit_count !== 1 ? 's' : ''}
          </span>
        </div>

        {collection.descripcion && (
          <p className="text-sm text-gray-500 line-clamp-2">{collection.descripcion}</p>
        )}

        <p className="text-xs text-gray-400 mt-1">{formatDate(collection.created_at)}</p>
      </Link>

      {/* Overlay de confirmación de borrado */}
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl
                        flex flex-col items-center justify-center gap-3 p-4 z-10">
          <span className="text-3xl">🗑️</span>
          <p className="text-sm font-medium text-gray-700 text-center">
            ¿Eliminar <strong>"{collection.nombre}"</strong>?
          </p>
          <p className="text-xs text-gray-400 text-center">
            Los outfits no se eliminarán, solo se quitan de esta colección.
          </p>
          <div className="flex gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete} className="flex-1">
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}