// app/outfits/page.js
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Core hooks ───────────────────────────────────────────────
import { useAuth }            from '@/context/AuthContext'
import { useGarments }        from '@/hooks/useGarments'
import { useOutfits }         from '@/hooks/useOutfits'
import { useCollections }     from '@/hooks/useCollections'
import { useStyleProfile }    from '@/hooks/useStyleProfile'
import { useFeedback }        from '@/hooks/useFeedback'
import { usePersonalization } from '@/hooks/usePersonalization'
import { useAIInsights }      from '@/hooks/useAIInsights'
import { useOutfitTagging }   from '@/hooks/useOutfitTagging'

// ── UI ───────────────────────────────────────────────────────
import Navbar                 from '@/components/ui/Navbar'
import Modal                  from '@/components/ui/Modal'
import Button                 from '@/components/ui/Button'
import OutfitGrid             from '@/components/outfits/OutfitGrid'
import ManualOutfitBuilder    from '@/components/outfits/ManualOutfitBuilder'
import AddToCollectionModal   from '@/components/collections/AddToCollectionModal'
import MoreLikeThisModal      from '@/components/outfits/MoreLikeThisModal'

// ── Lib ──────────────────────────────────────────────────────
import { SEASON_CONFIG }      from '@/lib/outfitInsights'

// ── Constantes ───────────────────────────────────────────────
const TABS = [
  { id: 'sugeridos', label: '✨ Sugeridos' },
  { id: 'guardados', label: '🔖 Guardados'  },
]

const SOURCE_FILTERS = [
  { id: 'all',       label: 'Todos'     },
  { id: 'generated', label: '✨ Auto'   },
  { id: 'manual',    label: '✏️ Manual' },
]

