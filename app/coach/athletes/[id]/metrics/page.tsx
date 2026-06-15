'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getAthletes } from '@/lib/db'
import { Athlete } from '@/lib/types'
import {
  parseActivityFile, formatDuration, formatDistance, formatPace, activityIcon,
  type Activity,
} from '@/lib/parsers/activity-parser'

const STORAGE_KEY = (id: string) => `athlete-activities-${id}`

const DEVICES = [
  { name: 'Garmin', exts: '.fit .gpx .tcx CSV' },
  { name: 'COROS', exts: '.fit .gpx CSV' },
  { name: 'Polar', exts: '.gpx .tcx' },
  { name: 'Suunto', exts: '.gpx .tcx' },
]

export default function MetricsPage() {
  const params = useParams()
  const id = params.id as string
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const found = getAthletes().find(a => a.id === id)
    if (found) setAthlete(found)
    try {
      const stored = localStorage.getItem(STORAGE_KEY(id))
      if (stored) setActivities(JSON.parse(stored))
    } catch {}
  }, [id])

  const save = (acts: Activity[]) => {
    setActivities(acts)
    localStorage.setItem(STORAGE_KEY(id), JSON.stringify(acts))
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setStatus('loading')
    setError('')
    const newActs: Activity[] = []
    const errors: string[] = []

    for (const file of Array.from(files)) {
      try {
        const parsed = await parseActivityFile(file)
        newActs.push(...parsed)
      } catch (e: unknown) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'Error desconocido'}`)
      }
    }

    if (newActs.length) save([...newActs, ...activities])
    if (errors.length) setError(errors.join('\n'))
    setStatus(errors.length && !newActs.length ? 'error' : 'idle')
  }

  const deleteActivity = (actId: string) =>
    save(activities.filter(a => a.id !== actId))

  const totalDistance = activities.reduce((s, a) => s + (a.distanceMeters ?? 0), 0)
  const totalTime = activities.reduce((s, a) => s + a.durationSeconds, 0)
  const withHR = activities.filter(a => a.avgHeartRate)
  const avgHR = withHR.length
    ? Math.round(withHR.reduce((s, a) => s + a.avgHeartRate!, 0) / withHR.length)
    : 0

  if (!athlete) {
    return (
      <div className="p-10" style={{ color: '#7A7E85', fontSize: '0.875rem' }}>
        Atleta no encontrado
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <Link
          href={`/coach/athletes/${id}`}
          className="inline-flex items-center gap-1 mb-4 transition-colors"
          style={{ fontSize: '0.8125rem', color: '#7A7E85', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#1C1F23')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7A7E85')}
        >
          ← Volver al perfil de {athlete.name}
        </Link>
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">GPS · Datos del Dispositivo</p>
            <h1 style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '2rem', fontWeight: 700,
              letterSpacing: '-0.03em', lineHeight: 1.1,
              color: '#1C1F23',
            }}>
              Métricas de {athlete.name}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {['FIT', 'GPX', 'TCX', 'CSV'].map(fmt => (
              <span
                key={fmt}
                style={{
                  fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
                  background: '#1C1F23', color: '#D5D8DD',
                  padding: '3px 8px', borderRadius: '6px', letterSpacing: '0.05em',
                }}
              >
                .{fmt.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        className="animate-fade-up delay-1"
        style={{
          border: dragOver ? '2px dashed #A8FF00' : '2px dashed #D5D8DD',
          background: dragOver ? 'rgba(168,255,0,0.03)' : 'white',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          textAlign: 'center',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          opacity: status === 'loading' ? 0.6 : 1,
          pointerEvents: status === 'loading' ? 'none' : 'auto',
          marginBottom: '1.5rem',
          transition: 'border-color 200ms, background 200ms',
        }}
      >
        <input
          ref={fileRef} type="file" multiple
          accept=".fit,.gpx,.tcx,.csv" className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {status === 'loading' ? (
          <div>
            <div style={{
              width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
              background: '#1C1F23', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <span style={{ color: '#A8FF00', fontSize: '1.5rem' }}>⌛</span>
            </div>
            <p style={{ fontWeight: 600, color: '#1C1F23', fontSize: '0.875rem' }}>
              Procesando archivo...
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
              background: dragOver ? 'rgba(168,255,0,0.15)' : '#F5F5F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', transition: 'background 200ms',
            }}>
              <span style={{ fontSize: '1.5rem' }}>⌚</span>
            </div>
            <p style={{ fontWeight: 600, color: '#1C1F23', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#7A7E85', marginBottom: '1.25rem' }}>
              Admite múltiples archivos a la vez
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {DEVICES.map(d => (
                <div
                  key={d.name}
                  style={{
                    background: '#1C1F23', borderRadius: '0.75rem',
                    padding: '0.5rem 0.875rem',
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: '0.75rem', color: 'white' }}>{d.name}</p>
                  <p style={{ fontSize: '10px', color: '#4A4F57', marginTop: '2px', fontFamily: 'monospace' }}>{d.exts}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="animate-fade-up"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '1rem', padding: '1rem', marginBottom: '1.5rem',
          }}
        >
          <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#f87171', marginBottom: '0.375rem' }}>
            Error al importar
          </p>
          <pre style={{ fontSize: '11px', color: '#fca5a5', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {error}
          </pre>
          <button
            onClick={() => setError('')}
            style={{
              fontSize: '11px', color: '#f87171', background: 'none',
              border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '0.5rem',
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Stats */}
      {activities.length > 0 && (
        <div className="animate-fade-up delay-2">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Actividades', value: String(activities.length), unit: '' },
              { label: 'Distancia total', value: formatDistance(totalDistance), unit: '' },
              { label: 'Tiempo total', value: formatDuration(totalTime), unit: '' },
              { label: 'FC promedio', value: avgHR ? String(avgHR) : '—', unit: avgHR ? 'bpm' : '' },
            ].map(stat => (
              <div
                key={stat.label}
                className="card-premium rounded-2xl text-center"
                style={{ background: '#1C1F23', border: '1px solid #252830', padding: '1.25rem' }}
              >
                <p className="eyebrow mb-2">{stat.label}</p>
                <p style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '1.5rem', fontWeight: 700,
                  color: 'white', letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {stat.value}
                  {stat.unit && (
                    <span style={{ fontSize: '0.75rem', color: '#7A7E85', fontWeight: 400, marginLeft: '3px' }}>
                      {stat.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Activities List */}
          <p className="eyebrow mb-4">Actividades Importadas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...activities]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(act => (
                <div
                  key={act.id}
                  className="card-premium rounded-2xl"
                  style={{ background: '#1C1F23', border: '1px solid #252830', padding: '1.25rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                      {/* Icon */}
                      <div style={{
                        width: '2.75rem', height: '2.75rem', flexShrink: 0,
                        background: '#252830', borderRadius: '0.75rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}>
                        {activityIcon(act.type)}
                      </div>

                      <div style={{ flex: 1 }}>
                        {/* Name + file type */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'white' }}>
                            {act.name}
                          </p>
                          <span style={{
                            fontSize: '9px', fontFamily: 'monospace', fontWeight: 700,
                            background: '#252830', color: '#7A7E85',
                            padding: '2px 6px', borderRadius: '4px',
                          }}>
                            {act.fileType}
                          </span>
                        </div>

                        {/* Date */}
                        <p style={{ fontSize: '0.75rem', color: '#4A4F57', marginBottom: '0.75rem' }}>
                          {new Date(act.date).toLocaleDateString('es-MX', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>

                        {/* Metrics */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                          {act.distanceMeters && (
                            <Metric value={formatDistance(act.distanceMeters)} label="Distancia" />
                          )}
                          <Metric value={formatDuration(act.durationSeconds)} label="Duración" />
                          {act.distanceMeters && (
                            <Metric
                              value={formatPace(act.distanceMeters, act.durationSeconds)}
                              label="Ritmo promedio"
                            />
                          )}
                          {act.avgHeartRate && (
                            <Metric value={`${act.avgHeartRate} bpm`} label="FC promedio" />
                          )}
                          {act.maxHeartRate && (
                            <Metric value={`${act.maxHeartRate} bpm`} label="FC máxima" />
                          )}
                          {act.calories && (
                            <Metric value={String(act.calories)} label="Calorías" />
                          )}
                          {act.elevationGainMeters && (
                            <Metric value={`+${act.elevationGainMeters}m`} label="Desnivel" accent />
                          )}
                          {act.avgCadence && (
                            <Metric value={String(act.avgCadence)} label="Cadencia" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteActivity(act.id)}
                      className="cursor-pointer transition-colors flex-shrink-0"
                      style={{
                        background: 'none', border: 'none',
                        color: '#252830', fontSize: '1.25rem', lineHeight: 1,
                        marginTop: '2px',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#252830')}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {activities.length === 0 && status === 'idle' && !error && (
        <div className="text-center animate-fade-up delay-2" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div style={{
            width: '4rem', height: '4rem', borderRadius: '1.25rem',
            background: '#F5F5F6', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem',
          }}>
            📂
          </div>
          <p className="eyebrow mb-2">Sin Actividades</p>
          <p style={{ fontSize: '0.8125rem', color: '#7A7E85' }}>
            Sube archivos de tu dispositivo GPS para ver las métricas aquí
          </p>
        </div>
      )}
    </div>
  )
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <p style={{
        fontFamily: 'var(--font-space-grotesk)',
        fontSize: '1rem', fontWeight: 700, lineHeight: 1,
        color: accent ? '#A8FF00' : 'white',
        marginBottom: '2px',
      }}>
        {value}
      </p>
      <p style={{ fontSize: '10px', color: '#4A4F57' }}>{label}</p>
    </div>
  )
}
