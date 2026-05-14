// app/outfits/page.js
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useGarments } from '@/hooks/useGarments'
import { useOutfits } from '@/hooks/useOutfits'
import { useCollections } from '@/hooks/useCollections'
import { SEASON_CONFIG } from '@/lib/outfitEngine'
import Navbar from '@/components/ui/Navbar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import OutfitGrid from '@/components/outfits/OutfitGrid'
import ManualOutfitBuilder from '@/components/outfits/ManualOutfitBuilder'
import AddToCollectionModal from '@/components/collections/AddToCollectionModal'

// ── Constantes ──────────────────────────────────────────────
const TABS = [
  { id: 'sugeridos', label: '✨ Sugeridos' },
  { id: 'guardados', label: '🔖 Guardados'  },
]

const SOURCE_FILTERS = [
  { id: 'all',       label: 'Todos'     },
  { id: 'generated', label: '✨ Auto'   },
  { id: 'manual',    label: '✏️ Manual' },
]

// ── Subcomponente: barra de filtro por estación ─────────────
function SeasonFilterBar({ seasonFilter, onChange, counts = {} }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-shrink-0">
        Estación
      </span>
      <div className="flex gap-1 flex-wrap">
        {/* Todos */}
        <button
          onClick={() => onChange(null)}
          className={`
            px-3 py-1 rounded-full text-xs font-medium transition-all
            ${!seasonFilter
              ? 'bg-gray-700 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          🌍 Todas
        </button>

        {/* Una por estación */}
        {Object.entries(SEASON_CONFIG).map(([key, cfg]) => {
          const count = counts[key] ?? 0
          const active = seasonFilter === key
          return (
            <button
              key={key}
              onClick={() => onChange(active ? null : key)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all
                inline-flex items-center gap-1
                ${active
                  ? `${cfg.color} border shadow-sm`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {cfg.emoji} {cfg.label}
              {count > 0 && (
                <span className="opacity-70">({count})</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────
export default function OutfitsPage() {
  const router                         = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { prendas }                    = useGarments()
  const {
    outfits,
    outfitsGuardados,
    loading,
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

  // ── Modales ─────────────────────────────────────────────────
  const [manualBuilderOpen, setManualBuilderOpen] = useState(false)
  const [editingOutfit,     setEditingOutfit]     = useState(null)
  const [collectionOutfit,  setCollectionOutfit]  = useState(null)

  // ── Filtros ─────────────────────────────────────────────────
  const [tab,          setTab]          = useState('sugeridos')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [seasonFilter, setSeasonFilter] = useState(null)   // null = todas

  // ── UI ──────────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false)
  const [toast,   setToast]   = useState({ visible: false, msg: '', type: 'success' })

  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  const showToast = (msg, type = 'success') => {
    setToast({ visible: true, msg, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000)
  }

  // ── Filtrado: Sugeridos ─────────────────────────────────────
  const sugeridosFiltrados = useMemo(() => {
    if (!seasonFilter) return outfits
    return outfits.filter(
      (o) => Array.isArray(o.seasons) && o.seasons.includes(seasonFilter)
    )
  }, [outfits, seasonFilter])

  // ── Filtrado: Guardados por source ──────────────────────────
  const guardadosPorSource = useMemo(() =>
    sourceFilter === 'all'
      ? outfitsGuardados
      : outfitsGuardados.filter((o) => o.source === sourceFilter),
    [outfitsGuardados, sourceFilter]
  )

  // ── Filtrado: Guardados por source + estación ───────────────
  const guardadosFiltrados = useMemo(() => {
    if (!seasonFilter) return guardadosPorSource
    return guardadosPorSource.filter(
      (o) => Array.isArray(o.seasons) && o.seasons.includes(seasonFilter)
    )
  }, [guardadosPorSource, seasonFilter])

  // ── Contadores por estación (para badges en filter bar) ─────
  const sugeridosSeasonCounts = useMemo(() =>
    Object.keys(SEASON_CONFIG).reduce((acc, s) => ({
      ...acc,
      [s]: outfits.filter((o) => Array.isArray(o.seasons) && o.seasons.includes(s)).length,
    }), {}),
    [outfits]
  )
  const guardadosSeasonCounts = useMemo(() =>
    Object.keys(SEASON_CONFIG).reduce((acc, s) => ({
      ...acc,
      [s]: guardadosPorSource.filter((o) => Array.isArray(o.seasons) && o.seasons.includes(s)).length,
    }), {}),
    [guardadosPorSource]
  )

  // ── IDs guardados (para badge "guardar" en sugeridos) ───────
  const savedKeys = useMemo(() => new Set(
    outfitsGuardados.map(
      (o) => `${o.top_id}-${o.bottom_id}-${o.shoes_id}-${o.outerwear_id || 'none'}`
    )
  ), [outfitsGuardados])

  // ── Prendas mínimas ─────────────────────────────────────────
  const puedeGenerar =
    prendas.some((p) => p.categoria === 'top')    &&
    prendas.some((p) => p.categoria === 'bottom') &&
    prendas.some((p) => p.categoria === 'shoes')

  // ── Contadores ──────────────────────────────────────────────
  const countGuardados = outfitsGuardados.length
  const countManuales  = outfitsGuardados.filter((o) => o.source === 'manual').length

  // ── Handlers ────────────────────────────────────────────────
  const handleSaveSuggested = async (outfit) => {
    const { error } = await saveOutfit(outfit)
    if (!error) showToast('Outfit guardado 🔖')
    else showToast(error, 'error')
  }

  const handleCreateManual = async (outfitData) => {
    const { error } = await createManualOutfit(outfitData)
    if (error) return { error }
    showToast('Outfit manual guardado ✏️')
    setManualBuilderOpen(false)
    setTab('guardados')
    setSourceFilter('manual')
    return { error: null }
  }

  const handleUpdateOutfit = async (outfitData) => {
    if (!editingOutfit) return { error: 'Sin outfit seleccionado' }
    const { error } = await updateOutfit(editingOutfit.id, outfitData)
    if (error) return { error }
    showToast(`Outfit actualizado ✏️ · ${outfitData.score}/100`)
    setEditingOutfit(null)
    return { error: null }
  }

  const handleDeleteOutfit = async (outfitId) => {
    const { error } = await deleteOutfit(outfitId)
    if (!error) showToast('Outfit eliminado')
    else showToast(error, 'error')
  }

  const handleSync = async () => {
    setSyncing(true)
    await syncTopOutfits()
    setSyncing(false)
    showToast('Top 5 outfits sincronizados ✓')
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outfits</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {outfits.length > 0
                ? `${outfits.length} automáticos · ${countManuales} manuales`
                : 'Crea outfits automáticos o diseña los tuyos'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              size="md"
              onClick={() => setManualBuilderOpen(true)}
              disabled={!puedeGenerar}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Crear outfit
            </Button>

            <Button variant="secondary" size="md" loading={syncing} onClick={handleSync} disabled={outfits.length === 0}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Sync top 5
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toast.visible && (
          <div className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-2 border
            ${toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'}`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {toast.type === 'success'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              }
            </svg>
            {toast.msg}
          </div>
        )}

        {/* Aviso prendas insuficientes */}
        {!puedeGenerar && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800">Necesitas más prendas</p>
              <p className="text-sm text-amber-700 mt-1">
                Mínimo: <strong>1 top</strong>, <strong>1 bottom</strong> y{' '}
                <strong>1 par de zapatos</strong>.
              </p>
              <Link href="/wardrobe">
                <Button size="sm" className="mt-3">Ir a Mi Armario</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150
                flex items-center gap-1.5
                ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
              `}
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

        {/* ── Tab: Sugeridos ─────────────────────────────────── */}
        {tab === 'sugeridos' && (
          <div className="flex flex-col gap-5">

            {/* Filtro de estación */}
            {outfits.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <SeasonFilterBar
                  seasonFilter={seasonFilter}
                  onChange={setSeasonFilter}
                  counts={sugeridosSeasonCounts}
                />
              </div>
            )}

            {/* Info sobre prendas sin warmth */}
            {seasonFilter && sugeridosFiltrados.length < outfits.length && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {outfits.length - sugeridosFiltrados.length} outfits ocultos porque sus prendas no tienen nivel de abrigo definido.
                <Link href="/wardrobe" className="font-medium underline ml-1">Editarlas</Link>
              </div>
            )}

            <OutfitGrid
              outfits={sugeridosFiltrados}
              loading={loading}
              onSave={handleSaveSuggested}
              onDelete={() => {}}
              onAddToCollection={(outfit) => outfit.id && setCollectionOutfit(outfit)}
              savedIds={outfitsGuardados.map((o) => o.id)}
              emptyMessage={seasonFilter ? `Sin outfits para ${SEASON_CONFIG[seasonFilter]?.label}` : 'No hay sugerencias todavía'}
              emptySubMessage={
                seasonFilter
                  ? 'Añade nivel de abrigo a tus prendas o cambia el filtro de estación.'
                  : 'Añade tops, bottoms y zapatos en Mi Armario para empezar.'
              }
            />
          </div>
        )}

        {/* ── Tab: Guardados ─────────────────────────────────── */}
        {tab === 'guardados' && (
          <div className="flex flex-col gap-5">

            {/* Filtros de source + estación */}
            {outfitsGuardados.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">

                {/* Source */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Origen
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {SOURCE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSourceFilter(f.id)}
                        className={`
                          px-3 py-1 rounded-full text-xs font-medium transition-all
                          ${sourceFilter === f.id
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                        `}
                      >
                        {f.label}{' '}
                        <span className="opacity-70">
                          ({f.id === 'all'
                            ? outfitsGuardados.length
                            : outfitsGuardados.filter((o) => o.source === f.id).length
                          })
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Separador */}
                <div className="h-px bg-gray-100"/>

                {/* Estación */}
                <SeasonFilterBar
                  seasonFilter={seasonFilter}
                  onChange={setSeasonFilter}
                  counts={guardadosSeasonCounts}
                />
              </div>
            )}

            <OutfitGrid
              outfits={guardadosFiltrados}
              loading={loading}
              onSave={() => {}}
              onDelete={handleDeleteOutfit}
              onEdit={(outfit) => setEditingOutfit(outfit)}
              onAddToCollection={(outfit) => setCollectionOutfit(outfit)}
              savedIds={guardadosFiltrados.map((o) => o.id)}
              emptyMessage={
                seasonFilter
                  ? `Sin outfits guardados para ${SEASON_CONFIG[seasonFilter]?.label}`
                  : sourceFilter === 'manual'
                    ? 'No tienes outfits manuales'
                    : 'No tienes outfits guardados'
              }
              emptySubMessage={
                seasonFilter
                  ? 'Ajusta los filtros de estación u origen.'
                  : 'Ve a Sugeridos y guarda los que más te gusten, o crea uno manual.'
              }
            />
          </div>
        )}
      </main>

      {/* ── MODAL: Crear outfit manual ──────────────────────── */}
      <Modal
        isOpen={manualBuilderOpen}
        onClose={() => setManualBuilderOpen(false)}
        title="Crear outfit manual"
        size="lg"
        closeOnBackdrop={false}
      >
        <ManualOutfitBuilder
          prendas={prendas}
          onSave={handleCreateManual}
          onCancel={() => setManualBuilderOpen(false)}
          isEditing={false}
        />
      </Modal>

      {/* ── MODAL: Editar outfit ────────────────────────────── */}
      <Modal
        isOpen={!!editingOutfit}
        onClose={() => setEditingOutfit(null)}
        title={editingOutfit ? `Editando outfit · Score actual: ${editingOutfit.score}/100` : 'Editar outfit'}
        size="lg"
        closeOnBackdrop={false}
      >
        {editingOutfit && (
          <div className="flex flex-col gap-0">
            <div className="flex items-center gap-3 p-3 mb-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex gap-1">
                {[editingOutfit._top, editingOutfit._bottom, editingOutfit._shoes]
                  .filter(Boolean).map((p, i) => (
                    <div key={i} className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 border border-gray-100 flex-shrink-0">
                      {p.imagen_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-sm">
                            {p.categoria === 'top' ? '👕' : p.categoria === 'bottom' ? '👖' : '👟'}
                          </div>
                      }
                    </div>
                  ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${editingOutfit.score >= 80 ? 'bg-green-500' : editingOutfit.score >= 60 ? 'bg-yellow-500' : 'bg-orange-400'}`}
                      style={{ width: `${editingOutfit.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700">{editingOutfit.score}/100</span>
                </div>
                {editingOutfit.seasons?.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {editingOutfit.seasons.map((s) => (
                      <span key={s} className="text-xs text-gray-400">
                        {s === 'summer' ? '☀️' : s === 'spring' ? '🌸' : s === 'autumn' ? '🍂' : '❄️'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <ManualOutfitBuilder
              prendas={prendas}
              onSave={handleUpdateOutfit}
              onCancel={() => setEditingOutfit(null)}
              initialOutfit={editingOutfit}
              isEditing
            />
          </div>
        )}
      </Modal>

      {/* ── MODAL: Añadir a colección ───────────────────────── */}
      <Modal
        isOpen={!!collectionOutfit}
        onClose={() => setCollectionOutfit(null)}
        title="Añadir a colección"
        size="sm"
      >
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
    </div>
  )
}