// components/outfits/OutfitVisualLayout.jsx
// ============================================================
// Mosaic layout — todos los items llenan el contenedor.
//
// Sin outerwear (3 prendas):
//   ┌─────────┬─────────┐
//   │  TOP    │ BOTTOM  │  ← 65% del alto
//   ├────┬────┴─────────┤
//   │    SHOES          │  ← 35% del alto
//   └───────────────────┘
//
// Con outerwear (4 prendas):
//   ┌───────────┬────────┐
//   │           │  TOP   │
//   │ OUTERWEAR │────────│
//   │           │ BOTTOM │
//   │           │────────│
//   │           │ SHOES  │
//   └───────────┴────────┘
// ============================================================
'use client'

import { useState } from 'react'
import Image from 'next/image'

const EMOJI = {
  top: '👕', bottom: '👖', shoes: '👟', outerwear: '🧥', accessory: '👜',
}
const ACC_EMOJI = {
  hat: '🧢', scarf: '🧣', jewelry: '💍',
  watch: '⌚', bag: '👜', glasses: '🕶️', gloves: '🧤',
}
const FAMILIA_BG = {
  neutro:   'bg-slate-100/70',
  calido:   'bg-amber-50/70',
  frio:     'bg-sky-50/70',
  vibrante: 'bg-fuchsia-50/70',
}

// ── Celda individual de prenda ────────────────────────────────
function Cell({ prenda, className = '', labelPos = 'bottom' }) {
  const [err, setErr] = useState(false)
  if (!prenda) return <div className={`${className} bg-white/20 rounded-2xl`}/>

  const bg = FAMILIA_BG[prenda.color_familia] ?? 'bg-white/30'

  return (
    <div className={`relative overflow-hidden group/cell ${className}`}>
      {/* Color background */}
      <div className={`absolute inset-0 ${bg} backdrop-blur-sm`}/>

      {/* Imagen */}
      {prenda.imagen_url && !err ? (
        <Image
          src={prenda.imagen_url}
          alt={prenda.nombre ?? ''}
          fill
          sizes="(max-width: 640px) 45vw, 200px"
          className="object-cover object-center transition-transform duration-300 group-hover/cell:scale-105"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <span className="text-3xl opacity-50">{EMOJI[prenda.categoria] ?? '👕'}</span>
          <span className="text-[10px] text-gray-500/80 text-center leading-tight line-clamp-2">
            {prenda.nombre}
          </span>
        </div>
      )}

      {/* Nombre (hover overlay) */}
      <div className={`
        absolute inset-x-0 ${labelPos === 'top' ? 'top-0 pt-1' : 'bottom-0 pb-1'}
        px-2 py-0.5 bg-gradient-to-t from-black/40 via-black/20 to-transparent
        opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200
      `}>
        <p className="text-white text-[10px] font-medium truncate text-center">
          {prenda.nombre}
        </p>
      </div>
    </div>
  )
}

// ── Celda de accesorios ───────────────────────────────────────
function AccessoriesCell({ accessories, className = '' }) {
  if (!accessories?.length) return null
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-wrap gap-1.5 p-2 ${className}`}>
      {accessories.slice(0, 4).map((acc) => (
        <span key={acc.id} className="text-2xl" title={acc.nombre}>
          {ACC_EMOJI[acc.subcategoria] ?? '✨'}
        </span>
      ))}
      {accessories.length > 4 && (
        <span className="text-xs text-white/70 font-medium">+{accessories.length - 4}</span>
      )}
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function OutfitVisualLayout({ outfit }) {
  const { _top, _bottom, _shoes, _outerwear, _accessories = [] } = outfit
  const hasOuter = !!_outerwear
  const hasAcc   = _accessories.length > 0

  return (
    <div className="absolute inset-0 p-2 group">
      {hasOuter ? (
        // ── CON OUTERWEAR: outerwear izquierda, resto derecha ──
        <div className="w-full h-full grid grid-cols-[0.85fr_1.15fr] gap-2">

          {/* Columna izquierda: outerwear ocupa toda la altura */}
          <Cell prenda={_outerwear} className="rounded-2xl h-full"/>

          {/* Columna derecha: top + bottom + shoes/accesorios */}
          <div className="h-full grid gap-2" style={{
            gridTemplateRows: hasAcc ? '1fr 1fr 0.8fr 0.6fr' : '1fr 1fr 0.8fr',
          }}>
            <Cell prenda={_top}    className="rounded-2xl"/>
            <Cell prenda={_bottom} className="rounded-2xl"/>
            <Cell prenda={_shoes}  className="rounded-2xl"/>
            {hasAcc && (
              <AccessoriesCell accessories={_accessories} className="h-full"/>
            )}
          </div>
        </div>
      ) : (
        // ── SIN OUTERWEAR: top+bottom arriba, shoes+acc abajo ──
        <div className="w-full h-full grid gap-2" style={{
          gridTemplateRows: hasAcc ? '1.4fr 0.8fr 0.6fr' : '1.4fr 0.8fr',
        }}>

          {/* Fila 1: top + bottom lado a lado */}
          <div className="grid grid-cols-2 gap-2">
            <Cell prenda={_top}    className="rounded-2xl"/>
            <Cell prenda={_bottom} className="rounded-2xl"/>
          </div>

          {/* Fila 2: zapatos (con o sin accesorios) */}
          <div className="grid gap-2" style={{
            gridTemplateColumns: hasAcc ? '1fr 1fr' : '1fr',
          }}>
            <Cell prenda={_shoes} className="rounded-2xl"/>
            {hasAcc && (
              <AccessoriesCell accessories={_accessories} className="h-full"/>
            )}
          </div>

          {/* Fila extra si hay accs y no outerwear ya fue manejado arriba */}
        </div>
      )}
    </div>
  )
}