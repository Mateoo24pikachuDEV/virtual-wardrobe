// components/outfits/OutfitSeasonBadges.jsx
'use client'

import { useMemo } from 'react'
import { getRangoTemperatura } from '@/lib/outfitInsights'

const SEASON_CONFIG = {
  summer: { emoji: '☀️', label: 'Verano',    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  spring: { emoji: '🌸', label: 'Primavera', cls: 'bg-green-50  text-green-700  border-green-200'  },
  autumn: { emoji: '🍂', label: 'Otoño',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  winter: { emoji: '❄️', label: 'Invierno',  cls: 'bg-blue-50   text-blue-700   border-blue-200'   },
}

const FORMALITY_CONFIG = {
  casual: { label: 'Casual', cls: 'bg-gray-100  text-gray-600'         },
  smart:  { label: 'Smart',  cls: 'bg-amber-50  text-amber-700'        },
  formal: { label: 'Formal', cls: 'bg-slate-100 text-slate-700'        },
}

export default function OutfitSeasonBadges({ outfit }) {
  const { seasons = [], _top, nivel_termico } = outfit

  // Formalidades del outfit (intersección de top como referencia)
  const formalidades = useMemo(() => {
    if (!_top) return []
    if (Array.isArray(_top.formalidades) && _top.formalidades.length > 0)
      return _top.formalidades
    return [_top.formalidad || 'casual']
  }, [_top?.id])

  const tempRange = getRangoTemperatura(nivel_termico)

  if (seasons.length === 0 && formalidades.length === 0 && !tempRange) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">

      {/* Season badges */}
      {seasons.map((season) => {
        const cfg = SEASON_CONFIG[season]
        if (!cfg) return null
        return (
          <span
            key={season}
            className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full
              text-xs font-medium border ${cfg.cls}
            `}
          >
            {cfg.emoji} {cfg.label}
          </span>
        )
      })}

      {/* Formality badges */}
      {formalidades.map((formality) => {
        const cfg = FORMALITY_CONFIG[formality]
        if (!cfg) return null
        return (
          <span
            key={formality}
            className={`
              inline-flex items-center px-2 py-0.5 rounded-full
              text-xs font-medium ${cfg.cls}
            `}
          >
            {cfg.label}
          </span>
        )
      })}

      {/* Temperature range badge */}
      {tempRange && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
          {tempRange}
        </span>
      )}
    </div>
  )
}