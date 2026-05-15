// components/outfits/FeedbackBar.jsx
'use client'

import { useState, useCallback } from 'react'

// ── Iconos inline (sin dependencias) ─────────────────────────
const Icons = {
  Heart: ({ filled }) => (
    <svg className="w-3.5 h-3.5" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
    </svg>
  ),
  X: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  ),
  Check: ({ filled }) => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={filled ? 3 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
    </svg>
  ),
  Similar: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7"/>
    </svg>
  ),
}

/**
 * Barra de feedback para outfits.
 *
 * @prop {Object}   outfit
 * @prop {Function} onFeedback       - async (outfit, action) => void
 * @prop {Function} onMoreLikeThis   - (outfit) => void
 * @prop {boolean}  compact          - versión pequeña para modal
 */
export default function FeedbackBar({ outfit, onFeedback, onMoreLikeThis, compact = false }) {
  // Estado local (optimistic)
  const [liked,    setLiked]    = useState(false)
  const [disliked, setDisliked] = useState(false)
  const [worn,     setWorn]     = useState(false)
  const [loading,  setLoading]  = useState(null) // acción en vuelo

  const handle = useCallback(async (action) => {
    if (loading) return

    // Optimistic update
    if (action === 'like')    { setLiked((v) => !v); if (disliked) setDisliked(false) }
    if (action === 'dislike') { setDisliked((v) => !v); if (liked) setLiked(false) }
    if (action === 'worn')    setWorn(true)

    setLoading(action)
    try {
      await onFeedback?.(outfit, action)
    } finally {
      setLoading(null)
    }
  }, [loading, liked, disliked, outfit, onFeedback])

  const btnBase = `
    flex items-center justify-center rounded-xl transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1
    disabled:cursor-not-allowed
  `
  const sz = compact ? 'w-7 h-7' : 'w-8 h-8'

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>

      {/* ── Like ─────────────────────────────────────────── */}
      <button
        onClick={() => handle(liked ? 'skip' : 'like')}
        disabled={loading === 'like'}
        title={liked ? 'Quitar like' : 'Me gusta'}
        className={`${btnBase} ${sz} ${
          liked
            ? 'bg-rose-500 text-white shadow-sm scale-110'
            : 'bg-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-500 hover:scale-105'
        }`}
      >
        <Icons.Heart filled={liked}/>
      </button>

      {/* ── Dislike ──────────────────────────────────────── */}
      <button
        onClick={() => handle(disliked ? 'skip' : 'dislike')}
        disabled={loading === 'dislike'}
        title="No me gusta"
        className={`${btnBase} ${sz} ${
          disliked
            ? 'bg-gray-700 text-white shadow-sm'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        <Icons.X/>
      </button>

      {/* ── Worn ─────────────────────────────────────────── */}
      <button
        onClick={() => handle('worn')}
        disabled={loading === 'worn' || worn}
        title={worn ? '¡Ya lo usaste!' : 'Lo usé hoy'}
        className={`${btnBase} ${sz} ${
          worn
            ? 'bg-green-500 text-white shadow-sm'
            : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600 hover:scale-105'
        }`}
      >
        <Icons.Check filled={worn}/>
      </button>

      {/* ── More Like This ───────────────────────────────── */}
      {onMoreLikeThis && (
        <button
          onClick={() => onMoreLikeThis(outfit)}
          title="Más outfits como este"
          className={`${btnBase} ${sz} bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600 hover:scale-105`}
        >
          <Icons.Similar/>
        </button>
      )}
    </div>
  )
}