// lib/outfitEngine.js
// ============================================================
// MOTOR DE OUTFITS — Virtual Wardrobe
// Versión 2.0 — Multi-Formality + Universales
// ============================================================

// -----------------------------------------------------------
// CONSTANTES DE FAMILIAS DE COLOR
// -----------------------------------------------------------
export const COLOR_FAMILIES = {
  neutro:   ['blanco', 'negro', 'gris'],
  calido:   ['rojo', 'naranja', 'amarillo', 'coral', 'terracota', 'burdeos', 'mostaza', 'teja', 'salmón', 'beige', 'crema', 'marino', 'camel', 'marfil', 'arena'],
  frio:     ['azul', 'verde', 'morado', 'lila', 'celeste', 'turquesa', 'menta', 'aguamarina', 'índigo', 'violeta', 'verde claro'],
  vibrante: ['rosa', 'fucsia', 'lima', 'magenta', 'neón', 'dorado', 'plateado', 'cobre'],
}

export const COLOR_TO_FAMILY = Object.entries(COLOR_FAMILIES).reduce(
  (acc, [familia, colores]) => {
    colores.forEach((color) => { acc[color] = familia })
    return acc
  },
  {}
)

// -----------------------------------------------------------
// FORMALIDADES VÁLIDAS
// -----------------------------------------------------------
export const FORMALIDADES_VALIDAS = ['casual', 'smart', 'formal']

// -----------------------------------------------------------
// ACCESORIOS — Subcategorías y reglas de scoring
// -----------------------------------------------------------
export const ACCESSORY_SUBCATEGORIES = [
  { value: 'hat',     label: '🧢 Gorro / Sombrero', climatic: true  },
  { value: 'scarf',   label: '🧣 Bufanda',           climatic: true  },
  { value: 'jewelry', label: '💍 Joyería',            climatic: false },
  { value: 'watch',   label: '⌚ Reloj',              climatic: false },
  { value: 'bag',     label: '👜 Bolso / Mochila',   climatic: false },
  { value: 'glasses', label: '🕶️ Gafas',              climatic: false },
  { value: 'gloves',  label: '🧤 Guantes',            climatic: true  },
]

/**
 * Bonus base que aporta cada subcategoría al outfit.
 * Reflect how much the accessory "completes" a look.
 */
const ACCESSORY_BASE_BONUS = {
  hat:     4,
  scarf:   5,
  jewelry: 6,
  watch:   7,   // watch = más formal → más bonus en smart/formal
  bag:     4,
  glasses: 3,
  gloves:  4,
}

/**
 * Multiplicador de formalidad por subcategoría.
 * Cuánto EXTRA aporta cuando el outfit tiene esa formalidad.
 */
const ACCESSORY_FORMALITY_MULTIPLIER = {
  //                casual  smart   formal
  hat:     { casual: 1.2, smart: 0.8, formal: 0.5 },
  scarf:   { casual: 1.0, smart: 1.2, formal: 0.9 },
  jewelry: { casual: 0.8, smart: 1.3, formal: 1.5 },
  watch:   { casual: 0.9, smart: 1.4, formal: 1.4 },
  bag:     { casual: 1.1, smart: 1.1, formal: 1.0 },
  glasses: { casual: 1.2, smart: 1.0, formal: 0.7 },
  gloves:  { casual: 0.8, smart: 1.0, formal: 1.2 },
}
/**
 * Normaliza formalidades de una prenda.
 * Acepta tanto el campo nuevo (array) como el campo viejo (string).
 * Garantiza retrocompatibilidad total.
 *
 * @param {Object} prenda
 * @returns {string[]} array de formalidades
 */
export function getFormalidades(prenda) {
  // Campo nuevo: array de formalidades
  if (Array.isArray(prenda.formalidades) && prenda.formalidades.length > 0) {
    return prenda.formalidades
  }
  // Campo viejo: string singular (backward compat)
  if (prenda.formalidad && typeof prenda.formalidad === 'string') {
    return [prenda.formalidad]
  }
  // Fallback seguro
  return ['casual']
}

/**
 * Determina si una prenda es "universal":
 * tiene las tres formalidades → compatible con todo.
 *
 * @param {Object} prenda
 * @returns {boolean}
 */
export function esUniversal(prenda) {
  const formalidades = getFormalidades(prenda)
  return FORMALIDADES_VALIDAS.every((f) => formalidades.includes(f))
}

