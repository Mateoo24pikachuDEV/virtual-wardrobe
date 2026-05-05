// app/outfits/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useGarments } from '@/hooks/useGarments'
import { useOutfits } from '@/hooks/useOutfits'
import Navbar from '@/components/ui/Navbar'
import Button from '@/components/ui/Button'
import OutfitGrid from '@/components/outfits/OutfitGrid'

const TABS = [
  { id: 'sugeridos', label: '✨ Sugeridos' },
  { id: 'guardados', label: '🔖 Guardados'  },
]

export default function OutfitsPage() {
  const router                          = useRouter()
  const { user, loading: authLoading }  = useAuth()
  const { prendas }                     = useGarments()
  const {
    outfits,
    outfitsGuardados,
    loading,
    saveOutfit,
    deleteOutfit,
    syncTopOutfits,
  } = useOutfits(prendas)

  const [tab,        setTab]        = useState('sugeridos')
  const [syncing,    setSyncing]    = useState(false)
  const [savedMsg,   setSavedMsg]   = useState('')

  if (!authLoading && !user) {
    router.push('/login')
    return null
  }

  // IDs de outfits ya guardados (para marcar el botón)
  const savedOutfitKeys = new Set(
    outfitsGuardados.map((o) => `${o.top_id}-${o.bottom_id}-${o.shoes_id}-${o.outerwear_id || 'none'}`)
  )

  const isSuggestionSaved = (outfit) =>
    savedOutfitKeys.has(`${outfit.top_id}-${outfit.bottom_id}-${outfit.shoes_id}-${outfit.outerwear_id || 'none'}`)

  const handleSave = async (outfit) => {
    const { error } = await saveOutfit(outfit)
    if (!error) {
      setSavedMsg('Outfit guardado ✓')
      setTimeout(() => setSavedMsg(''), 3000)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    await syncTopOutfits()
    setSyncing(false)
    setSavedMsg('Top 5 outfits sincronizados ✓')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  // Necesidad mínima de prendas
  const tieneTop     = prendas.some((p) => p.categoria === 'top')
  const tieneBottom  = prendas.some((p) => p.categoria === 'bottom')
  const tieneShoes   = prendas.some((p) => p.categoria === 'shoes')
  const puedeGenerar = tieneTop && tieneBottom && tieneShoes

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outfits Sugeridos</h1>
            <p className="text-gray-500 mt-1">
              {outfits.length > 0
                ? `${outfits.length} combinaciones generadas por el motor de color`
                : 'El motor analizará tu armario para crear combinaciones perfectas'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              loading={syncing}
              onClick={handleSync}
              disabled={outfits.length === 0}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Sincronizar top 5
            </Button>
          </div>
        </div>

        {/* Toast */}
        {savedMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {savedMsg}
          </div>
        )}

        {/* Aviso si no hay prendas suficientes */}
        {!puedeGenerar && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800">Necesitas más prendas</p>
              <p className="text-sm text-amber-700 mt-1">
                Para generar outfits necesitas al menos:{' '}
                <strong>1 top</strong>, <strong>1 bottom</strong> y{' '}
                <strong>1 par de zapatos</strong>.
              </p>
              <Link href="/wardrobe">
                <Button size="sm" className="mt-3">
                  Ir a Mi Armario
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {t.label}
              {t.id === 'guardados' && outfitsGuardados.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-purple-100 text-purple-700 rounded-full">
                  {outfitsGuardados.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenido de tabs */}
        {tab === 'sugeridos' ? (
          <OutfitGrid
            outfits={outfits}
            loading={loading}
            onSave={handleSave}
            onDelete={() => {}}
            savedIds={outfitsGuardados.map((o) => o.id)}
            emptyMessage="No hay sugerencias todavía"
            emptySubMessage="Añade tops, bottoms y zapatos en Mi Armario para empezar."
          />
        ) : (
          <OutfitGrid
            outfits={outfitsGuardados}
            loading={loading}
            onSave={handleSave}
            onDelete={deleteOutfit}
            savedIds={outfitsGuardados.map((o) => o.id)}
            emptyMessage="No tienes outfits guardados"
            emptySubMessage="Ve a la pestaña de Sugeridos y guarda los que más te gusten."
          />
        )}
      </main>
    </div>
  )
}