// lib/outfitEngine.js

/**
 * ============================================================
 * MOTOR DE GENERACIÓN DE OUTFITS — Virtual Wardrobe
 * ============================================================
 * Reglas implementadas:
 *  1. Un outfit DEBE tener: top + bottom + shoes (obligatorio)
 *  2. outerwear es opcional
 *  3. Todas las prendas del outfit deben compartir la misma formalidad
 *  4. Reglas de color:
 *     - Neutros combinan con CUALQUIER color (score +30)
 *     - Dos neutros combinan muy bien (score +40)
 *     - Neutro + vibrante: combinación clásica (score +25)
 *     - Calido + calido: combinación armónica (score +20)
 *     - Frio + frio: combinación armónica (score +20)
 *     - Calido + frio: combinación de contraste (score +10)
 *     - Más de 2 prendas vibrantes: penalización (-30)
 *     - Más de 3 colores distintos: penalización (-20)
 * ============================================================
 */

// -----------------------------------------------------------
// CONSTANTES DE FAMILIAS DE COLOR
// -----------------------------------------------------------
export const COLOR_FAMILIES = {
  neutro:   ['blanco', 'negro', 'gris', 'beige', 'crema', 'marino', 'camel'],
  calido:   ['rojo', 'naranja', 'amarillo', 'coral', 'terracota', 'burdeos', 'mostaza'],
  frio:     ['azul', 'verde', 'morado', 'lila', 'celeste', 'turquesa', 'menta'],
  vibrante: ['rosa', 'fucsia', 'lima', 'magenta', 'neón', 'dorado', 'plateado'],
}

// Mapeo rápido color → familia
export const COLOR_TO_FAMILY = Object.entries(COLOR_FAMILIES).reduce(
  (acc, [familia, colores]) => {
    colores.forEach((color) => { acc[color] = familia })
    return acc
  },
  {}
)

// -----------------------------------------------------------
// FUNCIÓN: calcular score de compatibilidad entre dos familias
// -----------------------------------------------------------
function scorePareja(familiaA, familiaB) {
  if (!familiaA || !familiaB) return 0

  // Ambos neutros → perfecta combinación
  if (familiaA === 'neutro' && familiaB === 'neutro') return 40

  // Uno es neutro → siempre funciona
  if (familiaA === 'neutro' || familiaB === 'neutro') return 30

  // Neutro + vibrante (ya cubierto arriba, pero por si acaso)
  if (
    (familiaA === 'neutro' && familiaB === 'vibrante') ||
    (familiaA === 'vibrante' && familiaB === 'neutro')
  ) return 25

  // Mismo grupo calido/frio → armonía análoga
  if (familiaA === familiaB) return 20

  // Calido + frio → contraste interesante
  if (
    (familiaA === 'calido' && familiaB === 'frio') ||
    (familiaA === 'frio' && familiaB === 'calido')
  ) return 10

  // Cualquier cosa con vibrante sin neutro → arriesgado
  return 5
}

// -----------------------------------------------------------
// FUNCIÓN: calcular score total de un outfit
// -----------------------------------------------------------
export function calcularScoreOutfit(top, bottom, shoes, outerwear = null) {
  const prendas = [top, bottom, shoes, outerwear].filter(Boolean)

  let score = 50 // base

  // ── Regla de formalidad: todas deben coincidir ──────────
  const formalidades = [...new Set(prendas.map((p) => p.formalidad))]
  if (formalidades.length > 1) return 0 // outfit inválido

  // ── Score por parejas de color ───────────────────────────
  const familias = prendas.map((p) => p.color_familia)

  // Comparar top-bottom (más importante)
  score += scorePareja(top.color_familia, bottom.color_familia) * 1.5

  // Comparar bottom-shoes
  score += scorePareja(bottom.color_familia, shoes.color_familia)

  // Comparar top-shoes
  score += scorePareja(top.color_familia, shoes.color_familia) * 0.8

  // Si hay outerwear, compararlo con el resto
  if (outerwear) {
    score += scorePareja(outerwear.color_familia, top.color_familia) * 0.7
    score += scorePareja(outerwear.color_familia, bottom.color_familia) * 0.5
  }

  // ── Penalización: más de 2 prendas vibrantes ─────────────
  const vibrantes = familias.filter((f) => f === 'vibrante').length
  if (vibrantes > 2) score -= 30
  else if (vibrantes === 2) score -= 10

  // ── Penalización: más de 3 colores distintos ─────────────
  const coloresUnicos = new Set(prendas.map((p) => p.color)).size
  if (coloresUnicos > 3) score -= 20

  // ── Bonus: outfit monocromático (todos neutros) ───────────
  if (familias.every((f) => f === 'neutro')) score += 15

  return Math.max(0, Math.min(100, Math.round(score)))
}

// -----------------------------------------------------------
// FUNCIÓN PRINCIPAL: generar todos los outfits posibles
// -----------------------------------------------------------
/**
 * @param {Array} prendas - Array de prendas del usuario desde Supabase
 * @returns {Array} outfits ordenados por score descendente
 */
export function generarOutfits(prendas) {
  if (!prendas || prendas.length === 0) return []

  // Separar por categoría
  const tops      = prendas.filter((p) => p.categoria === 'top')
  const bottoms   = prendas.filter((p) => p.categoria === 'bottom')
  const shoes     = prendas.filter((p) => p.categoria === 'shoes')
  const outerwear = prendas.filter((p) => p.categoria === 'outerwear')

  // Necesitamos al menos 1 de cada categoría obligatoria
  if (!tops.length || !bottoms.length || !shoes.length) return []

  const outfitsGenerados = []

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {

        // ── Outfit base: sin outerwear ──────────────────────
        const scoreBase = calcularScoreOutfit(top, bottom, shoe)
        if (scoreBase > 0) {
          outfitsGenerados.push({
            top_id:       top.id,
            bottom_id:    bottom.id,
            shoes_id:     shoe.id,
            outerwear_id: null,
            score:        scoreBase,
            // Referencias completas para la UI (no se guardan en DB)
            _top:         top,
            _bottom:      bottom,
            _shoes:       shoe,
            _outerwear:   null,
          })
        }

        // ── Outfit con outerwear ────────────────────────────
        for (const outer of outerwear) {
          const scoreConOuter = calcularScoreOutfit(top, bottom, shoe, outer)
          if (scoreConOuter > 0) {
            outfitsGenerados.push({
              top_id:       top.id,
              bottom_id:    bottom.id,
              shoes_id:     shoe.id,
              outerwear_id: outer.id,
              score:        scoreConOuter,
              _top:         top,
              _bottom:      bottom,
              _shoes:       shoe,
              _outerwear:   outer,
            })
          }
        }
      }
    }
  }

  // Ordenar por score descendente y eliminar duplicados de baja calidad
  return outfitsGenerados
    .sort((a, b) => b.score - a.score)
    .filter((outfit) => outfit.score >= 40) // filtrar outfits pobres
    .slice(0, 50) // máximo 50 sugerencias para no saturar la UI
}

// -----------------------------------------------------------
// FUNCIÓN: determinar familia de color a partir del nombre
// -----------------------------------------------------------
export function detectarFamiliaColor(colorNombre) {
  const normalizado = colorNombre.toLowerCase().trim()

  for (const [familia, colores] of Object.entries(COLOR_FAMILIES)) {
    if (colores.some((c) => normalizado.includes(c))) {
      return familia
    }
  }

  // Si no reconoce el color, lo clasifica como neutro por defecto
  return 'neutro'
}