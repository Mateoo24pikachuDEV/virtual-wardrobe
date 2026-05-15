// app/profile/page.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useAIInsights } from '@/hooks/useAIInsights'
import supabase from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'
import Button from '@/components/ui/Button'

// ── Metadata de acciones de feedback ─────────────────────────
const ACTION_META = {
  like:              { icon: '♥',  cls: 'text-rose-500   bg-rose-50   border-rose-200',   label: 'Le gustó'       },
  save:              { icon: '🔖', cls: 'text-purple-500 bg-purple-50 border-purple-200', label: 'Guardó'         },
  worn:              { icon: '✓',  cls: 'text-green-500  bg-green-50  border-green-200',  label: 'Lo usó'         },
  share:             { icon: '↗',  cls: 'text-blue-500   bg-blue-50   border-blue-200',   label: 'Compartió'      },
  add_to_collection: { icon: '📁', cls: 'text-indigo-500 bg-indigo-50 border-indigo-200', label: 'Colección'      },
  edit:              { icon: '✏️', cls: 'text-amber-500  bg-amber-50  border-amber-200',  label: 'Editó'          },
  skip:              { icon: '→',  cls: 'text-gray-400   bg-gray-50   border-gray-200',   label: 'Pasó'           },
  dislike:           { icon: '✕',  cls: 'text-gray-500   bg-gray-100  border-gray-300',   label: 'No le gustó'    },
  delete:            { icon: '🗑', cls: 'text-red-500    bg-red-50    border-red-200',    label: 'Eliminó'        },
}

// ── Barra de preferencia ──────────────────────────────────────
function PrefBar({ label, value, maxVal, color = 'bg-purple-500', emoji = '' }) {
  const pct = maxVal > 0 ? Math.min(100, Math.round((Math.max(0, value) / maxVal) * 100)) : 0

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
        {emoji && <span className="text-sm">{emoji}</span>}
        <span className="text-sm text-gray-600 capitalize truncate">{label}</span>
      </div>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{value}</span>
    </div>
  )
}

// ── Vibe / Aesthetic chip ─────────────────────────────────────
function Chip({ label, variant = 'purple' }) {
  const variants = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    pink:   'bg-pink-100   text-pink-700   border-pink-200',
    gray:   'bg-gray-100   text-gray-600   border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant] ?? variants.gray}`}>
      {label}
    </span>
  )
}

