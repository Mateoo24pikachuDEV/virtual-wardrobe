// lib/outfitInsights.js
// ============================================================
// Lógica pura para generar insights, score breakdown,
// temperatura y tema visual basado en las propiedades del outfit.
// Sin React. Reutilizable en cualquier componente.
// ============================================================

// -----------------------------------------------------------
// HELPERS INTERNOS
// -----------------------------------------------------------

function getFormalidades(prenda) {
  if (!prenda) return ['casual']
  if (Array.isArray(prenda.formalidades) && prenda.formalidades.length > 0)
    return prenda.formalidades
  return [prenda.formalidad || 'casual']
}

function getPrendas(outfit) {
  return [
    outfit._top,
    outfit._bottom,
    outfit._shoes,
    outfit._outerwear,
  ].filter(Boolean)
}

// -----------------------------------------------------------
// SCORE BREAKDOWN
// Genera 6 sub-scores (0-10) para display visual.
// Son independientes del engine score — cuentan una historia.
// -----------------------------------------------------------

/**
 * @param {Object} outfit  - outfit normalizado con _top, _bottom, etc.
 * @returns {Object}
 */
export function calcularScoreBreakdown(outfit) {
  const {
    _accessories = [],
    seasons       = [],
    score         = 0,
  } = outfit

  const prendas  = getPrendas(outfit)
  const familias = prendas.map((p) => p.color_familia).filter(Boolean)
  const warmths  = prendas.map((p) => p.warmth).filter(Boolean)

  // ── 1. Color Harmony ─────────────────────────────────────
  const neutros   = familias.filter((f) => f === 'neutro').length
  const vibrantes = familias.filter((f) => f === 'vibrante').length
  const uniqueFam = new Set(familias).size

  let colorHarmony =
    familias.length === 0        ? 5  :
    neutros === familias.length  ? 10 :
    neutros >= familias.length - 1 && vibrantes === 0 ? 9 :
    vibrantes >= 2               ? 3  :
    vibrantes === 1 && neutros >= 1 ? 8 :
    uniqueFam === 1              ? 7  :
    uniqueFam === 2              ? 6  : 5

  // ── 2. Warmth Match ──────────────────────────────────────
  const uniqueWarmths = new Set(warmths)
  const WARMTH_VAL    = { light: 1, medium: 2, heavy: 3 }
  let warmthMatch = 5

  if (warmths.length >= 2) {
    if (uniqueWarmths.size === 1) {
      warmthMatch = 10
    } else if (uniqueWarmths.size === 2) {
      const nums = [...uniqueWarmths].map((w) => WARMTH_VAL[w] ?? 2)
      const diff = Math.max(...nums) - Math.min(...nums)
      warmthMatch = diff === 1 ? 7 : 4
    } else {
      warmthMatch = 3
    }
  }
  if (outfit._outerwear) warmthMatch = Math.min(10, warmthMatch + 1)

  // ── 3. Formality Balance ─────────────────────────────────
  const allForms  = prendas.map(getFormalidades)
  const sharedForms = ['casual', 'smart', 'formal'].filter((f) =>
    allForms.length > 0 && allForms.every((forms) => forms.includes(f))
  )
  const formalityBalance =
    sharedForms.length === 3 ? 10 :
    sharedForms.length === 2 ? 8  :
    sharedForms.length === 1 ? 6  : 3

  // ── 4. Accessories ───────────────────────────────────────
  const accessoriesScore =
    _accessories.length === 0 ? 5 :
    _accessories.length === 1 ? 7 :
    _accessories.length === 2 ? 9 : 10

  // ── 5. Season Match ──────────────────────────────────────
  const seasonMatch =
    !seasons || seasons.length === 0 ? 4 :
    seasons.length === 1             ? 6 :
    seasons.length === 2             ? 8 : 10

  // ── 6. Occasion Fit ──────────────────────────────────────
  const occasionFit =
    sharedForms.length === 3 ? 10 :
    sharedForms.length === 2 ? 8  :
    sharedForms.length === 1 ? 6  : 4

  return {
    colorHarmony,
    warmthMatch,
    formalityBalance,
    accessories:      accessoriesScore,
    seasonMatch,
    occasionFit,
    overall:          score,
  }
}

