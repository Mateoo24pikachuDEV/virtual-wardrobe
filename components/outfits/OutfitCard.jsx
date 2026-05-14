// components/outfits/OutfitCard.jsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import Button from '@/components/ui/Button'

const SUBCATEGORIA_LABELS = {
  hat: '🧢', scarf: '🧣', jewelry: '💍',
  watch: '⌚', bag: '👜', glasses: '🕶️', gloves: '🧤',
}

// Barra de score con color dinámico

function ScoreBar({ score }) {
  const color =
    score >= 80 ? 'bg-green-500'  :
    score >= 60 ? 'bg-yellow-500' :
    score >= 40 ? 'bg-orange-400' : 'bg-red-400'

  const label =
    score >= 80 ? '🔥 Excelente' :
    score >= 60 ? '✨ Bueno'     :
    score >= 40 ? '👍 Aceptable' : '⚠️ Básico'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Compatibilidad</span>
        <span className="text-xs font-semibold text-gray-700">{label} · {score}/100</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

// Mini imagen de prenda dentro del outfit
function PrendaMini({ prenda, label }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
        {prenda?.imagen_url && !imgError ? (
          <Image
            src={prenda.imagen_url}
            alt={prenda.nombre}
            fill
            sizes="64px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">
            {label === 'Top'      ? '👕' :
             label === 'Bottom'   ? '👖' :
             label === 'Zapatos'  ? '👟' : '🧥'}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-600 max-w-[64px] truncate text-center">
        {prenda?.nombre || '—'}
      </span>
    </div>
  )
}

export default function OutfitCard({ outfit, onSave, onDelete, isSaved = false }) {
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(outfit)
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(outfit.id)
    setDeleting(false)
  }

  return (
    <div className="card p-4 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">

      {/* Prendas del outfit */}
      <div className="flex items-start justify-around gap-2">
        <PrendaMini prenda={outfit._top}       label="Top"     />
        <PrendaMini prenda={outfit._bottom}    label="Bottom"  />
        <PrendaMini prenda={outfit._shoes}     label="Zapatos" />
        {outfit._outerwear && (
          <PrendaMini prenda={outfit._outerwear} label="Abrigo" />
        )}
      </div>

      {/* Score */}
      <ScoreBar score={outfit.score} />

      {/* Accesorios sugeridos */}
      {outfit._accessories && outfit._accessories.length > 0 && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-pink-50 rounded-lg border border-pink-100">
          <span className="text-xs text-pink-500 font-medium flex-shrink-0">+</span>
          <div className="flex flex-wrap gap-1">
            {outfit._accessories.map((acc) => (
              <span
                key={acc.id}
                className="text-xs text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full flex items-center gap-1"
                title={acc.nombre}
              >
                {SUBCATEGORIA_LABELS[acc.subcategoria] || '🎁'}
                <span className="max-w-[60px] truncate">{acc.nombre}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metainfo */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="capitalize">
          {outfit._top?.formalidad || ''}
        </span>
        <span>
          {outfit._outerwear ? '4 prendas' : '3 prendas'}
        </span>
      </div>

      {/* Acciones */}
      {isSaved ? (
        <Button
          variant="danger"
          size="sm"
          loading={deleting}
          onClick={handleDelete}
          className="w-full"
        >
          Eliminar outfit
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          loading={saving}
          onClick={handleSave}
          className="w-full"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
          Guardar outfit
        </Button>
      )}
    </div>
  )
}