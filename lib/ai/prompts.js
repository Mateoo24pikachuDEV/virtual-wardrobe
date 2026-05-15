// lib/ai/prompts.js
// ============================================================
// Prompts optimizados para Groq.
// Regla Groq JSON mode: la palabra "json" DEBE aparecer en
// el primer mensaje del sistema. Los helpers lo garantizan.
// Estrategia de tokens:
//   - Modelo rápido (8b): tagging, scoring simple → maxTokens 200-300
//   - Modelo complejo (70b): análisis de perfil → maxTokens 600-800
// ============================================================

// ── SISTEMA BASE ─────────────────────────────────────────────
export const SYSTEM_STYLIST = `Eres un AI personal stylist experto en moda contemporánea. Respondes en español. Eres preciso, conciso y perspicaz. Cuando se pida json, devuelves SOLO json válido.`

// ── SERIALIZERS ──────────────────────────────────────────────

export function serializarOutfit(outfit) {
  const prendas = [outfit._top, outfit._bottom, outfit._shoes, outfit._outerwear]
    .filter(Boolean)
    .map((p) => `${p.categoria}:${p.color}(${p.color_familia})-${p.warmth ?? '?'}`)
    .join(' | ')

  const accessories = (outfit._accessories ?? [])
    .map((a) => a.subcategoria)
    .join(',') || 'ninguno'

  const formalidades = Array.isArray(outfit._top?.formalidades) && outfit._top.formalidades.length
    ? outfit._top.formalidades.join(',')
    : outfit._top?.formalidad ?? 'casual'

  return [
    `prendas:${prendas}`,
    `accesorios:${accessories}`,
    `formalidad:${formalidades}`,
    `estaciones:${(outfit.seasons ?? []).join(',') || '?'}`,
    `termico:${outfit.nivel_termico ?? '?'}/100`,
    `score:${outfit.score ?? '?'}`,
  ].join(' | ')
}

export function serializarPerfil(profile, maxItems = 6) {
  if (!profile) return 'sin_perfil'

  const topFamilias = Object.entries(profile.liked_color_families ?? {})
    .sort((a, b) => b[1] - a[1]).slice(0, maxItems)
    .map(([k, v]) => `${k}:${v}`).join(',')

  const topFormal = Object.entries(profile.liked_formality ?? {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k}:${v}`).join(',')

  const topWarmth = Object.entries(profile.liked_warmth ?? {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k}:${v}`).join(',')

  return [
    `familias:${topFamilias || '?'}`,
    `formalidad:${topFormal || '?'}`,
    `warmth:${topWarmth || '?'}`,
    `vibes:${(profile.vibes ?? []).slice(0, 4).join(',') || '?'}`,
    `L${profile.total_likes ?? 0}S${profile.total_saves ?? 0}D${profile.total_dislikes ?? 0}`,
  ].join(' | ')
}

export function serializarHistorial(outfits, limit = 8) {
  return outfits.slice(0, limit)
    .map((o) => `[${o._top?.color_familia ?? '?'}+${o._bottom?.color_familia ?? '?'}|${o._top?.formalidad ?? '?'}|s:${o.score ?? '?'}]`)
    .join(' ')
}

// ── PROMPTS ───────────────────────────────────────────────────

export function promptAnalyzeStyle({ profile, recentOutfits, feedbackSummary }) {
  return {
    messages: [
      { role: 'system', content: SYSTEM_STYLIST },
      {
        role: 'user',
        content: `Analiza el estilo de este usuario y devuelve json:

PERFIL: ${serializarPerfil(profile, 8)}
OUTFITS(${recentOutfits.length}): ${serializarHistorial(recentOutfits, 10)}
FEEDBACK: L${feedbackSummary.likes} S${feedbackSummary.saves} D${feedbackSummary.dislikes}

json exacto:
{
  "headline": "frase de 8-10 palabras sobre su estilo",
  "summary": "párrafo de 2-3 oraciones sobre su identidad de estilo",
  "vibes": ["vibe1","vibe2","vibe3"],
  "aesthetic": ["tag1","tag2"],
  "evolution": "cómo ha evolucionado (1 oración)",
  "strengths": ["fortaleza1","fortaleza2"],
  "opportunity": "sugerencia de exploración (1 oración)",
  "confidence": 0.7
}`,
      },
    ],
    schema: {
      headline: 'string', summary: 'string',
      vibes: 'string[]', aesthetic: 'string[]',
      evolution: 'string', strengths: 'string[]',
      opportunity: 'string', confidence: 'number',
    },
  }
}

