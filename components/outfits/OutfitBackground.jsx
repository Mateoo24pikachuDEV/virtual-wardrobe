// components/outfits/OutfitBackground.jsx
'use client'

import { useMemo } from 'react'
import { getDominantTheme, getThemeColors } from '@/lib/outfitInsights'

/**
 * Fondo aesthetic para la zona visual de la OutfitCard.
 * Genera gradientes + blur blobs basados en los colores del outfit.
 */
export default function OutfitBackground({ outfit }) {
  const theme  = useMemo(() => getDominantTheme(outfit), [outfit._top?.id, outfit._bottom?.id])
  const colors = getThemeColors(theme)

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
      }}
    >
      {/* Blob 1 — esquina superior izquierda */}
      <div
        className="absolute -top-8 -left-8 w-40 h-40 rounded-full blur-[90px] opacity-90"
        style={{ backgroundColor: colors.blob1 }}
      />

      {/* Blob 2 — esquina inferior derecha */}
      <div
        className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full blur-[90px] opacity-80"
        style={{ backgroundColor: colors.blob2 }}
      />

      {/* Blob 3 — centro superior, sutil */}
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-[70px] opacity-50"
        style={{ backgroundColor: colors.blob1 }}
      />

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* Glassmorphism inner gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5"/>
    </div>
  )
}