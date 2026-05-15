// components/outfits/MoreLikeThisModal.jsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import FeedbackBar from './FeedbackBar'
import { usePersonalization } from '@/hooks/usePersonalization'

// ── Mini outfit preview ───────────────────────────────────────
function OutfitMini({ outfit, similarity, onSave, onFeedback, isSaved }) {
  const [imgErr, setImgErr] = useState(false)
  const topImg = outfit._top?.imagen_url

  const simColor =
    similarity >= 80 ? 'bg-green-100 text-green-700' :
    similarity >= 60 ? 'bg-blue-100  text-blue-700'  :
                       'bg-gray-100  text-gray-500'

  return (
    <div className="card p-3 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">

      {/* Imagen de referencia (top del outfit) */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
        {topImg && !imgErr ? (
          <Image src={topImg} alt={outfit._top?.nombre ?? ''} fill sizes="160px" className="object-cover" onError={() => setImgErr(true)}/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">👕</div>
        )}

        {/* Similarity badge */}
        <span className={`absolute top-1.5 right-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${simColor}`}>
          {similarity}%
        </span>

        {/* Score */}
        <span className="absolute bottom-1.5 left-1.5 text-xs font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full">
          {outfit.personalizedScore ?? outfit.score}/100
        </span>
      </div>

      {/* Nombres */}
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-gray-800 truncate">{outfit._top?.nombre}</p>
        <p className="text-xs text-gray-400 truncate">{outfit._bottom?.nombre}</p>
      </div>

      {/* AI vibe tag */}
      {outfit.ai_tags?.vibe && (
        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full self-start truncate max-w-full">
          {outfit.ai_tags.vibe}
        </span>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <FeedbackBar outfit={outfit} onFeedback={onFeedback} compact/>

        {!isSaved && (
          <button
            onClick={() => onSave?.(outfit)}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            Guardar →
          </button>
        )}
      </div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
/**
 * @prop {Object}   outfit         - outfit de referencia
 * @prop {Object[]} allOutfits     - pool de candidatos (saved outfits)
 * @prop {boolean}  isOpen
 * @prop {Function} onClose
 * @prop {Function} onSave         - (outfit) => void
 * @prop {Function} onFeedback     - (outfit, action) => void
 * @prop {string[]} savedIds       - IDs ya guardados
 */
export default function MoreLikeThisModal({
  outfit,
  allOutfits = [],
  isOpen,
  onClose,
  onSave,
  onFeedback,
  savedIds = [],
}) {
  const { findSimilar, scoreOutfit } = usePersonalization()

  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [source,   setSource]   = useState('local') // 'local' | 'api'

  const buildResults = useCallback((rawResults) => {
    return rawResults
      .map((r) => ({
        outfit:            r.outfit ?? r,
        similarity:        r.similarity ?? 50,
        personalizedScore: scoreOutfit(r.outfit ?? r).finalScore,
      }))
      // Re-rank: blend similitud + personalización
      .sort((a, b) => {
        const sA = a.similarity * 0.55 + a.personalizedScore * 0.45
        const sB = b.similarity * 0.55 + b.personalizedScore * 0.45
        return sB - sA
      })
      .map((r) => ({
        ...r.outfit,
        similarity:        r.similarity,
        personalizedScore: r.personalizedScore,
      }))
  }, [scoreOutfit])

  useEffect(() => {
    if (!isOpen || !outfit) return

    setLoading(true)
    setResults([])

    // ── 1. Local similarity (instantáneo) ─────────────────
    const localRaw = findSimilar(outfit, allOutfits, {
      topN:          6,
      minSimilarity: 0.3,
      tagWeight:     0.25,
    })

    if (localRaw.length) {
      setResults(buildResults(localRaw))
      setSource('local')
      setLoading(false)
    }

    // ── 2. API enhancement (asíncrono, mejora si hay AI tags) ─
    if (outfit.id) {
      fetch('/api/ai/more-like-this', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          outfit_id: outfit.id,
          user_id:   outfit.user_id,
          top_n:     6,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.results?.length) {
            setResults(buildResults(data.results))
            setSource('api')
          }
        })
        .catch(() => { /* mantener resultados locales */ })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isOpen, outfit?.id])

  // Referencia visual del outfit base
  const refImg = outfit?._top?.imagen_url

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Más como este"
      size="lg"
    >
      <div className="flex flex-col gap-5">

        {/* Outfit de referencia */}
        {outfit && (
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-2xl border border-purple-100">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
              {refImg ? (
                <Image src={refImg} alt="" width={48} height={48} className="object-cover w-full h-full"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">👕</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {outfit._top?.nombre} + {outfit._bottom?.nombre}
              </p>
              {outfit.ai_tags?.vibe && (
                <p className="text-xs text-purple-600 mt-0.5">{outfit.ai_tags.vibe}</p>
              )}
            </div>
            <div className="ml-auto flex-shrink-0 text-right">
              <p className="text-xs text-gray-400">Base</p>
              <p className="text-sm font-bold text-gray-800">{outfit.score}/100</p>
            </div>
          </div>
        )}

        {/* Indicador de fuente */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {loading && (
            <svg className="animate-spin w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
          <span>
            {loading
              ? 'Buscando similares...'
              : source === 'api'
                ? `✨ ${results.length} outfits · IA + tu perfil`
                : `${results.length} outfits similares`
            }
          </span>
        </div>

        {/* Grid de resultados */}
        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {results.map((o, idx) => (
              <OutfitMini
                key={o.id ?? idx}
                outfit={o}
                similarity={o.similarity}
                onSave={onSave}
                onFeedback={onFeedback}
                isSaved={savedIds.includes(o.id)}
              />
            ))}
          </div>
        ) : !loading ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm">Sin outfits similares en tu armario</p>
            <p className="text-xs mt-1">Guarda más outfits para mejorar las recomendaciones</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-3 flex flex-col gap-2">
                <div className="skeleton aspect-square rounded-xl"/>
                <div className="skeleton h-3 w-3/4 rounded"/>
                <div className="skeleton h-3 w-1/2 rounded"/>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}