// components/outfits/OutfitGrid.jsx
'use client'

import OutfitCard from './OutfitCard'

export default function OutfitGrid({
  outfits,
  loading,
  // Acciones estándar
  onSave,
  onDelete,
  onEdit,
  onAddToCollection,
  savedIds        = [],
  // ── Nuevas props de IA ─────────────────────────────────────
  onFeedback,       // (outfit, action) => void
  onMoreLikeThis,   // (outfit) => void
  // ── Display ────────────────────────────────────────────────
  emptyMessage,
  emptySubMessage,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <div className="skeleton h-64 w-full"/>
            <div className="p-4 flex flex-col gap-3">
              <div className="skeleton h-4 w-3/4 rounded-full"/>
              <div className="skeleton h-3 w-1/2 rounded-full"/>
              <div className="skeleton h-8 w-full rounded-xl"/>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!outfits?.length) {
    return (
      <div className="text-center py-20 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">👗</div>
        <p className="font-medium text-gray-500">{emptyMessage ?? 'Sin outfits'}</p>
        {emptySubMessage && (
          <p className="text-sm text-gray-400 max-w-xs">{emptySubMessage}</p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {outfits.map((outfit, idx) => (
        <OutfitCard
          key={outfit.id ?? `outfit-${idx}`}
          outfit={outfit}
          isSaved={savedIds.includes(outfit.id)}
          onSave={onSave}
          onDelete={onDelete}
          onEdit={onEdit}
          onAddToCollection={onAddToCollection}
          onFeedback={onFeedback}
          onMoreLikeThis={onMoreLikeThis}
        />
      ))}
    </div>
  )
}