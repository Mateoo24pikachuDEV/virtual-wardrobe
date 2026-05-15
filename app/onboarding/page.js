// app/onboarding/page.js
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import supabase from '@/lib/supabase'
import Button from '@/components/ui/Button'

// ── Datos del onboarding ──────────────────────────────────────
const AESTHETICS = [
  { id: 'minimal',     label: 'Minimal',     emoji: '⬜', desc: 'Clean, simple, less is more',    colors: 'from-gray-100 to-white'      },
  { id: 'streetwear',  label: 'Streetwear',  emoji: '🏙️', desc: 'Urban, bold, oversized',         colors: 'from-gray-900 to-gray-700'   },
  { id: 'smart_casual',label: 'Smart Casual',emoji: '🎯', desc: 'Refined but relaxed',            colors: 'from-slate-200 to-blue-100'  },
  { id: 'preppy',      label: 'Preppy',      emoji: '🎓', desc: 'Classic, collegiate, polished',  colors: 'from-navy-100 to-green-100'  },
  { id: 'bohemian',    label: 'Bohemian',    emoji: '🌿', desc: 'Free, flowy, earthy tones',      colors: 'from-amber-100 to-orange-100'},
  { id: 'avant_garde', label: 'Avant Garde', emoji: '🎨', desc: 'Experimental, artistic, bold',  colors: 'from-purple-200 to-pink-100' },
  { id: 'old_money',   label: 'Old Money',   emoji: '🏛️', desc: 'Quiet luxury, timeless pieces', colors: 'from-stone-200 to-amber-50'  },
  { id: 'y2k',         label: 'Y2K / Retro', emoji: '💿', desc: 'Nostalgic, playful, colorful',  colors: 'from-pink-200 to-purple-200' },
]

const VIBES = [
  { id: 'effortless',  label: 'Effortless'  },
  { id: 'polished',    label: 'Polished'    },
  { id: 'bold',        label: 'Bold'        },
  { id: 'understated', label: 'Understated' },
  { id: 'playful',     label: 'Playful'     },
  { id: 'edgy',        label: 'Edgy'        },
  { id: 'romantic',    label: 'Romantic'    },
  { id: 'sporty',      label: 'Sporty'      },
  { id: 'elegant',     label: 'Elegant'     },
  { id: 'casual_cool', label: 'Casual Cool' },
]

const OCCASIONS = [
  { id: 'work',      label: '💼 Trabajo'       },
  { id: 'weekend',   label: '☕ Fin de semana' },
  { id: 'dates',     label: '🌹 Citas'         },
  { id: 'events',    label: '🎉 Eventos'       },
  { id: 'travel',    label: '✈️ Viajes'        },
  { id: 'gym',       label: '🏋️ Deporte'      },
  { id: 'nightout',  label: '🌙 Salidas'       },
  { id: 'homewear',  label: '🏠 En casa'       },
]

const COLOR_OPTIONS = [
  { id: 'blanco',  label: 'Blanco',  bg: 'bg-white border-gray-200'     },
  { id: 'negro',   label: 'Negro',   bg: 'bg-gray-900 text-white'        },
  { id: 'gris',    label: 'Gris',    bg: 'bg-gray-400'                   },
  { id: 'beige',   label: 'Beige',   bg: 'bg-amber-100'                  },
  { id: 'marino',  label: 'Marino',  bg: 'bg-blue-900 text-white'        },
  { id: 'azul',    label: 'Azul',    bg: 'bg-blue-500 text-white'        },
  { id: 'rojo',    label: 'Rojo',    bg: 'bg-red-500 text-white'         },
  { id: 'verde',   label: 'Verde',   bg: 'bg-green-600 text-white'       },
  { id: 'amarillo',label: 'Amarillo',bg: 'bg-yellow-400'                 },
  { id: 'naranja', label: 'Naranja', bg: 'bg-orange-500 text-white'      },
  { id: 'rosa',    label: 'Rosa',    bg: 'bg-pink-400'                   },
  { id: 'morado',  label: 'Morado',  bg: 'bg-purple-600 text-white'      },
  { id: 'camel',   label: 'Camel',   bg: 'bg-amber-700 text-white'       },
  { id: 'burdeos', label: 'Burdeos', bg: 'bg-red-900 text-white'         },
]

