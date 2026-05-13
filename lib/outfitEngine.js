// lib/outfitEngine.js
// ============================================================
// MOTOR DE OUTFITS — Virtual Wardrobe
// Versión 2.0 — Multi-Formality + Universales
// ============================================================

// -----------------------------------------------------------
// CONSTANTES DE FAMILIAS DE COLOR
// -----------------------------------------------------------
export const COLOR_FAMILIES = {
  neutro:   ['blanco', 'negro', 'gris', 'beige', 'crema', 'marino', 'camel', 'marfil', 'arena'],
  calido:   ['rojo', 'naranja', 'amarillo', 'coral', 'terracota', 'burdeos', 'mostaza', 'teja', 'salmón'],
  frio:     ['azul', 'verde', 'morado', 'lila', 'celeste', 'turquesa', 'menta', 'aguamarina', 'índigo'],
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
  if (accessories.length > 0) score += Math.min(accessories.length * 5, 15)

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
  const tops       = prendas.filter((p) => p.categoria === 'top')
  const bottoms    = prendas.filter((p) => p.categoria === 'bottom')
  const shoes      = prendas.filter((p) => p.categoria === 'shoes')
  const outerwears = prendas.filter((p) => p.categoria === 'outerwear')
  // Accesorios: ignorados en generación automática hasta Fase 2

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