// lib/personalization/feedbackEngine.js
// ============================================================
// Motor de feedback loop.
// Convierte acciones en actualizaciones del perfil de usuario.
// ============================================================

// ── PESOS — diseñados para reflejar intención real ───────────
export const ACTION_WEIGHTS = {
  worn:              10,   // lo usó → señal más fuerte posible
  share:              7,   // lo compartió → fuerte aprobación
  save:               5,   // lo guardó → aprobación alta
  add_to_collection:  4,   // lo organizó
  like:               2,   // like rápido
  edit:              -1,   // lo tuvo que editar → no era perfecto
  skip:              -2,   // lo ignoró
  dislike:           -4,   // no le gustó
  delete:            -6,   // lo eliminó → rechazo fuerte
}

export const POSITIVE_ACTIONS = new Set(['worn', 'share', 'save', 'add_to_collection', 'like'])
export const NEGATIVE_ACTIONS = new Set(['skip', 'dislike', 'delete'])

// ── EXTRACTOR DE FEATURES ────────────────────────────────────
export function extraerFeatures(outfit) {
  const prendas = [
    outfit._top, outfit._bottom, outfit._shoes, outfit._outerwear,
  ].filter(Boolean)

  const getForms = (p) =>
    Array.isArray(p?.formalidades) && p.formalidades.length
      ? p.formalidades
      : [p?.formalidad ?? 'casual']

  return {
    colors:         prendas.map((p) => p.color).filter(Boolean),
    color_families: prendas.map((p) => p.color_familia).filter(Boolean),
    formalidades: [...new Set(prendas.flatMap(getForms))],
    warmths:        prendas.map((p) => p.warmth).filter(Boolean),
    seasons:        outfit.seasons ?? [],
    accessories:    (outfit._accessories ?? []).map((a) => a.subcategoria).filter(Boolean),
    has_outerwear:  !!outfit._outerwear,
    nivel_termico:  outfit.nivel_termico,
    score:          outfit.score,
    ai_tags: {
      vibe:      outfit.ai_tags?.vibe,
      aesthetic: outfit.ai_tags?.aesthetic ?? [],
      mood:      outfit.ai_tags?.mood,
    },
  }
}

// ── SNAPSHOT para persistir en outfit_feedback ───────────────
export function crearSnapshot(outfit) {
  return {
    score:          outfit.score,
    seasons:        outfit.seasons ?? [],
    nivel_termico:  outfit.nivel_termico,
    source:         outfit.source,
    top_color:      outfit._top?.color,
    top_familia:    outfit._top?.color_familia,
    bottom_color:   outfit._bottom?.color,
    bottom_familia: outfit._bottom?.color_familia,
    formalidades:   outfit._top?.formalidades ?? [outfit._top?.formalidad ?? 'casual'],
    has_outerwear:  !!outfit._outerwear,
    acc_count:      (outfit._accessories ?? []).length,
    vibe:           outfit.ai_tags?.vibe,
  }
}

// ── ACTUALIZACIÓN DEL PERFIL ──────────────────────────────────
/**
 * Calcula los nuevos valores JSONB del perfil dado un feedback.
 * Retorna objeto listo para el UPDATE/merge en Supabase.
 */
export function calcularActualizacionPerfil(currentProfile, features, weight) {
  const isPositive = weight > 0
  const absW       = Math.abs(weight)

  // Deep clone de los campos actuales
  const liked_colors         = { ...(currentProfile.liked_colors         ?? {}) }
  const disliked_colors      = { ...(currentProfile.disliked_colors      ?? {}) }
  const liked_color_families = { ...(currentProfile.liked_color_families ?? {}) }
  const liked_formality      = { ...(currentProfile.liked_formality      ?? {}) }
  const liked_warmth         = { ...(currentProfile.liked_warmth         ?? {}) }
  const liked_accessories    = { ...(currentProfile.liked_accessories    ?? {}) }
  const liked_seasons        = { ...(currentProfile.liked_seasons        ?? {}) }
  const liked_vibes          = { ...(currentProfile.liked_vibes          ?? {}) }

  // Colores
  features.colors.forEach((color) => {
    if (isPositive) {
      liked_colors[color]    = (liked_colors[color]    ?? 0) + absW
      // Decay en disliked si el usuario empieza a aceptar este color
      if (disliked_colors[color]) disliked_colors[color] = Math.max(0, disliked_colors[color] - absW * 0.3)
    } else {
      disliked_colors[color] = (disliked_colors[color] ?? 0) + absW
      if (liked_colors[color])   liked_colors[color]   = Math.max(0, liked_colors[color] - absW * 0.3)
    }
  })

  // Familias de color
  features.color_families.forEach((f) => {
    liked_color_families[f] = (liked_color_families[f] ?? 0) + weight
  })

  // Formalidad
  features.formalidades.forEach((f) => {
    liked_formality[f] = (liked_formality[f] ?? 0) + weight
  })

  // Warmth
  features.warmths.forEach((w) => {
    liked_warmth[w] = (liked_warmth[w] ?? 0) + weight
  })

  // Accesorios
  features.accessories.forEach((a) => {
    liked_accessories[a] = (liked_accessories[a] ?? 0) + weight
  })

  // Estaciones
  features.seasons.forEach((s) => {
    liked_seasons[s] = (liked_seasons[s] ?? 0) + weight
  })

  // Vibes (del AI tagging)
  if (features.ai_tags?.vibe) {
    liked_vibes[features.ai_tags.vibe] = (liked_vibes[features.ai_tags.vibe] ?? 0) + weight
  }
  features.ai_tags?.aesthetic?.forEach((tag) => {
    liked_vibes[tag] = (liked_vibes[tag] ?? 0) + weight * 0.5
  })

  // Confidence
  const totalPositive = (currentProfile.total_likes ?? 0) + (currentProfile.total_saves ?? 0)
  const totalNegative = (currentProfile.total_dislikes ?? 0) + (currentProfile.total_skips ?? 0)
  const totalAll      = totalPositive + totalNegative + 1
  const engagement_rate = totalPositive / Math.max(1, totalAll)

  return {
    liked_colors,
    disliked_colors,
    liked_color_families,
    liked_formality,
    liked_warmth,
    liked_accessories,
    liked_seasons,
    liked_vibes,
    confidence_scores: {
      ...(currentProfile.confidence_scores ?? {}),
      engagement_rate:      Math.round(engagement_rate * 100) / 100,
      total_interactions:   totalAll,
      last_updated:         new Date().toISOString(),
    },
    needs_insight_refresh: totalAll % 10 === 0,
    updated_at:            new Date().toISOString(),
  }
}

export function getCounterField(action) {
  return {
    like:    'total_likes',
    save:    'total_saves',
    dislike: 'total_dislikes',
    edit:    'total_edits',
    skip:    'total_skips',
  }[action] ?? null
}