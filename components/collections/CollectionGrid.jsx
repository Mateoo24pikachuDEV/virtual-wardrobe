// components/collections/CollectionGrid.jsx
'use client'

import CollectionCard from './CollectionCard'

export default function CollectionGrid({ collections, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton aspect-video w-full"/>
            <div className="p-4 flex flex-col gap-2">
              <div className="skeleton h-5 w-3/4 rounded"/>
              <div className="skeleton h-3 w-1/2 rounded"/>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
          📁
        </div>
        <p className="font-medium text-gray-500">Sin colecciones todavía</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Crea tu primera colección para organizar tus outfits favoritos.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((collection, idx) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          index={idx}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}