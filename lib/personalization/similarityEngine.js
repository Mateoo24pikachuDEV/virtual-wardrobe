// lib/personalization/similarityEngine.js
// ============================================================
// Motor de similitud para "More Like This".
//
// VERSIÓN SIMPLE: vectores de features + cosine similarity (sin API)
// VERSIÓN AVANZADA: embeddings de Grok (ver comentario al final)
// ============================================================

// ── FEATURE VECTOR ───────────────────────────────────────────

const COLOR_FAMILIES = ['neutro', 'calido', 'frio', 'vibrante']
const WARMTHS        = ['light', 'medium', 'heavy']
const SEASONS_KEYS   = ['summer', 'spring', 'autumn', 'winter']
const FORMALITIES    = ['casual', 'smart', 'formal']

/**
 * Convierte un outfit en un vector numérico normalizado.
 * Dimensiones:
 *   [0-3]  color families (one-hot, puede ser multi-hot)
 *   [4-6]  warmth distribution
 *   [7-10] seasons
 *   [11-13] formality
 *   [14]   has_outerwear (0/1)
 *   [15]   accessories_count (normalizado 0-1)
 *   [16]   nivel_termico (normalizado 0-1)
 *
 * Total: 17 dimensiones
 */
export function outfitToVector(outfit) {
  const prendas = [
    outfit._top, outfit._bottom, outfit._shoes, outfit._outerwear,
  ].filter(Boolean)

  const vec = new Array(17).fill(0)

  // [0-3] Color families (frecuencia normalizada)
  const families = prendas.map((p) => p.color_familia).filter(Boolean)
  COLOR_FAMILIES.forEach((fam, i) => {
    const count = families.filter((f) => f === fam).length
    vec[i] = families.length > 0 ? count / families.length : 0
  })

  // [4-6] Warmth
  const warmths = prendas.map((p) => p.warmth).filter(Boolean)
  WARMTHS.forEach((w, i) => {
    const count = warmths.filter((x) => x === w).length
    vec[4 + i] = warmths.length > 0 ? count / warmths.length : 0
  })

  // [7-10] Seasons
  const seasons = outfit.seasons ?? []
  SEASONS_KEYS.forEach((s, i) => {
    vec[7 + i] = seasons.includes(s) ? 1 : 0
  })

  // [11-13] Formality (del top como referencia)
  const formalidades = Array.isArray(outfit._top?.formalidades)
    ? outfit._top.formalidades
    : [outfit._top?.formalidad ?? 'casual']
  FORMALITIES.forEach((f, i) => {
    vec[11 + i] = formalidades.includes(f) ? 1 : 0
  })

  // [14] Has outerwear
  vec[14] = outfit._outerwear ? 1 : 0

  // [15] Accessories count (normalizado, max 5)
  vec[15] = Math.min(1, (outfit._accessories?.length ?? 0) / 5)

  // [16] Nivel térmico
  vec[16] = (outfit.nivel_termico ?? 50) / 100

  return vec
}

// ── COSINE SIMILARITY ─────────────────────────────────────────
function dotProduct(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0)
}

function magnitude(v) {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0))
}

export function cosineSimilarity(vecA, vecB) {
  const mag = magnitude(vecA) * magnitude(vecB)
  if (mag === 0) return 0
  return dotProduct(vecA, vecB) / mag
}

// ── SIMILITUD SEMÁNTICA (opcional, vía AI tags) ───────────────
/**
 * Similitud adicional basada en tags AI.
 * Si ambos outfits tienen ai_tags, comparamos vibes y aesthetics.
 * @returns {number} 0-1
 */