// ── Stat card ────────────────────────────────────────────────
function StatCard({ value, label, icon, color = 'text-purple-600' }) {
  return (
    <div className="card p-4 text-center hover:shadow-sm transition-shadow">
      <div className={`text-2xl ${color} mb-1`}>{icon}</div>
      <div className="text-2xl font-black text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

// ── Sección colapsable ────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[2000px]' : 'max-h-0'}`}>
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useStyleProfile()
  const { analyzeStyle, loading: aiLoading }   = useAIInsights()

  const [insight,       setInsight]       = useState(null)
  const [feedbackLog,   setFeedbackLog]   = useState([])
  const [outfitCount,   setOutfitCount]   = useState(0)
  const [loadingFeed,   setLoadingFeed]   = useState(true)
  const [analysisMsg,   setAnalysisMsg]   = useState('')

  if (!authLoading && !user) { router.push('/login'); return null }

  // ── Cargar datos adicionales ─────────────────────────────
  useEffect(() => {
    if (!user) return

    async function loadData() {
      setLoadingFeed(true)

      const [insightRes, feedRes, outfitRes] = await Promise.all([
        // Último análisis completo cacheado
        supabase
          .from('style_insights')
          .select('content, created_at, model_used, tokens_used')
          .eq('user_id', user.id)
          .eq('insight_type', 'full_analysis')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Historial de feedback reciente
        supabase
          .from('outfit_feedback')
          .select('id, action, weight, outfit_snapshot, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),

        // Total de outfits
        supabase
          .from('outfits')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      if (insightRes.data) setInsight(insightRes.data)
      if (feedRes.data)    setFeedbackLog(feedRes.data)
      if (outfitRes.count !== null) setOutfitCount(outfitRes.count)

      setLoadingFeed(false)
    }

    loadData()
  }, [user?.id])

  // ── Refrescar análisis ────────────────────────────────────
  const handleRefreshAnalysis = useCallback(async () => {
    setAnalysisMsg('')
    const { data, error } = await analyzeStyle(true) // force refresh
    if (error) {
      setAnalysisMsg('Error al analizar. Inténtalo de nuevo.')
      return
    }
    // Recargar el insight guardado
    const { data: newInsight } = await supabase
      .from('style_insights')
      .select('content, created_at, model_used, tokens_used')
      .eq('user_id', user.id)
      .eq('insight_type', 'full_analysis')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (newInsight) setInsight(newInsight)
    setAnalysisMsg('✓ Análisis actualizado')
    setTimeout(() => setAnalysisMsg(''), 3000)
  }, [analyzeStyle, user?.id])

  // ── Helpers de perfil ─────────────────────────────────────
  const maxColorVal = Math.max(
    ...Object.values(profile?.liked_color_families ?? {}).map(Math.abs), 1
  )
  const maxFormalVal = Math.max(
    ...Object.values(profile?.liked_formality ?? {}).map(Math.abs), 1
  )
  const maxWarmthVal = Math.max(
    ...Object.values(profile?.liked_warmth ?? {}).map(Math.abs), 1
  )
  const maxVibeVal = Math.max(
    ...Object.values(profile?.liked_vibes ?? {}).filter(v => v > 0), 1
  )

  const topVibes = Object.entries(profile?.liked_vibes ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const totalInteractions = (profile?.total_likes ?? 0)
    + (profile?.total_saves ?? 0)
    + (profile?.total_dislikes ?? 0)
    + (profile?.total_skips ?? 0)

  const insightContent = insight?.content ?? {}
  const userName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario'

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar/>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="card p-6 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-black border-2 border-white/30 flex-shrink-0">
                {userName[0]?.toUpperCase() ?? '?'}
              </div>

              <div>
                <h1 className="text-xl font-bold">{userName}</h1>
                <p className="text-white/70 text-sm">{user?.email}</p>

                {/* Style headline */}
                {insightContent.headline ? (
                  <p className="mt-2 text-white/90 text-sm italic leading-snug max-w-xs">
                    "{insightContent.headline}"
                  </p>
                ) : profile?.style_summary ? (
                  <p className="mt-2 text-white/90 text-sm italic leading-snug max-w-xs">
                    "{profile.style_summary.slice(0, 80)}..."
                  </p>
                ) : null}
              </div>
            </div>

            {/* AI confidence badge */}
            {profile?.confidence_scores?.engagement_rate !== undefined && (
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-black">
                  {Math.round((profile.confidence_scores.engagement_rate ?? 0) * 100)}%
                </div>
                <div className="text-xs text-white/70">match rate</div>
              </div>
            )}
          </div>

          {/* Vibes */}
          {(insightContent.vibes ?? profile?.vibes ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {(insightContent.vibes ?? profile?.vibes ?? []).map((v) => (
                <span key={v} className="text-xs bg-white/20 text-white border border-white/30 px-2.5 py-0.5 rounded-full font-medium">
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Stats rápidas ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={outfitCount}              label="Outfits"    icon="👗" color="text-purple-600"/>
          <StatCard value={profile?.total_likes    ?? 0} label="Likes" icon="♥"  color="text-rose-500"/>
          <StatCard value={profile?.total_saves    ?? 0} label="Guardados" icon="🔖" color="text-blue-500"/>
          <StatCard value={profile?.total_dislikes ?? 0} label="No me gustó" icon="✕" color="text-gray-500"/>
        </div>

        {/* ── AI Style Analysis ─────────────────────────────── */}
        <Section title="Tu Estilo según la IA" icon="✦" defaultOpen>

          {profileLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-4 w-full rounded"/>)}
            </div>
          ) : insightContent.summary || profile?.style_summary ? (
            <div className="space-y-4">

              {/* Summary */}
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {insightContent.summary ?? profile?.style_summary}
                </p>
              </div>

              {/* Evolution */}
              {insightContent.evolution && (
                <div className="flex items-start gap-2.5">
                  <span className="text-purple-400 text-lg mt-0.5 flex-shrink-0">↗</span>
                  <p className="text-sm text-gray-600 italic">{insightContent.evolution}</p>
                </div>
              )}

              {/* Strengths */}
              {(insightContent.strengths ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Fortalezas
                  </p>
                  <ul className="space-y-1.5">
                    {insightContent.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunity */}
              {insightContent.opportunity && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-amber-500 flex-shrink-0">💡</span>
                  <p className="text-sm text-gray-700">{insightContent.opportunity}</p>
                </div>
              )}

              {/* Aesthetic tags */}
              {(insightContent.aesthetic ?? profile?.aesthetic_tags ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Aesthetics
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(insightContent.aesthetic ?? profile?.aesthetic_tags ?? []).map((tag) => (
                      <Chip key={tag} label={tag} variant="purple"/>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata del análisis */}
              {insight && (
                <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                  <span>
                    Actualizado: {new Date(insight.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <span>{insight.model_used} · {insight.tokens_used} tokens</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🤖</p>
              <p className="text-gray-500 text-sm">
                {totalInteractions < 3
                  ? 'Interactúa con algunos outfits para que la IA analice tu estilo'
                  : 'Análisis pendiente. Pulsa el botón para generarlo.'}
              </p>
            </div>
          )}

          {/* Botón de actualizar */}
          <div className="mt-4 flex items-center gap-3">
            <Button
              size="sm"
              variant={insightContent.summary ? 'secondary' : 'primary'}
              loading={aiLoading}
              onClick={handleRefreshAnalysis}
              disabled={totalInteractions < 3}
            >
              {aiLoading ? 'Analizando...' : insightContent.summary ? '↻ Actualizar análisis' : '✦ Analizar mi estilo'}
            </Button>
            {analysisMsg && (
              <span className="text-sm text-green-600 font-medium">{analysisMsg}</span>
            )}
            {totalInteractions < 3 && (
              <span className="text-xs text-gray-400">
                Necesitas al menos 3 interacciones ({totalInteractions}/3)
              </span>
            )}
          </div>
        </Section>

        {/* ── Preferencias Aprendidas ───────────────────────── */}
        <Section title="Lo que la IA aprendió de ti" icon="🧠">

          {totalInteractions === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <p className="text-2xl mb-2">📊</p>
              <p>Sin datos todavía. Da like, guarda o descarta outfits para que la IA aprenda.</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Familias de color */}
              {Object.keys(profile?.liked_color_families ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Familias de color preferidas
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { key: 'neutro',   label: 'Neutros',   emoji: '⬜', color: 'bg-gray-500'   },
                      { key: 'calido',   label: 'Cálidos',   emoji: '🔶', color: 'bg-orange-500' },
                      { key: 'frio',     label: 'Fríos',     emoji: '🔷', color: 'bg-blue-500'   },
                      { key: 'vibrante', label: 'Vibrantes', emoji: '🌸', color: 'bg-pink-500'   },
                    ].map(({ key, label, emoji, color }) => {
                      const val = profile.liked_color_families[key] ?? 0
                      if (val === 0) return null
                      return (
                        <PrefBar
                          key={key}
                          label={label}
                          emoji={emoji}
                          value={Math.round(val)}
                          maxVal={maxColorVal}
                          color={color}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Formalidad */}
              {Object.keys(profile?.liked_formality ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Formalidad preferida
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { key: 'casual', label: 'Casual', emoji: '😎', color: 'bg-green-500'  },
                      { key: 'smart',  label: 'Smart',  emoji: '🎯', color: 'bg-yellow-500' },
                      { key: 'formal', label: 'Formal', emoji: '👔', color: 'bg-slate-500'  },
                    ].map(({ key, label, emoji, color }) => {
                      const val = profile.liked_formality[key] ?? 0
                      if (val === 0) return null
                      return (
                        <PrefBar
                          key={key}
                          label={label}
                          emoji={emoji}
                          value={Math.round(val)}
                          maxVal={maxFormalVal}
                          color={color}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Warmth */}
              {Object.keys(profile?.liked_warmth ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Nivel térmico preferido
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { key: 'light',  label: 'Ligero',   emoji: '🌤️', color: 'bg-yellow-400' },
                      { key: 'medium', label: 'Templado', emoji: '🍂', color: 'bg-orange-400' },
                      { key: 'heavy',  label: 'Abrigado', emoji: '❄️', color: 'bg-blue-500'   },
                    ].map(({ key, label, emoji, color }) => {
                      const val = profile.liked_warmth[key] ?? 0
                      if (val === 0) return null
                      return (
                        <PrefBar
                          key={key}
                          label={label}
                          emoji={emoji}
                          value={Math.round(val)}
                          maxVal={maxWarmthVal}
                          color={color}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Vibes aprendidos */}
              {topVibes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Vibes detectados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topVibes.map(([vibe, weight], i) => (
                      <div
                        key={vibe}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm"
                        style={{
                          opacity: Math.max(0.5, 1 - i * 0.08),
                          borderColor: i < 3 ? 'rgb(168 85 247 / 0.4)' : 'rgb(209 213 219)',
                          backgroundColor: i < 3 ? 'rgb(250 245 255)' : 'rgb(249 250 251)',
                          color: i < 3 ? 'rgb(107 33 168)' : 'rgb(107 114 128)',
                        }}
                      >
                        {i === 0 && <span className="text-purple-400">✦</span>}
                        <span className="font-medium capitalize">{vibe}</span>
                        <span className="text-xs opacity-60">·{Math.round(weight)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Historial de Feedback ─────────────────────────── */}
        <Section title="Historial de interacciones" icon="📋" defaultOpen={false}>

          {loadingFeed ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded-xl flex-shrink-0"/>
                  <div className="flex-1 skeleton h-4 rounded"/>
                  <div className="skeleton h-3 w-16 rounded"/>
                </div>
              ))}
            </div>
          ) : feedbackLog.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm text-gray-400">Sin interacciones todavía</p>
              <Link href="/outfits">
                <Button size="sm" variant="outline" className="mt-3">
                  Ver outfits →
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              {/* Resumen rápido */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { actions: ['like', 'save', 'worn', 'share'], label: 'Positivos', color: 'text-green-600', bg: 'bg-green-50' },
                  { actions: ['edit'],                          label: 'Editados',  color: 'text-amber-600', bg: 'bg-amber-50' },
                  { actions: ['dislike', 'delete', 'skip'],     label: 'Negativos', color: 'text-red-500',   bg: 'bg-red-50'   },
                ].map(({ actions, label, color, bg }) => {
                  const count = feedbackLog.filter((f) => actions.includes(f.action)).length
                  return (
                    <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                      <p className={`text-xl font-black ${color}`}>{count}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  )
                })}
              </div>

              {/* Timeline */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-hide">
                {feedbackLog.map((item) => {
                  const meta = ACTION_META[item.action] ?? ACTION_META.skip
                  const snap = item.outfit_snapshot ?? {}
                  const date = new Date(item.created_at)
                  const relDate = (() => {
                    const diff = Date.now() - date.getTime()
                    const mins = Math.floor(diff / 60000)
                    const hrs  = Math.floor(diff / 3600000)
                    const days = Math.floor(diff / 86400000)
                    if (mins < 2)  return 'ahora'
                    if (mins < 60) return `hace ${mins}m`
                    if (hrs < 24)  return `hace ${hrs}h`
                    if (days < 7)  return `hace ${days}d`
                    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                  })()

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      {/* Acción icon */}
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm flex-shrink-0 ${meta.cls}`}>
                        {meta.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800">{meta.label}</span>
                          {snap.vibe && (
                            <span className="text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
                              {snap.vibe}
                            </span>
                          )}
                        </div>
                        {snap.top_color && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {snap.top_color} + {snap.bottom_color ?? '—'}
                            {snap.formalidades?.length > 0 && ` · ${snap.formalidades[0]}`}
                          </p>
                        )}
                      </div>

                      {/* Fecha */}
                      <span className="text-xs text-gray-400 flex-shrink-0">{relDate}</span>

                      {/* Peso */}
                      <span className={`text-xs font-bold flex-shrink-0 ${item.weight > 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {item.weight > 0 ? '+' : ''}{item.weight}
                      </span>
                    </div>
                  )
                })}
              </div>

              {feedbackLog.length >= 30 && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Mostrando las últimas 30 interacciones
                </p>
              )}
            </div>
          )}
        </Section>

        {/* ── Onboarding CTA ────────────────────────────────── */}
        {!profile?.onboarding_completed && (
          <div className="card p-5 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">✦</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Completa tu perfil de estilo</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Responde unas preguntas rápidas para que la IA entienda mejor tu estilo
                  y empiece a personalizar los outfits desde el primer día.
                </p>
                <Link href="/onboarding">
                  <Button size="sm" className="mt-3">Completar perfil →</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Danger zone ───────────────────────────────────── */}
        <Section title="Cuenta" icon="⚙️" defaultOpen={false}>
          <div className="space-y-3">
            <Link href="/onboarding">
              <button className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between text-sm text-gray-700 border border-gray-200">
                <span>Rehacer onboarding de estilo</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </Link>
            <button
              onClick={() => signOut().then(() => router.push('/login'))}
              className="w-full text-left p-3 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-between text-sm text-red-600 border border-red-200"
            >
              <span>Cerrar sesión</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </Section>

      </main>
    </div>
  )
}