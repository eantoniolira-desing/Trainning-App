'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAthletes, getPlans, saveAthletes, savePlans, getStrengthLibrary, getNotifications, saveNotifications, addReplyToSession } from '@/lib/db'
import type { Athlete, TrainingPlan, TrainingDay, ExerciseLog, StrengthExercise, NotificationEntry, CommentReply } from '@/lib/types'

function RpeButton({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  const activeColor = n <= 3 ? '#A8FF00' : n <= 6 ? '#FFD60A' : n <= 8 ? '#FF6B35' : '#FF3B30'
  const textColor = active && n <= 3 ? '#1C1F23' : '#fff'

  return (
    <button
      onClick={onClick}
      type="button"
      className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
      style={{
        background: active ? activeColor : '#F5F5F6',
        color: active ? textColor : '#4A4F57',
        border: active ? 'none' : '1px solid #E8E9EB',
        letterSpacing: '0.02em',
      }}
    >
      {n}
    </button>
  )
}

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null
}

const EMOJI_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Lesionado / Mal' },
  { value: 2, emoji: '😰', label: 'Cansado / Fatiga' },
  { value: 3, emoji: '😐', label: 'Normal' },
  { value: 4, emoji: '🙂', label: 'Bien / Fuerte' },
  { value: 5, emoji: '🔥', label: 'Excelente / Energía' }
]

const STRENGTH_SECTIONS = [
  { id: 'inferior', label: 'Tren Inferior' },
  { id: 'superior', label: 'Tren Superior' },
  { id: 'casa',     label: 'En Casa' },
]

