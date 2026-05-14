// components/outfits/ManualOutfitBuilder.jsx
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import {
  calcularScoreOutfit,
  formalidadesEnComun,
  getFormalidades,
} from '@/lib/outfitEngine'

// -----------------------------------------------------------
// Configuración de secciones del builder
// -----------------------------------------------------------
const SECTIONS = [
  { key: 'top',       label: 'Top',         emoji: '👕', required: true,  multiple: false, max: 1 },
  { key: 'bottom',    label: 'Bottom',      emoji: '👖', required: true,  multiple: false, max: 1 },
  { key: 'shoes',     label: 'Zapatos',     emoji: '👟', required: true,  multiple: false, max: 1 },
  { key: 'outerwear', label: 'Outerwear',   emoji: '🧥', required: false, multiple: false, max: 1 },
  { key: 'accessory', label: 'Accesorios',  emoji: '👜', required: false, multiple: true,  max: 3 },
]

const EMOJI_FALLBACK = {
  top: '👕', bottom: '👖', shoes: '👟', outerwear: '🧥', accessory: '👜',
}

const FAMILIA_DOT = {
  neutro: 'bg-gray-400', calido: 'bg-orange-400',
  frio: 'bg-blue-400', vibrante: 'bg-pink-400',
}

// -----------------------------------------------------------
// Subcomponente: tarjeta mini seleccionable
// -----------------------------------------------------------
function PrendaSelectCard({ prenda, isSelected, isDisabled, onSelect }) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onSelect(prenda)}
      className={`
        relative flex-shrink-0 w-[88px] flex flex-col items-center gap-1.5
        rounded-xl border-2 p-1.5 transition-all duration-150 group
        ${isSelected
          ? 'border-purple-500 bg-purple-50 shadow-sm'
          : isDisabled
            ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
            : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm cursor-pointer'
        }
      `}
    >
      {/* Checkmark badge */}
      {isSelected && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-purple-500 rounded-full
                         flex items-center justify-center z-10 shadow-sm">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
          </svg>
        </span>
      )}

      {/* Imagen */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
        {prenda.imagen_url && !imgError ? (
          <Image
            src={prenda.imagen_url}
            alt={prenda.nombre}
            fill sizes="88px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
            {EMOJI_FALLBACK[prenda.categoria] || '👕'}
          </div>
        )}
      </div>

      {/* Nombre */}
      <p className="text-xs text-gray-700 text-center leading-tight line-clamp-2 w-full px-0.5 font-medium">
        {prenda.nombre}
      </p>

      {/* Color indicator */}
      <div className="flex items-center gap-1 w-full justify-center">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${FAMILIA_DOT[prenda.color_familia] || 'bg-gray-300'}`}/>
        <span className="text-xs text-gray-400 capitalize truncate max-w-[56px]">
          {prenda.color}
        </span>
      </div>
    </button>
  )
}

// -----------------------------------------------------------
// Subcomponente: preview compacto del outfit actual
// -----------------------------------------------------------
function OutfitPreview({ selected, score, formalidades }) {
  const slots = [
    { key: 'top',       prenda: selected.top,       label: 'Top'    },
    { key: 'bottom',    prenda: selected.bottom,     label: 'Bottom' },
    { key: 'shoes',     prenda: selected.shoes,      label: 'Shoes'  },
    { key: 'outerwear', prenda: selected.outerwear,  label: 'Outer'  },
  ]

  const scoreColor =
    score === null     ? 'bg-gray-200' :
    score >= 80        ? 'bg-green-500' :
    score >= 60        ? 'bg-yellow-500' :
    score >= 40        ? 'bg-orange-400' : 'bg-red-400'

  const scoreLabel =
    score === null  ? '—' :
    score >= 80     ? '🔥 Excelente' :
    score >= 60     ? '✨ Bueno' :
    score >= 40     ? '👍 Aceptable' : '⚠️ Bajo'

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">

      {/* Prendas seleccionadas */}
      <div className="flex items-end gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {slots.map(({ key, prenda, label }) => (
          <PreviewSlot key={key} prenda={prenda} label={label} />
        ))}

        {/* Accesorios */}
        {selected.accessories.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {selected.accessories.map((acc) => (
                <PreviewSlot key={acc.id} prenda={acc} label="Acc" small />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Score */}
      {score !== null ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Compatibilidad</span>
            <span className="font-semibold text-gray-700">{scoreLabel} · {score}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${scoreColor}`}
              style={{ width: `${score}%` }}
            />
          </div>
          {formalidades.length > 0 && (
            <p className="text-xs text-gray-400 capitalize">
              Estilo: <strong className="text-gray-600">{formalidades.join(', ')}</strong>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-1">
          Selecciona top, bottom y zapatos para ver el score
        </p>
      )}
    </div>
  )
}

