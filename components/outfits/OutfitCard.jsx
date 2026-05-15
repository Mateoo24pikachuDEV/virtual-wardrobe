// components/outfits/OutfitCard.jsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import FeedbackBar from './FeedbackBar'
import OutfitBackground from './OutfitBackground'
import OutfitVisualLayout from './OutfitVisualLayout'
import OutfitScoreBreakdown from './OutfitScoreBreakdown'
import OutfitWhyWorks from './OutfitWhyWorks'
import OutfitSeasonBadges from './OutfitSeasonBadges'
import { labelNivelTermico } from '@/lib/outfitInsights'

// ── Circular progress ─────────────────────────────────────────
function CircularScore({ score, personalized }) {
  const color =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#eab308' :
    score >= 40 ? '#f97316' : '#ef4444'

  const r   = 18
  const circ = 2 * Math.PI * r
  const dash = circ * (score / 100)

  return (
    <div className="relative w-11 h-11" title={personalized ? 'Score personalizado' : 'Score base'}>
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3"/>
        <circle
          cx="22" cy="22" r={r}
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-black text-gray-900 leading-none">{score}</span>
        {personalized && (
          <span className="text-[8px] text-purple-500 leading-none mt-0.5">✦</span>
        )}
      </div>
    </div>
  )
}

// ── AI tags strip ─────────────────────────────────────────────
function AITagsStrip({ aiTags }) {
  if (!aiTags) return null

  const tags = [
    aiTags.vibe,
    ...(aiTags.aesthetic ?? []).slice(0, 2),
  ].filter(Boolean)

  if (!tags.length) return null

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <span
          key={i}
          className={`
            text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]
            ${i === 0
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600'}
          `}
        >
          {i === 0 ? `✦ ${tag}` : tag}
        </span>
      ))}
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function OutfitCard({
  outfit,
  isSaved      = false,
  onSave,
  onDelete,
  onEdit,
  onFeedback,
  onAddToCollection,
  onMoreLikeThis,
}) {
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Score a mostrar: personalizedScore si existe, sino score base
  const displayScore    = outfit.personalizedScore ?? outfit.score ?? 0
  const isPersonalized  = !!outfit.personalizedScore
  const isExploration   = outfit._isExploration ?? false

  const handleSave = async () => {
    setSaving(true)
    await onSave?.(outfit)
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete?.(outfit.id)
    setDeleting(false)
  }

  // Occasiones para tooltip
  const occasions = outfit.ai_tags?.occasion?.slice(0, 2).join(' · ')

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 group flex flex-col bg-white">

      {/* ── Zona visual ───────────────────────────────────── */}
      {/* h-72 garantiza que el mosaico sea visible completo */}
      <div className="relative h-72 flex-shrink-0">

        {/* Fondo aesthetic */}
        <OutfitBackground outfit={outfit}/>

        {/* Layout de prendas */}
        <OutfitVisualLayout outfit={outfit}/>

        {/* Score (top-right) */}
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-1 shadow-sm">
            <CircularScore score={displayScore} personalized={isPersonalized}/>
          </div>
        </div>

        {/* Badges top-left */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          {outfit.source === 'manual' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100/90 text-blue-700 backdrop-blur-sm">
              ✏️ Manual
            </span>
          )}
          {isExploration && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-700 backdrop-blur-sm">
              🌟 Descubre
            </span>
          )}
          {isPersonalized && !isExploration && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100/90 text-purple-700 backdrop-blur-sm">
              ✦ Para ti
            </span>
          )}
        </div>

        {/* Ocasiones (bottom overlay) */}
        {occasions && (
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6 z-10"
               style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%)' }}>
            <p className="text-xs text-white/90 font-medium truncate">📍 {occasions}</p>
          </div>
        )}
      </div>

      {/* ── Zona de info ──────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* Season + formality badges */}
        <OutfitSeasonBadges outfit={outfit}/>

        {/* AI tags */}
        <AITagsStrip aiTags={outfit.ai_tags}/>

        {/* Accordions */}
        <OutfitWhyWorks     outfit={outfit}/>
        <OutfitScoreBreakdown outfit={outfit}/>

        {/* ── Feedback bar ────────────────────────────────── */}
        {onFeedback && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <FeedbackBar
              outfit={outfit}
              onFeedback={onFeedback}
              onMoreLikeThis={onMoreLikeThis}
            />

            {/* Colección */}
            {onAddToCollection && isSaved && (
              <button
                onClick={() => onAddToCollection(outfit)}
                className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                title="Añadir a colección"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {/* ── Acciones principales ─────────────────────────── */}
        {isSaved ? (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(outfit)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                           text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Editar
              </button>
            )}
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}
                    className={onEdit ? 'flex-1' : 'w-full'}>
              {onEdit ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              ) : 'Eliminar outfit'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" loading={saving} onClick={handleSave} className="w-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
            Guardar outfit
          </Button>
        )}
      </div>
    </div>
  )
}