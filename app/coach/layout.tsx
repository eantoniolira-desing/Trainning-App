'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getCoachProfile, getNotifications, saveNotifications } from '@/lib/db'
import { CoachProfile, NotificationEntry } from '@/lib/types'

const NAV = [
  { href: '/coach/dashboard', icon: '▤', label: 'Mis atletas' },
  { href: '/coach/strength-library', icon: '🏋️', label: 'Biblioteca de Fuerza' },
  { href: '/coach/athletes/new', icon: '+', label: 'Nuevo atleta' },
  { href: '/coach/profile', icon: '👤', label: 'Mi perfil' },
]

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [coach, setCoach] = useState<CoachProfile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Notification states
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const [isOpenNotif, setIsOpenNotif] = useState(false)

  const loadCoach = () => {
    setCoach(getCoachProfile())
  }

  const loadNotifications = () => {
    setNotifications(getNotifications())
  }

  useEffect(() => {
    loadCoach()
    loadNotifications()

    if (typeof window !== 'undefined') {
      window.addEventListener('coach-profile-updated', loadCoach)
      
      const handleSessionSaved = () => {
        loadNotifications()
      }
      
      window.addEventListener('athlete-session-saved', handleSessionSaved)
      
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'athlete_tracker_notifications') {
          loadNotifications()
        }
      }
      window.addEventListener('storage', handleStorage)

      return () => {
        window.removeEventListener('coach-profile-updated', loadCoach)
        window.removeEventListener('athlete-session-saved', handleSessionSaved)
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [])

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    saveNotifications(updated)
  }

  const handleNotifClick = (notif: NotificationEntry) => {
    const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n)
    setNotifications(updated)
    saveNotifications(updated)
    setIsOpenNotif(false)
    router.push(`/coach/athletes/${notif.athleteId}`)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="flex h-screen" style={{ background: '#F5F5F6' }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-56 flex flex-col flex-shrink-0 z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: '#1C1F23' }}
      >
        {/* Logo area */}
        <div className="px-6 pt-7 pb-5" style={{ borderBottom: '1px solid #1e2226' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Óscar Barrón Entrenador"
            style={{
              width: '100%',
              maxWidth: 148,
              filter: 'brightness(0) invert(1)',
              opacity: 0.95,
            }}
          />
        </div>

        {/* Coach Profile Widget with Bell */}
        {coach && (
          <div className="px-6 py-4 flex items-center justify-between gap-2 border-b border-[#1e2226] relative">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#252830] flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.05)]">
                {coach.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.photo} alt={coach.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-[#A8FF00]">
                    {coach.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{coach.name}</p>
                <p className="text-[9px] mt-0.5 truncate" style={{ color: '#7A7E85' }}>
                  {coach.email}
                </p>
              </div>
            </div>

            {/* Notification Bell Icon */}
            <button
              onClick={() => setIsOpenNotif(!isOpenNotif)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#252830] transition-colors relative flex-shrink-0 cursor-pointer"
              title="Buzón de notificaciones"
            >
              <span className="text-sm">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border border-[#1C1F23]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Section label */}
        <div className="px-6 pt-6 pb-2">
          <span className="eyebrow" style={{ color: '#7A7E85' }}>
            Entrenador
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== '/coach/dashboard' && pathname.startsWith(href))

            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm tracking-wide transition-all duration-150 relative"
                style={{
                  background: active ? '#252830' : 'transparent',
                  color: active ? '#fff' : '#7A7E85',
                  fontWeight: active ? 500 : 400,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = '#1e2226'
                    ;(e.currentTarget as HTMLElement).style.color = '#FFFFFF'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = '#7A7E85'
                  }
                }}
              >
                {/* Active accent bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: '#A8FF00' }}
                  />
                )}
                <span
                  className="text-xs font-bold w-4 text-center"
                  style={{ color: active ? '#A8FF00' : '#7A7E85' }}
                >
                  {icon}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-6" style={{ borderTop: '1px solid #1e2226', paddingTop: '1.25rem' }}>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150"
            style={{ color: '#7A7E85' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#FFFFFF'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = '#7A7E85'
            }}
          >
            <span className="text-xs">←</span>
            <span className="text-xs uppercase tracking-widest font-medium">Salir</span>
          </Link>
        </div>
      </aside>

      {/* Floating Notifications Popover */}
      {isOpenNotif && (
        <div
          className="fixed left-4 lg:left-60 top-20 z-50 w-80 bg-white border border-[#E8E9EB] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px] animate-fade-in"
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
                      notif.read ? 'opacity-70' : 'bg-blue-50/10 font-medium'
                    }`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    {!notif.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                    <div className="pl-2.5 flex items-start justify-between gap-1">
                      <p className="text-gray-900 text-[10px] leading-tight">
                        <strong>{notif.athleteName}</strong> completó <strong>{notif.dayLabel}</strong>
                      </p>
                      <span className="text-xs flex-shrink-0">{notif.feelingEmoji}</span>
                    </div>
                    {notif.comments && (
                      <p className="ml-2.5 text-[9.5px] text-gray-500 italic line-clamp-2 leading-relaxed bg-[#F9FAFB] border border-gray-100 p-1.5 rounded-lg">
                        "{notif.comments}"
                      </p>
                    )}
                    <span className="pl-2.5 text-[7px] text-gray-400 self-end">
                      {new Date(notif.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto lg:ml-56">
        {/* Mobile top bar */}
        <div
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3"
          style={{ background: '#1C1F23', borderBottom: '1px solid #2a2e35' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ background: '#252830' }}
            aria-label="Abrir menú"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src="/logo.png"
            alt="Óscar Barrón"
            className="w-32"
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.95 }}
          />
          <div className="w-9" />
        </div>
        {children}
      </main>
    </div>
  )
}
