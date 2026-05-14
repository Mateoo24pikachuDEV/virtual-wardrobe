// components/outfits/OutfitCard.jsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import { labelNivelTermico } from '@/lib/outfitEngine'

// Emojis y colores de estaciones (inline para no depender de tree-shaking de config)
const SEASON_DISPLAY = {
  summer: { emoji: '☀️', label: 'Verano',    cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  spring: { emoji: '🌸', label: 'Primavera', cls: 'bg-green-100  text-green-700  border-green-200'  },
  autumn: { emoji: '🍂', label: 'Otoño',     cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  winter: { emoji: '❄️', label: 'Invierno',  cls: 'bg-blue-100   text-blue-700   border-blue-200'   },
}

// Barra de nivel térmico
function TermoBar({ nivel }) {
  if (nivel === null || nivel === undefined) return null

  const color =
    nivel <= 25  ? 'bg-yellow-400' :
    nivel <= 50  ? 'bg-green-400'  :
    nivel <= 75  ? 'bg-orange-400' : 'bg-blue-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${nivel}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
        {labelNivelTermico(nivel)}
      </span>
    </div>
  )
}

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

export default function OutfitCard({
  outfit,
  onSave,
  onDelete,
  onEdit,
  onAddToCollection,   // ← nuevo Fase 6
  isSaved = false,
}) {
  const [saving,   setSaving]   = useState(false)
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

  const handleEdit = () => {
    if (onEdit) onEdit(outfit)
  }

  const handleAddToCollection = () => {
    if (onAddToCollection) onAddToCollection(outfit)
  }

  return (
<div className="card p-4 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200">

      {/* Badge source */}
      {outfit.source && (
        <div className="flex items-center justify-between -mb-1">
          <span className={`
            text-xs font-medium px-2 py-0.5 rounded-full
            ${outfit.source === 'manual'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'}
          `}>
            {outfit.source === 'manual' ? '✏️ Manual' : '✨ Auto'}
          </span>
          {outfit.formalidades_outfit?.length > 0 && (
            <span className="text-xs text-gray-400 capitalize">
              {outfit.formalidades_outfit.join(' · ')}
            </span>
          )}
        </div>
      )}

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

{/* Sistema térmico */}
      {outfit.nivel_termico !== null && outfit.nivel_termico !== undefined && (
        <div className="flex flex-col gap-1.5">
          {/* Barra de nivel */}
          <TermoBar nivel={outfit.nivel_termico} />

          {/* Badges de estación */}
          {outfit.seasons && outfit.seasons.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {outfit.seasons.map((season) => {
                const s = SEASON_DISPLAY[season]
                if (!s) return null
                return (
                  <span
                    key={season}
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full
                                text-xs font-medium border ${s.cls}`}
                  >
                    {s.emoji} {s.label}
                  </span>
                )
              })}
            </div>
          )}
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
        <div className="flex gap-2">
{/* Colecciones */}
          {onAddToCollection && (
            <button
              onClick={handleAddToCollection}
              className="flex items-center justify-center p-2 rounded-xl border border-gray-200
                         bg-white text-gray-400 hover:text-purple-600 hover:border-purple-200
                         hover:bg-purple-50 transition-colors duration-150 flex-shrink-0"
              title="Añadir a colección"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </button>
          )}

          {/* Editar */}
          {onEdit && (
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                         text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100
                         rounded-xl border border-purple-200 transition-colors duration-150"
              title="Editar outfit"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                     m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Editar
            </button>
          )}

          {/* Eliminar */}
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={handleDelete}
            className={onEdit ? 'flex-1' : 'w-full'}
          >
            {!onEdit && 'Eliminar outfit'}
            {onEdit && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7
                     m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            )}
          </Button>
        </div>
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