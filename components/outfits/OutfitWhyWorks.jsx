// components/outfits/OutfitWhyWorks.jsx
'use client'

import { useState, useMemo } from 'react'
import { generarInsights } from '@/lib/outfitInsights'

export default function OutfitWhyWorks({ outfit }) {
  const [open, setOpen] = useState(false)
  const insights = useMemo(() => generarInsights(outfit), [outfit._top?.id, outfit._bottom?.id, outfit.score])

  if (insights.length === 0) return null

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">

      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="
          w-full flex items-center justify-between px-3.5 py-2.5
          bg-white hover:bg-gray-50/80 transition-colors text-left
        "
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">💡</span>
          <span className="text-xs font-semibold text-gray-700">Why this works</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">
            {insights.length} reason{insights.length !== 1 ? 's' : ''}
          </span>
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
        ${open ? 'max-h-72' : 'max-h-0'}
      `}>
        <div className="px-3.5 pb-3.5 pt-2 bg-gradient-to-b from-white to-gray-50/50 border-t border-gray-50">
          <ul className="space-y-2">
            {insights.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5"
                style={{
                  transitionDelay: `${idx * 40}ms`,
                  animation: open ? 'none' : undefined,
                }}
              >
                {/* Icon */}
                <span className="
                  flex-shrink-0 w-6 h-6 rounded-full
                  bg-white border border-gray-100 shadow-sm
                  flex items-center justify-center text-sm
                  mt-0.5
                ">
                  {item.icon}
                </span>

                {/* Text */}
                <p className="text-xs text-gray-600 leading-relaxed pt-1">
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}