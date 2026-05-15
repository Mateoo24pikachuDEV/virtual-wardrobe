// lib/personalization/explorationEngine.js
// ============================================================
// Sistema de exploración controlada.
// Evita el "filter bubble": el usuario no queda atrapado
// en una sola estética, recibe dosis controladas de novedad.
//
// FÓRMULA:
//   explorationBonus = noveltyFactor * explorationRatio * 100
//
//   noveltyFactor  = qué TAN DIFERENTE es este outfit de los que
//                    el usuario normalmente le gusta
//   explorationRatio = qué % de variedad inyectar (dinámico)
// ============================================================

import { outfitToVector, cosineSimilarity } from './similarityEngine.js'

// ── DIVERSIDAD DEL PERFIL ─────────────────────────────────────
/**
 * Calcula la diversidad de preferencias del usuario (0-1).
 * Usa entropía de Shannon sobre las familias de color preferidas.
 * 0 = muy homogéneo (le gusta solo un tipo de outfit)
 * 1 = muy diverso (le gustan todos los estilos por igual)
 */
export function calcularDiversidad(profile) {
  const families = profile?.liked_color_families ?? {}
  const values   = Object.values(families).filter((v) => v > 0)

  if (values.length < 2) return 0.2 // sin datos = baja diversidad asumida

  const total = values.reduce((s, v) => s + v, 0)
  if (total === 0) return 0.5

  // Entropía de Shannon normalizada
  const probs      = values.map((v) => v / total)
  const entropy    = -probs.reduce((s, p) => s + p * Math.log2(p), 0)
  const maxEntropy = Math.log2(values.length)

  return maxEntropy > 0 ? entropy / maxEntropy : 0.5
}

// ── EXPLORATION RATIO ─────────────────────────────────────────
/**
 * Calcula el ratio de exploración dinámico.
 * - Usuario nuevo (pocas interacciones): ratio medio (~15%)
 * - Usuario con gustos muy concentrados: ratio alto (~22%) → explorar más
 * - Usuario diverso con muchas interacciones: ratio bajo (~8%)
 *
 * Rango: 0.05 – 0.25
 */
export function calcularExplorationRatio(profile) {
  if (!profile) return 0.15

  const diversidad      = calcularDiversidad(profile)
  const totalInteracciones = (profile.total_likes ?? 0) + (profile.total_saves ?? 0) +
                             (profile.total_dislikes ?? 0)

  // A más experiencia → prefijo base se reduce (confiamos más en sus preferencias)
  const expFactor = Math.min(1, totalInteracciones / 40)

  // A menor diversidad → más exploración forzada
  const concentracion = 1 - diversidad

  const ratio = 0.15 + concentracion * 0.10 - expFactor * 0.07

  return Math.max(0.05, Math.min(0.25, ratio))
}

// ── NOVELTY FACTOR ────────────────────────────────────────────
/**
 * Qué tan DIFERENTE es este outfit de los que el usuario ha gustado.
 * noveltyFactor: 0 = outfit muy similar a los que ya le gustan
 *                1 = outfit completamente diferente (máxima novedad)
 *
 * @param {Object}   outfit
 * @param {Object[]} recentlyLikedOutfits - outfits con feedback positivo reciente
 */
export function calcularNoveltyFactor(outfit, recentlyLikedOutfits) {
  if (!recentlyLikedOutfits || recentlyLikedOutfits.length === 0) return 0.5

  const outfitVec = outfitToVector(outfit)

  // Promedio de similitud con los outfits que más le gustan
  const similarities = recentlyLikedOutfits.slice(0, 5).map((liked) => {
    const likedVec = outfitToVector(liked)
    return cosineSimilarity(outfitVec, likedVec)
  })

  const avgSimilarity = similarities.reduce((s, v) => s + v, 0) / similarities.length

  // Novelty = inverso de similitud (0.1 mínimo para no penalizar demasiado lo familiar)
  return Math.max(0.1, 1 - avgSimilarity)
}

// ── EXPLORATION BONUS ─────────────────────────────────────────
/**
 * Bonus de exploración para el scoring final (0-100).
 *
 * @param {Object}   outfit
 * @param {Object}   profile
 * @param {Object[]} recentlyLikedOutfits
 */
export function calcularExplorationBonus(outfit, profile, recentlyLikedOutfits = []) {
  const noveltyFactor     = calcularNoveltyFactor(outfit, recentlyLikedOutfits)
  const explorationRatio  = calcularExplorationRatio(profile)

  return Math.round(noveltyFactor * explorationRatio * 100)
}

// ── RERANKING CON EXPLORACIÓN ─────────────────────────────────
/**
 * Aplica exploración controlada a una lista ordenada de outfits.
 * Inserta "outfits de exploración" entre los resultados principales
 * para evitar el filter bubble, sin degradar la experiencia.
 *
 * @param {Object[]} outfits   - ya ordenados por personalizedScore
 * @param {Object}   profile
 * @param {Object[]} recentlyLiked
 * @returns {Object[]}          - lista con exploración mezclada
 */
export function aplicarExploracion(outfits, profile, recentlyLiked = []) {
  if (!outfits || outfits.length === 0) return outfits

  const explorationRatio = calcularExplorationRatio(profile)
  const totalOutfits     = outfits.length
  const numExploracion   = Math.ceil(totalOutfits * explorationRatio)

  // Separar outfits por similaridad con las preferencias
  // Los "de exploración" son aquellos con novelty > 0.5 pero score ≥ 40
  const mainOutfits = []
  const explorePool = []

  outfits.forEach((o) => {
    const novelty = calcularNoveltyFactor(o, recentlyLiked)
    if (novelty > 0.55 && (o.score ?? 0) >= 40) {
      explorePool.push({ ...o, _isExploration: true, _novelty: novelty })
    } else {
      mainOutfits.push(o)
    }
  })

  // Si no hay suficientes para explorar, devolver tal cual
  if (explorePool.length === 0) return outfits

  // Ordenar pool de exploración por score (los mejores primero)
  explorePool.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  // Intercalar outfits de exploración cada N posiciones
  const step   = Math.floor(totalOutfits / (numExploracion + 1))
  const result = [...mainOutfits]

  for (let i = 0; i < numExploracion && i < explorePool.length; i++) {
    const pos = Math.min((i + 1) * step, result.length)
    result.splice(pos, 0, explorePool[i])
  }

  return result
}