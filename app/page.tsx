'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAthletes, getCoachProfile, initDB } from '@/lib/db'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<'coach' | 'athlete'>('coach')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Initialize DB on mount
    initDB()
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (role === 'coach') {
      const MASTER_USER = 'Administrador'
      const MASTER_PASS = 'Concorde2'
      const coachProfile = getCoachProfile()
      const coachUser = coachProfile.username || 'Oscar'
      const coachPass = coachProfile.password || 'Tocayo'

      const isMaster = username === MASTER_USER && password === MASTER_PASS
      const isCoach = username.toLowerCase() === coachUser.toLowerCase() && password === coachPass

      if (isMaster || isCoach) {
        router.push('/coach/dashboard')
      } else {
        setError('Usuario o contraseña incorrectos.')
      }
    } else {
      // Athlete login
      if (!username || !password) {
        setError('Por favor ingresa usuario y contraseña.')
        return
      }

      const athletes = getAthletes()
      const found = athletes.find(
        a => a.username?.toLowerCase() === username.trim().toLowerCase() && a.password === password
      )

      if (found) {
        localStorage.setItem('active_athlete_id', found.id)
        router.push('/athlete/dashboard')
      } else {
        setError('Usuario o contraseña de atleta incorrectos. (Prueba con carlos / 123)')
      }
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#1C1F23' }}
    >
      {/* ── LEFT HALF: Logo ── */}
      <div
        className="hidden md:flex flex-1 flex-col items-center justify-center relative"
        style={{ background: '#000000' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Óscar Barrón Entrenador"
            style={{ width: '80%', maxWidth: 700, filter: 'brightness(0) invert(1)' }}
          />
          <p
            className="mt-8 text-[11px] font-semibold uppercase tracking-widest text-center"
            style={{ color: '#A8FF00', letterSpacing: '0.14em' }}
          >
            Del punto de partida al máximo rendimiento
          </p>
        </div>
      </div>

      {/* ── VERTICAL DIVIDER ── */}
      <div
        className="hidden md:block w-px flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />

      {/* ── RIGHT HALF: Login Form ── */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-8 relative"
        style={{
          background: '#1C1F23',
          backgroundImage: 'radial-gradient(ellipse 70% 50% at 70% 50%, rgba(168,255,0,0.03) 0%, transparent 70%)',
        }}
      >
        {/* Mobile-only logo */}
        <div className="md:hidden mb-10 text-center animate-fade-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Óscar Barrón Entrenador"
            className="mx-auto"
            style={{ width: 160, filter: 'brightness(0) invert(1)' }}
          />
        </div>

        <div className="w-full max-w-sm animate-fade-up">
          {/* Form header */}
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#A8FF00' }}>
              Plataforma de entrenamiento
            </p>
            <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
              Iniciar sesión
            </h1>
          </div>

          {/* Role Tabs */}
          <div className="flex bg-[#121417] p-1 rounded-xl mb-7" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              type="button"
              onClick={() => { setRole('coach'); setError(''); }}
              className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer"
              style={{
                background: role === 'coach' ? '#252830' : 'transparent',
                color: role === 'coach' ? '#FFFFFF' : '#7A7E85',
                border: role === 'coach' ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              }}
            >
              📋 Entrenador
            </button>
            <button
              type="button"
              onClick={() => { setRole('athlete'); setError(''); }}
              className="flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer"
              style={{
                background: role === 'athlete' ? '#252830' : 'transparent',
                color: role === 'athlete' ? '#FFFFFF' : '#7A7E85',
                border: role === 'athlete' ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              }}
            >
              🏃 Atleta
            </button>
          </div>

          <p className="text-xs mb-6" style={{ color: '#7A7E85' }}>
            {role === 'coach'
              ? 'Ingresa tus credenciales o haz clic en Continuar.'
              : 'Introduce el usuario y contraseña asignados por tu entrenador.'}
          </p>

          {error && (
            <div
              className="mb-5 p-3 rounded-xl text-xs font-medium"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#FCA5A5',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#7A7E85' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={role === 'coach' ? 'entrenador (opcional)' : 'Tu usuario asignado'}
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#4A4F57] focus:outline-none transition-colors"
                style={{ background: '#121417', border: '1px solid #2A2D35' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#7A7E85' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#2A2D35' }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#7A7E85' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#4A4F57] focus:outline-none transition-colors"
                style={{ background: '#121417', border: '1px solid #2A2D35' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#7A7E85' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#2A2D35' }}
              />
            </div>

            <button
              type="submit"
              className="w-full btn-primary justify-center mt-2 cursor-pointer"
              style={{ borderRadius: '0.875rem', padding: '0.8rem 1.5rem' }}
            >
              <span>{role === 'coach' && !username && !password ? 'Continuar' : 'Iniciar Sesión'}</span>
              <span className="arrow">→</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="absolute bottom-6 text-[9px] font-semibold uppercase tracking-widest"
          style={{ color: '#2A2D35' }}
        >
          Plataforma Óscar Barrón · v0.2
        </p>
      </div>
    </div>
  )
}
