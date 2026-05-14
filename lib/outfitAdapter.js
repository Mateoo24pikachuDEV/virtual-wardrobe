// lib/outfitAdapter.js
// ============================================================
// Adaptador centralizado para normalizar filas de outfits
// desde el formato de BD al formato que usa la UI.
//
// Soporta AMBOS formatos:
//   - Nuevo (Fase 8+): outfit_items join
//   - Antiguo (Fases 1-7): top:top_id, outfit_accessories, etc.
//
// REGLA: siempre produce { _top, _bottom, _shoes, _outerwear,
//         _accessories, accessory_ids } independientemente del origen.
// ============================================================

/**
 * Campos de prenda que se incluyen en todos los JOINs.
 * Fuente única: cambiar aquí afecta a todos los hooks.
 */
export const PRENDA_FIELDS = [
  'id', 'nombre', 'categoria', 'subcategoria',
  'color', 'color_familia', 'formalidad', 'formalidades',
  'imagen_url', 'warmth', 'storage_path',
].join(', ')

/**
 * Fragmento SELECT para outfit_items con join a prenda.
 * Incluye fallback de outfit_accessories para retrocompatibilidad.
 */
export const OUTFIT_SELECT_FRAGMENT = `
  outfit_items (
    id, slot, position,
    prenda:prenda_id ( ${PRENDA_FIELDS} )
  ),
  outfit_accessories (
    prenda:prenda_id ( ${PRENDA_FIELDS} )
  ),
  top:top_id            ( ${PRENDA_FIELDS} ),
  bottom:bottom_id      ( ${PRENDA_FIELDS} ),
  shoes:shoes_id        ( ${PRENDA_FIELDS} ),
  outerwear:outerwear_id( ${PRENDA_FIELDS} )
`.trim()

// -----------------------------------------------------------
// NORMALIZACIÓN
// -----------------------------------------------------------

/**
 * Normaliza una fila de la tabla `outfits` al objeto UI estándar.
 *
 * Prioridad:
 *  1. outfit_items (nuevo — Fase 8)
 *  2. outfit_accessories + columnas top_id/etc. (antiguo — Fases 1-7)
 *
 * @param {Object} row  - fila de Supabase con los joins correspondientes
 * @returns {Object}    - misma fila + _top, _bottom, _shoes, _outerwear, _accessories
 */
export function normalizarOutfit(row) {
  const items = row.outfit_items || []

  // ── Nuevo formato: outfit_items ──────────────────────────
  if (items.length > 0) {
    const bySlot = (slot) =>
      items
        .filter((i) => i.slot === slot)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((i) => i.prenda)
        .filter(Boolean)

    const accessories = bySlot('accessory')

    return {
      ...row,
      _top:         bySlot('top')[0]       ?? null,
      _bottom:      bySlot('bottom')[0]    ?? null,
      _shoes:       bySlot('shoes')[0]     ?? null,
      _outerwear:   bySlot('outerwear')[0] ?? null,
      _accessories: accessories,
      accessory_ids: accessories.map((a) => a.id),
      _source_format: 'outfit_items',  // metadata para debugging
    }
  }

  // ── Formato antiguo: columnas directas + outfit_accessories ─
  const legacyAccessories = (row.outfit_accessories || [])
    .map((oa) => oa.prenda)
    .filter(Boolean)

  return {
    ...row,
    _top:         row.top       ?? null,
    _bottom:      row.bottom    ?? null,
    _shoes:       row.shoes     ?? null,
    _outerwear:   row.outerwear ?? null,
    _accessories: legacyAccessories,
    accessory_ids: legacyAccessories.map((a) => a.id),
    _source_format: 'legacy',  // metadata para debugging
  }
}

// -----------------------------------------------------------
// CONSTRUCCIÓN
// -----------------------------------------------------------

/**
 * Construye el array de filas para INSERT en outfit_items
 * a partir de los objetos de prenda del outfit.
 *
 * @param {string} outfitId
 * @param {Object} prendas
 * @param {Object}   prendas.top
 * @param {Object}   prendas.bottom
 * @param {Object}   prendas.shoes
 * @param {Object}   [prendas.outerwear]
 * @param {Object[]} [prendas.accessories]
 * @returns {Object[]}  filas listas para supabase.from('outfit_items').insert(...)
 */
export function buildOutfitItems(outfitId, {
  top,
  bottom,
  shoes,
  outerwear    = null,
  accessories  = [],
}) {
  const rows = []

  if (top)       rows.push({ outfit_id: outfitId, prenda_id: top.id,       slot: 'top',       position: 0 })
  if (bottom)    rows.push({ outfit_id: outfitId, prenda_id: bottom.id,    slot: 'bottom',    position: 0 })
  if (shoes)     rows.push({ outfit_id: outfitId, prenda_id: shoes.id,     slot: 'shoes',     position: 0 })
  if (outerwear) rows.push({ outfit_id: outfitId, prenda_id: outerwear.id, slot: 'outerwear', position: 0 })

  accessories.forEach((acc, idx) => {
    rows.push({ outfit_id: outfitId, prenda_id: acc.id, slot: 'accessory', position: idx })
  })

  return rows
}

// -----------------------------------------------------------
// VERIFICACIÓN (solo para uso en desarrollo / admin)
// -----------------------------------------------------------

/**
 * Comprueba si un outfit tiene sus outfit_items migrados.
 * Útil para detectar outfits que necesitan re-migración.
 *
 * @param {Object} row  - fila normalizada (con _source_format)
 * @returns {boolean}
 */
export function esMigrado(row) {
  return row._source_format === 'outfit_items'
}