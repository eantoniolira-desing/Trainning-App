'use client'

import { useState, useEffect } from 'react'
import { getCoachProfile, saveCoachProfile } from '@/lib/db'
import { CoachProfile } from '@/lib/types'

const inputCls =
  'w-full bg-white border border-[#D5D8DD] rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-[#7A7E85] transition-colors duration-150 focus:border-[#4A4F57] focus:outline-none'

const labelCls =
  'block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#4A4F57]'

export default function CoachProfilePage() {
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [form, setForm] = useState({ name: '', age: '', phone: '', email: '', photo: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [creds, setCreds] = useState({ username: '', password: '', confirm: '' })
  const [credsSaving, setCredsSaving] = useState(false)
  const [credsSuccess, setCredsSuccess] = useState(false)
  const [credsError, setCredsError] = useState('')

  useEffect(() => {
    const data = getCoachProfile()
    setProfile(data)
    setForm({
      name: data.name || '',
      age: data.age?.toString() || '',
      phone: data.phone || '',
      email: data.email || '',
      photo: data.photo || ''
    })
    setCreds({ username: data.username || '', password: '', confirm: '' })
  }, [])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setForm(prev => ({ ...prev, photo: base64String }))
    };
    reader.readAsDataURL(file)
  }

  const handleSaveCreds = (e: React.FormEvent) => {
    e.preventDefault()
    setCredsError('')
    if (!creds.username.trim()) { setCredsError('El usuario no puede estar vacío.'); return }
    if (creds.password.length < 4) { setCredsError('La contraseña debe tener al menos 4 caracteres.'); return }
    if (creds.password !== creds.confirm) { setCredsError('Las contraseñas no coinciden.'); return }

    setCredsSaving(true)
    const current = getCoachProfile()
    const updated: CoachProfile = { ...current, username: creds.username.trim(), password: creds.password }
    setTimeout(() => {
      saveCoachProfile(updated)
      setCreds({ username: creds.username.trim(), password: '', confirm: '' })
      setCredsSaving(false)
      setCredsSuccess(true)
      setTimeout(() => setCredsSuccess(false), 2500)
    }, 600)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return

    setSaving(true)
    const updated: CoachProfile = {
      name: form.name,
      age: parseInt(form.age) || 0,
      phone: form.phone,
      email: form.email,
      photo: form.photo
    }

    setTimeout(() => {
      saveCoachProfile(updated)
      setProfile(updated)
      setSaving(false)
      setSuccess(true)
      // Force custom event or dispatch to trigger layout update in real time
      window.dispatchEvent(new Event('coach-profile-updated'))
      setTimeout(() => setSuccess(false), 2000)
    }, 800)
  }

  if (!profile) {
    return (
      <div className="p-10 max-w-2xl animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-12"></div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <p className="eyebrow mb-2">Configuración</p>
        <h1
          className="text-3xl font-bold mt-2"
          style={{ color: '#1C1F23', letterSpacing: '-0.03em' }}
        >
          Perfil del Entrenador
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A7E85' }}>
          Personaliza tu información pública y de contacto
        </p>
      </div>

      {/* Main card */}
      <div
        className="rounded-2xl p-8 animate-fade-up delay-1"
        style={{ background: '#FFFFFF', border: '1px solid #E8E9EB' }}
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar upload section */}
          <div className="flex items-center gap-6 pb-6" style={{ borderBottom: '1px solid #E8E9EB' }}>
            <div className="relative group w-20 h-20 rounded-2xl overflow-hidden bg-[#F5F5F6] border border-[#E8E9EB] flex items-center justify-center flex-shrink-0">
              {form.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.photo}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-[#7A7E85]">
                  {form.name ? form.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'OB'}
                </span>
              )}
              
              {/* Overlay */}
              <label
                htmlFor="photo-upload"
                className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-center p-1"
              >
                <span>📷</span>
                <span>Subir Foto</span>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Foto de perfil</h3>
              <p className="text-xs text-[#7A7E85] mt-1">
                Sube una foto cuadrada (PNG o JPG). Se sincronizará con la barra lateral.
              </p>
              {form.photo && (
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, photo: '' }))}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold mt-2 block"
                >
                  Eliminar foto
                </button>
              )}
            </div>
          </div>

          {/* Form inputs */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className={labelCls}>Nombre Completo *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Óscar Barrón"
                className={inputCls}
              />
            </div>

            {/* Age + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Edad (años)</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={e => setForm(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="32"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Teléfono de Contacto</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+52 55 9876 5432"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Correo de Contacto *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contacto@oscarbarron.fit"
                className={inputCls}
              />
            </div>
          </div>

          {/* Alert messages */}
          {success && (
            <div
              className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-up"
              style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}
            >
              <span>✓</span>
              <span>¡Perfil guardado con éxito! Se han actualizado los cambios.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid #E8E9EB' }}>
            <button
              type="submit"
              disabled={saving || !form.name.trim() || !form.email.trim()}
              className="btn-primary flex-1 justify-center"
              style={{
                opacity: form.name.trim() && form.email.trim() ? 1 : 0.35,
                cursor: form.name.trim() && form.email.trim() ? 'pointer' : 'not-allowed',
                borderRadius: '0.75rem',
                padding: '0.625rem 1.25rem',
              }}
            >
              <span>{saving ? 'Guardando...' : 'Guardar Perfil'}</span>
              {!saving && <span className="arrow">→</span>}
            </button>
          </div>
        </form>
      </div>
      {/* Credentials card */}
      <div
        className="rounded-2xl p-8 animate-fade-up delay-2 mt-6"
        style={{ background: '#FFFFFF', border: '1px solid #E8E9EB' }}
      >
        <div className="mb-6 pb-4" style={{ borderBottom: '1px solid #E8E9EB' }}>
          <h2 className="text-sm font-bold text-[#1C1F23]">Credenciales de Acceso</h2>
          <p className="text-xs mt-1" style={{ color: '#7A7E85' }}>
            Cambia tu usuario y contraseña para entrar a la plataforma.
          </p>
        </div>

        <form onSubmit={handleSaveCreds} className="space-y-4">
          <div>
            <label className={labelCls}>Usuario</label>
            <input
              type="text"
              required
              value={creds.username}
              onChange={e => setCreds(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Tu usuario de acceso"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nueva contraseña</label>
              <input
                type="password"
                required
                value={creds.password}
                onChange={e => setCreds(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 4 caracteres"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Confirmar contraseña</label>
              <input
                type="password"
                required
                value={creds.confirm}
                onChange={e => setCreds(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="Repite la contraseña"
                className={inputCls}
              />
            </div>
          </div>

          {credsError && (
            <div className="p-3 rounded-xl text-xs font-medium" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {credsError}
            </div>
          )}

          {credsSuccess && (
            <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
              <span>✓</span> Credenciales actualizadas correctamente.
            </div>
          )}

          <div className="pt-4" style={{ borderTop: '1px solid #E8E9EB' }}>
            <button
              type="submit"
              disabled={credsSaving}
              className="btn-primary justify-center"
              style={{ borderRadius: '0.75rem', padding: '0.625rem 1.25rem', opacity: credsSaving ? 0.6 : 1 }}
            >
              <span>{credsSaving ? 'Guardando...' : 'Actualizar credenciales'}</span>
              {!credsSaving && <span className="arrow">→</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
