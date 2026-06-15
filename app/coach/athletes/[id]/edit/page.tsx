'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAthletes, saveAthletes } from '@/lib/db'
import { Athlete } from '@/lib/types'

const AVATAR_COLORS = ['#4A4F57', '#3a3f47', '#5a5f67', '#2d3035', '#4A4F57']
const PHOTO_KEY = (id: string) => `athlete-photo-${id}`

const inputCls =
  'w-full bg-white border border-[#D5D8DD] rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-[#7A7E85] transition-colors duration-150 focus:border-[#4A4F57] focus:outline-none'

const labelCls =
  'block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#4A4F57]'

export default function EditAthletePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [idx, setIdx] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    age: '',
    sport: '',
    goal: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    gender: 'hombre' as 'hombre' | 'mujer',
    startOfWeekDay: 'lunes' as 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo',
    zone1: '',
    zone2: '',
    zone3: '',
    pb5k: '',
    pb10k: '',
    pb21k: '',
    pb42k: ''
  })

  useEffect(() => {
    const all = getAthletes()
    const found = all.find(a => a.id === id)
    const index = all.findIndex(a => a.id === id)

    if (found) {
      setAthlete(found)
      setIdx(index >= 0 ? index : 0)
      setForm({
        name: found.name || '',
        age: String(found.age || ''),
        sport: found.sport || '',
        goal: found.goal || '',
        email: found.email || '',
        phone: found.phone || '',
        username: found.username || '',
        password: found.password || '',
        gender: found.gender || 'hombre',
        startOfWeekDay: found.startOfWeekDay || 'lunes',
        zone1: found.zone1 || '',
        zone2: found.zone2 || '',
        zone3: found.zone3 || '',
        pb5k: found.personalBests?.pb5k || '',
        pb10k: found.personalBests?.pb10k || '',
        pb21k: found.personalBests?.pb21k || '',
        pb42k: found.personalBests?.pb42k || ''
      })
    }

    try {
      setPhoto(localStorage.getItem(PHOTO_KEY(id)))
    } catch {}

    setMounted(true)
  }, [id])

  function handlePhoto(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      setPhoto(url)
      try {
        localStorage.setItem(PHOTO_KEY(id), url)
      } catch {}
    }
    reader.readAsDataURL(file)
  }

  const update = (field: string, value: string | number | boolean) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = () => {
    if (!form.name.trim() || !athlete) return

    const all = getAthletes()
    const updatedAthlete: Athlete = {
      ...athlete,
      name: form.name,
      age: parseInt(form.age) || 0,
      sport: form.sport,
      goal: form.goal,
      email: form.email,
      phone: form.phone,
      username: form.username.trim().toLowerCase(),
      password: form.password,
      gender: form.gender,
      startOfWeekDay: form.startOfWeekDay,
      zone1: form.zone1,
      zone2: form.zone2,
      zone3: form.zone3,
      personalBests: {
        pb5k: form.pb5k || undefined,
        pb10k: form.pb10k || undefined,
        pb21k: form.pb21k || undefined,
        pb42k: form.pb42k || undefined
      }
    }

    const updatedList = all.map(a => (a.id === id ? updatedAthlete : a))
    saveAthletes(updatedList)

    setSaved(true)
    setTimeout(() => router.push(`/coach/athletes/${id}`), 1600)
  }

  if (!mounted) {
    return (
      <div className="max-w-xl mx-auto p-10 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-1/2 mb-8"></div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="p-10 text-center">
        <p style={{ color: '#7A7E85' }}>Atleta no encontrado.</p>
        <Link href="/coach/dashboard" className="text-sm mt-2 inline-block" style={{ color: '#4A4F57' }}>
          Volver
        </Link>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#F5F5F6' }}>
        <div className="rounded-2xl p-12 text-center animate-fade-up" style={{ background: '#1C1F23' }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: '#A8FF00' }}
          >
            <span className="text-xl font-bold" style={{ color: '#1C1F23' }}>✓</span>
          </div>
          <p className="eyebrow mb-2">Perfil actualizado</p>
          <h2 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            Cambios guardados
          </h2>
          <p className="text-sm mt-2" style={{ color: '#7A7E85' }}>Redirigiendo al perfil…</p>
        </div>
      </div>
    )
  }

  const initials = athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  const isFormValid = form.name.trim() && form.username.trim() && form.password.trim()

  return (
    <div className="max-w-xl mx-auto p-10">
      {/* Back + header */}
      <div className="mb-8 animate-fade-up">
        <Link
          href={`/coach/athletes/${id}`}
          className="eyebrow transition-colors duration-150 mb-4 inline-block"
          style={{ color: '#4A4F57' }}
        >
          ← Perfil de {athlete.name}
        </Link>
        <h1
          className="text-3xl font-bold mt-2"
          style={{ color: '#1C1F23', letterSpacing: '-0.03em' }}
        >
          Editar perfil
        </h1>
      </div>

      {/* Form card */}
      <div
        className="rounded-2xl p-7 space-y-5 animate-fade-up delay-1"
        style={{ background: '#FFFFFF', border: '1px solid #E8E9EB' }}
      >
        {/* Photo section */}
        <div className="flex items-center gap-5 pb-5" style={{ borderBottom: '1px solid #E8E9EB' }}>
          <input ref={photoRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]) }} />

          <div className="relative group flex-shrink-0">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={athlete.name}
                className="w-16 h-16 rounded-xl object-cover"
                style={{ border: '2px solid #E8E9EB' }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ background: avatarBg }}
              >
                <span className="text-lg font-bold text-white">{initials}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >
              <span className="text-white text-xs">📷</span>
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Foto de perfil</p>
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="text-xs transition-colors duration-150 text-[#4A4F57] hover:text-[#1C1F23] font-semibold"
            >
              {photo ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {photo && (
              <>
                <span className="mx-2 text-xs" style={{ color: '#E8E9EB' }}>·</span>
                <button
                  type="button"
                  onClick={() => { setPhoto(null); try { localStorage.removeItem(PHOTO_KEY(id)) } catch {} }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  Eliminar
                </button>
              </>
            )}
            <p className="eyebrow mt-1" style={{ color: '#7A7E85' }}>JPG · PNG · WEBP · max 5 MB</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className={labelCls}>Nombre completo *</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} />
        </div>

        {/* Gender Select */}
        <div>
          <label className={labelCls}>Género *</label>
          <div className="flex bg-[#F5F5F6] p-1 rounded-xl" style={{ border: '1px solid #E8E9EB' }}>
            <button
              type="button"
              onClick={() => update('gender', 'hombre')}
              className="flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all"
              style={{
                background: form.gender === 'hombre' ? '#FFFFFF' : 'transparent',
                color: form.gender === 'hombre' ? '#1C1F23' : '#7A7E85',
                border: form.gender === 'hombre' ? '1px solid #D5D8DD' : '1px solid transparent',
                boxShadow: form.gender === 'hombre' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Hombre
            </button>
            <button
              type="button"
              onClick={() => update('gender', 'mujer')}
              className="flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all"
              style={{
                background: form.gender === 'mujer' ? '#FFFFFF' : 'transparent',
                color: form.gender === 'mujer' ? '#1C1F23' : '#7A7E85',
                border: form.gender === 'mujer' ? '1px solid #D5D8DD' : '1px solid transparent',
                boxShadow: form.gender === 'mujer' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Mujer
            </button>
          </div>
        </div>

        {/* Age + Sport */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Edad</label>
            <input type="number" value={form.age} onChange={e => update('age', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Deporte</label>
            <input type="text" value={form.sport} onChange={e => update('sport', e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Start of Week Day */}
        <div>
          <label className={labelCls}>Inicio de Semana Deportiva</label>
          <select
            value={form.startOfWeekDay}
            onChange={e => update('startOfWeekDay', e.target.value)}
            className={inputCls}
            style={{ color: '#1C1F23' }}
          >
            <option value="lunes">Lunes</option>
            <option value="martes">Martes</option>
            <option value="miercoles">Miércoles</option>
            <option value="jueves">Jueves</option>
            <option value="viernes">Viernes</option>
            <option value="sabado">Sábado</option>
            <option value="domingo">Domingo</option>
          </select>
        </div>

        {/* Goal */}
        <div>
          <label className={labelCls}>Objetivo</label>
          <textarea
            value={form.goal}
            onChange={e => update('goal', e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Access Credentials block */}
        <div className="p-4 rounded-xl border border-[#E8E9EB] bg-[#F9FAFB] space-y-4">
          <p className="font-bold text-xs text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>
            Credenciales de acceso
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Usuario *</label>
              <input
                type="text"
                value={form.username}
                onChange={e => update('username', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Contraseña *</label>
              <input
                type="text"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Running Zones block */}
        <div className="p-4 rounded-xl border border-[#E8E9EB] bg-[#F9FAFB] space-y-4">
          <p className="font-bold text-xs text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>
            Zonas de Carrera (Ritmos)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Zona 1 (Rodaje)</label>
              <input
                type="text"
                value={form.zone1}
                onChange={e => update('zone1', e.target.value)}
                placeholder="5:45-5:55"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Zona 2 (Umbral)</label>
              <input
                type="text"
                value={form.zone2}
                onChange={e => update('zone2', e.target.value)}
                placeholder="4:45-4:55"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Zona 3 (Vo2Max)</label>
              <input
                type="text"
                value={form.zone3}
                onChange={e => update('zone3', e.target.value)}
                placeholder="4:30-4:40"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Personal Bests block */}
        <div className="p-4 rounded-xl border border-[#E8E9EB] bg-[#F9FAFB] space-y-4">
          <p className="font-bold text-xs text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>
            Marcas Personales (PBs)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>PB 5K</label>
              <input
                type="text"
                value={form.pb5k}
                onChange={e => update('pb5k', e.target.value)}
                placeholder="Ej. 19:45"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>PB 10K</label>
              <input
                type="text"
                value={form.pb10k}
                onChange={e => update('pb10k', e.target.value)}
                placeholder="Ej. 42:10"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>PB 21K</label>
              <input
                type="text"
                value={form.pb21k}
                onChange={e => update('pb21k', e.target.value)}
                placeholder="Ej. 1h 45m"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>PB 42K</label>
              <input
                type="text"
                value={form.pb42k}
                onChange={e => update('pb42k', e.target.value)}
                placeholder="Ej. 3h 50m"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #E8E9EB' }} />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href={`/coach/athletes/${id}`}
            className="px-5 py-2.5 rounded-xl text-sm transition-colors duration-150"
            style={{ color: '#4A4F57', border: '1px solid #D5D8DD', background: '#FFFFFF' }}
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className="btn-primary flex-1 justify-center"
            style={{
              opacity: isFormValid ? 1 : 0.35,
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              borderRadius: '0.75rem',
              padding: '0.625rem 1.25rem',
            }}
          >
            <span>Guardar cambios</span>
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
