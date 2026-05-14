// app/outfits/page.js
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useGarments } from '@/hooks/useGarments'
import { useOutfits } from '@/hooks/useOutfits'
import Navbar from '@/components/ui/Navbar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import OutfitGrid from '@/components/outfits/OutfitGrid'
import ManualOutfitBuilder from '@/components/outfits/ManualOutfitBuilder'

const TABS = [
  { id: 'sugeridos', label: '✨ Sugeridos' },
  { id: 'guardados', label: '🔖 Guardados'  },
]

const SOURCE_FILTERS = [
  { id: 'all',       label: 'Todos'     },
  { id: 'generated', label: '✨ Auto'   },
  { id: 'manual',    label: '✏️ Manual' },
]

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

  // ── Modales ────────────────────────────────────────────────
  const [manualBuilderOpen, setManualBuilderOpen] = useState(false)
  const [editingOutfit,     setEditingOutfit]     = useState(null)   // outfit en edición o null

  // ── UI state ───────────────────────────────────────────────
  const [tab,          setTab]          = useState('sugeridos')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [syncing,      setSyncing]      = useState(false)
  const [toast,        setToast]        = useState({ visible: false, msg: '', type: 'success' })

  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  // ── Toast helper ────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ visible: true, msg, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000)
  }

  // ── Guardados filtrados por source ──────────────────────────
  const guardadosFiltrados = useMemo(() =>
    sourceFilter === 'all'
      ? outfitsGuardados
      : outfitsGuardados.filter((o) => o.source === sourceFilter),
    [outfitsGuardados, sourceFilter]
  )

  // ── IDs guardados (para badge en sugeridos) ─────────────────
  const savedKeys = useMemo(() => new Set(
    outfitsGuardados.map(
      (o) => `${o.top_id}-${o.bottom_id}-${o.shoes_id}-${o.outerwear_id || 'none'}`
    )
  ), [outfitsGuardados])

  // ── Prendas mínimas para generar outfits ────────────────────
  const puedeGenerar =
    prendas.some((p) => p.categoria === 'top')    &&
    prendas.some((p) => p.categoria === 'bottom') &&
    prendas.some((p) => p.categoria === 'shoes')

  // ── Contadores ─────────────────────────────────────────────
  const countGuardados = outfitsGuardados.length
  const countManuales  = outfitsGuardados.filter((o) => o.source === 'manual').length

  // ── Handlers ───────────────────────────────────────────────

  /** Guardar un outfit sugerido (automático) */
  const handleSaveSuggested = async (outfit) => {
    const { error } = await saveOutfit(outfit)
    if (!error) showToast('Outfit guardado 🔖')
    else showToast(error, 'error')
  }

  /** Crear outfit manual (desde builder en modo creación) */
  const handleCreateManual = async (outfitData) => {
    const { error } = await createManualOutfit(outfitData)
    if (error) return { error }
    showToast('Outfit manual guardado ✏️')
    setManualBuilderOpen(false)
    setTab('guardados')
    setSourceFilter('manual')
    return { error: null }
  }

  /** Abrir modal de edición con el outfit seleccionado */
  const handleOpenEdit = (outfit) => {
    setEditingOutfit(outfit)
  }

  /** Guardar cambios de edición */
  const handleUpdateOutfit = async (outfitData) => {
    if (!editingOutfit) return { error: 'No hay outfit seleccionado' }

    const { error } = await updateOutfit(editingOutfit.id, outfitData)

    if (error) return { error }

    showToast(`Outfit actualizado ✏️ — nuevo score: ${outfitData.score}/100`)
    setEditingOutfit(null)
    return { error: null }
  }

  /** Eliminar outfit guardado */
  const handleDeleteOutfit = async (outfitId) => {
    const { error } = await deleteOutfit(outfitId)
    if (!error) showToast('Outfit eliminado')
    else showToast(error, 'error')
  }

  /** Sincronizar top 5 automáticos */
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

        {/* ── Header ─────────────────────────────────────────── */}
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
              title={!puedeGenerar ? 'Necesitas al menos 1 top, 1 bottom y 1 zapato' : ''}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Crear outfit
            </Button>

            <Button
              variant="secondary"
              size="md"
              loading={syncing}
              onClick={handleSync}
              disabled={outfits.length === 0}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11
                     11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Sync top 5
            </Button>
          </div>
        </div>

        {/* ── Toast ──────────────────────────────────────────── */}
        {toast.visible && (
          <div className={`
            mb-6 p-4 rounded-xl text-sm flex items-center gap-2 border
            ${toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'}
          `}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {toast.type === 'success'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              }
            </svg>
            {toast.msg}
          </div>
        )}

        {/* ── Aviso prendas insuficientes ────────────────────── */}
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

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
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
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs
                                 bg-purple-100 text-purple-700 rounded-full">
                  {countGuardados}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Sugeridos ─────────────────────────────────── */}
        {tab === 'sugeridos' && (
          <OutfitGrid
            outfits={outfits}
            loading={loading}
            onSave={handleSaveSuggested}
            onDelete={() => {}}
            savedIds={outfitsGuardados.map((o) => o.id)}
            emptyMessage="No hay sugerencias todavía"
            emptySubMessage="Añade tops, bottoms y zapatos en Mi Armario para empezar."
          />
        )}

        {/* ── Tab: Guardados ─────────────────────────────────── */}
        {tab === 'guardados' && (
          <div className="flex flex-col gap-5">

            {/* Filtro source */}
            {outfitsGuardados.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Origen
                </span>
                <div className="flex gap-1">
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
                      {f.label}
                      {' '}
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
            )}

            <OutfitGrid
              outfits={guardadosFiltrados}
              loading={loading}
              onSave={() => {}}
              onDelete={handleDeleteOutfit}
              onEdit={handleOpenEdit}                        // ← pasa onEdit
              savedIds={guardadosFiltrados.map((o) => o.id)}
              emptyMessage={
                sourceFilter === 'manual'    ? 'No tienes outfits manuales' :
                sourceFilter === 'generated' ? 'No tienes outfits automáticos guardados' :
                                               'No tienes outfits guardados'
              }
              emptySubMessage={
                sourceFilter === 'manual'
                  ? 'Crea tu primer outfit manual con el botón "Crear outfit".'
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

      {/* ── MODAL: Editar outfit guardado ───────────────────── */}
      <Modal
        isOpen={!!editingOutfit}
        onClose={() => setEditingOutfit(null)}
        title={editingOutfit
          ? `Editando outfit · Score actual: ${editingOutfit.score}/100`
          : 'Editar outfit'
        }
        size="lg"
        closeOnBackdrop={false}
      >
        {/* Montamos el builder SOLO cuando editingOutfit existe para que
            el useEffect de precarga se dispare correctamente */}
        {editingOutfit && (
          <div className="flex flex-col gap-0">

            {/* Info rápida del outfit actual */}
            <div className="flex items-center gap-3 p-3 mb-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex gap-1">
                {[editingOutfit._top, editingOutfit._bottom, editingOutfit._shoes]
                  .filter(Boolean)
                  .map((p, i) => (
                    <div key={i} className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 border border-gray-100 flex-shrink-0">
                      {p.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">
                          {p.categoria === 'top' ? '👕' : p.categoria === 'bottom' ? '👖' : '👟'}
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">Score actual</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        editingOutfit.score >= 80 ? 'bg-green-500' :
                        editingOutfit.score >= 60 ? 'bg-yellow-500' : 'bg-orange-400'
                      }`}
                      style={{ width: `${editingOutfit.score}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 flex-shrink-0">
                    {editingOutfit.score}/100
                  </span>
                </div>
              </div>
              <span className={`
                text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0
                ${editingOutfit.source === 'manual'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'}
              `}>
                {editingOutfit.source === 'manual' ? '✏️ Manual' : '✨ Auto'}
              </span>
            </div>

            <ManualOutfitBuilder
              prendas={prendas}
              onSave={handleUpdateOutfit}
              onCancel={() => setEditingOutfit(null)}
              initialOutfit={editingOutfit}
              isEditing={true}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}