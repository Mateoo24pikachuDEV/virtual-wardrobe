// components/wardrobe/AddGarmentForm.jsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FORMALIDADES_VALIDAS } from '@/lib/outfitEngine'

const CATEGORIAS = [
  { value: 'top',       label: '👕 Top / Camiseta'   },
  { value: 'bottom',    label: '👖 Bottom / Pantalón' },
  { value: 'shoes',     label: '👟 Zapatos'           },
  { value: 'outerwear', label: '🧥 Abrigo / Chaqueta' },
]

const FORMALIDADES = [
  { value: 'casual', emoji: '😎', label: 'Casual', desc: 'Día a día'      },
  { value: 'smart',  emoji: '🎯', label: 'Smart',  desc: 'Semiformal'     },
  { value: 'formal', emoji: '👔', label: 'Formal', desc: 'Eventos'        },
]

const COLORES_SUGERIDOS = [
  'blanco', 'negro', 'gris', 'beige', 'marino',
  'rojo', 'naranja', 'amarillo', 'azul', 'verde',
  'morado', 'rosa', 'coral', 'camel', 'mostaza',
]

const WARMTH_OPTIONS = [
  { value: 'light',  emoji: '🌤️', label: 'Ligero',   desc: 'Verano / calor'  },
  { value: 'medium', emoji: '🍂', label: 'Medio',    desc: 'Primavera / otoño' },
  { value: 'heavy',  emoji: '❄️', label: 'Abrigado', desc: 'Invierno / frío'  },
]

const FORM_INITIAL = {
  nombre:      '',
  categoria:   '',
  color:       '',
  formalidades: [],   // ← array multi-select
  warmth:      '',
}

/**
 * AddGarmentForm — reutilizable para crear Y editar prendas.
 *
 * @prop {Object|null}   initialData   - si se pasa, el form se pre-carga (modo edición)
 * @prop {Function}      onSubmit      - ({ ...formData, imagenFile }) => { error }
 * @prop {Function}      onCancel
 * @prop {boolean}       isEditing     - cambia labels del botón
 */
