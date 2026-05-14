// components/outfits/OutfitVisualLayout.jsx
'use client'

import { useState } from 'react'
import Image from 'next/image'

const EMOJI_FALLBACK = {
  top:       '👕',
  bottom:    '👖',
  shoes:     '👟',
  outerwear: '🧥',
  accessory: '👜',
}

const SUBCATEGORY_EMOJI = {
  hat: '🧢', scarf: '🧣', jewelry: '💍',
  watch: '⌚', bag: '👜', glasses: '🕶️', gloves: '🧤',
}

// -----------------------------------------------------------
// Tarjeta individual de prenda
// -----------------------------------------------------------
function GarmentTile({ prenda, widthClass, heightClass, label, delay = 0 }) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Imagen */}
      <div
        className={`
          relative ${widthClass} ${heightClass}
          rounded-2xl overflow-hidden
          border-2 border-white/70 shadow-lg
          transition-all duration-300 ease-out
          ${hovered ? 'scale-105 shadow-xl border-white/90' : 'scale-100'}
        `}
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {prenda.imagen_url && !imgError ? (
          <Image
            src={prenda.imagen_url}
            alt={prenda.nombre}
            fill
            sizes="120px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-white/40 flex items-center justify-center text-3xl">
            {EMOJI_FALLBACK[prenda.categoria] || '👕'}
          </div>
        )}

        {/* Shimmer on hover */}
        <div className={`
          absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0
          transition-opacity duration-300
          ${hovered ? 'opacity-100' : 'opacity-0'}
        `}/>
      </div>

      {/* Label on hover */}
      <div className={`
        mt-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm
        text-xs text-gray-700 font-medium max-w-[80px] truncate text-center
        shadow-sm border border-white/60
        transition-all duration-200
        ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}
      `}>
        {prenda.nombre.split(' ')[0]}
      </div>
    </div>
  )
}

// -----------------------------------------------------------
// Conector visual entre prendas
// -----------------------------------------------------------
function Connector() {
  return (
    <div className="flex flex-col items-center my-0.5">
      <div className="w-px h-3 bg-white/40"/>
      <div className="w-1 h-1 rounded-full bg-white/50"/>
      <div className="w-px h-3 bg-white/40"/>
    </div>
  )
}

// -----------------------------------------------------------
// Accesorio mini (horizontal strip)
// -----------------------------------------------------------
function AccessoryMini({ acc }) {
  const [imgError, setImgError] = useState(false)
  const emoji = SUBCATEGORY_EMOJI[acc.subcategoria] || '✨'

  return (
    <div className="flex flex-col items-center gap-0.5 group/acc">
      <div className="
        w-9 h-9 rounded-xl overflow-hidden
        border-2 border-white/60 shadow-md
        bg-white/30 backdrop-blur-sm
        flex items-center justify-center
        transition-all duration-200 group-hover/acc:scale-110 group-hover/acc:shadow-lg
      ">
        {acc.imagen_url && !imgError ? (
          <div className="relative w-full h-full">
            <Image
              src={acc.imagen_url}
              alt={acc.nombre}
              fill sizes="36px"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <span className="text-lg">{emoji}</span>
        )}
      </div>
      <span className="text-xs text-white/70 font-medium hidden group-hover/acc:block absolute mt-10">
        {emoji}
      </span>
    </div>
  )
}

// -----------------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------------
/**
 * Layout visual vertical tipo editorial fashion.
 * Apila las prendas de arriba a abajo con conectores.
 */
export default function OutfitVisualLayout({ outfit }) {
  const { _top, _bottom, _shoes, _outerwear, _accessories = [] } = outfit

  const slots = [
    _outerwear && {
      prenda: _outerwear,
      widthClass: 'w-24', heightClass: 'h-20',
      label: 'Outerwear', delay: 0,
    },
    _top && {
      prenda: _top,
      widthClass: 'w-20', heightClass: 'h-20',
      label: 'Top', delay: 60,
    },
    _bottom && {
      prenda: _bottom,
      widthClass: 'w-20', heightClass: 'h-24',
      label: 'Bottom', delay: 120,
    },
    _shoes && {
      prenda: _shoes,
      widthClass: 'w-16', heightClass: 'h-16',
      label: 'Shoes', delay: 180,
    },
  ].filter(Boolean)

  return (
    <div className="relative flex flex-col items-center justify-center h-full py-3 px-4">

      {/* Stack vertical de prendas */}
      <div className="flex flex-col items-center">
        {slots.map((slot, idx) => (
          <div key={slot.prenda.id} className="flex flex-col items-center">
            <GarmentTile {...slot} />
            {idx < slots.length - 1 && <Connector />}
          </div>
        ))}
      </div>

      {/* Accesorios en strip horizontal */}
      {_accessories.length > 0 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
          <div className="
            flex items-center gap-1.5 px-3 py-1.5
            rounded-full bg-black/10 backdrop-blur-sm
            border border-white/30
          ">
            {_accessories.slice(0, 4).map((acc) => (
              <AccessoryMini key={acc.id} acc={acc}/>
            ))}
            {_accessories.length > 4 && (
              <span className="text-xs text-white/80 font-medium pl-1">
                +{_accessories.length - 4}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}