function tagSimilarity(outfitA, outfitB) {
  if (!outfitA.ai_tags || !outfitB.ai_tags) return 0

  const tagsA = new Set([
    outfitA.ai_tags.vibe,
    outfitA.ai_tags.energy,
    outfitA.ai_tags.mood,
    ...(outfitA.ai_tags.aesthetic ?? []),
  ].filter(Boolean).map((t) => t.toLowerCase()))

  const tagsB = new Set([
    outfitB.ai_tags.vibe,
    outfitB.ai_tags.energy,
    outfitB.ai_tags.mood,
    ...(outfitB.ai_tags.aesthetic ?? []),
  ].filter(Boolean).map((t) => t.toLowerCase()))

  if (tagsA.size === 0 || tagsB.size === 0) return 0

  const intersection = [...tagsA].filter((t) => tagsB.has(t)).length
  const union        = new Set([...tagsA, ...tagsB]).size

  return intersection / union // Jaccard similarity
}

// ── MORE LIKE THIS — FUNCIÓN PRINCIPAL ───────────────────────
/**
 * Encuentra los N outfits más similares a uno dado.
 *
 * @param {Object}   targetOutfit   - outfit de referencia
 * @param {Object[]} candidates     - pool de outfits a comparar
 * @param {Object}   [options]
 * @param {number}   [options.topN]          - cuántos devolver (default 6)
 * @param {number}   [options.minSimilarity] - umbral mínimo (default 0.4)
 * @param {number}   [options.tagWeight]     - peso de similitud semántica (default 0.3)
 * @returns {Array<{ outfit, similarity, breakdown }>}
 */
export function findSimilarOutfits(targetOutfit, candidates, {
  topN          = 6,
  minSimilarity = 0.35,
  tagWeight     = 0.3,
} = {}) {
  const targetVec = outfitToVector(targetOutfit)

  const results = candidates
    .filter((o) => o.id !== targetOutfit.id) // excluir el propio
    .map((outfit) => {
      const vec       = outfitToVector(outfit)
      const vecSim    = cosineSimilarity(targetVec, vec)
      const tagSim    = tagSimilarity(targetOutfit, outfit)

      // Combinar: vector similarity + optional tag similarity
      const similarity = tagSim > 0
        ? vecSim * (1 - tagWeight) + tagSim * tagWeight
        : vecSim

      return {
        outfit,
        similarity:  Math.round(similarity * 100),
        breakdown: {
          vectorSimilarity: Math.round(vecSim * 100),
          tagSimilarity:    Math.round(tagSim * 100),
        },
      }
    })
    .filter((r) => r.similarity >= minSimilarity * 100)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)

  return results
}

// ────────────────────────────────────────────────────────────
// VERSIÓN AVANZADA: Embeddings (opcional, requiere API call)
// ────────────────────────────────────────────────────────────
//
// Para mayor precisión semántica, se puede generar un embedding
// de texto de cada outfit y calcular cosine similarity entre embeddings.
//
// Ejemplo de texto para embedding:
// "casual minimal outfit: white t-shirt, navy trousers, white sneakers.
//  neutral palette. light warmth. spring/summer. clean urban vibe."
//
// Con Grok/OpenAI embeddings:
//
//   async function getOutfitEmbedding(outfit) {
//     const text = `
//       ${outfit._top?.color} ${outfit._top?.categoria}
//       ${outfit._bottom?.color} ${outfit._bottom?.categoria}
//       ${outfit._shoes?.color} shoes
//       ${outfit.seasons?.join(' ')} season
//       ${outfit.ai_tags?.vibe ?? ''} vibe
//       ${outfit.ai_tags?.aesthetic?.join(' ') ?? ''}
//     `.trim()
//
//     const res = await fetch('https://api.x.ai/v1/embeddings', {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${process.env.GROK_API_KEY}` },
//       body: JSON.stringify({ model: 'grok-embed', input: text })
//     })
//     const data = await res.json()
//     return data.data[0].embedding
//   }
//
// Guardar embeddings en outfit_ai_tags como columna VECTOR (pgvector).
// Búsqueda: `SELECT * FROM outfit_ai_tags ORDER BY embedding <-> $1 LIMIT 6`