// -----------------------------------------------------------
// WHY THIS WORKS — bullets generados por reglas
// -----------------------------------------------------------

/**
 * @param {Object} outfit
 * @returns {Array<{ icon: string, text: string }>}  max 5 bullets
 */
export function generarInsights(outfit) {
  const {
    _top, _bottom, _shoes, _outerwear,
    _accessories = [],
    seasons       = [],
    nivel_termico,
  } = outfit

  const prendas  = getPrendas(outfit)
  const familias = prendas.map((p) => p?.color_familia).filter(Boolean)
  const warmths  = prendas.map((p) => p?.warmth).filter(Boolean)
  const results  = []

  // ── COLOR ────────────────────────────────────────────────
  const neutros      = familias.filter((f) => f === 'neutro').length
  const vibrantes    = familias.filter((f) => f === 'vibrante').length
  const dominantes   = [...new Set(familias)]

  if (familias.length > 1) {
    if (neutros === familias.length) {
      results.push({ icon: '🎨', text: 'Paleta neutral atemporal — elegante y versátil' })
    } else if (neutros >= 2 && vibrantes === 0) {
      results.push({ icon: '🎨', text: 'Base neutral que unifica y equilibra el conjunto' })
    } else if (vibrantes === 1 && neutros >= 1) {
      results.push({ icon: '✨', text: 'El tono vibrante se ancla sobre una base neutra' })
    } else if (dominantes.length === 1) {
      const labels = {
        calido:   'Paleta cálida con coherencia cromática',
        frio:     'Paleta fría de gran armonía visual',
        vibrante: 'Tonos audaces que se complementan entre sí',
      }
      results.push({ icon: '🎨', text: labels[dominantes[0]] ?? 'Colores bien coordinados' })
    } else if (dominantes.includes('calido') && dominantes.includes('frio')) {
      results.push({ icon: '🎨', text: 'Contraste cálido-frío con personalidad propia' })
    }
  }

  // ── WARMTH ───────────────────────────────────────────────
  const uniqueWarmths = new Set(warmths)
  if (uniqueWarmths.size === 1 && warmths.length >= 2) {
    const w = [...uniqueWarmths][0]
    results.push({
      icon: w === 'light' ? '🌤️' : w === 'medium' ? '🍂' : '❄️',
      text: w === 'light'  ? 'Outfit ligero, perfecto para clima cálido' :
            w === 'medium' ? 'Nivel térmico consistente para días templados' :
                             'Conjunto abrigado, ideal para frío o invierno',
    })
  } else if (_outerwear) {
    results.push({ icon: '🧥', text: 'La capa exterior añade versatilidad frente al clima' })
  }

  // ── FORMALITY ────────────────────────────────────────────
  const allForms    = prendas.map(getFormalidades)
  const sharedForms = ['casual', 'smart', 'formal'].filter((f) =>
    allForms.length > 0 && allForms.every((forms) => forms.includes(f))
  )

  if (sharedForms.length === 3) {
    results.push({ icon: '🎯', text: 'Outfit universal — del trabajo al fin de semana' })
  } else if (sharedForms.includes('casual') && sharedForms.includes('smart')) {
    results.push({ icon: '💼', text: 'Equilibrio casual-smart — cómodo y con estilo' })
  } else if (sharedForms.includes('smart') && sharedForms.includes('formal')) {
    results.push({ icon: '✨', text: 'Look pulido para ocasiones de mayor formalidad' })
  } else if (sharedForms.length === 1) {
    const labels = {
      casual: 'Estilo casual auténtico y sin esfuerzo',
      smart:  'Smart look coherente de principio a fin',
      formal: 'Formalidad impecable y bien coordinada',
    }
    results.push({ icon: '👔', text: labels[sharedForms[0]] ?? 'Formalidad consistente' })
  }

  // ── ACCESSORIES ──────────────────────────────────────────
  if (_accessories.length > 0) {
    const subs = _accessories.map((a) => a.subcategoria)
    const msgs = {
      watch:   { icon: '⌚', text: 'El reloj eleva el nivel de sofisticación del look' },
      jewelry: { icon: '💍', text: 'La joyería añade personalidad sin recargar' },
      scarf:   { icon: '🧣', text: 'La bufanda complementa y protege el cuello' },
      glasses: { icon: '🕶️', text: 'Las gafas aportan un toque cool y moderno' },
      hat:     { icon: '🧢', text: 'El gorro corona el look con carácter propio' },
      bag:     { icon: '👜', text: 'El bolso completa la composición funcional' },
      gloves:  { icon: '🧤', text: 'Los guantes añaden detalle invernal' },
    }
    const first = subs.find((s) => msgs[s])
    if (first) {
      results.push(msgs[first])
    } else if (_accessories.length >= 2) {
      results.push({ icon: '✨', text: 'Los accesorios completan el outfit con detalle' })
    }
  }

  // ── SEASON ───────────────────────────────────────────────
  if (seasons.length >= 3) {
    results.push({ icon: '🌍', text: 'Outfit para todo el año — máxima versatilidad' })
  } else if (seasons.length === 2) {
    results.push({ icon: '🌍', text: 'Versátil para dos estaciones — gran aprovechamiento' })
  }

  return results.slice(0, 5)
}