export default function AthleteDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryDayId = searchParams.get('dayId')

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [session, setSession] = useState<TrainingDay | null>(null)
  const [mounted, setMounted] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const loggerRef = useRef<HTMLDivElement>(null)
  
  const [logs, setLogs] = useState<Record<string, Partial<ExerciseLog>>>({})
  const [saved, setSaved] = useState(false)

  // Goal states
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalDate, setNewGoalDate] = useState('')

  // Feedback states
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [selectedEmoji, setSelectedEmoji] = useState<string>('')
  const [sessionComments, setSessionComments] = useState<string>('')

  // Calendar expanded day per week
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null)

  // Strength Library items for lookups
  const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>([])
  const [showGuide, setShowGuide] = useState<StrengthExercise | null>(null)

  // Strength exercise selections per plan-exercise: planExId → libExId → {series, reps}
  const [strengthSels, setStrengthSels] = useState<Record<string, Record<string, { series: string; reps: string }>>>({})
  const [strengthOpenRoutine, setStrengthOpenRoutine] = useState<Record<string, string>>({})

  const [athleteReplyText, setAthleteReplyText] = useState('')

  const initStrengthFromDay = (day: TrainingDay) => {
    const sels: Record<string, Record<string, { series: string; reps: string }>> = {}
    const openRoutines: Record<string, string> = {}
    for (const ex of day.exercises) {
      if (ex.type === 'strength') {
        openRoutines[ex.id] = 'inferior'
        const entries = (day.logs || {})[ex.id]?.strengthEntries
        if (entries?.length) {
          sels[ex.id] = {}
          for (const entry of entries) {
            sels[ex.id][entry.libraryId] = { series: entry.series, reps: entry.reps }
          }
        }
      }
    }
    setStrengthSels(sels)
    setStrengthOpenRoutine(openRoutines)
  }

  const loadLatestPlan = () => {
    const athleteId = localStorage.getItem('active_athlete_id')
    if (!athleteId) return
    const currentAthlete = getAthletes().find(a => a.id === athleteId)
    if (currentAthlete) setAthlete(currentAthlete)

    const athletePlans = getPlans().filter(p => p.athleteId === athleteId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const active = athletePlans.find(p => new Date(p.endDate) >= today) || athletePlans[athletePlans.length - 1]
    if (active) {
      setPlan(active)
    }
  }

  const handleSendAthleteReply = () => {
    if (!athleteReplyText.trim() || !athlete || !plan || !session) return

    const newReply: CommentReply = {
      id: Math.random().toString(36).slice(2),
      sender: 'athlete',
      senderName: athlete.name,
      text: athleteReplyText.trim(),
      createdAt: new Date().toISOString()
    }

    addReplyToSession(plan.id, session.id, newReply)

    // Notify coach (Óscar Barrón)
    const notifs = getNotifications()
    const newNotif: NotificationEntry = {
      id: Math.random().toString(36).slice(2),
      athleteId: athlete.id,
      athleteName: athlete.name,
      planId: plan.id,
      dayId: session.id,
      dayLabel: session.dayLabel,
      comments: `Mensaje de atleta: ${athleteReplyText.trim().substring(0, 40)}${athleteReplyText.trim().length > 40 ? '...' : ''}`,
      feelingRating: selectedRating || 3,
      feelingEmoji: selectedEmoji || '😐',
      createdAt: new Date().toISOString(),
      read: false
    }
    saveNotifications([newNotif, ...notifs])

    window.dispatchEvent(new Event('athlete-session-saved'))
    window.dispatchEvent(new Event('chat-reply-saved'))
    setAthleteReplyText('')
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSync = () => {
        loadLatestPlan()
        const athleteId = localStorage.getItem('active_athlete_id')
        if (athleteId && session) {
          const updatedPlan = getPlans().filter(p => p.athleteId === athleteId).find(p => p.id === plan?.id || new Date(p.endDate) >= new Date())
          if (updatedPlan) {
            const updatedSession = updatedPlan.weeks.flatMap(w => w.days).find(d => d.id === session.id)
            if (updatedSession) {
              setSession(updatedSession)
              setLogs(updatedSession.logs || {})
              setSelectedRating(updatedSession.feedback?.feelingRating || 0)
              setSelectedEmoji(updatedSession.feedback?.feelingEmoji || '')
              setSessionComments(updatedSession.feedback?.comments || '')
            }
          }
        }
      }
      window.addEventListener('chat-reply-saved', handleSync)
      window.addEventListener('athlete-session-saved', handleSync)
      return () => {
        window.removeEventListener('chat-reply-saved', handleSync)
        window.removeEventListener('athlete-session-saved', handleSync)
      }
    }
  }, [session, plan])

  useEffect(() => {
    if (queryDayId && plan) {
      const foundDay = plan.weeks.flatMap(w => w.days).find(d => d.id === queryDayId)
      if (foundDay) {
        setExpandedDayId(foundDay.id)
        setSession(foundDay)
        setLogs(foundDay.logs || {})
        setSelectedRating(foundDay.feedback?.feelingRating || 0)
        setSelectedEmoji(foundDay.feedback?.feelingEmoji || '')
        setSessionComments(foundDay.feedback?.comments || '')
        setSaved(false)
        initStrengthFromDay(foundDay)
        setTimeout(() => loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    }
  }, [queryDayId, plan])

  useEffect(() => {
    const athleteId = localStorage.getItem('active_athlete_id')
    if (!athleteId) {
      router.push('/')
      return
    }

    const currentAthlete = getAthletes().find(a => a.id === athleteId)
    if (!currentAthlete) {
      router.push('/')
      return
    }
    setAthlete(currentAthlete)

    // Load photo
    try {
      setPhoto(localStorage.getItem(`athlete-photo-${athleteId}`))
    } catch {}

    // Load plans & current active plan
    const athletePlans = getPlans().filter(p => p.athleteId === athleteId)
    // Find active or latest
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const active = athletePlans.find(p => new Date(p.endDate) >= today) || athletePlans[athletePlans.length - 1]
    
    if (active) {
      setPlan(active)
      // Auto-load first incomplete session, or just first day
      let initialSession = active.weeks?.[0]?.days?.[0] || null
      // Find the first day of the plan where feedback isn't logged yet
      for (const week of active.weeks) {
        const foundDay = week.days.find(d => !d.feedback?.completed)
        if (foundDay) {
          initialSession = foundDay
          break
        }
      }
      
      if (initialSession) {
        setSession(initialSession)
        setLogs(initialSession.logs || {})
        setSelectedRating(initialSession.feedback?.feelingRating || 0)
        setSelectedEmoji(initialSession.feedback?.feelingEmoji || '')
        setSessionComments(initialSession.feedback?.comments || '')
        initStrengthFromDay(initialSession)
      }
    }

    // Load strength exercises for guide dialogs
    setStrengthExercises(getStrengthLibrary())

    setMounted(true)
  }, [router])

  const handlePhotoUpload = (file: File) => {
    if (!athlete) return
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      setPhoto(url)
      try {
        localStorage.setItem(`athlete-photo-${athlete.id}`, url)
        // Dispatch event to sync profiles
        window.dispatchEvent(new Event('athlete-photo-updated'))
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
    const updatedList = all.map(a => a.id === athlete.id ? updatedAthlete : a)
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
    const updatedList = all.map(a => a.id === athlete.id ? updatedAthlete : a)
    saveAthletes(updatedList)
    setAthlete(updatedAthlete)
  }

  const handleSelectDay = (day: TrainingDay) => {
    setExpandedDayId(prev => prev === day.id ? null : day.id)
    setSession(day)
    setLogs(day.logs || {})
    setSelectedRating(day.feedback?.feelingRating || 0)
    setSelectedEmoji(day.feedback?.feelingEmoji || '')
    setSessionComments(day.feedback?.comments || '')
    setSaved(false)
    initStrengthFromDay(day)
  }

  const handleSaveSession = () => {
    if (!athlete || !plan || !session) return

    // Merge strength selections into logs before saving
    const finalLogs = { ...logs } as Record<string, ExerciseLog>
    for (const ex of session.exercises) {
      if (ex.type === 'strength') {
        const sels = strengthSels[ex.id] || {}
        const strengthEntries = Object.entries(sels).map(([libId, vals]) => ({
          libraryId: libId,
          name: strengthExercises.find(se => se.id === libId)?.name || libId,
          series: vals.series,
          reps: vals.reps,
        }))
        finalLogs[ex.id] = { ...(finalLogs[ex.id] || {}), exerciseId: ex.id, completed: !!(finalLogs[ex.id]?.completed), strengthEntries }
      }
    }

    const updatedWeeks = plan.weeks.map(week => {
      const dayExists = week.days.some(d => d.id === session.id)
      if (dayExists) {
        const updatedDays = week.days.map(d => {
          if (d.id === session.id) {
            return {
              ...d,
              logs: finalLogs,
              feedback: {
                completed: true,
                feelingRating: selectedRating || 3,
                feelingEmoji: selectedEmoji || '😐',
                comments: sessionComments,
                loggedAt: new Date().toISOString().split('T')[0]
              }
            }
          }
          return d
        })
        return { ...week, days: updatedDays }
      }
      return week
    })

    const updatedPlan = { ...plan, weeks: updatedWeeks }
    
    // Save to localStorage
    const allPlans = getPlans()
    const updatedPlansList = allPlans.map(p => p.id === plan.id ? updatedPlan : p)
    savePlans(updatedPlansList)
    setPlan(updatedPlan)
    
    // Update active session locally
    const updatedSession = updatedWeeks.flatMap(w => w.days).find(d => d.id === session.id)
    if (updatedSession) setSession(updatedSession)

    // Generate notification for coach
    const notifs = getNotifications()
    const newNotif: NotificationEntry = {
      id: Math.random().toString(36).slice(2),
      athleteId: athlete.id,
      athleteName: athlete.name,
      planId: plan.id,
      dayId: session.id,
      dayLabel: session.dayLabel,
      comments: sessionComments,
      feelingRating: selectedRating || 3,
      feelingEmoji: selectedEmoji || '😐',
      createdAt: new Date().toISOString(),
      read: false
    }
    saveNotifications([newNotif, ...notifs])

    // Dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('athlete-session-saved'))
    }

    setSaved(true)
  }

  const updateLog = (eid: string, field: string, value: string | number | boolean) =>
    setLogs(prev => ({ ...prev, [eid]: { ...prev[eid], [field]: value } }))

  const toggleDone = (eid: string) =>
    setLogs(prev => ({ ...prev, [eid]: { ...prev[eid], completed: !prev[eid]?.completed } }))

  // Sorting helper
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

  if (!mounted || !athlete) {
    return (
      <div className="max-w-7xl mx-auto p-5 pt-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="h-48 bg-gray-200 rounded-2xl"></div>
            <div className="h-28 bg-gray-200 rounded-2xl"></div>
            <div className="h-28 bg-gray-200 rounded-2xl"></div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="h-20 bg-gray-200 rounded-2xl"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
  }

  const labelCls = 'block text-[9px] font-semibold uppercase tracking-wider mb-1 text-[#7A7E85]'

  return (
    <div className="max-w-7xl mx-auto p-5 pt-8">

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Profile info, Zones, PBs, Goals, Calendar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Profile Card & Photo Uploader */}
          <div className="rounded-2xl p-6 bg-white border border-[#E8E9EB] shadow-sm flex flex-col items-center text-center relative animate-fade-up">
            <input 
              ref={photoRef} 
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]) }} 
            />
            <div className="relative group mb-4 cursor-pointer">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={athlete.name} className="w-24 h-24 rounded-2xl object-cover border border-[#E8E9EB]" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-[#4A4F57] flex items-center justify-center text-white text-3xl font-bold">
                  {athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div
                onClick={() => photoRef.current?.click()}
                className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Cambiar foto"
              >
                <span className="text-white text-xs font-bold font-mono">📷 Editar</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{athlete.name}</h2>
            <p className="text-xs text-[#7A7E85] mt-1 uppercase tracking-wider font-semibold">
              {athlete.sport} · {athlete.age} años {athlete.gender === 'mujer' ? '· Femenino' : '· Masculino'}
            </p>
            
            <div className="mt-4 pt-3 border-t border-[#F5F5F6] w-full text-left space-y-2">
              <p className="text-xs text-[#4A4F57]"><strong className="text-gray-900">Objetivo:</strong> {athlete.goal}</p>
              {athlete.email && <p className="text-xs text-[#7A7E85]"><strong className="text-gray-900">Email:</strong> {athlete.email}</p>}
              {athlete.phone && <p className="text-xs text-[#7A7E85]"><strong className="text-gray-900">Teléfono:</strong> {athlete.phone}</p>}
            </div>
          </div>

          {/* Running Zones Card */}
          {(athlete.zone1 || athlete.zone2 || athlete.zone3) && (
            <div className="rounded-2xl p-5 bg-white border border-[#E8E9EB] shadow-sm animate-fade-up">
              <div className="flex items-center justify-between mb-3.5 pb-2" style={{ borderBottom: '1px solid #F5F5F6' }}>
                <span className="eyebrow" style={{ color: '#7A7E85' }}>Zonas de Carrera</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-[#4A4F57] uppercase tracking-wider">Ritmos</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {athlete.zone1 && (
                  <div className="p-2 rounded-xl bg-gray-50 border border-[#E8E9EB]">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Zona 1</p>
                    <p className="text-xs font-bold text-[#1C1F23]">{athlete.zone1}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Rodaje</p>
                  </div>
                )}
                {athlete.zone2 && (
                  <div className="p-2 rounded-xl bg-gray-50 border border-[#E8E9EB]">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Zona 2</p>
                    <p className="text-xs font-bold text-[#E25C3E]">{athlete.zone2}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Umbral</p>
                  </div>
                )}
                {athlete.zone3 && (
                  <div className="p-2 rounded-xl bg-gray-50 border border-[#E8E9EB]">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Zona 3</p>
                    <p className="text-xs font-bold text-red-600">{athlete.zone3}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Vo2Max / Comp</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Personal Bests Card */}
          {athlete.personalBests && (athlete.personalBests.pb5k || athlete.personalBests.pb10k || athlete.personalBests.pb21k || athlete.personalBests.pb42k) && (
            <div className="rounded-2xl p-5 bg-white border border-[#E8E9EB] shadow-sm animate-fade-up">
              <div className="flex items-center justify-between mb-3.5 pb-2" style={{ borderBottom: '1px solid #F5F5F6' }}>
                <span className="eyebrow" style={{ color: '#7A7E85' }}>Mis Marcas Personales (PB)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-[#4A4F57] uppercase tracking-wider">Histórico</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {athlete.personalBests.pb5k && (
                  <div>
                    <span className="block text-[8px] text-[#7A7E85] font-semibold">5K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb5k}</span>
                  </div>
                )}
                {athlete.personalBests.pb10k && (
                  <div>
                    <span className="block text-[8px] text-[#7A7E85] font-semibold">10K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb10k}</span>
                  </div>
                )}
                {athlete.personalBests.pb21k && (
                  <div>
                    <span className="block text-[8px] text-[#7A7E85] font-semibold">21K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb21k}</span>
                  </div>
                )}
                {athlete.personalBests.pb42k && (
                  <div>
                    <span className="block text-[8px] text-[#7A7E85] font-semibold">42K</span>
                    <span className="text-xs font-bold text-gray-900">{athlete.personalBests.pb42k}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goal History Card */}
          <div className="rounded-2xl p-5 bg-white border border-[#E8E9EB] shadow-sm animate-fade-up">
            <div className="flex items-center justify-between mb-3.5 pb-2" style={{ borderBottom: '1px solid #F5F5F6' }}>
              <span className="eyebrow" style={{ color: '#7A7E85' }}>Historial de Objetivos</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-gray-400 bg-gray-100">
                {(athlete.goals || []).length}
              </span>
            </div>

            {(athlete.goals || []).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 italic text-center">No tienes objetivos cargados.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                {(athlete.goals || []).map(goal => (
                  <div 
                    key={goal.id} 
                    className="flex items-center gap-3 p-2.5 rounded-xl border transition-all"
                    style={{ 
                      background: goal.completed ? 'rgba(4, 120, 87, 0.02)' : '#F9FAFB', 
                      borderColor: goal.completed ? '#A7F3D0' : '#E8E9EB' 
                    }}
                  >
                    <button
                      onClick={() => handleToggleGoal(goal.id)}
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ 
                        background: goal.completed ? '#047857' : 'transparent',
                        border: goal.completed ? 'none' : '1px solid #D5D8DD',
                        color: '#FFFFFF'
                      }}
                    >
                      {goal.completed && <span className="text-[8px] font-bold">✓</span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p 
                        className="text-xs font-semibold truncate leading-normal" 
                        style={{ 
                          color: goal.completed ? '#6B7280' : '#1C1F23',
                          textDecoration: goal.completed ? 'line-through' : 'none'
                        }}
                      >
                        {goal.title}
                      </p>
                      <p className="text-[8px] text-[#7A7E85] mt-0.5">
                        Meta: {new Date(goal.targetDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Goal form */}
            <form onSubmit={handleAddGoal} className="pt-3.5 border-t border-[#F5F5F6] space-y-3">
              <div>
                <label className={labelCls}>Añadir Objetivo Personal</label>
                <input
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  placeholder="Ej. Mantener Zona 1 en la tirada"
                  className="w-full bg-[#F9FAFB] border border-[#D5D8DD] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A7E85] text-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={newGoalDate}
                  onChange={e => setNewGoalDate(e.target.value)}
                  className="flex-1 bg-[#F9FAFB] border border-[#D5D8DD] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A7E85] text-gray-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1C1F23] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Calendar first, then Session Logger/Evaluation */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── 1. WEEKLY TRAINING CALENDAR ── */}
          {plan && (
            <div className="bg-white border border-[#E8E9EB] rounded-2xl shadow-sm animate-fade-up">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F1]">
                <h3 className="font-bold text-gray-900 text-base">Mi Calendario de Entrenamiento</h3>
                <span className="text-[10px] text-[#7A7E85] font-medium">
                  Semana inicia: <span className="font-bold text-gray-700 capitalize">{athlete.startOfWeekDay || 'lunes'}</span>
                </span>
              </div>

              <div className="p-5 space-y-5">
                {plan.weeks.map((week, wi) => {
                  const sortedDays = sortDaysByStartOfWeek(week.days, athlete.startOfWeekDay || 'lunes')
                  const weekColors = [
                    { bg: '#1C1F23', accent: '#A8FF00' },
                    { bg: '#1a3a5c', accent: '#60B4FF' },
                    { bg: '#2d1a4a', accent: '#c084fc' },
                    { bg: '#1a3d2b', accent: '#34D399' },
                    { bg: '#4a1c1c', accent: '#F87171' },
                  ]
                  const wc = weekColors[wi % weekColors.length]
                  // Which day (if any) in THIS week is expanded?
                  const expandedDay = sortedDays.find(d => d.id === expandedDayId) ?? null

                  return (
                    <div key={week.id} className="rounded-2xl border border-[#E8E9EB] overflow-hidden shadow-sm">

                      {/* Week header */}
                      <div
                        className="px-5 py-2.5 flex items-center justify-between"
                        style={{ background: wc.bg }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                            style={{ background: wc.accent, color: wc.bg }}
                          >
                            Semana {week.weekNumber}
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {sortedDays[0]?.dayLabel?.split(' ').slice(1).join(' ')} → {sortedDays[sortedDays.length - 1]?.dayLabel?.split(' ').slice(1).join(' ')}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {sortedDays.filter(d => d.feedback?.completed).length}/{sortedDays.length} ✓
                        </span>
                      </div>

                      {/* 7-column day grid */}
                      <div className="grid grid-cols-7 divide-x divide-[#F0F0F1]">
                        {sortedDays.map((day, di) => {
                          const isExpanded = expandedDayId === day.id
                          const isDone = !!day.feedback?.completed
                          const isRest = day.exercises.length === 0
                          const parts = day.dayLabel.split(' ')
                          const shortDay = parts[0]?.slice(0, 3) ?? ''
                          const dateNum = parts[1] ?? ''

                          return (
                            <button
                              key={day.id}
                              onClick={() => handleSelectDay(day)}
                              type="button"
                              className="flex flex-col items-center justify-start pt-3 pb-2.5 px-1 w-full transition-all duration-200 focus:outline-none"
                              style={{
                                minHeight: 88,
                                background: isExpanded
                                  ? wc.bg
                                  : isDone
                                  ? 'rgba(236,253,245,0.5)'
                                  : isRest
                                  ? '#FAFAFA'
                                  : '#FFFFFF',
                                borderBottom: isExpanded ? `3px solid ${wc.accent}` : '3px solid transparent',
                              }}
                            >
                              {/* Day abbrev */}
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                                style={{ color: isExpanded ? 'rgba(255,255,255,0.55)' : '#9CA3AF' }}
                              >
                                {shortDay}
                              </span>

                              {/* Date number */}
                              <span
                                className="text-xl font-black leading-none mb-1.5"
                                style={{ color: isExpanded ? '#fff' : isDone ? '#047857' : '#1C1F23' }}
                              >
                                {dateNum}
                              </span>

                              {/* Status indicator */}
                              {isDone ? (
                                <span className="text-sm leading-none flex items-center gap-0.5">
                                  <span>{day.feedback?.feelingEmoji || '✓'}</span>
                                  {day.feedback?.replies && day.feedback.replies.length > 0 && (
                                    <span className="text-[9px] filter drop-shadow-sm" title="Nuevos comentarios">💬</span>
                                  )}
                                </span>
                              ) : isRest ? (
                                <span className="text-xs opacity-30">🌙</span>
                              ) : (
                                <div className="flex gap-0.5">
                                  {day.exercises.slice(0, 4).map((ex, ei) => (
                                    <div
                                      key={ei}
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ background: isExpanded ? wc.accent : ex.type === 'cardio' ? '#047857' : '#6366F1' }}
                                    />
                                  ))}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Expanded day detail panel */}
                      {expandedDay && (
                        <div
                          className="border-t border-[#F0F0F1] bg-[#FAFAFA]"
                          style={{ animation: 'fadeIn 0.18s ease' }}
                        >
                          <div className="px-5 py-4">
                            {/* Panel header */}
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A7E85] mb-0.5">Sesión del día</p>
                                <h4 className="text-base font-black text-gray-900">{expandedDay.dayLabel}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                {expandedDay.feedback?.completed ? (
                                  <span className="text-xs font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full">
                                    {expandedDay.feedback.feelingEmoji} Sesión registrada
                                  </span>
                                ) : expandedDay.exercises.length === 0 ? (
                                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">🌙 Descanso</span>
                                ) : (
                                  <span className="text-xs font-bold text-gray-500 bg-white border border-[#E8E9EB] px-3 py-1 rounded-full">Sin registrar</span>
                                )}
                                <button
                                  onClick={() => setExpandedDayId(null)}
                                  className="w-7 h-7 rounded-full bg-white border border-[#E8E9EB] flex items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-400 transition-all cursor-pointer text-sm font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Exercises */}
                            {expandedDay.exercises.length === 0 ? (
                              <p className="text-sm text-[#7A7E85] italic text-center py-4">🌙 Día de descanso activo — descansa y recupera.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {expandedDay.exercises.map(ex => {
                                  const details: string[] = []
                                  if (ex.duration) details.push(`${ex.duration} min`)
                                  if (ex.distance) details.push(`${ex.distance} km`)
                                  if (ex.pace) details.push(ex.pace)
                                  return (
                                    <div
                                      key={ex.id}
                                      className="bg-white rounded-xl border border-[#E8E9EB] p-3.5 flex gap-3"
                                    >
                                      <span className="text-lg flex-shrink-0 mt-0.5">
                                        {ex.type === 'strength' ? '💪' : '🏃'}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 leading-tight">{ex.name}</p>
                                        {details.length > 0 && (
                                          <p className="text-xs text-[#7A7E85] mt-1 font-medium">{details.join(' · ')}</p>
                                        )}
                                        {ex.notes && (
                                          <p className="text-[11px] text-gray-400 italic mt-1 leading-tight">{ex.notes}</p>
                                        )}
                                        <span
                                          className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                          style={{
                                            background: ex.type === 'cardio' ? 'rgba(4,120,87,0.07)' : 'rgba(99,102,241,0.07)',
                                            color: ex.type === 'cardio' ? '#047857' : '#6366F1',
                                          }}
                                        >
                                          {ex.type === 'cardio' ? 'Cardio' : 'Fuerza'}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* CTA button → scroll to logger */}
                            {expandedDay.exercises.length > 0 && !expandedDay.feedback?.completed && (
                              <div className="flex justify-center mt-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedDayId(null)
                                    setTimeout(() => loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
                                  }}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 cursor-pointer hover:opacity-90"
                                  style={{ background: '#1C1F23' }}
                                >
                                  Registrar sesión <span className="text-base">↓</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            </div>
          )}


          {/* ── 2. SESSION LOGGER / EVALUATION ── */}
          <div ref={loggerRef} />
          {plan && session ? (
            <div>
              {saved ? (
                <div className="rounded-2xl p-10 text-center animate-fade-up bg-white border border-[#E8E9EB] shadow-sm mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-[#ECFDF5] border border-[#A7F3D0]">
                    <span className="text-xl font-bold text-[#047857]">✓</span>
                  </div>
                  <p className="eyebrow mb-2 text-[#7A7E85]">Sesión registrada</p>
                  <h2 className="text-2xl font-bold mb-2 text-[#1C1F23]" style={{ letterSpacing: '-0.025em' }}>
                    ¡Excelente trabajo!
                  </h2>
                  <p className="text-sm mb-8 text-[#4A4F57]">
                    Tus resultados y comentarios fueron enviados al entrenador.
                  </p>
                  <button
                    onClick={() => { setSaved(false); setLogs(session.logs || {}) }}
                    className="eyebrow transition-colors duration-200 text-[#7A7E85] hover:text-[#1C1F23] cursor-pointer"
                  >
                    Ver o editar reporte →
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-[#E8E9EB] rounded-2xl p-6 shadow-sm space-y-6 animate-fade-up">

                  {/* Session header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#F5F5F6]">
                    <div>
                      <p className="eyebrow mb-1">{plan.name}</p>
                      <h1 className="text-2xl font-bold text-[#1C1F23] tracking-tight">
                        {session.dayLabel}
                      </h1>
                    </div>
                    {session.feedback?.completed && (
                      <span className="mt-2 md:mt-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] self-start md:self-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                        Completado {session.feedback.feelingEmoji}
                      </span>
                    )}
                  </div>

                  {/* Exercises list */}
                  <div className="space-y-4">
                    {session.exercises.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <span className="text-3xl block mb-2">🧘</span>
                        <p className="text-sm font-semibold">Día de descanso activo / recuperación</p>
                        <p className="text-xs text-[#7A7E85] mt-1">Disfruta de tu descanso o realiza estiramientos ligeros.</p>
                      </div>
                    ) : (
                      session.exercises.map(ex => {
                        const log = logs[ex.id] || {}
                        const done = !!log.completed

                        const matchingLibEx = strengthExercises.find(
                          se => se.name.toLowerCase().trim() === ex.name.toLowerCase().trim()
                        )

                        return (
                          <div
                            key={ex.id}
                            className="rounded-2xl p-5 border transition-all duration-200 bg-white"
                            style={{
                              borderColor: done ? '#047857' : '#E8E9EB',
                              boxShadow: done ? '0 4px 12px rgba(4,120,87,0.04)' : 'none',
                            }}
                          >
                            {/* Exercise header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                                    style={{
                                      background: ex.type === 'cardio' ? 'rgba(4,120,87,0.06)' : '#F5F5F6',
                                      color: ex.type === 'cardio' ? '#047857' : '#4A4F57',
                                    }}
                                  >
                                    {ex.type === 'cardio' ? 'Cardio' : 'Fuerza'}
                                  </span>
                                  {matchingLibEx && (
                                    <button
                                      onClick={() => setShowGuide(matchingLibEx)}
                                      type="button"
                                      className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-0.5 cursor-pointer"
                                      title="Ver video y guía del ejercicio"
                                    >
                                      <span>ℹ️</span> Guía Técnica
                                    </button>
                                  )}
                                </div>
                                <h3 className="font-bold text-sm text-[#1C1F23]">{ex.name}</h3>
                                {ex.notes && (
                                  <p className="text-xs text-[#7A7E85] mt-0.5 italic">{ex.notes}</p>
                                )}
                              </div>

                              <button
                                onClick={() => toggleDone(ex.id)}
                                type="button"
                                className="w-7 h-7 rounded-lg flex items-center justify-center ml-3 flex-shrink-0 transition-all duration-150 cursor-pointer"
                                style={{
                                  background: done ? '#047857' : 'transparent',
                                  border: done ? 'none' : '1px solid #D5D8DD',
                                  color: done ? '#FFFFFF' : '#7A7E85',
                                }}
                              >
                                {done && <span className="text-xs font-bold">✓</span>}
                              </button>
                            </div>

                            {/* Planned workout card */}
                            <div className="rounded-xl p-3 mb-4 bg-[#F5F5F6] border border-[#E8E9EB]">
                              <p className="eyebrow text-[9px] mb-1 text-[#7A7E85]">Planificado</p>
                              <p className="text-xs text-[#4A4F57] font-semibold">
                                {ex.type === 'strength' ? (
                                  ex.notes ? (
                                    <span className="font-normal italic text-[#7A7E85]">{ex.notes}</span>
                                  ) : ex.sets ? (
                                    <>
                                      {ex.sets} series × {ex.reps} reps
                                      {ex.weight && <span className="text-gray-400"> · {ex.weight} kg</span>}
                                    </>
                                  ) : (
                                    <span className="font-normal italic text-[#7A7E85]">Selecciona los ejercicios realizados abajo</span>
                                  )
                                ) : (
                                  <>
                                    {ex.distance && `${ex.distance} km`}
                                    {ex.duration && ` · ${ex.duration} min`}
                                    {ex.pace && ` · ${ex.pace}`}
                                    {ex.heartRateZone && ` · Zona ${ex.heartRateZone}`}
                                  </>
                                )}
                              </p>
                            </div>

                            {/* Actual results */}
                            {ex.type === 'cardio' ? (
                              <div className="mb-4">
                                <p className="eyebrow text-[9px] mb-2 text-[#7A7E85]">Completado Real</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { label: 'Km', field: 'actualDistance', placeholder: String(ex.distance ?? ''), type: 'text' },
                                    { label: 'Min', field: 'actualDuration', placeholder: String(ex.duration ?? ''), type: 'text' },
                                    { label: 'Ritmo', field: 'actualPace', placeholder: ex.pace ?? '5:30', type: 'text' },
                                  ].map(({ label, field, placeholder, type }) => (
                                    <div key={field}>
                                      <label className="block text-[8px] mb-1 font-semibold text-[#7A7E85] uppercase tracking-wide">{label}</label>
                                      <input
                                        type={type}
                                        value={(log as Record<string, unknown>)[field] as string ?? ''}
                                        onChange={e => updateLog(ex.id, field, e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-white border border-[#D5D8DD] outline-none focus:border-gray-500"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* Strength library picker — compact grid */
                              <div className="mb-4">
                                {/* Section tabs */}
                                <div className="flex gap-1 mb-3">
                                  {STRENGTH_SECTIONS.map(sect => {
                                    const activeTab = strengthOpenRoutine[ex.id] ?? 'inferior'
                                    const isActive = activeTab === sect.id
                                    const selCount = Object.keys(strengthSels[ex.id] || {})
                                      .filter(lid => strengthExercises.find(se => se.id === lid && se.routine === sect.id)).length
                                    return (
                                      <button
                                        key={sect.id}
                                        type="button"
                                        onClick={() => setStrengthOpenRoutine(prev => ({ ...prev, [ex.id]: sect.id }))}
                                        className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                        style={{
                                          background: isActive ? '#1C1F23' : '#F5F5F6',
                                          color: isActive ? '#A8FF00' : '#4A4F57',
                                          border: `1px solid ${isActive ? '#1C1F23' : '#E8E9EB'}`,
                                        }}
                                      >
                                        {sect.label}
                                        {selCount > 0 && (
                                          <span className="ml-1 text-[8px] font-black px-1 rounded-full" style={{ background: '#A8FF00', color: '#1C1F23' }}>
                                            {selCount}
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>

                                {/* "Rutina completa" button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentRoutine = strengthOpenRoutine[ex.id] ?? 'inferior'
                                    const routineExs = strengthExercises.filter(se => se.routine === currentRoutine)
                                    const newSels: Record<string, { series: string; reps: string }> = {}
                                    for (const se of routineExs) {
                                      newSels[se.id] = { series: String(se.series || 2), reps: se.reps || '' }
                                    }
                                    setStrengthSels(prev => ({ ...prev, [ex.id]: newSels }))
                                    setLogs(prev => ({ ...prev, [ex.id]: { ...prev[ex.id], completed: true } }))
                                  }}
                                  className="w-full mb-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                                  style={{ background: '#A8FF00', color: '#1C1F23', border: 'none' }}
                                >
                                  <span>✓</span> Hice la rutina completa
                                </button>

                                {/* Compact 2-col card grid */}
                                <div className="grid grid-cols-2 gap-2">
                                  {strengthExercises
                                    .filter(se => se.routine === (strengthOpenRoutine[ex.id] ?? 'inferior'))
                                    .map(se => {
                                      const isChecked = !!(strengthSels[ex.id]?.[se.id])
                                      const vals = strengthSels[ex.id]?.[se.id] || { series: '', reps: '' }
                                      return (
                                        <div
                                          key={se.id}
                                          className="rounded-xl p-3 transition-all cursor-pointer select-none"
                                          style={{
                                            background: isChecked ? 'rgba(168,255,0,0.06)' : '#F9FAFB',
                                            border: `1.5px solid ${isChecked ? 'rgba(168,255,0,0.4)' : '#EFEFEF'}`,
                                          }}
                                          onClick={() => setStrengthSels(prev => {
                                            const planSels = { ...(prev[ex.id] || {}) }
                                            if (planSels[se.id]) { delete planSels[se.id] }
                                            else { planSels[se.id] = { series: String(se.series || 2), reps: se.reps || '' } }
                                            return { ...prev, [ex.id]: planSels }
                                          })}
                                        >
                                          {/* Name row */}
                                          <div className="flex items-start gap-1.5">
                                            <span
                                              className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center mt-0.5"
                                              style={{
                                                background: isChecked ? '#A8FF00' : 'transparent',
                                                border: isChecked ? 'none' : '1.5px solid #D5D8DD',
                                              }}
                                            >
                                              {isChecked && <span className="text-[8px] font-black text-[#1C1F23]">✓</span>}
                                            </span>
                                            <span className="text-[11px] font-semibold text-gray-800 leading-tight">{se.name}</span>
                                          </div>

                                          {/* Inputs when checked */}
                                          {isChecked && (
                                            <div
                                              className="flex items-center gap-1 mt-2 pl-5"
                                              onClick={e => e.stopPropagation()}
                                            >
                                              <input
                                                type="number"
                                                min="1"
                                                value={vals.series}
                                                onChange={e => setStrengthSels(prev => ({
                                                  ...prev,
                                                  [ex.id]: { ...(prev[ex.id] || {}), [se.id]: { ...vals, series: e.target.value } }
                                                }))}
                                                placeholder={String(se.series || 2)}
                                                className="w-10 rounded-lg px-1 py-1 text-xs text-gray-900 bg-white border border-[#D5D8DD] outline-none text-center"
                                              />
                                              <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">×</span>
                                              <input
                                                type="text"
                                                value={vals.reps}
                                                onChange={e => setStrengthSels(prev => ({
                                                  ...prev,
                                                  [ex.id]: { ...(prev[ex.id] || {}), [se.id]: { ...vals, reps: e.target.value } }
                                                }))}
                                                placeholder={se.reps || 'Reps'}
                                                className="w-full rounded-lg px-1 py-1 text-xs text-gray-900 bg-white border border-[#D5D8DD] outline-none text-center"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                </div>

                                {Object.keys(strengthSels[ex.id] || {}).length > 0 && (
                                  <p className="mt-2 text-[10px] text-[#7A7E85]">
                                    {Object.keys(strengthSels[ex.id]).length} ejercicio(s) registrado(s) ·{' '}
                                    <button
                                      type="button"
                                      className="underline cursor-pointer"
                                      onClick={() => setStrengthSels(prev => ({ ...prev, [ex.id]: {} }))}
                                    >
                                      Limpiar
                                    </button>
                                  </p>
                                )}
                              </div>
                            )}

                            {/* RPE Selector */}
                            <div>
                              <p className="eyebrow text-[9px] mb-2 text-[#7A7E85]">Esfuerzo percibido (RPE 1-10)</p>
                              <div className="flex gap-1">
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                  <RpeButton
                                    key={n}
                                    n={n}
                                    active={log.rpe === n}
                                    onClick={() => updateLog(ex.id, 'rpe', n)}
                                  />
                                ))}
                              </div>
                            </div>

                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Evaluation form */}
                  {session.exercises.length > 0 && (
                    <div className="pt-4 border-t border-[#F5F5F6] space-y-4">
                      <h4 className="font-bold text-gray-900 text-sm">Evaluación de la Sesión</h4>

                      {/* Emojis feeling select */}
                      <div>
                        <label className={labelCls}>¿Cómo te sentiste hoy?</label>
                        <div className="flex flex-wrap md:flex-nowrap gap-2 justify-between mt-1.5">
                          {EMOJI_OPTIONS.map(opt => {
                            const active = selectedRating === opt.value
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSelectedRating(opt.value)
                                  setSelectedEmoji(opt.emoji)
                                }}
                                className="flex-1 p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all duration-150 hover:bg-gray-50 cursor-pointer"
                                style={{
                                  background: active ? 'rgba(168, 255, 0, 0.08)' : '#FFFFFF',
                                  borderColor: active ? '#A8FF00' : '#E8E9EB',
                                  boxShadow: active ? '0 2px 8px rgba(168,255,0,0.05)' : 'none',
                                }}
                              >
                                <span className="text-xl mb-1">{opt.emoji}</span>
                                <span className="text-[8px] font-semibold text-center text-gray-500 leading-tight">{opt.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Coach Comments */}
                      <div>
                        <label className={labelCls}>Comentarios para tu Entrenador (sensaciones, malestar, etc.)</label>
                        <textarea
                          rows={3}
                          value={sessionComments}
                          onChange={e => setSessionComments(e.target.value)}
                          placeholder="Cuéntale a Óscar cómo te sentiste, si tuviste fatiga, dolor articular o ritmo cardíaco inusual..."
                          className="w-full bg-[#F9FAFB] border border-[#D5D8DD] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A7E85] text-gray-900 mt-1"
                        />
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={handleSaveSession}
                        type="button"
                        className="btn-primary w-full justify-center py-4 cursor-pointer"
                        style={{ borderRadius: '1rem' }}
                      >
                        <span>Confirmar y Guardar Sesión</span>
                        <span className="arrow">→</span>
                      </button>

                      {/* Chat / Replies Section for Athlete */}
                      {session.feedback?.completed && (
                        <div className="mt-6 pt-6 border-t border-[#F5F5F6] space-y-4">
                          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                            <span>💬</span> Chat de Retroalimentación con Óscar Barrón
                          </h4>
                          
                          {session.feedback.comments && (
                            <div className="bg-gray-50 border border-gray-150 p-3 rounded-xl">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Mi Comentario Inicial</p>
                              <p className="text-xs text-[#4A4F57] italic">"{session.feedback.comments}"</p>
                            </div>
                          )}

                          {session.feedback.replies && session.feedback.replies.length > 0 ? (
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                              {session.feedback.replies.map(reply => {
                                const isAthlete = reply.sender === 'athlete'
                                return (
                                  <div 
                                    key={reply.id} 
                                    className={`flex flex-col ${isAthlete ? 'items-end' : 'items-start'}`}
                                  >
                                    <div 
                                      className={`p-3 rounded-2xl max-w-[85%] text-xs leading-normal shadow-sm ${
                                        isAthlete 
                                          ? 'bg-[#A8FF00]/10 border border-[#A8FF00]/30 text-gray-900 rounded-tr-none' 
                                          : 'bg-[#1C1F23] text-white rounded-tl-none'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="font-bold text-[8.5px] uppercase tracking-wider opacity-90">
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
                            <p className="text-xs text-gray-400 italic text-center py-2">Sin mensajes de seguimiento aún.</p>
                          )}

                          {/* Send reply form */}
                          <div className="flex gap-2 items-end pt-2">
                            <div className="flex-1">
                              <textarea
                                rows={2}
                                value={athleteReplyText}
                                onChange={e => setAthleteReplyText(e.target.value)}
                                placeholder="Escribe un mensaje para tu entrenador..."
                                className="w-full bg-[#F9FAFB] border border-[#D5D8DD] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7A7E85] text-gray-900 resize-none max-h-24"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSendAthleteReply}
                              className="py-3 px-4 bg-[#1C1F23] hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer h-[42px] flex items-center justify-center flex-shrink-0"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          ) : !plan ? (
            <div className="rounded-2xl p-10 bg-white border border-[#E8E9EB] text-center shadow-sm">
              <span className="text-3xl block mb-3">🏃</span>
              <h3 className="font-bold text-gray-900 text-sm">Sin plan de entrenamiento activo</h3>
              <p className="text-xs text-[#7A7E85] mt-1 max-w-sm mx-auto">
                No tienes planes cargados en este momento. Ponte en contacto con tu entrenador para habilitar tu calendario.
              </p>
            </div>
          ) : null}

        </div>

      </div>

      {/* STRENGTH GUIDE TECHNIQUE MODAL */}
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
