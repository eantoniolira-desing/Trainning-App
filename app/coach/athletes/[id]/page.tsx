'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getAthletes, getPlans, saveAthletes, getStrengthLibrary, addReplyToSession, getAthleteNotifications, saveAthleteNotifications } from '@/lib/db'
import { Athlete, TrainingPlan, TrainingDay, StrengthExercise, CommentReply } from '@/lib/types'

const AVATAR_COLORS = ['#4A4F57', '#3a3f47', '#5a5f67', '#2d3035', '#4A4F57']
const PHOTO_KEY = (id: string) => `athlete-photo-${id}`
const labelCls = 'block text-[9px] font-semibold uppercase tracking-wider mb-1 text-[#7A7E85]'


export default function AthleteProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [idx, setIdx] = useState<number>(0)
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [mounted, setMounted] = useState(false)

  const [photo, setPhoto] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  // Goal states
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalDate, setNewGoalDate] = useState('')

  // Strength library lookup states
  const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>([])
  const [showGuide, setShowGuide] = useState<StrengthExercise | null>(null)
  const [repliesTexts, setRepliesTexts] = useState<Record<string, string>>({})

  const loadPlans = () => {
    const athletePlans = getPlans()
      .filter(p => p.athleteId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setPlans(athletePlans)
  }

  const handleSendReply = (planId: string, dayId: string, dayLabel: string) => {
    const text = repliesTexts[dayId] || ''
    if (!text.trim() || !athlete) return

    const newReply: CommentReply = {
      id: Math.random().toString(36).slice(2),
      sender: 'coach',
      senderName: 'Óscar Barrón',
      text: text.trim(),
      createdAt: new Date().toISOString()
    }

    addReplyToSession(planId, dayId, newReply)

    // Notify athlete
    const athleteNotifs = getAthleteNotifications()
    const newAthleteNotif = {
      id: Math.random().toString(36).slice(2),
      athleteId: athlete.id,
      planId: planId,
      dayId: dayId,
      dayLabel: dayLabel,
      text: `Óscar Barrón respondió a tu entrenamiento: "${text.trim().substring(0, 40)}${text.trim().length > 40 ? '...' : ''}"`,
      createdAt: new Date().toISOString(),
      read: false
    }
    saveAthleteNotifications([newAthleteNotif, ...athleteNotifs])

    window.dispatchEvent(new Event('chat-reply-saved'))
    setRepliesTexts(prev => ({ ...prev, [dayId]: '' }))
    loadPlans()
  }

  useEffect(() => {
    const all = getAthletes()
    const found = all.find(a => a.id === id)
    const index = all.findIndex(a => a.id === id)
    
    if (found) {
      setAthlete(found)
      setIdx(index >= 0 ? index : 0)
      loadPlans()
    }
    
    try { 
      setPhoto(localStorage.getItem(PHOTO_KEY(id))) 
    } catch {}
    
    setStrengthExercises(getStrengthLibrary())
    
    setMounted(true)

    if (typeof window !== 'undefined') {
      window.addEventListener('chat-reply-saved', loadPlans)
      return () => {
        window.removeEventListener('chat-reply-saved', loadPlans)
      }
    }
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

  // Goal Handlers
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGoalTitle.trim() || !newGoalDate || !athlete) return

    const newGoal = {
      id: Math.random().toString(36).slice(2),
      title: newGoalTitle.trim(),
      targetDate: newGoalDate,
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    }

    const updatedGoals = [...(athlete.goals || []), newGoal]
    const updatedAthlete = { ...athlete, goals: updatedGoals }

    const all = getAthletes()
    const updatedList = all.map(a => a.id === id ? updatedAthlete : a)
    saveAthletes(updatedList)

    setAthlete(updatedAthlete)
    setNewGoalTitle('')
    setNewGoalDate('')
  }

  const handleToggleGoal = (goalId: string) => {
    if (!athlete) return
    const updatedGoals = (athlete.goals || []).map(g => {
      if (g.id === goalId) {
        return { ...g, completed: !g.completed }
      }
      return g
    })
    const updatedAthlete = { ...athlete, goals: updatedGoals }

    const all = getAthletes()
    const updatedList = all.map(a => a.id === id ? updatedAthlete : a)
    saveAthletes(updatedList)
    setAthlete(updatedAthlete)
  }

  const handleDeleteGoal = (goalId: string) => {
    if (!athlete) return
    const updatedGoals = (athlete.goals || []).filter(g => g.id !== goalId)
    const updatedAthlete = { ...athlete, goals: updatedGoals }

    const all = getAthletes()
    const updatedList = all.map(a => a.id === id ? updatedAthlete : a)
    saveAthletes(updatedList)
    setAthlete(updatedAthlete)
  }

  const handleDeleteAthlete = () => {
    if (!athlete) return
    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar a ${athlete.name}?\n\nEsta acción no se puede deshacer.`
    )
    if (!confirmed) return
    const updated = getAthletes().filter(a => a.id !== id)
    saveAthletes(updated)
    router.push('/coach/dashboard')
  }

  // Week sorting helper
  const sortDaysByStartOfWeek = (days: TrainingDay[], startDay: string = 'lunes') => {
    const dayOrder = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const startIndex = dayOrder.indexOf(startDay)
    
    const getWeekdayIndex = (dateStr: string) => {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).getDay()
      }
      return new Date(dateStr).getDay()
    }
    
    const getRelativeIndex = (dateStr: string) => {
      const idx = getWeekdayIndex(dateStr)
      return (idx - startIndex + 7) % 7
    }
    
    return [...days].sort((a, b) => getRelativeIndex(a.date) - getRelativeIndex(b.date))
  }

  if (!mounted) {
    return (
      <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="h-44 bg-gray-200 rounded-2xl mb-8"></div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div className="p-10 text-center">
        <p style={{ color: '#7A7E85' }}>Atleta no encontrado.</p>
        <Link href="/coach/dashboard" className="text-sm mt-2 inline-block" style={{ color: '#4A4F57' }}>
          Volver al dashboard
        </Link>
      </div>
    )
  }

  const initials = athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const activePlan = plans.find(p => new Date(p.endDate) >= today)
  const totalExercises = plans.flatMap(p => p.weeks.flatMap(w => w.days.flatMap(d => d.exercises))).length
  const completedSessions = plans.flatMap(p => 
    p.weeks.flatMap(w => 
      w.days.map(d => ({ ...d, planName: p.name, planId: p.id }))
    )
  ).filter(d => d.feedback?.completed)
   .sort((a, b) => new Date(b.feedback!.loggedAt).getTime() - new Date(a.feedback!.loggedAt).getTime())

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto">

      {/* Back */}
      <Link
        href="/coach/dashboard"
        className="eyebrow transition-colors duration-150 mb-8 inline-block"
        style={{ color: '#4A4F57' }}
      >
        ← Dashboard
      </Link>

      {/* Hero card & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-2xl p-7 animate-fade-up flex flex-col justify-between" style={{ background: '#FFFFFF', border: '1px solid #E8E9EB' }}>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <input ref={photoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]) }} />
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={athlete.name}
                  className="w-20 h-20 rounded-2xl object-cover"
                  style={{ border: '2px solid #E8E9EB' }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: avatarColor }}
                >
                  <span className="text-2xl font-bold text-white" style={{ letterSpacing: '0.04em' }}>
                    {initials}
                  </span>
                </div>
              )}
              <button
                onClick={() => photoRef.current?.click()}
                className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'rgba(0,0,0,0.5)' }}
                title="Cambiar foto"
              >
                <span className="text-white text-xs">📷</span>
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1
                    className="text-2xl font-bold"
                    style={{ letterSpacing: '-0.025em', lineHeight: 1.2, color: '#1C1F23' }}
                  >
                    {athlete.name}
                  </h1>
                  <p className="eyebrow mt-1" style={{ color: '#7A7E85' }}>
                    {athlete.sport} · {athlete.age} años {athlete.gender === 'mujer' ? '· Femenino' : '· Masculino'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {activePlan ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399' }} />
                      Activo
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>Sin plan</span>
                  )}
                  <Link
                    href={`/coach/athletes/${id}/edit`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150"
                    style={{ color: '#4A4F57', border: '1px solid #D5D8DD', background: '#FFFFFF' }}
                  >
                    Editar perfil
                  </Link>
                  <button
                    onClick={handleDeleteAthlete}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer"
                    style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', background: '#FFFFFF' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF' }}
                  >
                    Eliminar atleta
                  </button>
                </div>
              </div>

              <p className="text-sm mt-3 leading-relaxed" style={{ color: '#4A4F57' }}>
                {athlete.goal}
              </p>

              {(athlete.email || athlete.phone) && (
                <div className="flex gap-5 mt-3">
                  {athlete.email && (
                    <p className="eyebrow" style={{ color: '#7A7E85' }}>{athlete.email}</p>
                  )}
                  {athlete.phone && (
                    <p className="eyebrow" style={{ color: '#7A7E85' }}>{athlete.phone}</p>
                  )}
                </div>
              )}
              
              {athlete.username && (
                <p className="text-[10px] uppercase font-semibold tracking-wider mt-2.5" style={{ color: '#7A7E85' }}>
                  Acceso Atleta: <span className="text-gray-900 lowercase font-medium">{athlete.username}</span> / <span className="text-gray-900 lowercase font-medium">{athlete.password || '123'}</span>
                </p>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-0 mt-6 pt-6 border-t border-[#E8E9EB]">
            {[
              { value: plans.length, label: 'Planes' },
              { value: activePlan ? 1 : 0, label: 'Activos' },
              { value: totalExercises, label: 'Ejercicios' },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center" style={i > 0 ? { borderLeft: '1px solid #E8E9EB' } : {}}>
                <p className="font-bold text-xl text-[#1C1F23]">{stat.value}</p>
                <p className="eyebrow mt-1 text-[10px]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Zones & Personal Bests Column */}
        <div className="space-y-4 animate-fade-up delay-1">
          {/* Running Zones Card */}
          {(athlete.zone1 || athlete.zone2 || athlete.zone3) && (
            <div className="rounded-2xl p-5 bg-white border border-[#E8E9EB]">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3 pb-2 border-b border-[#F5F5F6]" style={{ color: '#7A7E85' }}>
                Zonas de Carrera (Ritmos)
              </p>
              <div className="space-y-2.5">
                <div>
                  <span className="block text-[9px] text-[#7A7E85] font-semibold uppercase">Z1 (Rodaje suave)</span>
                  <span className="text-xs font-bold text-gray-900">{athlete.zone1 || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-[#7A7E85] font-semibold uppercase">Z2 (Umbral láctico)</span>
                  <span className="text-xs font-bold text-[#E25C3E]">{athlete.zone2 || '—'}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-[#7A7E85] font-semibold uppercase">Z3 (Vo2max / Competición)</span>
                  <span className="text-xs font-bold text-red-600">{athlete.zone3 || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Personal Bests Card */}
          {athlete.personalBests && (athlete.personalBests.pb5k || athlete.personalBests.pb10k || athlete.personalBests.pb21k || athlete.personalBests.pb42k) && (
            <div className="rounded-2xl p-5 bg-white border border-[#E8E9EB]">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3 pb-2 border-b border-[#F5F5F6]" style={{ color: '#7A7E85' }}>
                Marcas Personales (PB)
              </p>
              <div className="grid grid-cols-2 gap-4">
                {athlete.personalBests.pb5k && (
                  <div>
                    <span className="block text-[9px] text-[#7A7E85] font-semibold">PB 5K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb5k}</span>
                  </div>
                )}
                {athlete.personalBests.pb10k && (
                  <div>
                    <span className="block text-[9px] text-[#7A7E85] font-semibold">PB 10K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb10k}</span>
                  </div>
                )}
                {athlete.personalBests.pb21k && (
                  <div>
                    <span className="block text-[9px] text-[#7A7E85] font-semibold">PB 21K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb21k}</span>
                  </div>
                )}
                {athlete.personalBests.pb42k && (
                  <div>
                    <span className="block text-[9px] text-[#7A7E85] font-semibold">PB 42K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb42k}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drag layout helper: row of Actions & Goals history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-8 animate-fade-up delay-1">
        {/* Goals widget */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F5F5F6]">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span>🎯</span> Historial de Objetivos
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-400 bg-gray-100">
              {(athlete.goals || []).length}
            </span>
          </div>

          {(athlete.goals || []).length === 0 ? (
            <p className="text-xs text-gray-400 py-4 italic text-center">No hay objetivos definidos aún.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-h-60 overflow-y-auto pr-1">
              {(athlete.goals || []).map(goal => (
                <div 
                  key={goal.id} 
                  className="flex items-center justify-between p-3.5 rounded-xl border transition-all"
                  style={{ 
                    background: goal.completed ? 'rgba(4, 120, 87, 0.02)' : '#F9FAFB', 
                    borderColor: goal.completed ? '#A7F3D0' : '#E8E9EB' 
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleGoal(goal.id)}
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ 
                        background: goal.completed ? '#047857' : 'transparent',
                        border: goal.completed ? 'none' : '1px solid #D5D8DD',
                        color: '#FFFFFF'
                      }}
                    >
                      {goal.completed && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                    <div className="min-w-0">
                      <p 
                        className="text-xs font-semibold truncate leading-normal" 
                        style={{ 
                          color: goal.completed ? '#6B7280' : '#1C1F23',
                          textDecoration: goal.completed ? 'line-through' : 'none'
                        }}
                      >
                        {goal.title}
                      </p>
                      <p className="text-[9px] text-[#7A7E85] mt-0.5">
                        Meta: {new Date(goal.targetDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-xs p-1 ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Goal form */}
          <form onSubmit={handleAddGoal} className="pt-4 border-t border-[#F5F5F6] flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className={labelCls}>Nuevo objetivo del atleta</label>
              <input
                type="text"
                required
                value={newGoalTitle}
                onChange={e => setNewGoalTitle(e.target.value)}
                placeholder="Ej. Lograr ritmo de 4:35/km en el chequeo"
                className="w-full bg-[#F9FAFB] border border-[#D5D8DD] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A7E85]"
              />
            </div>
            <div>
              <label className={labelCls}>Fecha Límite</label>
              <input
                type="date"
                required
                value={newGoalDate}
                onChange={e => setNewGoalDate(e.target.value)}
                className="bg-[#F9FAFB] border border-[#D5D8DD] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A7E85] text-gray-900"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 bg-[#1C1F23] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors md:self-end h-[38px]"
            >
              Agregar
            </button>
          </form>
        </div>

        {/* GPS Metrics Link */}
        <div className="bg-white border border-[#E8E9EB] p-6 rounded-2xl flex flex-col justify-between h-full min-h-[220px]">
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-2">Métricas de GPS</h3>
            <p className="text-xs text-[#7A7E85] leading-relaxed mb-4">
              Revisa los datos de telemetría, ritmo cardíaco y zonas de potencia del atleta cargados desde archivos Garmin o Strava.
            </p>
          </div>
          <Link
            href={`/coach/athletes/${id}/metrics`}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 border border-[#D5D8DD] hover:bg-gray-50 text-[#4A4F57]"
          >
            <span>⌚</span> Ver Métricas Deportivas
          </Link>
        </div>
      </div>

      {/* Buzón de Sesiones / Comentarios de Retroalimentación */}
      <div className="bg-white border border-[#E8E9EB] rounded-2xl p-6 shadow-sm space-y-4 animate-fade-up delay-2 mb-8 mt-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F6]">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <span>📬</span> Buzón de Sesiones y Retroalimentación del Atleta
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F5F5F6] text-[#4A4F57] uppercase tracking-wider">
            {completedSessions.length} Completadas
          </span>
        </div>

        {completedSessions.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 italic text-center">
            El atleta no ha registrado ninguna sesión evaluada aún.
          </p>
        ) : (
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {completedSessions.map(session => {
              const fb = session.feedback!
              const warningRating = fb.feelingRating <= 2
              
              return (
                <div 
                  key={session.id} 
                  className="p-4 rounded-xl border transition-all"
                  style={{ 
                    borderColor: warningRating ? '#FFBDBD' : '#E8E9EB', 
                    background: warningRating ? 'rgba(239, 68, 68, 0.02)' : '#F9FAFB' 
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">
                        {session.planName}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 mt-0.5">{session.dayLabel}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs flex items-center gap-1">
                        {fb.feelingEmoji} <span className="text-[10px] font-bold text-gray-700">{fb.feelingRating}/5</span>
                      </span>
                      <span className="text-[8px] text-gray-400 block mt-0.5 font-mono">
                        {new Date(fb.loggedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Comments */}
                  {fb.comments ? (
                    <p className="text-xs text-[#4A4F57] bg-white border border-gray-150 p-2.5 rounded-lg italic mt-3 leading-relaxed shadow-sm">
                      "{fb.comments}"
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic mt-2">Sin comentarios escritos.</p>
                  )}

                  {/* Logs of exercises */}
                  {session.logs && Object.keys(session.logs).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E8E9EB]/60">
                      <p className="text-[8px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">Métricas Registradas</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {session.exercises.map(ex => {
                          const elog = session.logs![ex.id]
                          if (!elog || !elog.completed) return null
                          return (
                            <div key={ex.id} className="text-[10px] bg-white p-2 rounded-lg border border-gray-100 leading-snug">
                              <span className="font-bold text-gray-900 block truncate">
                                {ex.type === 'strength' ? '💪' : '🏃'} {ex.name}
                              </span>
                              <span className="text-gray-500 text-[8.5px] font-semibold block mt-0.5">
                                {ex.type === 'strength' ? (
                                  <>
                                    Real: {elog.actualSets || ex.sets}x{elog.actualReps || ex.reps}
                                    {elog.actualWeight !== undefined && ` · ${elog.actualWeight}kg`}
                                  </>
                                ) : (
                                  <>
                                    Real: {elog.actualDistance || ex.distance}km
                                    {elog.actualDuration && ` · ${elog.actualDuration}min`}
                                    {elog.actualPace && ` · ${elog.actualPace}`}
                                  </>
                                )}
                                {elog.rpe && <span className="text-red-500 font-bold ml-1">· RPE: {elog.rpe}</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chat / Replies Section */}
                  <div className="mt-4 pt-4 border-t border-[#E8E9EB]">
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: '#7A7E85' }}>
                      💬 Chat de Retroalimentación
                    </p>
                    
                    {fb.replies && fb.replies.length > 0 ? (
                      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
                        {fb.replies.map(reply => {
                          const isCoach = reply.sender === 'coach'
                          return (
                            <div 
                              key={reply.id} 
                              className={`flex flex-col ${isCoach ? 'items-end' : 'items-start'}`}
                            >
                              <div 
                                className={`p-2.5 rounded-xl max-w-[85%] text-[11px] leading-normal shadow-sm ${
                                  isCoach 
                                    ? 'bg-[#1C1F23] text-white rounded-tr-none' 
                                    : 'bg-white border border-[#E8E9EB] text-gray-900 rounded-tl-none'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="font-bold text-[8px] uppercase tracking-wider opacity-90">
                                    {reply.senderName}
                                  </span>
                                  <span className="text-[7.5px] opacity-60">
                                    {new Date(reply.createdAt).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                <p className="whitespace-pre-line">{reply.text}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic mb-4">Sin mensajes de seguimiento aún.</p>
                    )}

                    {/* Send reply form */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <textarea
                          rows={1}
                          value={repliesTexts[session.id] || ''}
                          onChange={e => setRepliesTexts(prev => ({ ...prev, [session.id]: e.target.value }))}
                          placeholder="Responder al atleta..."
                          className="w-full bg-white border border-[#D5D8DD] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A7E85] text-gray-900 resize-none max-h-20"
                        />
                      </div>
                      <button
                        onClick={() => handleSendReply(session.planId, session.id, session.dayLabel)}
                        className="py-2 px-3 bg-[#1C1F23] hover:bg-black text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer h-[34px] flex items-center justify-center flex-shrink-0"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Plans Section */}
      <div className="animate-fade-up delay-2">
        <div className="flex items-center justify-between mb-5">
          <p className="eyebrow">Planes de entrenamiento</p>
          <Link
            href={`/coach/athletes/${id}/plan/new`}
            className="btn-primary"
            style={{ borderRadius: '0.75rem', padding: '0.625rem 1.25rem' }}
          >
            <span>+ Nuevo plan</span>
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="rounded-2xl p-12 text-center bg-white border border-[#E8E9EB]">
            <p className="text-sm mb-3 text-gray-500">Este atleta no tiene planes aún</p>
            <Link
              href={`/coach/athletes/${id}/plan/new`}
              className="text-sm font-bold text-[#1C1F23] hover:underline"
            >
              Crear primer plan de entrenamiento →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map(plan => {
              const isActive = new Date(plan.endDate) >= today
              const totalDays = plan.weeks.reduce((s, w) => s + w.days.length, 0)
              const totalExs = plan.weeks.flatMap(w => w.days.flatMap(d => d.exercises)).length

              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl p-6 border border-[#E8E9EB] shadow-sm space-y-5"
                >
                  {/* Plan header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F6]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm tracking-tight">
                        {plan.name}
                      </h3>
                      {isActive && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34D399' }} />
                          Activo
                        </span>
                      )}
                      <Link
                        href={`/coach/athletes/${id}/plan/${plan.id}/edit`}
                        className="px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-[#D5D8DD] hover:bg-[#F5F5F6] transition-colors inline-block text-center bg-white"
                        style={{ color: '#4A4F57' }}
                      >
                        Editar plan
                      </Link>
                    </div>
                    <p className="eyebrow text-xs" style={{ color: '#7A7E85' }}>
                      Semana Deportiva inicia en <span className="lowercase font-bold text-gray-900">{athlete.startOfWeekDay || 'lunes'}</span>
                    </p>
                  </div>

                  {/* Calendar view of weeks */}
                  <div className="space-y-6">
                    {plan.weeks.map(week => {
                      const sortedDays = sortDaysByStartOfWeek(week.days, athlete.startOfWeekDay || 'lunes')

                      return (
                        <div key={week.id} className="space-y-3">
                          <p className="eyebrow text-xs font-bold text-gray-900" style={{ color: '#1C1F23' }}>
                            Semana {week.weekNumber}
                          </p>
                          
                          {/* Calendar Grid of 7 days */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
                            {sortedDays.map(day => (
                              <div 
                                key={day.id} 
                                className="bg-[#F9FAFB] border border-[#E8E9EB] rounded-xl p-3 flex flex-col justify-between shadow-sm min-h-[140px]"
                              >
                                <div>
                                  {/* Day label */}
                                  <div className="flex items-center justify-between pb-1.5 border-b border-[#E8E9EB] mb-2">
                                    <p className="text-xs font-bold text-gray-900 truncate tracking-tight">{day.dayLabel}</p>
                                  </div>
                                  
                                  {/* Exercises detail list */}
                                  {day.exercises.length === 0 ? (
                                    <p className="text-[10px] text-gray-400 italic">Descanso</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {day.exercises.map(ex => {
                                        const matchingLibEx = strengthExercises.find(
                                          s => s.name.toLowerCase().trim() === ex.name.toLowerCase().trim()
                                        )
                                        return (
                                          <div key={ex.id} className="text-[10px] leading-snug bg-white border border-gray-100 p-2 rounded-lg">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                              <p className="font-bold text-gray-900">
                                                {ex.type === 'strength' ? '💪' : '🏃'} {ex.name}
                                              </p>
                                              {matchingLibEx && (
                                                <button
                                                  onClick={() => setShowGuide(matchingLibEx)}
                                                  className="text-[8px] px-1 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 cursor-pointer flex-shrink-0"
                                                  title="Ver guía del ejercicio"
                                                >
                                                  ℹ️
                                                </button>
                                              )}
                                            </div>
                                          <p className="text-gray-500 mt-0.5 text-[9px] font-semibold">
                                            {ex.type === 'strength' ? (
                                              <>
                                                {ex.sets}x{ex.reps}
                                                {ex.weight && ` · ${ex.weight}kg`}
                                              </>
                                            ) : (
                                              <>
                                                {ex.distance && `${ex.distance}km`}
                                                {ex.duration && ` · ${ex.duration}'`}
                                                {ex.pace && ` · ${ex.pace}`}
                                              </>
                                            )}
                                          </p>
                                          {ex.notes && (
                                            <p className="text-[8.5px] text-[#7A7E85] italic mt-0.5 border-t border-gray-100 pt-0.5">
                                              {ex.notes}
                                            </p>
                                          )}
                                        </div>
                                      )})}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* STRENGTH GUIDE TECHNIQUE MODAL FOR COACH */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-[#E8E9EB] shadow-2xl relative animate-scale-up">
            <button 
              onClick={() => setShowGuide(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-950 transition-colors text-xl font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
            <span className="text-[9px] font-bold uppercase tracking-wider text-black bg-[#A8FF00] px-2 py-0.5 rounded mb-2.5 inline-block">
              {showGuide.category || 'Ejercicio de Fuerza'}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{showGuide.name}</h3>
            {showGuide.description && (
              <p className="text-xs text-[#7A7E85] leading-relaxed mb-4">{showGuide.description}</p>
            )}
            
            {/* YouTube Embed Video */}
            {showGuide.videoUrl && getYoutubeEmbedUrl(showGuide.videoUrl) ? (
              <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 border border-[#E8E9EB] bg-black shadow-inner">
                <iframe
                  width="100%"
                  height="100%"
                  src={getYoutubeEmbedUrl(showGuide.videoUrl)!}
                  title={showGuide.name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : showGuide.videoUrl ? (
              <div className="mb-4">
                <a 
                  href={showGuide.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-center p-3 rounded-xl border border-dashed border-[#D5D8DD] hover:bg-gray-50 text-xs font-bold text-[#4A4F57]"
                >
                  📺 Ver Video de Demostración Externo
                </a>
              </div>
            ) : null}

            {/* Image Embed */}
            {showGuide.imageUrl && (
              <div className="w-full max-h-48 rounded-xl overflow-hidden mb-4 border border-[#E8E9EB] relative bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={showGuide.imageUrl} alt={showGuide.name} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Step instructions */}
            {showGuide.instructions && (
              <div className="bg-[#F5F5F6] border border-[#E8E9EB] p-4 rounded-xl">
                <h4 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Instrucciones de Ejecución</h4>
                <p className="text-xs text-[#4A4F57] whitespace-pre-line leading-relaxed">{showGuide.instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null
}
