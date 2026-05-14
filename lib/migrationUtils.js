// lib/migrationUtils.js
// ============================================================
// Utilidades para verificar y reparar la migración a outfit_items.
// USO: solo en desarrollo, consola del navegador o script de admin.
// ============================================================

import supabase from '@/lib/supabase'
import { buildOutfitItems } from '@/lib/outfitAdapter'

/**
 * Verifica qué outfits del usuario tienen outfit_items
 * y cuáles necesitan re-migración.
 *
 * USO en consola del navegador:
 *   import { verificarMigracion } from '@/lib/migrationUtils'
 *   await verificarMigracion()
 */
export async function verificarMigracion() {
  const { data: outfits } = await supabase
    .from('outfits')
    .select(`
      id, source, score,
      top_id, bottom_id, shoes_id, outerwear_id,
      outfit_items ( id )
    `)

  if (!outfits) { console.error('No se pudieron cargar outfits'); return }

  const sinMigrar = outfits.filter((o) => o.outfit_items.length === 0)
  const migrados  = outfits.filter((o) => o.outfit_items.length > 0)

  console.group('📊 Estado de migración outfit_items')
  console.log(`✅ Migrados:     ${migrados.length}`)
  console.log(`⚠️  Sin migrar:  ${sinMigrar.length}`)
  console.log(`📦 Total:       ${outfits.length}`)

  if (sinMigrar.length > 0) {
    console.warn('Outfits que necesitan re-migración:', sinMigrar.map((o) => o.id))
  }
  console.groupEnd()

  return { migrados: migrados.length, sinMigrar: sinMigrar.length, ids: sinMigrar.map((o) => o.id) }
}

/**
 * Re-migra outfits huérfanos (sin outfit_items) usando las columnas antiguas.
 * Seguro ejecutar múltiples veces (idempotente).
 *
 * USO en consola del navegador:
 *   import { remigrarHuerfanos } from '@/lib/migrationUtils'
 *   await remigrarHuerfanos()
 */
export async function remigrarHuerfanos() {
  const { data: sinMigrar } = await supabase
    .from('outfits')
    .select(`
      id, top_id, bottom_id, shoes_id, outerwear_id,
      outfit_items ( id ),
      outfit_accessories ( prenda_id )
    `)

  if (!sinMigrar) return

  const huerfanos = sinMigrar.filter((o) => o.outfit_items.length === 0)
  console.log(`Re-migrando ${huerfanos.length} outfits huérfanos...`)

  let ok = 0
  let fail = 0

  for (const o of huerfanos) {
    // Construir items mínimos desde las columnas antiguas
    const items = [
      o.top_id       && { outfit_id: o.id, prenda_id: o.top_id,       slot: 'top',       position: 0 },
      o.bottom_id    && { outfit_id: o.id, prenda_id: o.bottom_id,    slot: 'bottom',    position: 0 },
      o.shoes_id     && { outfit_id: o.id, prenda_id: o.shoes_id,     slot: 'shoes',     position: 0 },
      o.outerwear_id && { outfit_id: o.id, prenda_id: o.outerwear_id, slot: 'outerwear', position: 0 },
      ...(o.outfit_accessories || []).map((oa, idx) => ({
        outfit_id: o.id, prenda_id: oa.prenda_id, slot: 'accessory', position: idx,
      })),
    ].filter(Boolean)

    if (items.length === 0) { console.warn(`Outfit ${o.id} sin prendas, skip`); continue }

    const { error } = await supabase
      .from('outfit_items')
      .insert(items)

    if (error && error.code !== '23505') {
      console.error(`Error en outfit ${o.id}:`, error.message)
      fail++
    } else {
      ok++
    }
  }

  console.log(`✅ Re-migrados: ${ok} | ❌ Errores: ${fail}`)
  return { ok, fail }
}