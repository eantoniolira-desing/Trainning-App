'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getStrengthLibrary, saveStrengthLibrary } from '@/lib/db'
import { StrengthExercise } from '@/lib/types'

const ExercisePdfImage = dynamic(
  () => import('@/components/ExercisePdfImage').then(m => m.ExercisePdfImage),
  { ssr: false }
)

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|v=)([^#&?]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : null
}

const ROUTINES = [
  { id: 'inferior', label: 'Tronco Inferior', sublabel: 'Gym' },
  { id: 'superior', label: 'Tronco Superior', sublabel: 'Gym' },
  { id: 'casa',     label: 'Fuerza en Casa',  sublabel: 'Banda Elástica' },
  { id: 'custom',   label: 'Personalizado',   sublabel: 'Mi biblioteca' },
]

const CATEGORIES = [
  'Pierna', 'Glúteo', 'Cadera', 'Empuje', 'Tirón',
  'Core', 'Pie', 'Cadena Posterior', 'Tren Superior', 'Full Body', 'Movilidad',
]

const inputCls =
  'w-full bg-white border border-[#E8E9EB] rounded-xl px-4 py-2.5 text-sm text-[#1C1F23] placeholder-[#D5D8DD] transition-colors focus:border-[#4A4F57] focus:outline-none'
const labelCls =
  'block text-[10px] font-semibold uppercase tracking-widest mb-1.5 text-[#7A7E85]'

export default function StrengthLibraryPage() {
  const [exercises, setExercises] = useState<StrengthExercise[]>([])
  const [mounted, setMounted] = useState(false)
  const [activeRoutine, setActiveRoutine] = useState('inferior')
  const [editingEx, setEditingEx] = useState<StrengthExercise | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [routine, setRoutine] = useState('inferior')
  const [reps, setReps] = useState('')
  const [series, setSeries] = useState<number>(2)
  const [tips, setTips] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  useEffect(() => {
    setExercises(getStrengthLibrary())
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="p-10 max-w-7xl mx-auto">
        <div className="h-10 rounded-2xl animate-pulse mb-10" style={{ background: '#E8E9EB', width: '35%' }} />
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: '#E8E9EB' }} />
          ))}
        </div>
      </div>
    )
  }

  const filteredExercises = exercises.filter(
    ex => (ex.routine || 'custom') === activeRoutine
  )

  const routineCounts = ROUTINES.reduce<Record<string, number>>((acc, r) => {
    acc[r.id] = exercises.filter(ex => (ex.routine || 'custom') === r.id).length
    return acc
  }, {})

  const resetForm = () => {
    setName(''); setDescription(''); setCategory(CATEGORIES[0])
    setRoutine(activeRoutine); setReps(''); setSeries(2); setTips(''); setVideoUrl('')
  }

  const handleOpenAdd = () => {
    resetForm(); setEditingEx(null); setIsAdding(true)
  }

  const handleOpenEdit = (ex: StrengthExercise) => {
    setEditingEx(ex); setName(ex.name); setDescription(ex.description || '')
    setCategory(ex.category || CATEGORIES[0]); setRoutine(ex.routine || 'custom')
    setReps(ex.reps || ''); setSeries(ex.series ?? 2)
    setTips(ex.tips?.join('\n') || ex.instructions || '')
    setVideoUrl(ex.videoUrl || ''); setIsAdding(false)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const tipsArr = tips.split('\n').map(t => t.trim()).filter(Boolean)
    let updated: StrengthExercise[]
    if (editingEx) {
      updated = exercises.map(ex =>
        ex.id === editingEx.id
          ? { ...ex, name: name.trim(), description: description.trim() || undefined,
              category, routine, reps: reps.trim() || undefined, series,
              tips: tipsArr.length > 0 ? tipsArr : undefined,
              videoUrl: videoUrl.trim() || undefined }
          : ex
      )
    } else {
      updated = [{ id: Math.random().toString(36).slice(2), name: name.trim(),
        description: description.trim() || undefined, category, routine,
        reps: reps.trim() || undefined, series,
        tips: tipsArr.length > 0 ? tipsArr : undefined,
        videoUrl: videoUrl.trim() || undefined,
      }, ...exercises]
    }
    setExercises(updated); saveStrengthLibrary(updated)
    setEditingEx(null); setIsAdding(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este ejercicio?')) return
    const updated = exercises.filter(ex => ex.id !== id)
    setExercises(updated); saveStrengthLibrary(updated)
    if (editingEx?.id === id) { setEditingEx(null); setIsAdding(false) }
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-10 animate-fade-up">
        <div>
          <p className="eyebrow mb-2">Running Master · Guías de Óscar Barrón</p>
          <h1 style={{
            fontFamily: 'var(--font-space-grotesk)',
            letterSpacing: '-0.03em', lineHeight: 1.1,
            fontSize: '2.25rem', fontWeight: 700, color: '#1C1F23',
          }}>
            Biblioteca de Fuerza
          </h1>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary cursor-pointer">
          <span>+ Añadir Ejercicio</span>
        </button>
      </div>

      {/* Routine Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 animate-fade-up delay-1">
        {ROUTINES.map(r => {
          const isActive = activeRoutine === r.id
          const count = routineCounts[r.id] || 0
          return (
            <button
              key={r.id}
              onClick={() => setActiveRoutine(r.id)}
              className="text-left p-5 rounded-2xl cursor-pointer transition-all"
              style={{
                background: isActive ? '#1C1F23' : 'white',
                border: isActive ? '1px solid #252830' : '1px solid #E8E9EB',
                borderLeft: isActive ? '3px solid #A8FF00' : '1px solid #E8E9EB',
              }}
            >
              <p style={{
                fontSize: '9px', fontWeight: 600, letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isActive ? 'rgba(255,255,255,0.45)' : '#7A7E85',
                marginBottom: '0.375rem',
              }}>
                {r.sublabel}
              </p>
              <p style={{
                fontFamily: 'var(--font-space-grotesk)', fontWeight: 700,
                fontSize: '0.8125rem', color: isActive ? 'white' : '#1C1F23', lineHeight: 1.2,
              }}>
                {r.label}
              </p>
              <p style={{
                fontSize: '1.75rem', fontWeight: 700,
                color: isActive ? '#A8FF00' : '#D5D8DD',
                letterSpacing: '-0.04em', lineHeight: 1, marginTop: '0.625rem',
              }}>
                {count}
              </p>
              <p style={{ fontSize: '9px', color: isActive ? 'rgba(255,255,255,0.4)' : '#D5D8DD' }}>
                {count === 1 ? 'ejercicio' : 'ejercicios'}
              </p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Exercise Grid */}
        <div className="lg:col-span-2 animate-fade-up delay-2">
          {filteredExercises.length === 0 ? (
            <div
              className="rounded-2xl p-16 text-center"
              style={{ background: '#F5F5F6', border: '1.5px dashed #D5D8DD' }}
            >
              <div style={{
                width: '3rem', height: '3rem', borderRadius: '1rem',
                background: '#E8E9EB', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem',
              }}>
                <span style={{ color: '#7A7E85', fontSize: '1.25rem' }}>✦</span>
              </div>
              <p className="eyebrow mb-2">Sin ejercicios</p>
              <p style={{ fontSize: '0.8125rem', color: '#7A7E85' }}>
                Añade ejercicios a esta rutina con el botón superior
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredExercises.map(ex => {
                const embed = getYoutubeEmbedUrl(ex.videoUrl)
                const exTips = ex.tips && ex.tips.length > 0
                  ? ex.tips
                  : ex.instructions ? [ex.instructions] : []
                const hasPdfImage = ex.pdfFile && ex.pdfPage && ex.photoPosition

                return (
                  <div
                    key={ex.id}
                    className="rounded-2xl overflow-hidden flex flex-col"
                    style={{
                      background: 'white',
                      border: '1px solid #E8E9EB',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      transition: 'box-shadow 200ms, transform 200ms',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'
                      ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                      ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Image area */}
                    {embed ? (
                      <div className="aspect-video w-full" style={{ background: '#000' }}>
                        <iframe width="100%" height="100%" src={embed} title={ex.name}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen />
                      </div>
                    ) : hasPdfImage ? (
                      <ExercisePdfImage
                        pdfFile={ex.pdfFile!}
                        page={ex.pdfPage!}
                        position={ex.photoPosition!}
                      />
                    ) : ex.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ex.imageUrl} alt={ex.name} className="w-full h-40 object-cover" />
                    ) : null}

                    <div className="flex-1 flex flex-col" style={{ padding: '1.125rem 1.25rem 1.125rem' }}>

                      {/* Category + series */}
                      <div className="flex items-center justify-between" style={{ marginBottom: '0.625rem' }}>
                        {ex.category && (
                          <span style={{
                            fontSize: '8px', fontWeight: 700,
                            letterSpacing: '0.14em', textTransform: 'uppercase',
                            background: '#F5F5F6', color: '#4A4F57',
                            padding: '3px 8px', borderRadius: '4px',
                            border: '1px solid #E8E9EB',
                          }}>
                            {ex.category}
                          </span>
                        )}
                        {ex.series && (
                          <span style={{ fontSize: '9px', color: '#B0B4BB', fontWeight: 500 }}>
                            {ex.series} series
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <h3 style={{
                        fontFamily: 'var(--font-space-grotesk)',
                        fontWeight: 700, fontSize: '0.9375rem',
                        color: '#1C1F23', lineHeight: 1.25,
                        marginBottom: '0.3125rem',
                      }}>
                        {ex.name}
                      </h3>

                      {/* Reps */}
                      {ex.reps && (
                        <span style={{
                          display: 'inline-block', alignSelf: 'flex-start',
                          fontSize: '0.6875rem', fontWeight: 700,
                          color: '#1C1F23',
                          background: 'rgba(168,255,0,0.18)',
                          border: '1px solid rgba(168,255,0,0.35)',
                          padding: '2px 9px', borderRadius: '6px',
                          marginBottom: '0.875rem', letterSpacing: '0.01em',
                        }}>
                          {ex.reps}
                        </span>
                      )}

                      {/* Tips */}
                      {exTips.length > 0 && (
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: '8px', fontWeight: 600,
                            letterSpacing: '0.14em', textTransform: 'uppercase',
                            color: '#B0B4BB', marginBottom: '0.4375rem',
                          }}>
                            Puntos Clave
                          </p>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {exTips.slice(0, 4).map((tip, i) => (
                              <li key={i} style={{ display: 'flex', gap: '0.4375rem', alignItems: 'flex-start' }}>
                                <span style={{ color: '#A8FF00', fontSize: '7px', marginTop: '4px', flexShrink: 0 }}>◆</span>
                                <span style={{ fontSize: '0.6875rem', color: '#7A7E85', lineHeight: 1.55 }}>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{
                        display: 'flex', gap: '0.5rem',
                        marginTop: '0.875rem', paddingTop: '0.875rem',
                        borderTop: '1px solid #F5F5F6',
                      }}>
                        <button
                          onClick={() => handleOpenEdit(ex)}
                          className="cursor-pointer transition-all"
                          style={{
                            flex: 1, padding: '0.4375rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #E8E9EB',
                            background: 'transparent',
                            color: '#7A7E85', fontSize: '11px', fontWeight: 600,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#F5F5F6'
                            e.currentTarget.style.color = '#1C1F23'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#7A7E85'
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(ex.id)}
                          className="cursor-pointer transition-all"
                          style={{
                            padding: '0.4375rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #E8E9EB',
                            background: 'transparent',
                            color: '#D5D8DD', fontSize: '12px',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = '#ef4444'
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
                            e.currentTarget.style.background = 'rgba(239,68,68,0.04)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = '#D5D8DD'
                            e.currentTarget.style.borderColor = '#E8E9EB'
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Form Panel */}
        <div className="lg:col-span-1 animate-fade-up delay-3">
          {(isAdding || editingEx) ? (
            <div
              className="rounded-2xl sticky top-10"
              style={{ background: 'white', border: '1px solid #E8E9EB', padding: '1.5rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div
                className="flex items-center justify-between"
                style={{ paddingBottom: '1rem', borderBottom: '1px solid #F0F1F3', marginBottom: '1.25rem' }}
              >
                <div>
                  <p style={{
                    fontSize: '9px', fontWeight: 600, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: '#7A7E85', marginBottom: '0.25rem',
                  }}>
                    {editingEx ? 'Editando' : 'Nuevo Ejercicio'}
                  </p>
                  <h3 style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontWeight: 700, fontSize: '0.875rem', color: '#1C1F23',
                  }}>
                    {editingEx ? editingEx.name : 'Agregar a la biblioteca'}
                  </h3>
                </div>
                <button
                  onClick={() => { setEditingEx(null); setIsAdding(false) }}
                  className="cursor-pointer transition-colors"
                  style={{ color: '#D5D8DD', fontSize: '1.5rem', background: 'none', border: 'none', lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#1C1F23')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#D5D8DD')}
                >×</button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input type="text" required value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Curl de Bíceps" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Rutina</label>
                    <select value={routine} onChange={e => setRoutine(e.target.value)} className={inputCls}>
                      {ROUTINES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Categoría</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Repeticiones</label>
                    <input type="text" value={reps}
                      onChange={e => setReps(e.target.value)}
                      placeholder="Ej. 6 x pierna" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Series</label>
                    <input type="number" min={1} max={10} value={series}
                      onChange={e => setSeries(Number(e.target.value))} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Descripción Corta</label>
                  <textarea rows={2} value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Objetivo del ejercicio..."
                    className={inputCls} style={{ resize: 'none' }} />
                </div>

                <div>
                  <label className={labelCls}>Puntos Clave (uno por línea)</label>
                  <textarea rows={5} value={tips}
                    onChange={e => setTips(e.target.value)}
                    placeholder={'Espalda recta\nRodillas no superan la punta del pie\nRespiración constante'}
                    className={inputCls}
                    style={{ resize: 'none', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.6 }} />
                </div>

                <div>
                  <label className={labelCls}>Video YouTube (opcional)</label>
                  <input type="url" value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className={inputCls} />
                </div>

                <button type="submit" className="btn-primary w-full justify-center cursor-pointer"
                  style={{ borderRadius: '0.75rem' }}>
                  <span>{editingEx ? 'Actualizar Ejercicio' : 'Guardar Ejercicio'}</span>
                  <span className="arrow">→</span>
                </button>
              </form>
            </div>
          ) : (
            <div
              className="rounded-2xl p-8 text-center sticky top-10"
              style={{ background: 'white', border: '1px solid #E8E9EB',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div style={{
                width: '3rem', height: '3rem', borderRadius: '0.875rem',
                background: '#F5F5F6', border: '1px solid #E8E9EB',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem',
              }}>
                <span style={{ color: '#A8FF00', fontSize: '1.25rem' }}>✦</span>
              </div>
              <p style={{
                fontSize: '9px', fontWeight: 600, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#7A7E85', marginBottom: '0.5rem',
              }}>
                Panel de Edición
              </p>
              <p style={{ fontSize: '0.75rem', color: '#7A7E85', lineHeight: 1.6 }}>
                Selecciona un ejercicio para editar o crea uno nuevo
              </p>
              <button
                onClick={handleOpenAdd}
                className="cursor-pointer transition-all"
                style={{
                  marginTop: '1.5rem', width: '100%',
                  padding: '0.75rem', borderRadius: '0.875rem',
                  border: '1px dashed #D5D8DD', background: 'transparent',
                  color: '#7A7E85', fontSize: '0.75rem', fontWeight: 600,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#A8FF00'
                  e.currentTarget.style.color = '#1C1F23'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#D5D8DD'
                  e.currentTarget.style.color = '#7A7E85'
                }}
              >
                + Añadir ejercicio
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