/**
 * Comprueba si DOS prendas son compatibles por formalidad.
 * Deben compartir AL MENOS una formalidad.
 *
 * Ejemplos:
 *   casual,smart  + smart,formal → compatible (comparten "smart")
 *   casual        + formal       → incompatible
 *   casual,smart,formal + formal → compatible (universal)
 *
 * @param {Object} prendasA
 * @param {Object} prendasB
 * @returns {boolean}
 */
export function formalidadCompatible(prendasA, prendasB) {
  const fa = getFormalidades(prendasA)
  const fb = getFormalidades(prendasB)
  return fa.some((f) => fb.includes(f))
}

/**
 * Obtiene las formalidades EN COMÚN entre un array de prendas.
 * Se usa para etiquetar el outfit resultante.
 *
 * @param {Object[]} prendas
 * @returns {string[]}
 */
export function formalidadesEnComun(prendas) {
  if (!prendas || prendas.length === 0) return []

  return FORMALIDADES_VALIDAS.filter((f) =>
    prendas.every((p) => getFormalidades(p).includes(f))
  )
}

// -----------------------------------------------------------
// SISTEMA TÉRMICO — Constantes
// -----------------------------------------------------------

/** Valor numérico de cada nivel de abrigo */
const WARMTH_VALUE = { light: 1, medium: 2, heavy: 3 }

/**
 * Peso de cada categoría en el cálculo térmico del outfit.
 * outerwear tiene el mayor impacto (es la capa exterior).
 */
const WARMTH_CATEGORY_WEIGHTS = {
  top:       1.0,
  bottom:    0.8,
  shoes:     0.3,
  outerwear: 2.0,
}

/**
 * Peso térmico de accesorios climáticos.
 * Otros accesorios (jewelry, watch, bag…) no aportan calor.
 */
const WARMTH_ACCESSORY_WEIGHTS = {
  scarf:  0.6,
  hat:    0.4,
  gloves: 0.5,
}

/**
 * Configuración de estaciones: rango de nivel_termico y metadata UI.
 * Los rangos se solapan deliberadamente para que un outfit
 * pueda pertenecer a varias estaciones (ej: primavera y otoño).
 *
 * nivel_termico: 0 (ligero) → 100 (muy abrigado)
 */
