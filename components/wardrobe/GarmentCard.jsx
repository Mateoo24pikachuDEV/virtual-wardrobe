// components/wardrobe/GarmentCard.jsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import Button from '@/components/ui/Button'

// Colores de badge por categoría
const CATEGORIA_STYLES = {
  top:       { label: 'Top',       bg: 'bg-blue-100',   text: 'text-blue-700'   },
  bottom:    { label: 'Bottom',    bg: 'bg-green-100',  text: 'text-green-700'  },
  shoes:     { label: 'Zapatos',   bg: 'bg-orange-100', text: 'text-orange-700' },
  outerwear: { label: 'Abrigo',    bg: 'bg-purple-100', text: 'text-purple-700' },
  accessory: { label: 'Accesorio', bg: 'bg-pink-100',   text: 'text-pink-700'   },
}

const SUBCATEGORIA_LABELS = {
  hat:     '🧢', scarf:   '🧣', jewelry: '💍',
  watch:   '⌚', bag:     '👜', glasses: '🕶️', gloves:  '🧤',
}

const FORMALIDAD_STYLES = {
  casual: { label: 'Casual', bg: 'bg-gray-100',   text: 'text-gray-600'   },
  smart:  { label: 'Smart',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  formal: { label: 'Formal', bg: 'bg-slate-100',  text: 'text-slate-700'  },
}

const FAMILIA_COLORS = {
  neutro:   'bg-gray-400',
  calido:   'bg-orange-400',
  frio:     'bg-blue-400',
  vibrante: 'bg-pink-400',
}

  export default function GarmentCard({ prenda, onDelete, onEdit }) {
    const [deleting,    setDeleting]    = useState(false)
    const [imgError,    setImgError]    = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

  const catStyle  = CATEGORIA_STYLES[prenda.categoria]  || CATEGORIA_STYLES.top
  const formStyle = FORMALIDAD_STYLES[prenda.formalidad] || FORMALIDAD_STYLES.casual
  const dotColor  = FAMILIA_COLORS[prenda.color_familia] || 'bg-gray-400'

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(prenda.id)
    setDeleting(false)
    setShowConfirm(false)
  }

  return (
    <div className="card group relative flex flex-col hover:shadow-md transition-shadow duration-200">

      {/* Imagen */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {prenda.imagen_url && !imgError ? (
          <Image
            src={prenda.imagen_url}
            alt={prenda.nombre}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          // Placeholder sin imagen
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span className="text-xs">Sin imagen</span>
          </div>
        )}

        {/* Badge categoría (top-left) */}
        <span className={`absolute top-2 left-2 badge ${catStyle.bg} ${catStyle.text}`}>
          {catStyle.label}
        </span>

                {/* Botones de acción — visibles al hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {/* Editar */}
          {onEdit && (
            <button
              onClick={() => onEdit(prenda)}
              className="p-1.5 rounded-lg bg-white/90 text-gray-400
                         hover:text-purple-600 hover:bg-purple-50
                         shadow-sm transition-colors"
              aria-label="Editar prenda"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                     m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          )}

          {/* Eliminar */}
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1.5 rounded-lg bg-white/90 text-gray-400
                       hover:text-red-500 hover:bg-red-50
                       shadow-sm transition-colors"
            aria-label="Eliminar prenda"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7
                   m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {prenda.subcategoria && (
            <span className="text-base flex-shrink-0">
              {SUBCATEGORIA_LABELS[prenda.subcategoria] || '🎁'}
            </span>
          )}
          <p className="font-medium text-gray-900 text-sm truncate">{prenda.nombre}</p>
        </div>

        <div className="flex items-center justify-between">
          {/* Color */}
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${dotColor} flex-shrink-0`}/>
            <span className="text-xs text-gray-500 capitalize">{prenda.color}</span>
          </div>

                  {/* Formalidades (multi) */}
        <div className="flex gap-1 flex-wrap">
          {(() => {
            const formalidades = Array.isArray(prenda.formalidades) && prenda.formalidades.length > 0
              ? prenda.formalidades
              : prenda.formalidad ? [prenda.formalidad] : ['casual']

            const allThree = formalidades.length === 3

            if (allThree) {
              return (
                <span className="badge bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
                  ✨ Universal
                </span>
              )
            }

            return formalidades.map((f) => {
              const s = FORMALIDAD_STYLES[f] || FORMALIDAD_STYLES.casual
              return (
                <span key={f} className={`badge ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
              )
            })
          })()}
        </div>
        </div>
      </div>

      {/* Overlay de confirmación de borrado */}
      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 p-4 z-10">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p className="text-sm font-medium text-gray-700 text-center">
            ¿Eliminar esta prenda?
          </p>
          <div className="flex gap-2 w-full">
            <Button
              variant="secondary" size="sm"
              onClick={() => setShowConfirm(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger" size="sm"
              loading={deleting}
              onClick={handleDelete}
              className="flex-1"
            >
              Eliminar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

