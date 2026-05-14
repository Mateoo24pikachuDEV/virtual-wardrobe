// components/collections/CollectionForm.jsx
'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

/**
 * Formulario de crear / editar colección.
 * @prop {Object|null} initialData  - { nombre, descripcion } para edición
 * @prop {Function}    onSubmit     - async ({ nombre, descripcion }) => { error }
 * @prop {Function}    onCancel
 * @prop {boolean}     isEditing
 * @prop {boolean}     compact      - versión inline sin card (para AddToCollectionModal)
 */
export default function CollectionForm({
  initialData = null,
  onSubmit,
  onCancel,
  isEditing = false,
  compact   = false,
}) {
  const [form,    setForm]    = useState({ nombre: '', descripcion: '' })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre:      initialData.nombre      || '',
        descripcion: initialData.descripcion || '',
      })
    }
  }, [initialData?.nombre])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setApiError('')
  }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (form.nombre.trim().length > 60) e.nombre = 'Máximo 60 caracteres'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setLoading(true)
    const { error } = await onSubmit({
      nombre:      form.nombre.trim(),
      descripcion: form.descripcion.trim(),
    })
    setLoading(false)

    if (error) { setApiError(error); return }

    if (!isEditing) setForm({ nombre: '', descripcion: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {apiError}
        </div>
      )}

      <Input
        label={compact ? undefined : 'Nombre de la colección'}
        name="nombre"
        placeholder='Ej: "Invierno 2026", "Citas", "Minimal fits"...'
        value={form.nombre}
        onChange={handleChange}
        error={errors.nombre}
        required
        autoFocus
        maxLength={60}
      />

      {!compact && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Descripción <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            name="descripcion"
            placeholder="Describe esta colección..."
            value={form.descripcion}
            onChange={handleChange}
            rows={3}
            maxLength={200}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500
                       focus:border-transparent resize-none transition-all"
          />
          {form.descripcion.length > 0 && (
            <p className="text-xs text-gray-400 text-right">
              {form.descripcion.length}/200
            </p>
          )}
        </div>
      )}

      <div className={`flex gap-2 ${compact ? '' : 'pt-1'}`}>
        {onCancel && (
          <Button type="button" variant="secondary" size={compact ? 'sm' : 'md'} onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" size={compact ? 'sm' : 'md'} loading={loading} className="flex-1">
          {loading
            ? (isEditing ? 'Guardando...' : 'Creando...')
            : (isEditing ? 'Guardar cambios' : '+ Crear colección')
          }
        </Button>
      </div>
    </form>
  )
}