const TOTAL_STEPS = 4

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`
            h-1.5 flex-1 rounded-full transition-all duration-500
            ${i < step ? 'bg-purple-500' : i === step - 1 ? 'bg-purple-300' : 'bg-gray-200'}
          `}/>
        </div>
      ))}
      <span className="text-xs text-gray-400 flex-shrink-0">{step}/{TOTAL_STEPS}</span>
    </div>
  )
}

// ── Selector de chips ─────────────────────────────────────────
function ChipSelector({ options, selected, onToggle, max, keyField = 'id', labelField = 'label' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const key      = opt[keyField]
        const isSelected = selected.includes(key)
        const isDisabled = !isSelected && selected.length >= max

        return (
          <button
            key={key}
            type="button"
            disabled={isDisabled}
            onClick={() => onToggle(key)}
            className={`
              px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-150
              ${isSelected
                ? 'bg-purple-600 text-white shadow-sm'
                : isDisabled
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {opt[labelField] ?? key}
          </button>
        )
      })}
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────
export default function OnboardingPage() {
  const router       = useRouter()
  const { user }     = useAuth()
  const [step,       setStep]       = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Estado de respuestas
  const [answers, setAnswers] = useState({
    chosen_aesthetics:    [],
    chosen_vibes:         [],
    preferred_formality:  '',
    preferred_occasions:  [],
    climate_preference:   '',
    favorite_colors:      [],
    avoided_colors:       [],
  })

  const toggle = useCallback((field, value, max = 999) => {
    setAnswers((prev) => {
      const arr = prev[field] ?? []
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) }
      }
      if (arr.length >= max) return prev
      return { ...prev, [field]: [...arr, value] }
    })
  }, [])

  const set = useCallback((field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }, [])

  // ── Completar onboarding ───────────────────────────────────
  const handleComplete = async () => {
    if (!user) return
    setSubmitting(true)

    try {
      // 1. Guardar respuestas de onboarding
      await supabase.from('onboarding_responses').upsert([{
        user_id:              user.id,
        ...answers,
        completed_at:         new Date().toISOString(),
      }], { onConflict: 'user_id' })

      // 2. Calcular pesos iniciales del perfil basados en onboarding
      const initialWeights = buildInitialWeights(answers)

      // 3. Actualizar el perfil de estilo
      await supabase.from('user_style_profiles').upsert([{
        user_id:              user.id,
        ...initialWeights,
        onboarding_completed: true,
        needs_insight_refresh: true,
        updated_at:           new Date().toISOString(),
      }], { onConflict: 'user_id' })

      // 4. Llamar a AI para generar el perfil inicial
      await fetch('/api/ai/analyze-style', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: user.id }),
      })

      router.push('/wardrobe')
    } catch (err) {
      console.error('Onboarding error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg mb-4">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tu AI Stylist Personal</h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            Cuéntanos tu estilo para que podamos personalizar tu experiencia
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <ProgressBar step={step} />

          {/* ── PASO 1: Aesthetics ─────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                ¿Qué aesthetics te representan?
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Selecciona hasta 3 estilos que mejor te describan
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {AESTHETICS.map((a) => {
                  const isSelected = answers.chosen_aesthetics.includes(a.id)
                  const isDisabled = !isSelected && answers.chosen_aesthetics.length >= 3

                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggle('chosen_aesthetics', a.id, 3)}
                      className={`
                        relative p-3 rounded-2xl border-2 text-left transition-all duration-200
                        flex flex-col items-center gap-1.5
                        ${isSelected
                          ? 'border-purple-500 shadow-md'
                          : isDisabled
                            ? 'border-gray-100 opacity-40 cursor-not-allowed'
                            : 'border-gray-200 hover:border-purple-200 hover:shadow-sm'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      )}
                      <div className={`w-full h-12 rounded-xl bg-gradient-to-br ${a.colors} flex items-center justify-center text-xl`}>
                        {a.emoji}
                      </div>
                      <span className="text-xs font-semibold text-gray-800 text-center">{a.label}</span>
                      <span className="text-xs text-gray-400 text-center leading-tight">{a.desc}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-3">¿Qué vibes te identifican?</p>
                <ChipSelector
                  options={VIBES}
                  selected={answers.chosen_vibes}
                  onToggle={(v) => toggle('chosen_vibes', v, 4)}
                  max={4}
                />
              </div>
            </div>
          )}

          {/* ── PASO 2: Preferencias rápidas ───────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                ¿Para qué ocasiones vistes más?
              </h2>
              <p className="text-sm text-gray-500 mb-5">Selecciona todas las que apliquen</p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {OCCASIONS.map((o) => {
                  const isSelected = answers.preferred_occasions.includes(o.id)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle('preferred_occasions', o.id)}
                      className={`
                        p-3 rounded-2xl border-2 text-sm font-medium text-left
                        transition-all duration-150
                        ${isSelected
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Formalidad preferida</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'casual', label: '😎 Casual',   desc: 'Relajado'   },
                    { id: 'smart',  label: '🎯 Smart',    desc: 'Intermedio' },
                    { id: 'formal', label: '👔 Formal',   desc: 'Elegante'   },
                    { id: 'all',    label: '🌍 Todos',    desc: 'Versátil'   },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => set('preferred_formality', f.id)}
                      className={`
                        p-3 rounded-2xl border-2 text-center transition-all duration-150
                        ${answers.preferred_formality === f.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="text-lg">{f.label.split(' ')[0]}</div>
                      <div className={`text-xs font-medium mt-0.5 ${answers.preferred_formality === f.id ? 'text-purple-700' : 'text-gray-700'}`}>
                        {f.label.split(' ').slice(1).join(' ')}
                      </div>
                      <div className="text-xs text-gray-400">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">¿Cómo es tu clima?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cold',  label: '❄️', desc: 'Frío'     },
                    { id: 'mild',  label: '🍂', desc: 'Templado' },
                    { id: 'warm',  label: '☀️', desc: 'Cálido'   },
                    { id: 'mixed', label: '🌍', desc: 'Variable' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => set('climate_preference', c.id)}
                      className={`
                        p-3 rounded-2xl border-2 text-center transition-all
                        ${answers.climate_preference === c.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="text-xl">{c.label}</div>
                      <div className={`text-xs mt-0.5 font-medium ${answers.climate_preference === c.id ? 'text-purple-700' : 'text-gray-600'}`}>
                        {c.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 3: Colores ────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Tus colores favoritos
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                Selecciona los colores que más usas (o evitas)
              </p>

              <div className="mb-5">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  ❤️ Mis colores favoritos
                </p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const isFav     = answers.favorite_colors.includes(c.id)
                    const isAvoided = answers.avoided_colors.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={isAvoided}
                        onClick={() => toggle('favorite_colors', c.id, 6)}
                        className={`
                          w-14 h-14 rounded-2xl border-2 flex items-center justify-center
                          text-xs font-semibold transition-all duration-150
                          ${c.bg}
                          ${isFav
                            ? 'border-purple-500 scale-110 shadow-lg'
                            : isAvoided
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : 'border-transparent hover:border-gray-300 hover:scale-105'
                          }
                        `}
                      >
                        {isFav && (
                          <span className="text-base">✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  🚫 Colores que evito
                </p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const isFav     = answers.favorite_colors.includes(c.id)
                    const isAvoided = answers.avoided_colors.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={isFav}
                        onClick={() => toggle('avoided_colors', c.id, 5)}
                        className={`
                          w-14 h-14 rounded-2xl border-2 flex items-center justify-center
                          text-xs font-semibold transition-all duration-150
                          ${c.bg}
                          ${isAvoided
                            ? 'border-red-500 scale-110 shadow-lg opacity-70'
                            : isFav
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : 'border-transparent hover:border-gray-300 hover:scale-105'
                          }
                        `}
                      >
                        {isAvoided && <span className="text-base">✕</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 4: Confirmación ───────────────────────── */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg text-4xl">
                ✨
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">¡Perfil listo!</h2>
                <p className="text-sm text-gray-500 mt-2 max-w-sm">
                  Tu AI Stylist analizará tus preferencias y empezará a personalizar
                  los outfits para ti. El sistema mejora con cada interacción.
                </p>
              </div>

              {/* Resumen */}
              <div className="w-full bg-gray-50 rounded-2xl p-4 text-left space-y-2">
                {answers.chosen_aesthetics.length > 0 && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Aesthetics: </span>
                    <span className="text-gray-500">{answers.chosen_aesthetics.join(', ')}</span>
                  </p>
                )}
                {answers.preferred_formality && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Formalidad: </span>
                    <span className="text-gray-500">{answers.preferred_formality}</span>
                  </p>
                )}
                {answers.favorite_colors.length > 0 && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Colores favoritos: </span>
                    <span className="text-gray-500">{answers.favorite_colors.join(', ')}</span>
                  </p>
                )}
                {answers.chosen_vibes.length > 0 && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Vibes: </span>
                    <span className="text-gray-500">{answers.chosen_vibes.join(', ')}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Navegación ────────────────────────────────── */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1"
              >
                Atrás
              </Button>
            )}

            {step < TOTAL_STEPS ? (
              <Button
                size="lg"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1"
              >
                Continuar →
              </Button>
            ) : (
              <Button
                size="lg"
                loading={submitting}
                onClick={handleComplete}
                className="flex-1"
              >
                {submitting ? 'Creando tu perfil...' : '🚀 Empezar'}
              </Button>
            )}
          </div>

          {/* Skip option */}
          {step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={() => setStep(TOTAL_STEPS)}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Omitir por ahora
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper: construir pesos iniciales del onboarding ──────────
function buildInitialWeights(answers) {
  const liked_color_families = {}
  const liked_formality      = {}
  const liked_colors         = {}
  const disliked_colors      = {}

  // Desde colores favoritos → detectar familia
  const COLOR_FAMILY_MAP = {
    blanco:   'neutro', negro: 'neutro', gris: 'neutro',
    beige:    'neutro', marino: 'neutro', camel: 'neutro',
    azul:     'frio',   verde: 'frio',   morado: 'frio',
    rojo:     'calido', naranja: 'calido', amarillo: 'calido', burdeos: 'calido',
    rosa:     'vibrante',
  }

  answers.favorite_colors.forEach((c) => {
    liked_colors[c] = (liked_colors[c] ?? 0) + 10
    const fam = COLOR_FAMILY_MAP[c]
    if (fam) liked_color_families[fam] = (liked_color_families[fam] ?? 0) + 8
  })

  answers.avoided_colors.forEach((c) => {
    disliked_colors[c] = (disliked_colors[c] ?? 0) + 10
  })

  // Formalidad inicial
  if (answers.preferred_formality === 'all') {
    liked_formality.casual = 8
    liked_formality.smart  = 8
    liked_formality.formal = 8
  } else if (answers.preferred_formality) {
    liked_formality[answers.preferred_formality] = 15
    // Adjacent styles con menor peso
    const adjacent = { casual: ['smart'], smart: ['casual', 'formal'], formal: ['smart'] }
    adjacent[answers.preferred_formality]?.forEach((adj) => {
      liked_formality[adj] = (liked_formality[adj] ?? 0) + 5
    })
  }

  // Clima → warmth
  const liked_warmth = {}
  const climateWarmth = {
    cold:  { heavy: 15, medium: 8 },
    mild:  { medium: 15, light: 5, heavy: 5 },
    warm:  { light: 15, medium: 5 },
    mixed: { light: 8, medium: 10, heavy: 8 },
  }
  const warmthMap = climateWarmth[answers.climate_preference]
  if (warmthMap) Object.assign(liked_warmth, warmthMap)

  return {
    liked_colors,
    disliked_colors,
    liked_color_families,
    liked_formality,
    liked_warmth,
  }
}