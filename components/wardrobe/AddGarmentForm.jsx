// components/wardrobe/AddGarmentForm.jsx
'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const CATEGORIAS = [
  { value: 'top',       label: '👕 Top / Camiseta' },
  { value: 'bottom',    label: '👖 Bottom / Pantalón' },
  { value: 'shoes',     label: '👟 Zapatos' },
  { value: 'outerwear', label: '🧥 Abrigo / Chaqueta' },
]

const FORMALIDADES = [
  { value: 'casual', label: '😎 Casual', desc: 'Para el día a día' },
  { value: 'smart',  label: '🎯 Smart',  desc: 'Semiformal'         },
  { value: 'formal', label: '👔 Formal', desc: 'Eventos formales'   },
]

const COLORES_SUGERIDOS = [
  'blanco', 'negro', 'gris', 'beige', 'marino',
  'rojo', 'naranja', 'amarillo', 'azul', 'verde',
  'morado', 'rosa', 'coral', 'camel', 'mostaza',
]

export default function AddGarmentForm({ onSubmit, onCancel }) {
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    nombre:     '',
    categoria:  '',
    color:      '',
    formalidad: '',
  })
  const [imagenFile,    setImagenFile]    = useState(null)
  const [previewUrl,    setPreviewUrl]    = useState(null)
  const [errors,        setErrors]        = useState({})
  const [loading,       setLoading]       = useState(false)
  const [submitError,   setSubmitError]   = useState('')
  const [dragOver,      setDragOver]      = useState(false)

  // Actualizar campos de texto
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setSubmitError('')
  }

  // Procesar archivo de imagen
  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imagen: 'Solo se admiten imágenes (JPG, PNG, WEBP)' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imagen: 'La imagen no puede superar los 5 MB' }))
      return
    }
    setImagenFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setErrors((prev) => ({ ...prev, imagen: '' }))
  }

  const handleFileInput   = (e) => handleFile(e.target.files?.[0])
  const handleDrop        = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }
  const handleDragOver    = (e) => { e.preventDefault(); setDragOver(true)  }
  const handleDragLeave   = ()  => setDragOver(false)

  // Validación
  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre     = 'El nombre es obligatorio'
    if (!form.categoria)     e.categoria  = 'Selecciona una categoría'
    if (!form.color.trim())  e.color      = 'Indica el color principal'
    if (!form.formalidad)    e.formalidad = 'Selecciona la formalidad'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setLoading(true)
    setSubmitError('')

    const { error } = await onSubmit({ ...form, imagenFile })

    setLoading(false)

    if (error) {
      setSubmitError(error)
      return
    }

    // Limpiar formulario en éxito
    setForm({ nombre: '', categoria: '', color: '', formalidad: '' })
    setImagenFile(null)
    setPreviewUrl(null)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {submitError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* ── Zona de imagen ────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Foto de la prenda <span className="text-gray-400 font-normal">(opcional)</span>
        </label>

        {previewUrl ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
            <Image src={previewUrl} alt="Preview" fill className="object-contain"/>
            <button
              type="button"
              onClick={() => { setImagenFile(null); setPreviewUrl(null) }}
              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-gray-500 hover:text-red-500 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center
              justify-center gap-2 cursor-pointer transition-all duration-200
              ${dragOver
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/50'
              }
            `}
          >
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p className="text-sm text-gray-400">
              Arrastra una imagen o{' '}
              <span className="text-purple-600 font-medium">haz clic</span>
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
        {errors.imagen && (
          <p className="text-xs text-red-500">{errors.imagen}</p>
        )}
      </div>

      {/* ── Nombre ──────────────────────────────────────────── */}
      <Input
        label="Nombre de la prenda"
        name="nombre"
        placeholder="Ej: Camiseta azul de algodón"
        value={form.nombre}
        onChange={handleChange}
        error={errors.nombre}
        required
      />

      {/* ── Categoría ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Categoría <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => { setForm((p) => ({ ...p, categoria: cat.value })); setErrors((p) => ({ ...p, categoria: '' })) }}
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
        {errors.categoria && (
          <p className="text-xs text-red-500">{errors.categoria}</p>
        )}
      </div>

      {/* ── Color ───────────────────────────────────────────── */}
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
        {/* Sugerencias de color */}
        <div className="flex flex-wrap gap-1.5">
          {COLORES_SUGERIDOS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setForm((p) => ({ ...p, color: c })); setErrors((p) => ({ ...p, color: '' })) }}
              className={`
                px-2.5 py-1 rounded-full text-xs border transition-all
                ${form.color === c
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }
              `}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Formalidad ──────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Formalidad <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FORMALIDADES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setForm((p) => ({ ...p, formalidad: f.value })); setErrors((p) => ({ ...p, formalidad: '' })) }}
              className={`
                p-3 rounded-xl border text-center transition-all duration-150
                ${form.formalidad === f.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className="text-lg">{f.label.split(' ')[0]}</div>
              <div className={`text-xs font-medium mt-0.5 ${form.formalidad === f.value ? 'text-purple-700' : 'text-gray-600'}`}>
                {f.label.split(' ')[1]}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
            </button>
          ))}
        </div>
        {errors.formalidad && (
          <p className="text-xs text-red-500">{errors.formalidad}</p>
        )}
      </div>

      {/* ── Botones ──────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={loading} className="flex-1">
          {loading ? 'Guardando...' : 'Añadir prenda'}
        </Button>
      </div>
    </form>
  )
}