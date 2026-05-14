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

// ── Tabs disponibles ────────────────────────────────────────
const TABS = [
  { id: 'sugeridos',  label: '✨ Sugeridos'          },
  { id: 'guardados',  label: '🔖 Guardados'           },
]

// ── Filtros de source en Guardados ──────────────────────────
const SOURCE_FILTERS = [
  { id: 'all',       label: 'Todos'    },
  { id: 'generated', label: '✨ Auto'  },
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
    deleteOutfit,
    syncTopOutfits,
  } = useOutfits(prendas)

  const [tab,                setTab]                = useState('sugeridos')
  const [sourceFilter,       setSourceFilter]       = useState('all')
  const [syncing,            setSyncing]            = useState(false)
  const [manualBuilderOpen,  setManualBuilderOpen]  = useState(false)
  const [toast,              setToast]              = useState({ visible: false, msg: '' })

  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  // ── Helpers ─────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast({ visible: true, msg })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000)
  }

  // ── Filtrar guardados por source ─────────────────────────────
  const guardadosFiltrados = useMemo(() =>
    sourceFilter === 'all'
      ? outfitsGuardados
      : outfitsGuardados.filter((o) => o.source === sourceFilter),
    [outfitsGuardados, sourceFilter]
  )

  // IDs guardados (para marcar botón "Guardar" en sugeridos)
  const savedKeys = useMemo(() => new Set(
    outfitsGuardados.map(
      (o) => `${o.top_id}-${o.bottom_id}-${o.shoes_id}-${o.outerwear_id || 'none'}`
    )
  ), [outfitsGuardados])

  // ── Handlers ────────────────────────────────────────────────

  const handleSaveSuggested = async (outfit) => {
    const { error } = await saveOutfit(outfit)
    if (!error) showToast('Outfit guardado 🔖')
  }

  const handleCreateManual = async (outfitData) => {
    const { error } = await createManualOutfit(outfitData)
    if (error) return { error }
    showToast('Outfit manual guardado ✏️')
    setManualBuilderOpen(false)
    setTab('guardados')       // ir a Guardados para verlo
    setSourceFilter('manual') // enfocar en manuales
    return { error: null }
  }

  const handleSync = async () => {
    setSyncing(true)
    await syncTopOutfits()
    setSyncing(false)
    showToast('Top 5 outfits sincronizados ✓')
  }

  // Necesidad mínima de prendas
  const tieneTop    = prendas.some((p) => p.categoria === 'top')
  const tieneBottom = prendas.some((p) => p.categoria === 'bottom')
  const tieneShoes  = prendas.some((p) => p.categoria === 'shoes')
  const puedeGenerar = tieneTop && tieneBottom && tieneShoes

  // Contadores para badges de tab
  const countGuardados = outfitsGuardados.length
  const countManuales  = outfitsGuardados.filter((o) => o.source === 'manual').length

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
                ? `${outfits.length} combinaciones automáticas · ${countManuales} manuales`
                : 'Crea outfits automáticos o diseña los tuyos'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Botón principal: crear manual */}
            <Button
              size="md"
              onClick={() => setManualBuilderOpen(true)}
              disabled={!puedeGenerar}
              title={!puedeGenerar ? 'Necesitas al menos 1 top, 1 bottom y 1 zapato' : ''}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4"/>
              </svg>
              Crear outfit
            </Button>

            {/* Sincronizar auto */}
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
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm
                          text-green-700 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {toast.msg}
          </div>
        )}

        {/* ── Aviso si faltan prendas ─────────────────────────── */}
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
                ${tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}
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

        {/* ── Contenido por tab ──────────────────────────────── */}
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

        {tab === 'guardados' && (
          <div className="flex flex-col gap-5">

            {/* Filtros de source */}
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
                      {f.id !== 'all' && (
                        <span className="ml-1 opacity-70">
                          ({outfitsGuardados.filter(
                            (o) => f.id === 'all' || o.source === f.id
                          ).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <OutfitGrid
              outfits={guardadosFiltrados}
              loading={loading}
              onSave={() => {}}
              onDelete={deleteOutfit}
              savedIds={guardadosFiltrados.map((o) => o.id)}
              emptyMessage={
                sourceFilter === 'manual'
                  ? 'No tienes outfits manuales'
                  : sourceFilter === 'generated'
                    ? 'No tienes outfits automáticos guardados'
                    : 'No tienes outfits guardados'
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
        closeOnBackdrop={false}   // evitar cierres accidentales
      >
        <ManualOutfitBuilder
          prendas={prendas}
          onSave={handleCreateManual}
          onCancel={() => setManualBuilderOpen(false)}
        />
      </Modal>
    </div>
  )
}