// components/wardrobe/GarmentGrid.jsx
'use client'

import GarmentCard from './GarmentCard'

const FILTROS_CATEGORIA = [
  { value: 'all',       label: 'Todas'   },
  { value: 'top',       label: 'Tops'    },
  { value: 'bottom',    label: 'Bottoms' },
  { value: 'shoes',     label: 'Zapatos' },
  { value: 'outerwear', label: 'Abrigos' },
]

const FILTROS_FORMALIDAD = [
  { value: 'all',    label: 'Todas'  },
  { value: 'casual', label: 'Casual' },
  { value: 'smart',  label: 'Smart'  },
  { value: 'formal', label: 'Formal' },
]

export default function GarmentGrid({
  prendas,
  loading,
  onDelete,
  filtroCategoria,
  setFiltroCategoria,
  filtroFormalidad,
  setFiltroFormalidad,
}) {
  // Filtrado
  const prendasFiltradas = prendas.filter((p) => {
    const porCategoria  = filtroCategoria  === 'all' || p.categoria  === filtroCategoria
    const porFormalidad = filtroFormalidad === 'all' || p.formalidad === filtroFormalidad
    return porCategoria && porFormalidad
  })

  return (
    <div className="flex flex-col gap-5">

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filtro categoría */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Categoría
          </span>
          <div className="flex gap-1 flex-wrap">
            {FILTROS_CATEGORIA.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltroCategoria(f.value)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-all duration-150
                  ${filtroCategoria === f.value
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro formalidad */}
        <div className="flex items-center gap-2 flex-wrap sm:ml-4">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Estilo
          </span>
          <div className="flex gap-1 flex-wrap">
            {FILTROS_FORMALIDAD.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltroFormalidad(f.value)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-all duration-150
                  ${filtroFormalidad === f.value
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-400">
        {prendasFiltradas.length}{' '}
        {prendasFiltradas.length === 1 ? 'prenda' : 'prendas'}
        {(filtroCategoria !== 'all' || filtroFormalidad !== 'all') && ' (filtradas)'}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton aspect-square"/>
              <div className="p-3 flex flex-col gap-2">
                <div className="skeleton h-4 w-3/4 rounded"/>
                <div className="skeleton h-3 w-1/2 rounded"/>
              </div>
            </div>
          ))}
        </div>
      ) : prendasFiltradas.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p className="font-medium text-gray-500">
            {prendas.length === 0
              ? 'Tu armario está vacío'
              : 'Sin prendas con estos filtros'}
          </p>
          <p className="text-sm text-gray-400">
            {prendas.length === 0
              ? 'Añade tu primera prenda usando el botón de arriba'
              : 'Prueba a cambiar los filtros'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {prendasFiltradas.map((prenda) => (
            <GarmentCard
              key={prenda.id}
              prenda={prenda}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}