export const SEASON_CONFIG = {
  summer: { emoji: '☀️', label: 'Verano',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', min: 0,  max: 35 },
  spring: { emoji: '🌸', label: 'Primavera', color: 'bg-green-100  text-green-700  border-green-200',  min: 20, max: 60 },
  autumn: { emoji: '🍂', label: 'Otoño',     color: 'bg-orange-100 text-orange-700 border-orange-200', min: 45, max: 80 },
  winter: { emoji: '❄️', label: 'Invierno',  color: 'bg-blue-100   text-blue-700   border-blue-200',   min: 65, max: 100 },
}

/** Config visual de warmth para prendas individuales */
export const WARMTH_CONFIG = {
  light:  { emoji: '🌤️', label: 'Ligero',   color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  medium: { emoji: '🍂', label: 'Medio',    color: 'bg-orange-50 text-orange-600 border-orange-200' },
  heavy:  { emoji: '❄️', label: 'Abrigado', color: 'bg-blue-50   text-blue-600   border-blue-200'   },
}

// -----------------------------------------------------------
// SISTEMA TÉRMICO — Funciones
// -----------------------------------------------------------

/**
 * Calcula el nivel térmico de un outfit (0-100).
 *
 * Algoritmo:
 *  1. Asignar valor numérico a cada prenda (light=1, medium=2, heavy=3)
 *     Si warmth es null → se usa 1.5 (valor intermedio conservador)
 *  2. Ponderar por el peso de la categoría
 *  3. Normalizar la media ponderada al rango 0-100
 *
 * @returns {number} nivel_termico 0-100
 */
export function calcularNivelTermico(
  top,
  bottom,
  shoes,
  outerwear    = null,
  accessories  = []
) {
  const slots = [
    top       && { prenda: top,       weight: WARMTH_CATEGORY_WEIGHTS.top       },
    bottom    && { prenda: bottom,    weight: WARMTH_CATEGORY_WEIGHTS.bottom    },
    shoes     && { prenda: shoes,     weight: WARMTH_CATEGORY_WEIGHTS.shoes     },
    outerwear && { prenda: outerwear, weight: WARMTH_CATEGORY_WEIGHTS.outerwear },
  ].filter(Boolean)

  let totalWeightedWarmth = 0
  let totalWeight         = 0

  slots.forEach(({ prenda, weight }) => {
    const val = prenda.warmth ? (WARMTH_VALUE[prenda.warmth] ?? 1.5) : 1.5
    totalWeightedWarmth += val * weight
    totalWeight         += weight
  })

  // Accesorios térmicos (scarf, hat, gloves)
  accessories.forEach((acc) => {
    const accWeight = WARMTH_ACCESSORY_WEIGHTS[acc.subcategoria] ?? 0
    if (accWeight === 0) return
    const val = acc.warmth ? (WARMTH_VALUE[acc.warmth] ?? 1.5) : 1.5
    totalWeightedWarmth += val * accWeight
    totalWeight         += accWeight
  })

  if (totalWeight === 0) return 50 // sin datos → valor neutro

  // avg en rango [1,3] → normalizar a [0,100]
  const avg = totalWeightedWarmth / totalWeight
  return Math.max(0, Math.min(100, Math.round(((avg - 1) / 2) * 100)))
}

/**
 * Detecta las estaciones para las que es apto un outfit
 * dado su nivel térmico.
 *
 * Usa rangos solapados (ver SEASON_CONFIG):
 *   0-35   → summer
 *   20-60  → spring
 *   45-80  → autumn
 *   65-100 → winter
 *
 * @param {number} nivelTermico
 * @returns {string[]}  ej: ['spring', 'autumn']
 */
export function detectarEstaciones(nivelTermico) {
  const seasons = Object.entries(SEASON_CONFIG)
    .filter(([, cfg]) => nivelTermico >= cfg.min && nivelTermico <= cfg.max)
    .map(([key]) => key)

  // Si no cae en ningún rango (edge case) → primavera por defecto
  return seasons.length > 0 ? seasons : ['spring']
}

/**
 * Calcula nivel térmico Y estaciones en una sola llamada.
 * Función principal para uso externo.
 *
 * @returns {{ nivel_termico: number, seasons: string[] }}
 */
export function calcularDatosTermicos(
  top,
  bottom,
  shoes,
  outerwear    = null,
  accessories  = []
) {
  const nivel_termico = calcularNivelTermico(top, bottom, shoes, outerwear, accessories)
  const seasons       = detectarEstaciones(nivel_termico)
  return { nivel_termico, seasons }
}

/**
 * Convierte nivel_termico (0-100) en una etiqueta descriptiva.
 * @returns {string}
 */
export function labelNivelTermico(nivel) {
  if (nivel === null || nivel === undefined) return 'Sin datos'
  if (nivel <= 20)  return 'Muy ligero'
  if (nivel <= 40)  return 'Ligero'
  if (nivel <= 55)  return 'Templado'
  if (nivel <= 70)  return 'Abrigado'
  if (nivel <= 85)  return 'Muy abrigado'
  return 'Invernal'
}

// -----------------------------------------------------------
// SCORE DE COMPATIBILIDAD DE COLOR
// -----------------------------------------------------------
function scorePareja(familiaA, familiaB) {
  if (!familiaA || !familiaB) return 0
  if (familiaA === 'neutro' && familiaB === 'neutro')   return 40
  if (familiaA === 'neutro' || familiaB === 'neutro')   return 30
  if (familiaA === familiaB)                             return 20
  if (
    (familiaA === 'calido' && familiaB === 'frio') ||
    (familiaA === 'frio'   && familiaB === 'calido')
  ) return 10
  return 5
}

/**
 * Calcula el score de compatibilidad de un outfit (0-100).
 * Devuelve 0 si el outfit es inválido (formalidad incompatible).
 *
 * @param {Object}      top
 * @param {Object}      bottom
 * @param {Object}      shoes
 * @param {Object|null} outerwear
 * @param {Object[]}    accessories  - array de accesorios (para Fase 2)
 * @returns {number}
 */
export function calcularScoreOutfit(
  top,
  bottom,
  shoes,
  outerwear    = null,
  accessories  = []
) {
  const prendas = [top, bottom, shoes, outerwear, ...accessories].filter(Boolean)

  // ── Validación de formalidad: todas las prendas deben
  //    compartir AL MENOS una formalidad en común ───────────
  const prendasObligatorias = [top, bottom, shoes]
  if (outerwear) prendasObligatorias.push(outerwear)

  // Verificar compatibilidad par a par entre prendas obligatorias
  for (let i = 0; i < prendasObligatorias.length; i++) {
    for (let j = i + 1; j < prendasObligatorias.length; j++) {
      if (!formalidadCompatible(prendasObligatorias[i], prendasObligatorias[j])) {
        return 0 // outfit inválido
      }
    }
  }

  let score = 50 // base

  // ── Score por color ──────────────────────────────────────
  score += scorePareja(top.color_familia, bottom.color_familia)    * 1.5
  score += scorePareja(bottom.color_familia, shoes.color_familia)
  score += scorePareja(top.color_familia, shoes.color_familia)     * 0.8

  if (outerwear) {
    score += scorePareja(outerwear.color_familia, top.color_familia)    * 0.7
    score += scorePareja(outerwear.color_familia, bottom.color_familia) * 0.5
  }

  // ── Penalizaciones de color ──────────────────────────────
  const familias    = prendas.map((p) => p.color_familia)
  const vibrantes   = familias.filter((f) => f === 'vibrante').length
  const coloresUniq = new Set(prendas.map((p) => p.color)).size

  if (vibrantes > 2)   score -= 30
  else if (vibrantes === 2) score -= 10
  if (coloresUniq > 3) score -= 20

  // ── Bonus monocromático (todo neutro) ────────────────────
  if (familias.every((f) => f === 'neutro')) score += 15

  // ── Bonus por prendas universales ────────────────────────
  prendas.forEach((p) => { if (esUniversal(p)) score += 3 })

  // ── Bonus por accesorios (preview Fase 2) ────────────────
    // ── Bonus por accesorios ─────────────────────────────────
  if (accessories.length > 0) {
    // Formalidades que comparte el outfit principal
    const outfitFormalidades = formalidadesEnComun([top, bottom, shoes, outerwear].filter(Boolean))

    accessories.forEach((acc) => {
      // 1. El accesorio debe ser compatible en formalidad
      const accForms = getFormalidades(acc)
      const formMatch = outfitFormalidades.length === 0
        || outfitFormalidades.some((f) => accForms.includes(f))

      if (!formMatch) return // skip accesorio incompatible

      const sub = acc.subcategoria || 'bag'
      const baseBonus = ACCESSORY_BASE_BONUS[sub] || 3

      // 2. Multiplicador por formalidad dominante del outfit
      const formalidadDominante = outfitFormalidades[0] || 'casual'
      const multiplier = ACCESSORY_FORMALITY_MULTIPLIER[sub]?.[formalidadDominante] ?? 1.0

      // 3. Bonus de color (accesorio neutro combina con todo)
      const colorBonus = acc.color_familia === 'neutro'
        ? 3
        : scorePareja(acc.color_familia, top.color_familia) * 0.2

      score += (baseBonus * multiplier) + colorBonus
    })

    // Cap: máximo +20 puntos por accesorios en total
    // (implementado implícitamente por el Math.min al final)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// -----------------------------------------------------------
// GENERADOR PRINCIPAL DE OUTFITS
// -----------------------------------------------------------
/**
 * Genera todos los outfits válidos para un conjunto de prendas.
 *
 * @param {Object[]} prendas   - todas las prendas del usuario
 * @param {Object}   options
 * @param {number}   options.maxOutfits   - límite de outfits (default 50)
 * @param {number}   options.minScore     - score mínimo para incluir (default 40)
 * @returns {Object[]} outfits ordenados por score descendente
 */
export function generarOutfits(prendas, options = {}) {
  const { maxOutfits = 50, minScore = 40 } = options

  if (!prendas || prendas.length === 0) return []

  // Separar por categoría
   // Separar por categoría
  const tops        = prendas.filter((p) => p.categoria === 'top')
  const bottoms     = prendas.filter((p) => p.categoria === 'bottom')
  const shoes       = prendas.filter((p) => p.categoria === 'shoes')
  const outerwears  = prendas.filter((p) => p.categoria === 'outerwear')
  const accessories = prendas.filter((p) => p.categoria === 'accessory')

  if (!tops.length || !bottoms.length || !shoes.length) return []

  const outfitsGenerados = []

  for (const top of tops) {
    for (const bottom of bottoms) {

      // ── Pre-check: top + bottom compatibles ──────────────
      if (!formalidadCompatible(top, bottom)) continue

      for (const shoe of shoes) {

        // ── Pre-check: shoes compatible con el par ─────────
        if (!formalidadCompatible(top, shoe))    continue
        if (!formalidadCompatible(bottom, shoe)) continue

        // ── Outfit base (sin outerwear) ────────────────────
        const scoreBase = calcularScoreOutfit(top, bottom, shoe)
        if (scoreBase >= minScore) {
          outfitsGenerados.push({
            // IDs para persistir en BD
            top_id:          top.id,
            bottom_id:       bottom.id,
            shoes_id:        shoe.id,
            outerwear_id:    null,
            score:           scoreBase,
            // Referencias para la UI (no se guardan en BD)
            _top:            top,
            _bottom:         bottom,
            _shoes:          shoe,
            _outerwear:      null,
            // Metadata
            formalidades_outfit: formalidadesEnComun([top, bottom, shoe]),
            source:          'generated',
          })
        }

        // ── Outfit con outerwear ───────────────────────────
        for (const outer of outerwears) {
          if (!formalidadCompatible(top, outer))    continue
          if (!formalidadCompatible(bottom, outer)) continue
          if (!formalidadCompatible(shoe, outer))   continue

          const scoreOuter = calcularScoreOutfit(top, bottom, shoe, outer)
          if (scoreOuter >= minScore) {
            outfitsGenerados.push({
              top_id:          top.id,
              bottom_id:       bottom.id,
              shoes_id:        shoe.id,
              outerwear_id:    outer.id,
              score:           scoreOuter,
              _top:            top,
              _bottom:         bottom,
              _shoes:          shoe,
              _outerwear:      outer,
              formalidades_outfit: formalidadesEnComun([top, bottom, shoe, outer]),
              source:          'generated',
            })
          }
        }
      }
    }
  }

  // ── Enriquecer cada outfit con el mejor accesorio opcional ──
  // Lógica: probamos cada accesorio en cada outfit.
  // Si mejora el score en ≥3 puntos, lo adjuntamos como sugerencia.
  // Máximo 1 accesorio por outfit en generación automática
  // (en Fase 5 el usuario puede añadir más manualmente).
  if (accessories.length > 0) {
    outfitsGenerados.forEach((outfit) => {
      let bestAcc       = null
      let bestScore     = outfit.score

      for (const acc of accessories) {
        const scoreConAcc = calcularScoreOutfit(
          outfit._top,
          outfit._bottom,
          outfit._shoes,
          outfit._outerwear,
          [acc]
        )
        if (scoreConAcc > bestScore + 2) {
          bestScore = scoreConAcc
          bestAcc   = acc
        }
      }

      if (bestAcc) {
        outfit.score          = bestScore
        outfit._accessories   = [bestAcc]
        outfit.accessory_ids  = [bestAcc.id]
      } else {
        outfit._accessories  = []
        outfit.accessory_ids = []
      }
    })
  } else {
    // Sin accesorios: inicializar vacío para consistencia
    outfitsGenerados.forEach((o) => {
      o._accessories  = []
      o.accessory_ids = []
    })
  }

// ── Calcular datos térmicos para cada outfit generado ────
  // Se hace aquí para que el filtro de estaciones en la UI
  // funcione incluso antes de guardar el outfit en la BD.
  outfitsGenerados.forEach((outfit) => {
    const { nivel_termico, seasons } = calcularDatosTermicos(
      outfit._top,
      outfit._bottom,
      outfit._shoes,
      outfit._outerwear,
      outfit._accessories || []
    )
    outfit.nivel_termico = nivel_termico
    outfit.seasons       = seasons
  })

  return outfitsGenerados
    .sort((a, b) => b.score - a.score)
    .slice(0, maxOutfits)
}
// -----------------------------------------------------------
// DETECCIÓN AUTOMÁTICA DE FAMILIA DE COLOR
// -----------------------------------------------------------
/**
 * Detecta la familia de color a partir del nombre.
 * @param {string} colorNombre
 * @returns {'neutro'|'calido'|'frio'|'vibrante'}
 */
export function detectarFamiliaColor(colorNombre) {
  const normalizado = colorNombre.toLowerCase().trim()
  for (const [familia, colores] of Object.entries(COLOR_FAMILIES)) {
    if (colores.some((c) => normalizado.includes(c))) return familia
  }
  return 'neutro'
}