// ── Subcomponente: barra de filtro por estación ───────────────
function SeasonFilterBar({ seasonFilter, onChange, counts = {} }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-shrink-0">
        Estación
      </span>
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => onChange(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all
            ${!seasonFilter ? 'bg-gray-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          🌍 Todas
        </button>
        {Object.entries(SEASON_CONFIG ?? {}).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => onChange(seasonFilter === key ? null : key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all inline-flex items-center gap-1
              ${seasonFilter === key
                ? `${cfg.color} border shadow-sm`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cfg.emoji} {cfg.label}
            {(counts[key] ?? 0) > 0 && (
              <span className="opacity-60">({counts[key]})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────
export default function OutfitsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  // ── Datos base ───────────────────────────────────────────
  const { prendas } = useGarments()
  const {
    outfits: generatedOutfits,
    outfitsGuardados,
    loading: outfitsLoading,
    saveOutfit,
    createManualOutfit,
    updateOutfit,
    deleteOutfit,
    syncTopOutfits,
  } = useOutfits(prendas)

  const {
    collections,
    createCollection,
    addOutfitToCollection,
    removeOutfitFromCollection,
    getOutfitCollectionIds,
  } = useCollections()

  // ── IA hooks ─────────────────────────────────────────────
  const { profile }             = useStyleProfile()
  const { recordFeedback }      = useFeedback()
  const {
    sortOutfits,
    recentlyLiked,
    isPersonalized,
    needsOnboarding,
  }                             = usePersonalization()
  const { analyzeStyle, tagOutfit } = useAIInsights()

  // ── Auto-tagging de outfits guardados ────────────────────
  // Solo taggea los que tienen ID en BD
  const {
    outfitsWithTags,
    isTagging,
    tagProgress,
  } = useOutfitTagging(outfitsGuardados)

  // ── Personalized sorting ─────────────────────────────────
  // Sugeridos: sort con exploración
  const sortedSugeridos = useMemo(() => {
    return sortOutfits(generatedOutfits)
  }, [generatedOutfits, sortOutfits])

  // Guardados: sort con exploración + tags
  const sortedGuardados = useMemo(() => {
    return sortOutfits(outfitsWithTags)
  }, [outfitsWithTags, sortOutfits])

  // ── Auto-análisis de estilo ───────────────────────────────
  // Se dispara cuando el perfil marca needs_insight_refresh=true
  useEffect(() => {
    if (!profile?.needs_insight_refresh) return
    if (!user) return

    // Non-blocking: no esperamos el resultado
    analyzeStyle().catch((e) => console.warn('[auto-analyzeStyle]', e))
  }, [profile?.needs_insight_refresh])

  // ── UI state ─────────────────────────────────────────────
  const [tab,          setTab]          = useState('sugeridos')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [seasonFilter, setSeasonFilter] = useState(null)
  const [syncing,      setSyncing]      = useState(false)
  const [toast,        setToast]        = useState({ visible: false, msg: '', type: 'success' })

  // Modales
  const [manualBuilderOpen, setManualBuilderOpen] = useState(false)
  const [editingOutfit,     setEditingOutfit]     = useState(null)
  const [collectionOutfit,  setCollectionOutfit]  = useState(null)
  const [moreLikeOutfit,    setMoreLikeOutfit]    = useState(null) // ← More Like This

  // Redirect si no hay sesión
  if (!authLoading && !user) { router.push('/login'); return null }

  // ── Toast helper ─────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ visible: true, msg, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500)
  }, [])

  // ── Filtrado final ────────────────────────────────────────
  const guardadosFiltrados = useMemo(() => {
    let list = sortedGuardados

    if (sourceFilter !== 'all') {
      list = list.filter((o) => o.source === sourceFilter)
    }
    if (seasonFilter) {
      list = list.filter((o) => Array.isArray(o.seasons) && o.seasons.includes(seasonFilter))
    }
    return list
  }, [sortedGuardados, sourceFilter, seasonFilter])

  const sugeridosFiltrados = useMemo(() => {
    if (!seasonFilter) return sortedSugeridos
    return sortedSugeridos.filter(
      (o) => Array.isArray(o.seasons) && o.seasons.includes(seasonFilter)
    )
  }, [sortedSugeridos, seasonFilter])

  // Contadores de estación
  const sugeridosSeasonCounts = useMemo(() =>
    Object.keys(SEASON_CONFIG ?? {}).reduce((acc, s) => ({
      ...acc,
      [s]: sortedSugeridos.filter((o) => o.seasons?.includes(s)).length,
    }), {}), [sortedSugeridos])

  const guardadosSeasonCounts = useMemo(() =>
    Object.keys(SEASON_CONFIG ?? {}).reduce((acc, s) => ({
      ...acc,
      [s]: sortedGuardados.filter((o) => o.seasons?.includes(s)).length,
    }), {}), [sortedGuardados])

  // IDs guardados (para badge en sugeridos)
  const savedIds = useMemo(
    () => outfitsGuardados.map((o) => o.id),
    [outfitsGuardados]
  )

  // ── Checks de prendas mínimas ─────────────────────────────
  const puedeGenerar =
    prendas.some((p) => p.categoria === 'top')    &&
    prendas.some((p) => p.categoria === 'bottom') &&
    prendas.some((p) => p.categoria === 'shoes')

  // ── HANDLERS ─────────────────────────────────────────────

  /** Feedback real — actualiza perfil + dispara análisis si corresponde */
  const handleFeedback = useCallback(async (outfit, action) => {
    const { error } = await recordFeedback(outfit, action, {
      screen: tab,
      source: outfit.source ?? 'unknown',
    })
    if (error) console.warn('[handleFeedback]', error)
  }, [recordFeedback, tab])

  /** More Like This — abre modal de similitud */
  const handleMoreLikeThis = useCallback((outfit) => {
    // Registrar la intención como feedback positivo suave
    recordFeedback(outfit, 'like', { screen: 'more_like_this' }).catch(() => {})
    setMoreLikeOutfit(outfit)
  }, [recordFeedback])

  /** Guardar sugerido */
  const handleSaveSuggested = useCallback(async (outfit) => {
    const { error } = await saveOutfit(outfit)
    if (!error) {
      showToast('Outfit guardado 🔖')
      // Tag el nuevo outfit guardado (tiene ID ahora)
      recordFeedback(outfit, 'save', { screen: 'sugeridos' }).catch(() => {})
    } else {
      showToast(error, 'error')
    }
  }, [saveOutfit, showToast, recordFeedback])

  /** Crear manual */
  const handleCreateManual = useCallback(async (outfitData) => {
    const { error } = await createManualOutfit(outfitData)
    if (error) return { error }
    showToast('Outfit manual creado ✏️')
    setManualBuilderOpen(false)
    setTab('guardados')
    return { error: null }
  }, [createManualOutfit, showToast])

  /** Actualizar outfit */
  const handleUpdateOutfit = useCallback(async (outfitData) => {
    if (!editingOutfit) return { error: 'Sin outfit' }
    const { error } = await updateOutfit(editingOutfit.id, outfitData)
    if (error) return { error }
    showToast(`Outfit actualizado · ${outfitData.score}/100`)
    setEditingOutfit(null)
    return { error: null }
  }, [editingOutfit, updateOutfit, showToast])

  /** Eliminar outfit */
  const handleDeleteOutfit = useCallback(async (outfitId) => {
    const { error } = await deleteOutfit(outfitId)
    if (!error) showToast('Outfit eliminado')
    else showToast(error, 'error')
  }, [deleteOutfit, showToast])

  /** Sync top 5 */
  const handleSync = useCallback(async () => {
    setSyncing(true)
    await syncTopOutfits()
    setSyncing(false)
    showToast('Top 5 sincronizados ✓')
  }, [syncTopOutfits, showToast])

  // Contadores para tabs
  const countGuardados = outfitsGuardados.length
  const countManuales  = outfitsGuardados.filter((o) => o.source === 'manual').length

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar/>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Outfits</h1>
              {isPersonalized && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  ✦ Personalizados
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1 text-sm">
              {sortedSugeridos.length} sugeridos · {countManuales} manuales
              {isTagging && (
                <span className="ml-2 text-purple-500">
                  · tagging {tagProgress.done}/{tagProgress.total} outfits...
                </span>
              )}
            </p>

            {/* Onboarding CTA */}
            {needsOnboarding && (
              <Link href="/onboarding">
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-purple-600 hover:underline">
                  ✦ Completa tu perfil para outfits personalizados →
                </span>
              </Link>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button size="md" onClick={() => setManualBuilderOpen(true)} disabled={!puedeGenerar}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Crear outfit
            </Button>
            <Button variant="secondary" size="md" loading={syncing} onClick={handleSync} disabled={!sortedSugeridos.length}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Sync
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toast.visible && (
          <div className={`mb-5 p-4 rounded-xl text-sm flex items-center gap-2 border
            ${toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {toast.type === 'success'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              }
            </svg>
            {toast.msg}
          </div>
        )}

        {/* Prendas insuficientes */}
        {!puedeGenerar && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800">Necesitas más prendas</p>
              <p className="text-sm text-amber-700 mt-1">
                Mínimo: <strong>1 top</strong>, <strong>1 bottom</strong> y <strong>1 zapato</strong>.
              </p>
              <Link href="/wardrobe"><Button size="sm" className="mt-3">Ir a Mi Armario</Button></Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
              {t.id === 'guardados' && countGuardados > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-purple-100 text-purple-700 rounded-full">
                  {countGuardados}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: SUGERIDOS ──────────────────────────────── */}
        {tab === 'sugeridos' && (
          <div className="flex flex-col gap-5">

            {sortedSugeridos.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <SeasonFilterBar
                  seasonFilter={seasonFilter}
                  onChange={setSeasonFilter}
                  counts={sugeridosSeasonCounts}
                />
              </div>
            )}

            {seasonFilter && sugeridosFiltrados.length < sortedSugeridos.length && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {sortedSugeridos.length - sugeridosFiltrados.length} outfits ocultos sin datos térmicos.
                <Link href="/wardrobe" className="font-medium underline ml-1">Añadir warmth →</Link>
              </div>
            )}

            <OutfitGrid
              outfits={sugeridosFiltrados}
              loading={outfitsLoading}
              onSave={handleSaveSuggested}
              onDelete={() => {}}
              onFeedback={handleFeedback}
              onMoreLikeThis={handleMoreLikeThis}
              onAddToCollection={(o) => o.id && setCollectionOutfit(o)}
              savedIds={savedIds}
              emptyMessage={seasonFilter
                ? `Sin sugerencias para ${SEASON_CONFIG[seasonFilter]?.label}`
                : 'No hay sugerencias todavía'}
              emptySubMessage="Añade tops, bottoms y zapatos para generar outfits."
            />
          </div>
        )}

        {/* ── TAB: GUARDADOS ──────────────────────────────── */}
        {tab === 'guardados' && (
          <div className="flex flex-col gap-5">

            {outfitsGuardados.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">

                {/* Source filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Origen</span>
                  <div className="flex gap-1 flex-wrap">
                    {SOURCE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSourceFilter(f.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                          ${sourceFilter === f.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {f.label} ({f.id === 'all' ? outfitsGuardados.length
                          : outfitsGuardados.filter((o) => o.source === f.id).length})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gray-100"/>

                {/* Season filter */}
                <SeasonFilterBar
                  seasonFilter={seasonFilter}
                  onChange={setSeasonFilter}
                  counts={guardadosSeasonCounts}
                />
              </div>
            )}

            <OutfitGrid
              outfits={guardadosFiltrados}
              loading={outfitsLoading}
              onSave={() => {}}
              onDelete={handleDeleteOutfit}
              onEdit={(o) => setEditingOutfit(o)}
              onFeedback={handleFeedback}
              onMoreLikeThis={handleMoreLikeThis}
              onAddToCollection={(o) => setCollectionOutfit(o)}
              savedIds={savedIds}
              emptyMessage={
                seasonFilter
                  ? `Sin outfits guardados para ${SEASON_CONFIG[seasonFilter]?.label}`
                  : sourceFilter === 'manual'
                    ? 'Sin outfits manuales'
                    : 'Sin outfits guardados'
              }
              emptySubMessage="Ve a Sugeridos y guarda los que más te gusten."
            />
          </div>
        )}
      </main>

      {/* ── MODAL: Crear outfit manual ────────────────────── */}
      <Modal isOpen={manualBuilderOpen} onClose={() => setManualBuilderOpen(false)}
             title="Crear outfit manual" size="lg" closeOnBackdrop={false}>
        <ManualOutfitBuilder
          prendas={prendas}
          onSave={handleCreateManual}
          onCancel={() => setManualBuilderOpen(false)}
        />
      </Modal>

      {/* ── MODAL: Editar outfit ──────────────────────────── */}
      <Modal isOpen={!!editingOutfit} onClose={() => setEditingOutfit(null)}
             title={editingOutfit ? `Editando · ${editingOutfit.score}/100` : 'Editar'}
             size="lg" closeOnBackdrop={false}>
        {editingOutfit && (
          <ManualOutfitBuilder
            prendas={prendas}
            onSave={handleUpdateOutfit}
            onCancel={() => setEditingOutfit(null)}
            initialOutfit={editingOutfit}
            isEditing
          />
        )}
      </Modal>

      {/* ── MODAL: Añadir a colección ─────────────────────── */}
      <Modal isOpen={!!collectionOutfit} onClose={() => setCollectionOutfit(null)}
             title="Añadir a colección" size="sm">
        {collectionOutfit && (
          <AddToCollectionModal
            outfit={collectionOutfit}
            collections={collections}
            getOutfitCollectionIds={getOutfitCollectionIds}
            addOutfitToCollection={addOutfitToCollection}
            removeOutfitFromCollection={removeOutfitFromCollection}
            createCollection={createCollection}
            onClose={() => {
              setCollectionOutfit(null)
              showToast('Colecciones actualizadas 📁')
            }}
          />
        )}
      </Modal>

      {/* ── MODAL: More Like This ────────────────────────── */}
      <MoreLikeThisModal
        outfit={moreLikeOutfit}
        allOutfits={sortedGuardados}          // pool de candidatos
        isOpen={!!moreLikeOutfit}
        onClose={() => setMoreLikeOutfit(null)}
        onSave={handleSaveSuggested}
        onFeedback={handleFeedback}
        savedIds={savedIds}
      />
    </div>
  )
}