export function promptTagOutfit(outfit) {
  const outfitStr = serializarOutfit(outfit)

  return {
    messages: [
      { role: 'system', content: SYSTEM_STYLIST },
      {
        role: 'user',
        content: `Clasifica este outfit con tags fashion y devuelve json:
${outfitStr}

json exacto:
{
  "vibe": "2-3 palabras ej: clean urban",
  "energy": "2-3 palabras ej: calm confidence",
  "mood": "1 palabra ej: polished",
  "aesthetic": ["minimal","smart"],
  "occasion": ["trabajo","casual weekend"],
  "descriptors": ["clean","structured","neutral"],
  "silhouette": "fitted|relaxed|oversized|tailored",
  "layering": "none|light|medium|heavy"
}`,
      },
    ],
  }
}

export function promptExplainOutfit({ outfit, profile }) {
  return {
    messages: [
      { role: 'system', content: SYSTEM_STYLIST },
      {
        role: 'user',
        content: `Explica por qué este outfit funciona para este usuario. Devuelve json:
OUTFIT: ${serializarOutfit(outfit)}
USUARIO: ${serializarPerfil(profile, 4)}

json:
{
  "why_for_you": "1-2 oraciones personalizadas",
  "color_note": "observación de colores (1 oración)",
  "style_match": "encaje con su estilo (1 oración)",
  "occasion_tip": "cuándo usarlo (1 oración)"
}`,
      },
    ],
  }
}

export function promptStyleEvolution({ oldOutfits, recentOutfits }) {
  return {
    messages: [
      { role: 'system', content: SYSTEM_STYLIST },
      {
        role: 'user',
        content: `Detecta evolución de estilo y devuelve json:
ANTERIOR(>30d): ${serializarHistorial(oldOutfits, 6) || 'sin_datos'}
RECIENTE: ${serializarHistorial(recentOutfits, 6) || 'sin_datos'}

json:
{
  "has_evolved": true,
  "direction": "hacia qué estilo evoluciona",
  "insight": "observación de 1-2 oraciones",
  "trend": "increasing_formality|decreasing_formality|warmer_tones|cooler_tones|more_minimal|more_bold|stable"
}`,
      },
    ],
  }
}

export function promptAnalyzeOnboarding(data) {
  return {
    messages: [
      { role: 'system', content: SYSTEM_STYLIST },
      {
        role: 'user',
        content: `Usuario completó onboarding. Genera perfil inicial y devuelve json:
aesthetics:${data.chosen_aesthetics?.join(',') || '?'}
vibes:${data.chosen_vibes?.join(',') || '?'}
formalidad:${data.preferred_formality || '?'}
ocasiones:${data.preferred_occasions?.join(',') || '?'}
clima:${data.climate_preference || '?'}
colores_fav:${data.favorite_colors?.join(',') || '?'}
colores_evitar:${data.avoided_colors?.join(',') || '?'}

json:
{
  "headline": "descripción del estilo en 8-10 palabras",
  "vibes": ["vibe1","vibe2","vibe3"],
  "aesthetic": ["tag1","tag2"],
  "summary": "2 oraciones sobre su identidad de estilo",
  "initial_weights": {
    "liked_color_families": {"neutro":0,"calido":0,"frio":0,"vibrante":0},
    "liked_formality": {"casual":0,"smart":0,"formal":0}
  }
}`,
      },
    ],
  }
}