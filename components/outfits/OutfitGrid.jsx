// components/outfits/OutfitGrid.jsx
'use client'

import OutfitCard from './OutfitCard'

export default function OutfitGrid({
  outfits,
  loading,
  onSave,
  onDelete,
  onEdit,                // ← nuevo Fase 5
  savedIds = [],
  emptyMessage,
  emptySubMessage,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 flex flex-col gap-4">
            <div className="flex justify-around">
              {[1,2,3].map((j) => (
                <div key={j} className="flex flex-col items-center gap-1">
                  <div className="skeleton w-16 h-16 rounded-xl"/>
                  <div className="skeleton h-3 w-10 rounded"/>
                </div>
              ))}
            </div>
            <div className="skeleton h-3 w-full rounded-full"/>
            <div className="skeleton h-8 w-full rounded-xl"/>
          </div>
        ))}
      </div>
    )
  }

  if (!outfits || outfits.length === 0) {
    return (
      <div className="text-center py-16 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
          👗
        </div>
        <p className="font-medium text-gray-500">
          {emptyMessage || 'No hay outfits disponibles'}
        </p>
        <p className="text-sm text-gray-400 max-w-xs">
          {emptySubMessage || 'Añade más prendas (al menos 1 top, 1 bottom y 1 par de zapatos) para generar outfits.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {outfits.map((outfit, idx) => (
        <OutfitCard
          key={outfit.id || `outfit-${idx}`}
          outfit={outfit}
          onSave={onSave}
          onDelete={onDelete}
          onEdit={onEdit}
          isSaved={savedIds.includes(outfit.id)}
        />
      ))}
    </div>
  )
}