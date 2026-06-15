'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAthletes, saveAthletes } from '@/lib/db'
import { Athlete } from '@/lib/types'

const inputCls =
  'w-full bg-white border border-[#D5D8DD] rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-[#7A7E85] transition-colors duration-150 focus:border-[#4A4F57] focus:outline-none'

const labelCls =
  'block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#4A4F57]'

export default function NewAthletePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    age: '',
    sport: '',
    goal: '',
    email: '',
    phone: '',
    username: '',
    password: '123', // default password suggestion
    gender: 'hombre' as 'hombre' | 'mujer',
    startOfWeekDay: 'lunes' as 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo',
    zone1: '5:45-5:55 min/km',
    zone2: '4:45-4:55 min/km',
    zone3: '4:30-4:40 min/km',
    pb5k: '',
    pb10k: '',
    pb21k: '',
    pb42k: ''
  })
  const [saved, setSaved] = useState(false)

  const update = (field: string, value: string | number | boolean) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return

    const newAthlete: Athlete = {
      id: Date.now().toString(),
      name: form.name,
      age: parseInt(form.age) || 0,
      sport: form.sport,
      goal: form.goal,
      email: form.email,
      phone: form.phone,
      active: true,
      joinedAt: new Date().toISOString().split('T')[0],
      username: form.username.trim().toLowerCase(),
      password: form.password,
      zone1: form.zone1,
      zone2: form.zone2,
      zone3: form.zone3,
      gender: form.gender,
      status: 'por_trabajar', // initial status column
      startOfWeekDay: form.startOfWeekDay,
      personalBests: {
        pb5k: form.pb5k || undefined,
        pb10k: form.pb10k || undefined,
        pb21k: form.pb21k || undefined,
        pb42k: form.pb42k || undefined
      },
      goals: []
    }

    const currentAthletes = getAthletes()
    saveAthletes([...currentAthletes, newAthlete])

    setSaved(true)
    setTimeout(() => router.push('/coach/dashboard'), 1600)
  }

  // Pre-fill username based on name for convenience
  const handleNameChange = (val: string) => {
    update('name', val)
    const firstWord = val.trim().split(' ')[0].toLowerCase()
    update('username', firstWord)
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
          <p className="eyebrow mb-2">Perfil creado</p>
          <h2 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            Atleta registrado
          </h2>
          <p className="text-sm mt-2" style={{ color: '#7A7E85' }}>Redirigiendo al dashboard…</p>
        </div>
      </div>
    )
  }

  const isFormValid = form.name.trim() && form.username.trim() && form.password.trim()

  return (
    <div className="max-w-xl mx-auto p-10">
      {/* Back + header */}
      <div className="mb-8 animate-fade-up">
        <Link
          href="/coach/dashboard"
          className="eyebrow transition-colors duration-150 mb-4 inline-block"
          style={{ color: '#4A4F57' }}
        >
          ← Volver
        </Link>
        <h1
          className="text-3xl font-bold mt-2"
          style={{ color: '#1C1F23', letterSpacing: '-0.03em' }}
        >
          Nuevo atleta
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A7E85' }}>
          Completa los datos del perfil, zonas de carrera y asigna sus credenciales de acceso
        </p>
      </div>

      {/* Form card */}
      <div
        className="rounded-2xl p-7 animate-fade-up delay-1"
        style={{ background: '#FFFFFF', border: '1px solid #E8E9EB' }}
      >
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className={labelCls}>
              Nombre completo *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Ej. Carlos Mendoza"
              className={inputCls}
            />
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
              <input
                type="number"
                value={form.age}
                onChange={e => update('age', e.target.value)}
                placeholder="24"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Deporte</label>
              <input
                type="text"
                value={form.sport}
                onChange={e => update('sport', e.target.value)}
                placeholder="Atletismo, CrossFit…"
                className={inputCls}
              />
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
              placeholder="Ej. Preparación para maratón en octubre"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="atleta@email.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="+52 55 1234 5678"
                className={inputCls}
              />
            </div>
          </div>

          {/* Access Credentials block */}
          <div className="p-5 rounded-xl border border-[#E8E9EB]" style={{ background: '#F9FAFB' }}>
            <p className="font-bold text-xs text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>
              Credenciales de acceso para el atleta
            </p>
            <p className="text-xs text-[#7A7E85] mb-4">
              Estos datos le permitirán al atleta iniciar sesión en la plataforma y ver su plan de entrenamiento.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Usuario *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => update('username', e.target.value)}
                  placeholder="carlos"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Contraseña *</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="123"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Running Zones block */}
          <div className="p-5 rounded-xl border border-[#E8E9EB]" style={{ background: '#F9FAFB' }}>
            <p className="font-bold text-xs text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>
              Zonas de Carrera (Ritmos)
            </p>
            <p className="text-xs text-[#7A7E85] mb-4">
              Configura los ritmos de paso (min/km) para las tres zonas de rodaje y competencia.
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
          <div className="p-5 rounded-xl border border-[#E8E9EB]" style={{ background: '#F9FAFB' }}>
            <p className="font-bold text-xs text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>
              Marcas Personales (PBs)
            </p>
            <p className="text-xs text-[#7A7E85] mb-4">
              Registra las mejores marcas históricas del atleta (opcional).
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
                <label className={labelCls}>PB 21K (Medio Maratón)</label>
                <input
                  type="text"
                  value={form.pb21k}
                  onChange={e => update('pb21k', e.target.value)}
                  placeholder="Ej. 1h 45m"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>PB 42K (Maratón)</label>
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
              href="/coach/dashboard"
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
              <span>Crear atleta</span>
              <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