export default function AddGarmentForm({
  initialData = null,
  onSubmit,
  onCancel,
  isEditing = false,
}) {
  const fileInputRef = useRef(null)

  // ── Estado del formulario ──────────────────────────────────
  const [form,       setForm]       = useState(FORM_INITIAL)
  const [imagenFile, setImagenFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [errors,     setErrors]     = useState({})
  const [loading,    setLoading]    = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [dragOver,   setDragOver]   = useState(false)

  // ── Pre-cargar datos si estamos editando ───────────────────
  useEffect(() => {
    if (initialData) {
      // Normalizar formalidades del campo viejo o nuevo
      const formalidades = Array.isArray(initialData.formalidades) && initialData.formalidades.length > 0
        ? initialData.formalidades
        : initialData.formalidad
          ? [initialData.formalidad]
          : ['casual']

      setForm({
        nombre:       initialData.nombre       || '',
        categoria:    initialData.categoria    || '',
        color:        initialData.color        || '',
        formalidades,
        warmth:       initialData.warmth       || '',
      })
      if (initialData.imagen_url) {
        setPreviewUrl(initialData.imagen_url)
      }
    }
  }, [initialData])

  // ── Handlers básicos ──────────────────────────────────────
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setSubmitError('')
  }

  // ── Toggle de formalidad (multi-select) ───────────────────
  const toggleFormalidad = (value) => {
    setForm((prev) => {
      const ya = prev.formalidades.includes(value)
      const nuevas = ya
        ? prev.formalidades.filter((f) => f !== value)
        : [...prev.formalidades, value]
      return { ...prev, formalidades: nuevas }
    })
    setErrors((prev) => ({ ...prev, formalidades: '' }))
    setSubmitError('')
  }

  // Seleccionar todas (universal)
  const toggleUniversal = () => {
    const esUniversal = FORMALIDADES_VALIDAS.every((f) => form.formalidades.includes(f))
    setForm((prev) => ({
      ...prev,
      formalidades: esUniversal ? [] : [...FORMALIDADES_VALIDAS],
    }))
    setErrors((prev) => ({ ...prev, formalidades: '' }))
  }

  const esUniversal = FORMALIDADES_VALIDAS.every((f) => form.formalidades.includes(f))

  // ── Archivo de imagen ─────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imagen: 'Solo imágenes (JPG, PNG, WEBP)' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imagen: 'Máximo 5 MB' }))
      return
    }
    setImagenFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setErrors((prev) => ({ ...prev, imagen: '' }))
  }

  const handleFileInput = (e) => handleFile(e.target.files?.[0])
  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }

  const removeImage = () => {
    setImagenFile(null)
    // En modo edición, si quitamos imagen borramos también la URL
    // (useGarments mantendrá la vieja si imagenFile === null)
    if (!isEditing) setPreviewUrl(null)
    else setPreviewUrl(initialData?.imagen_url || null)
  }

  // ── Validación ────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.nombre.trim())         e.nombre      = 'El nombre es obligatorio'
    if (!form.categoria)             e.categoria   = 'Selecciona una categoría'
    if (!form.color.trim())          e.color       = 'Indica el color principal'
    if (form.formalidades.length === 0)
      e.formalidades = 'Selecciona al menos una formalidad'
    return e
  }

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setLoading(true)
    setSubmitError('')

    const { error } = await onSubmit({
      ...form,
      imagenFile: imagenFile || null,
    })

    setLoading(false)
    if (error) { setSubmitError(error); return }

    // Limpiar (solo si es modo creación)
    if (!isEditing) {
      setForm(FORM_INITIAL)
      setImagenFile(null)
      setPreviewUrl(null)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* Error global */}
      {submitError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* ── IMAGEN ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Foto <span className="text-gray-400 font-normal">(opcional)</span>
        </label>

        {previewUrl ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
            <Image src={previewUrl} alt="Preview" fill className="object-contain"/>
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 bg-white/90 rounded-lg text-gray-500 hover:text-purple-600 shadow-sm transition-colors"
                title="Cambiar imagen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="p-1.5 bg-white/90 rounded-lg text-gray-500 hover:text-red-500 shadow-sm transition-colors"
                title="Quitar imagen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {imagenFile && (
              <div className="absolute bottom-2 left-2">
                <span className="badge bg-purple-100 text-purple-700 text-xs">Nueva imagen</span>
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
              w-full aspect-video rounded-xl border-2 border-dashed flex flex-col
              items-center justify-center gap-2 cursor-pointer transition-all duration-200
              ${dragOver
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/50'}
            `}
          >
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p className="text-sm text-gray-400">
              Arrastra o <span className="text-purple-600 font-medium">haz clic</span>
            </p>
            <p className="text-xs text-gray-300">JPG, PNG, WEBP — máx. 5 MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        {errors.imagen && <p className="text-xs text-red-500">{errors.imagen}</p>}
      </div>

      {/* ── NOMBRE ─────────────────────────────────────────── */}
      <Input
        label="Nombre de la prenda"
        name="nombre"
        placeholder="Ej: Camiseta azul de algodón"
        value={form.nombre}
        onChange={handleChange}
        error={errors.nombre}
        required
      />

      {/* ── CATEGORÍA ──────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Categoría <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                setForm((p) => ({ ...p, categoria: cat.value }))
                setErrors((p) => ({ ...p, categoria: '' }))
              }}
              className={`
                p-3 rounded-xl border text-sm font-medium text-left transition-all duration-150
                ${form.categoria === cat.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {errors.categoria && <p className="text-xs text-red-500">{errors.categoria}</p>}
      </div>

      {/* ── COLOR ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <Input
          label="Color principal"
          name="color"
          placeholder="Ej: azul marino, blanco roto..."
          value={form.color}
          onChange={handleChange}
          error={errors.color}
          required
        />
        <div className="flex flex-wrap gap-1.5">
          {COLORES_SUGERIDOS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setForm((p) => ({ ...p, color: c }))
                setErrors((p) => ({ ...p, color: '' }))
              }}
              className={`
                px-2.5 py-1 rounded-full text-xs border transition-all
                ${form.color === c
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}
              `}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── FORMALIDAD (MULTI-SELECT) ───────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Formalidad <span className="text-red-500">*</span>
          </label>
          {/* Botón Universal */}
          <button
            type="button"
            onClick={toggleUniversal}
            className={`
              text-xs px-2.5 py-1 rounded-full border font-medium transition-all
              ${esUniversal
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent'
                : 'border-gray-200 text-gray-500 hover:border-purple-300'}
            `}
          >
            {esUniversal ? '✨ Universal' : '+ Universal'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {FORMALIDADES.map((f) => {
            const selected = form.formalidades.includes(f.value)
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFormalidad(f.value)}
                className={`
                  relative p-3 rounded-xl border text-center transition-all duration-150
                  ${selected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'}
                `}
              >
                {/* Checkmark */}
                {selected && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                    </svg>
                  </span>
                )}
                <div className="text-xl">{f.emoji}</div>
                <div className={`text-xs font-medium mt-0.5 ${selected ? 'text-purple-700' : 'text-gray-700'}`}>
                  {f.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
              </button>
            )
          })}
        </div>

        {/* Preview de combinación seleccionada */}
        {form.formalidades.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-xs text-gray-500">
              Compatible con:{' '}
              <strong className="text-gray-700">
                {form.formalidades.join(', ')}
              </strong>
              {esUniversal && ' (combina con todo)'}
            </span>
          </div>
        )}

        {errors.formalidades && (
          <p className="text-xs text-red-500">{errors.formalidades}</p>
        )}
      </div>

      {/* ── WARMTH (opcional) ──────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Abrigo térmico{' '}
          <span className="text-gray-400 font-normal">(opcional, para sugerencias por clima)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {WARMTH_OPTIONS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  warmth: p.warmth === w.value ? '' : w.value,
                }))
              }
              className={`
                p-3 rounded-xl border text-center transition-all duration-150
                ${form.warmth === w.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'}
              `}
            >
              <div className="text-xl">{w.emoji}</div>
              <div className={`text-xs font-medium mt-0.5 ${form.warmth === w.value ? 'text-purple-700' : 'text-gray-700'}`}>
                {w.label}
              </div>
              <div className="text-xs text-gray-400">{w.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── BOTONES ────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={loading} className="flex-1">
          {loading
            ? (isEditing ? 'Guardando...' : 'Añadiendo...')
            : (isEditing ? 'Guardar cambios' : 'Añadir prenda')
          }
        </Button>
      </div>
    </form>
  )
}