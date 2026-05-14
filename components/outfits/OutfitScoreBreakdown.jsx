// components/outfits/OutfitScoreBreakdown.jsx
'use client'

import { useState, useEffect } from 'react'
import { calcularScoreBreakdown } from '@/lib/outfitInsights'

const DIMENSIONS = [
  { key: 'colorHarmony',     label: 'Color Harmony',     icon: '🎨', color: 'bg-violet-500' },
  { key: 'warmthMatch',      label: 'Warmth Match',      icon: '🌡️', color: 'bg-orange-500' },
  { key: 'formalityBalance', label: 'Formality Balance', icon: '👔', color: 'bg-blue-500'   },
  { key: 'accessories',      label: 'Accessories',       icon: '✨', color: 'bg-pink-500'   },
  { key: 'seasonMatch',      label: 'Season Match',      icon: '🍂', color: 'bg-green-500'  },
  { key: 'occasionFit',      label: 'Occasion Fit',      icon: '🎯', color: 'bg-yellow-500' },
]

// Barra animada individual
function AnimatedBar({ value, color, visible }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!visible) { setWidth(0); return }
    const t = setTimeout(() => setWidth(value * 10), 80)
    return () => clearTimeout(t)
  }, [value, visible])

  const scoreColor =
    value >= 9 ? 'bg-green-500' :
    value >= 7 ? 'bg-blue-500'  :
    value >= 5 ? 'bg-yellow-500': 'bg-red-400'

  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full ${scoreColor} transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

// Score number chip
function ScoreChip({ value }) {
  const color =
    value >= 9 ? 'text-green-600 bg-green-50' :
    value >= 7 ? 'text-blue-600  bg-blue-50'  :
    value >= 5 ? 'text-yellow-600 bg-yellow-50': 'text-red-500 bg-red-50'

  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${color} flex-shrink-0 tabular-nums`}>
      {value}/10
    </span>
  )
}

export default function OutfitScoreBreakdown({ outfit }) {
  const [open, setOpen] = useState(false)
  const breakdown = calcularScoreBreakdown(outfit)

  // Promedio visual de los sub-scores
  const avg = Math.round(
    Object.values(breakdown)
      .filter((_, i) => i < 6)
      .reduce((s, v) => s + v, 0) / 6
  )

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">

      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          w-full flex items-center justify-between px-3.5 py-2.5
          bg-white hover:bg-gray-50/80 transition-colors
          text-left
        "
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <span className="text-xs font-semibold text-gray-700">Score Breakdown</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mini sparkline preview */}
          <div className="flex items-end gap-0.5 h-4">
            {DIMENSIONS.map((d) => (
              <div
                key={d.key}
                className="w-1 rounded-full bg-purple-400/60"
                style={{ height: `${(breakdown[d.key] / 10) * 100}%` }}
              />
            ))}
          </div>

          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      <div className={`
        overflow-hidden transition-all duration-300 ease-in-out
        ${open ? 'max-h-80' : 'max-h-0'}
      `}>
        <div className="px-3.5 pb-3.5 pt-1 bg-white border-t border-gray-50 space-y-3">

          {DIMENSIONS.map((dim, idx) => (
            <div key={dim.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{dim.icon}</span>
                  <span className="text-xs text-gray-600 font-medium">{dim.label}</span>
                </div>
                <ScoreChip value={breakdown[dim.key]} />
              </div>
              <AnimatedBar
                value={breakdown[dim.key]}
                color={dim.color}
                visible={open}
              />
            </div>
          ))}

          {/* Divider + Overall */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Overall Score
            </span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${breakdown.overall}%` }}
                />
              </div>
              <span className="text-sm font-black text-gray-900 tabular-nums">
                {breakdown.overall}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}