// -----------------------------------------------------------
// RANGO DE TEMPERATURA
// -----------------------------------------------------------

/** @param {number|null} nivel_termico */
export function getRangoTemperatura(nivel_termico) {
  if (nivel_termico === null || nivel_termico === undefined) return null
  if (nivel_termico <= 15) return '28°C – 38°C'
  if (nivel_termico <= 30) return '22°C – 30°C'
  if (nivel_termico <= 45) return '15°C – 24°C'
  if (nivel_termico <= 60) return '8°C – 17°C'
  if (nivel_termico <= 75) return '2°C – 12°C'
  return '-5°C – 5°C'
}

// -----------------------------------------------------------
// TEMA VISUAL (para OutfitBackground)
// -----------------------------------------------------------

const THEMES = {
  neutro:           { from: '#f1f5f9', to: '#f8fafc', blob1: 'rgb(148,163,184)',  blob2: 'rgb(226,232,240)' },
  neutro_calido:    { from: '#fafaf9', to: '#fef3c7', blob1: 'rgb(253,186,116)',  blob2: 'rgb(214,211,209)' },
  neutro_frio:      { from: '#f1f5f9', to: '#eff6ff', blob1: 'rgb(147,197,253)',  blob2: 'rgb(203,213,225)' },
  neutro_vibrante:  { from: '#faf5ff', to: '#f1f5f9', blob1: 'rgb(216,180,254)',  blob2: 'rgb(203,213,225)' },
  calido:           { from: '#fff7ed', to: '#fffbeb', blob1: 'rgb(253,186,116)',  blob2: 'rgb(252,211,77)'  },
  frio:             { from: '#eff6ff', to: '#f0f9ff', blob1: 'rgb(147,197,253)',  blob2: 'rgb(165,180,252)' },
  vibrante:         { from: '#fdf4ff', to: '#fce7f3', blob1: 'rgb(240,171,252)',  blob2: 'rgb(249,168,212)' },
  mixed:            { from: '#f5f3ff', to: '#eff6ff', blob1: 'rgb(196,181,253)',  blob2: 'rgb(165,180,252)' },
}

/**
 * Detecta el tema visual dominante del outfit.
 * @param {Object} outfit
 * @returns {keyof THEMES}
 */
export function getDominantTheme(outfit) {
  const { _top, _bottom, _outerwear } = outfit
  const prendas  = [_top, _bottom, _outerwear].filter(Boolean)
  const familias = prendas.map((p) => p?.color_familia).filter(Boolean)

  if (familias.length === 0) return 'mixed'

  const counts = familias.reduce(
    (acc, f) => ({ ...acc, [f]: (acc[f] || 0) + 1 }),
    {}
  )
  const sorted   = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0][0]

  if (dominant === 'neutro' && sorted.length > 1) {
    const accent = sorted[1][0]
    const key    = `neutro_${accent}`
    return key in THEMES ? key : 'neutro'
  }

  return dominant in THEMES ? dominant : 'mixed'
}

/**
 * Devuelve el objeto de tema para un clave dada.
 * @param {string} themeKey
 */
export function getThemeColors(themeKey) {
  return THEMES[themeKey] ?? THEMES.mixed
}