function PreviewSlot({ prenda, label, small = false }) {
  const [imgError, setImgError] = useState(false)
  const size = small ? 'w-10 h-10' : 'w-14 h-14'

  return (
    <div className={`flex flex-col items-center gap-1 flex-shrink-0 ${small ? 'w-10' : 'w-14'}`}>
      <div className={`${size} rounded-xl overflow-hidden border-2 ${prenda ? 'border-purple-200 bg-gray-100' : 'border-dashed border-gray-200 bg-gray-50'} flex items-center justify-center`}>
        {prenda ? (
          prenda.imagen_url && !imgError ? (
            <div className="relative w-full h-full">
              <Image
                src={prenda.imagen_url}
                alt={prenda.nombre}
                fill sizes={small ? '40px' : '56px'}
                className="object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <span className="text-xl">{EMOJI_FALLBACK[prenda.categoria] || '👕'}</span>
          )
        ) : (
          <span className="text-gray-300 text-xs font-medium">+</span>
        )}
      </div>
      <span className={`text-center leading-tight ${small ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
        {prenda ? (
          <span className="text-gray-600 font-medium line-clamp-1">
            {prenda.nombre.split(' ')[0]}
          </span>
        ) : label}
      </span>
    </div>
  )
}

// -----------------------------------------------------------
// Subcomponente: sección de categoría con scroll horizontal
// -----------------------------------------------------------
function CategorySection({ section, prendas, selected, onSelect }) {
  const [search, setSearch] = useState('')

  const prendasFiltradas = prendas.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.color.toLowerCase().includes(search.toLowerCase())
  )

  // Determinar si una prenda está deshabilitada por límite de selección
  const isDisabled = (prenda) => {
    if (!section.multiple) return false
    const acc = selected.accessories || []
    return acc.length >= section.max && !acc.some((a) => a.id === prenda.id)
  }

  const isSelected = (prenda) => {
    if (section.key === 'accessory') {
      return (selected.accessories || []).some((a) => a.id === prenda.id)
    }
    return selected[section.key]?.id === prenda.id
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header de sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{section.emoji}</span>
          <span className="text-sm font-semibold text-gray-800">{section.label}</span>
          {section.required && (
            <span className="text-red-400 text-xs">*</span>
          )}
          {section.multiple && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              máx. {section.max}
            </span>
          )}
        </div>

        {/* Selección activa */}
        {!section.multiple && selected[section.key] && (
          <button
            type="button"
            onClick={() => onSelect(section.key, null, false)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            ✕ Quitar
          </button>
        )}
        {section.multiple && (selected.accessories || []).length > 0 && (
          <button
            type="button"
            onClick={() => onSelect(section.key, null, true)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            ✕ Quitar todos
          </button>
        )}
      </div>

      {prendas.length === 0 ? (
        <div className="h-24 flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400">
            No tienes {section.label.toLowerCase()}s en tu armario
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Search si hay más de 4 prendas */}
          {prendas.length > 4 && (
            <input
              type="text"
              placeholder={`Buscar ${section.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            />
          )}

          {/* Scroll horizontal */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {prendasFiltradas.length > 0 ? prendasFiltradas.map((prenda) => (
              <PrendaSelectCard
                key={prenda.id}
                prenda={prenda}
                isSelected={isSelected(prenda)}
                isDisabled={isDisabled(prenda)}
                onSelect={(p) => onSelect(section.key, p, section.multiple)}
              />
            )) : (
              <p className="text-xs text-gray-400 py-4 px-2">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------
// COMPONENTE PRINCIPAL
// -----------------------------------------------------------
/**
 * @prop {Object[]} prendas    - todas las prendas del usuario
 * @prop {Function} onSave     - async (outfitData) => { error }
 * @prop {Function} onCancel
 */
/**
 * @prop {Object[]}    prendas       - todas las prendas del usuario
 * @prop {Function}    onSave        - async (outfitData) => { error }
 * @prop {Function}    onCancel
 * @prop {Object|null} initialOutfit - outfit a editar (null = crear nuevo)
 * @prop {boolean}     isEditing     - true cuando estamos editando
 */
export default function ManualOutfitBuilder({
  prendas,
  onSave,
  onCancel,
  initialOutfit = null,
  isEditing     = false,
}) {
  // Estado de selección
  const [selected, setSelected] = useState({
    top:         null,
    bottom:      null,
    shoes:       null,
    outerwear:   null,
    accessories: [],
  })
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')

// Pre-cargar selección cuando se abre en modo edición
  // Usa initialOutfit?.id como dependency para evitar re-renders innecesarios
  useEffect(() => {
    if (initialOutfit) {
      setSelected({
        top:         initialOutfit._top       || null,
        bottom:      initialOutfit._bottom    || null,
        shoes:       initialOutfit._shoes     || null,
        outerwear:   initialOutfit._outerwear || null,
        accessories: initialOutfit._accessories || [],
      })
    } else {
      // Modo creación: resetear formulario
      setSelected({ top: null, bottom: null, shoes: null, outerwear: null, accessories: [] })
    }
    setSaveError('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOutfit?.id])

  // Prendas por categoría (memo para no recalcular)
  const prendasPorCategoria = useMemo(() => ({
    top:       prendas.filter((p) => p.categoria === 'top'),
    bottom:    prendas.filter((p) => p.categoria === 'bottom'),
    shoes:     prendas.filter((p) => p.categoria === 'shoes'),
    outerwear: prendas.filter((p) => p.categoria === 'outerwear'),
    accessory: prendas.filter((p) => p.categoria === 'accessory'),
  }), [prendas])

  // Score en vivo (null si faltan prendas obligatorias)
  const liveScore = useMemo(() => {
    if (!selected.top || !selected.bottom || !selected.shoes) return null
    return calcularScoreOutfit(
      selected.top,
      selected.bottom,
      selected.shoes,
      selected.outerwear,
      selected.accessories
    )
  }, [selected])

  // Formalidades en común del outfit actual
  const formalidades = useMemo(() => {
    const obligatorias = [selected.top, selected.bottom, selected.shoes, selected.outerwear]
      .filter(Boolean)
    return formalidadesEnComun(obligatorias)
  }, [selected])

  // Validación para guardar
  const canSave = selected.top && selected.bottom && selected.shoes && liveScore !== null && liveScore > 0

  const validationMsg = useMemo(() => {
    if (!selected.top)    return 'Selecciona un top'
    if (!selected.bottom) return 'Selecciona un bottom'
    if (!selected.shoes)  return 'Selecciona unos zapatos'
    if (liveScore === 0)  return '⚠️ Estas prendas no son compatibles (formalidades distintas)'
    return null
  }, [selected, liveScore])

  // Handler de selección unificado
  const handleSelect = useCallback((categoryKey, prenda, isMultiple) => {
    setSelected((prev) => {
      if (categoryKey === 'accessory') {
        if (prenda === null) {
          // Quitar todos
          return { ...prev, accessories: [] }
        }
        const ya = prev.accessories.some((a) => a.id === prenda.id)
        if (ya) {
          return { ...prev, accessories: prev.accessories.filter((a) => a.id !== prenda.id) }
        }
        if (prev.accessories.length >= 3) return prev // límite alcanzado
        return { ...prev, accessories: [...prev.accessories, prenda] }
      }

      if (!isMultiple) {
        // Toggle: si ya está seleccionada y se hace clic de nuevo, deseleccionar
        const esMisma = prev[categoryKey]?.id === prenda?.id
        return { ...prev, [categoryKey]: esMisma ? null : prenda }
      }

      return { ...prev, [categoryKey]: prenda }
    })
    setSaveError('')
  }, [])

// Guardar / actualizar outfit
  const handleSave = async () => {
    if (!canSave) return

    setSaving(true)
    setSaveError('')

    const outfitData = {
      top_id:        selected.top.id,
      bottom_id:     selected.bottom.id,
      shoes_id:      selected.shoes.id,
      outerwear_id:  selected.outerwear?.id || null,
      score:         liveScore,
      // source: el padre decide si es 'manual' o mantiene el existente
      source:        initialOutfit?.source || 'manual',
      _top:          selected.top,
      _bottom:       selected.bottom,
      _shoes:        selected.shoes,
      _outerwear:    selected.outerwear || null,
      _accessories:  selected.accessories,
      accessory_ids: selected.accessories.map((a) => a.id),
    }

    const { error } = await onSave(outfitData)

    setSaving(false)

    if (error) {
      setSaveError(error)
      return
    }

    // En creación: resetear. En edición: el padre cierra el modal.
    if (!isEditing) {
      setSelected({ top: null, bottom: null, shoes: null, outerwear: null, accessories: [] })
    }
    onCancel()
  }

  // -----------------------------------------------------------
  return (
    <div className="flex flex-col gap-5">

      {/* ── PREVIEW LIVE ──────────────────────────────────── */}
      <OutfitPreview
        selected={selected}
        score={liveScore}
        formalidades={formalidades}
      />

      {/* ── SEPARADOR ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100"/>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          Selecciona tus prendas
        </span>
        <div className="flex-1 h-px bg-gray-100"/>
      </div>

      {/* ── SECCIONES POR CATEGORÍA ───────────────────────── */}
      {SECTIONS.map((section) => (
        <CategorySection
          key={section.key}
          section={section}
          prendas={prendasPorCategoria[section.key] || []}
          selected={selected}
          onSelect={handleSelect}
        />
      ))}

      {/* ── VALIDACIÓN / ERROR ────────────────────────────── */}
      {(validationMsg || saveError) && (
        <div className={`
          p-3 rounded-xl text-sm border flex items-start gap-2
          ${liveScore === 0 || saveError
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'}
        `}>
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {saveError || validationMsg}
        </div>
      )}

      {/* ── BOTONES ───────────────────────────────────────── */}
      <div className="flex gap-3 pt-1 sticky bottom-0 bg-white pb-1">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="lg"
          loading={saving}
          disabled={!canSave}
          onClick={handleSave}
          className="flex-1"
        >
{saving
            ? (isEditing ? 'Actualizando...' : 'Guardando...')
            : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={isEditing
                      ? 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                      : 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z'
                    }
                  />
                </svg>
                {isEditing ? 'Guardar cambios' : 'Guardar outfit manual'}
                {liveScore !== null && liveScore > 0 && (
                  <span className="ml-1 text-xs opacity-80">({liveScore}/100)</span>
                )}
              </>
            )
          }
        </Button>
      </div>
    </div>
  )
}