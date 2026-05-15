// lib/personalization/scoringEngine.js
// ============================================================
// Motor de scoring personalizado.
//
// FÓRMULA:
//   finalScore =
//     engineScore          * 0.55   ← calidad base del outfit
//     personalizationScore * 0.30   ← afinidad con el perfil
//     aestheticScore       * 0.10   ← match de vibes/aesthetics
//     explorationBonus     * 0.05   ← novedad controlada
//
// ============================================================

import { extraerFeatures } from './feedbackEngine.js'
import {
  calcularExplorationBonus,
  aplicarExploracion,
} from './explorationEngine.js'

// ── AFFINITY SCORES ───────────────────────────────────────────

function normalizar(mapa, key) {
  const vals  = Object.values(mapa ?? {}).filter((v) => v > 0)
  const total = vals.reduce((s, v) => s + v, 0)
  if (total === 0) return 0.5
  const raw = mapa[key] ?? 0
  return Math.max(0, raw) / total
}

function scorePorFamilias(features, profile) {
  if (!features.color_families.length) return 50
  const scores = features.color_families.map((f) =>
    normalizar(profile.liked_color_families, f) * 100
  )
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

function scorePorFormalidad(features, profile) {
  if (!features.formalidades.length) return 50
  const scores = features.formalidades.map((f) =>
    normalizar(profile.liked_formality, f) * 100
  )
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

function scorePorWarmth(features, profile) {
  if (!features.warmths.length) return 50
  const scores = features.warmths.map((w) =>
    normalizar(profile.liked_warmth, w) * 100
  )
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

function scorePorEstacion(features, profile) {
  if (!features.seasons.length) return 50
  const scores = features.seasons.map((s) =>
    normalizar(profile.liked_seasons, s) * 100
  )
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

function scorePorAccesorios(features, profile) {
  if (!features.accessories.length) return 50
  const scores = features.accessories.map((a) =>
    normalizar(profile.liked_accessories, a) * 100
  )
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

/**
 * Score de personalización total (0-100).
 * Promedio ponderado de todos los sub-scores de afinidad.
 */
function calcularPersonalizationScore(features, profile) {
  if (!profile) return 50

  const colorScore    = scorePorFamilias(features, profile)
  const formalScore   = scorePorFormalidad(features, profile)
  const warmthScore   = scorePorWarmth(features, profile)
  const seasonScore   = scorePorEstacion(features, profile)
  const accScore      = scorePorAccesorios(features, profile)

  // Pesos: color y formalidad son los más importantes
  return Math.round(
    colorScore  * 0.30 +
    formalScore * 0.25 +
    warmthScore * 0.20 +
    seasonScore * 0.15 +
    accScore    * 0.10
  )
}

// ── AESTHETIC SCORE ───────────────────────────────────────────

/**
 * Qué tan bien encaja el vibe/aesthetic del outfit con los del usuario.
 * Usa los liked_vibes del perfil y los ai_tags del outfit.
 */
function calcularAestheticScore(outfit, profile) {
  if (!profile?.liked_vibes || !outfit.ai_tags) return 50

  const userVibes = profile.liked_vibes ?? {}

  const outfitTags = [
    outfit.ai_tags?.vibe,
    outfit.ai_tags?.mood,
    ...(outfit.ai_tags?.aesthetic ?? []),
    ...(outfit.ai_tags?.descriptors ?? []),
  ]
    .filter(Boolean)
    .map((t) => t.toLowerCase())

  if (outfitTags.length === 0) return 50

  const totalUserWeight = Object.values(userVibes).filter((v) => v > 0).reduce((s, v) => s + v, 0)
  if (totalUserWeight === 0) return 50

  let matchScore = 0
  outfitTags.forEach((tag) => {
    if (userVibes[tag] && userVibes[tag] > 0) {
      matchScore += (userVibes[tag] / totalUserWeight) * 100
    }
  })

  return Math.min(100, Math.round(matchScore * 1.5)) // boost para que tenga impacto real
}

// ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────

/**
 * @param {Object}   outfit
 * @param {Object}   userProfile
 * @param {Object[]} [recentlyLiked]  - para calcular exploration bonus
 * @returns {{
 *   finalScore: number,
 *   breakdown: {
 *     engineScore, personalizationScore, aestheticScore, explorationBonus
 *   },
 *   isPersonalized: boolean
 * }}
 */
export function calcularScorePersonalizado(outfit, userProfile, recentlyLiked = []) {
  const features = extraerFeatures(outfit)

  const engineScore        = outfit.score               ?? 50
  const personalizationScore = calcularPersonalizationScore(features, userProfile)
  const aestheticScore     = calcularAestheticScore(outfit, userProfile)
  const explorationBonus   = calcularExplorationBonus(outfit, userProfile, recentlyLiked)

  const finalScore = Math.round(
    engineScore          * 0.55 +
    personalizationScore * 0.30 +
    aestheticScore       * 0.10 +
    explorationBonus     * 0.05
  )

  const hasEnoughData = ((userProfile?.total_likes ?? 0) + (userProfile?.total_saves ?? 0)) >= 3

  return {
    finalScore:    Math.max(0, Math.min(100, finalScore)),
    breakdown: {
      engineScore,
      personalizationScore,
      aestheticScore,
      explorationBonus,
    },
    isPersonalized: hasEnoughData,
  }
}

/**
 * Ordena outfits por score personalizado e inyecta exploración.
 *
 * @param {Object[]} outfits
 * @param {Object}   userProfile
 * @param {Object[]} recentlyLiked
 */
export function ordenarOutfitsPersonalizados(outfits, userProfile, recentlyLiked = []) {
  if (!outfits?.length) return []

  // 1. Calcular scores personalizados
  const scored = outfits.map((outfit) => {
    const { finalScore, breakdown, isPersonalized } = calcularScorePersonalizado(
      outfit, userProfile, recentlyLiked
    )
    return { ...outfit, personalizedScore: finalScore, scoring: breakdown, isPersonalized }
  })

  // 2. Ordenar por score
  scored.sort((a, b) => b.personalizedScore - a.personalizedScore)

  // 3. Aplicar exploración controlada
  return aplicarExploracion(scored, userProfile, recentlyLiked)
}