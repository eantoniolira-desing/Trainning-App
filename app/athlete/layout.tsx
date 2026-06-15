'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getAthletes, getPlans, getAthleteNotifications, saveAthleteNotifications } from '@/lib/db'
import { Athlete, TrainingPlan, AthleteNotificationEntry } from '@/lib/types'

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null)
  const [mounted, setMounted] = useState(false)

  // Notification states
  const [notifications, setNotifications] = useState<AthleteNotificationEntry[]>([])
  const [isOpenNotif, setIsOpenNotif] = useState(false)

  const loadNotifications = () => {
    setNotifications(getAthleteNotifications())
  }

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    saveAthleteNotifications(updated)
  }

  const handleNotifClick = (notif: AthleteNotificationEntry) => {
    const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n)
    setNotifications(updated)
    saveAthleteNotifications(updated)
    setIsOpenNotif(false)
    router.push(`/athlete/dashboard?dayId=${notif.dayId}`)
    window.dispatchEvent(new Event('chat-reply-saved'))
  }

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

    const athletePlans = getPlans().filter(p => p.athleteId === athleteId)
    // Try to find an ending in the future first
    const active = athletePlans.find(p => new Date(p.endDate) >= new Date()) || athletePlans[athletePlans.length - 1]
    if (active) {
      setActivePlan(active)
    }

    // Load initial notification state
    loadNotifications()

    setMounted(true)

    if (typeof window !== 'undefined') {
      const handleSync = () => {
        loadNotifications()
      }
      window.addEventListener('chat-reply-saved', handleSync)
      window.addEventListener('athlete-session-saved', handleSync)

      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'athlete_tracker_athlete_notifications') {
          loadNotifications()
        }
      }
      window.addEventListener('storage', handleStorage)

      return () => {
        window.removeEventListener('chat-reply-saved', handleSync)
        window.removeEventListener('athlete-session-saved', handleSync)
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('active_athlete_id')
    router.push('/')
  }

  if (!mounted || !athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F6]">
        <div className="animate-pulse text-[#7A7E85] font-semibold text-sm">Cargando perfil...</div>
      </div>
    )
  }

  const initials = athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F6' }}>
      {/* Top bar — full width */}
      <header
        className="sticky top-0 z-10"
        style={{ background: '#1C1F23', borderBottom: '1px solid #2a2e35' }}
      >
        <div className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">

          {/* Left: Logo + plan name */}
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Óscar Barrón"
              className="w-28 sm:w-44"
              style={{ filter: 'brightness(0) invert(1)', opacity: 0.95 }}
            />
            {activePlan && (
              <span
                className="hidden md:block text-sm"
                style={{
                  color: '#7A7E85',
                  borderLeft: '1px solid #3a3f47',
                  paddingLeft: '1.25rem',
                  fontFamily: 'Space Grotesk, sans-serif',
                  letterSpacing: '0.03em',
                }}
              >
                {activePlan.name}
              </span>
            )}
          </div>

          {/* Right: Nav + identity */}
          <div className="flex items-center gap-4">
            <Link
              href="/athlete/strength-library"
              className="hidden sm:flex items-center gap-2 text-xs font-semibold transition-all duration-150 px-4 py-2 rounded-xl cursor-pointer"
              style={{ color: '#A8FF00', background: 'rgba(168,255,0,0.08)', border: '1px solid rgba(168,255,0,0.2)' }}
            >
              🏋️ Biblioteca de Fuerza
            </Link>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6" style={{ background: '#3a3f47' }} />

            {/* Notification Bell Icon */}
            <button
              onClick={() => setIsOpenNotif(!isOpenNotif)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#252830] transition-colors relative flex-shrink-0 cursor-pointer border border-[#3a3f47]"
              style={{ color: '#D5D8DD' }}
              title="Buzón de notificaciones"
            >
              <span className="text-sm">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border border-[#1C1F23]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6" style={{ background: '#3a3f47' }} />

            {/* Avatar + Name */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#3a3f47' }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: '#D5D8DD', fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {initials}
                </span>
              </div>
              <span
                className="hidden md:block text-sm font-medium"
                style={{ color: '#D5D8DD', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {athlete.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs transition-colors duration-150 font-medium cursor-pointer px-3 py-2 rounded-lg"
              style={{ color: '#7A7E85', background: 'transparent', border: '1px solid #3a3f47' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; (e.currentTarget as HTMLElement).style.borderColor = '#7A7E85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7A7E85'; (e.currentTarget as HTMLElement).style.borderColor = '#3a3f47' }}
            >
              Salir
            </button>
          </div>

          {/* Floating Notifications Popover for Athlete */}
          {isOpenNotif && (
            <div 
              className="absolute right-8 top-16 z-40 w-80 bg-white border border-[#E8E9EB] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px] animate-fade-in text-left"
            >
              {/* Header */}
              <div className="p-4 border-b border-[#F5F5F6] flex items-center justify-between bg-gray-50">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">Notificaciones</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[9px] font-bold text-[#4A4F57] hover:underline cursor-pointer"
                  >
                    Marcar todo leído
                  </button>
                  <button
                    onClick={() => setIsOpenNotif(false)}
                    className="text-xs text-gray-400 hover:text-gray-900 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#F5F5F6]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs italic">
                    Sin notificaciones nuevas
                  </div>
                ) : (
                  notifications.map(notif => {
                    return (
                      <div 
                        key={notif.id}
                        className={`p-3 text-xs transition-colors hover:bg-gray-50 flex flex-col gap-1 cursor-pointer relative ${
                          notif.read ? 'opacity-70' : 'bg-lime-50/20 font-medium'
                        }`}
                        onClick={() => handleNotifClick(notif)}
                      >
                        {!notif.read && (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-lime-500" />
                        )}
                        <div className="pl-2.5 flex flex-col gap-1">
                          <p className="text-gray-900 text-[10px] leading-tight">
                            {notif.text}
                          </p>
                          <span className="text-[8px] text-gray-400 self-start font-bold uppercase tracking-wide">
                            {notif.dayLabel}
                          </span>
                        </div>
                        <span className="pl-2.5 text-[7px] text-gray-400 self-end font-mono">
                          {new Date(notif.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </header>

      <div className="pb-16 sm:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around py-2 border-t"
        style={{ background: '#1C1F23', borderColor: '#2a2e35' }}
      >
        <Link
          href="/athlete/dashboard"
          className="flex flex-col items-center gap-1 px-6 py-1.5"
          style={{ color: pathname === '/athlete/dashboard' ? '#A8FF00' : '#7A7E85' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="text-[9px] font-semibold uppercase tracking-wider">Mi Plan</span>
        </Link>
        <Link
          href="/athlete/strength-library"
          className="flex flex-col items-center gap-1 px-6 py-1.5"
          style={{ color: pathname === '/athlete/strength-library' ? '#A8FF00' : '#7A7E85' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10h2M15 10h2M5 10h10M5 7v6M15 7v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-[9px] font-semibold uppercase tracking-wider">Biblioteca</span>
        </Link>
      </nav>
    </div>
  )
}
