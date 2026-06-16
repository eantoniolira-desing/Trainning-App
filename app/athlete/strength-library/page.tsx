'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getStrengthLibrary } from '@/lib/db'
import type { StrengthExercise } from '@/lib/types'

const ExercisePdfImage = dynamic(
  () => import('@/components/ExercisePdfImage').then(m => m.ExercisePdfImage),
  { ssr: false }
)

const SECTIONS = [
  {
    id: 'inferior',
    title: 'Fuerza en Gym',
    subtitle: 'Tren Inferior',
    description: 'Cuádriceps, glúteos, isquiotibiales, gemelos y cadera.',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.18)',
    icon: '🦵',
  },
  {
    id: 'superior',
    title: 'Fuerza en Gym',
    subtitle: 'Tren Superior',
    description: 'Empuje, tirón, core y estabilización lumbar.',
    color: '#047857',
    bg: 'rgba(4,120,87,0.06)',
    border: 'rgba(4,120,87,0.18)',
    icon: '💪',
  },
  {
    id: 'casa',
    title: 'Fuerza en Casa',
    subtitle: 'Banda Elástica',
    description: 'Pie, tobillo, cadera e isquiotibiales con banda elástica.',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.06)',
    border: 'rgba(217,119,6,0.18)',
    icon: '🏠',
  },
]

export default function AthleteStrengthLibrary() {
  const [exercises, setExercises] = useState<StrengthExercise[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [selected, setSelected] = useState<StrengthExercise | null>(null)
  const [search, setSearch] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setExercises(getStrengthLibrary())
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto p-5 pt-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-1/3 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const currentSection = SECTIONS.find(s => s.id === activeSection)
  const sectionExercises = activeSection
    ? exercises.filter(e => e.routine === activeSection &&
        (!search || e.name.toLowerCase().includes(search.toLowerCase())))
    : []

  return (
    <div className="max-w-3xl mx-auto p-5 pt-8">

      {/* Back navigation */}
      {activeSection ? (
        <button
          type="button"
          onClick={() => { setActiveSection(null); setSearch('') }}
          className="inline-flex items-center gap-2 text-sm font-semibold mb-7 transition-colors duration-150 group"
          style={{ color: '#7A7E85' }}
        >
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 group-hover:bg-white group-hover:shadow-sm"
            style={{ background: '#EBEBEC', border: '1px solid #E8E9EB' }}
          >
            ←
          </span>
          <span className="group-hover:text-gray-900 transition-colors">Volver a rutinas</span>
        </button>
      ) : (
        <Link
          href="/athlete/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold mb-7 transition-colors duration-150 group"
          style={{ color: '#7A7E85' }}
        >
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 group-hover:bg-white group-hover:shadow-sm"
            style={{ background: '#EBEBEC', border: '1px solid #E8E9EB' }}
          >
            ←
          </span>
          <span className="group-hover:text-gray-900 transition-colors">Volver al plan de entrenamiento</span>
        </Link>
      )}

      {/* ── MENU DE SELECCIÓN ── */}
      {!activeSection && (
        <>
          <div className="mb-8">
            <span className="eyebrow text-[#7A7E85]">Tu programa</span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1" style={{ letterSpacing: '-0.025em' }}>
              Biblioteca de Fuerza
            </h1>
            <p className="text-sm text-[#7A7E85] mt-1">
              Selecciona una rutina para ver los ejercicios con guías e instrucciones.
            </p>
          </div>

          <div className="space-y-4">
            {SECTIONS.map(sect => {
              const count = exercises.filter(e => e.routine === sect.id).length
              return (
                <button
                  key={sect.id}
                  type="button"
                  onClick={() => setActiveSection(sect.id)}
                  className="w-full text-left rounded-2xl p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: sect.bg, border: `1.5px solid ${sect.border}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{sect.icon}</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: sect.color }}>
                          {sect.title}
                        </p>
                        <h2 className="text-lg font-bold text-[#1C1F23]">{sect.subtitle}</h2>
                        <p className="text-xs text-[#7A7E85] mt-1">{sect.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: sect.color, color: '#fff' }}
                      >
                        {count} ejercicios
                      </span>
                      <span className="text-lg" style={{ color: sect.color }}>→</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ── LISTA DE EJERCICIOS DE LA SECCIÓN ── */}
      {activeSection && currentSection && (
        <>
          {/* Section header */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: currentSection.color }}>
              {currentSection.title}
            </p>
            <h1 className="text-3xl font-bold text-gray-900" style={{ letterSpacing: '-0.025em' }}>
              {currentSection.subtitle}
            </h1>
            <p className="text-sm text-[#7A7E85] mt-1">{currentSection.description}</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="w-full bg-white border border-[#D5D8DD] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-500 text-gray-900"
            />
          </div>

          {sectionExercises.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="text-4xl block mb-3">🔍</span>
              <p className="font-semibold">No se encontraron ejercicios</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sectionExercises.map(ex => (
                <div
                  key={ex.id}
                  className="bg-white rounded-2xl border border-[#E8E9EB] shadow-sm overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => setSelected(ex)}
                >
                  {ex.pdfFile && ex.pdfPage ? (
                    <ExercisePdfImage
                      pdfFile={ex.pdfFile}
                      page={ex.pdfPage}
                      position={ex.photoPosition ?? 'top'}
                    />
                  ) : (
                    <div className="w-full flex items-center justify-center" style={{ minHeight: 120, background: currentSection.bg }}>
                      <span className="text-3xl">{currentSection.icon}</span>
                    </div>
                  )}

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1">{ex.name}</h3>
                    {ex.description && (
                      <p className="text-xs text-[#7A7E85] leading-relaxed line-clamp-2 flex-1">{ex.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {ex.series && (
                        <span className="text-[9px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {ex.series} series
                        </span>
                      )}
                      {ex.reps && (
                        <span className="text-[9px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {ex.reps}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400 font-semibold">Ver guía →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#E8E9EB] shadow-2xl relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-900 transition-colors text-xl font-bold p-1 cursor-pointer bg-white rounded-full w-8 h-8 flex items-center justify-center shadow"
            >
              ✕
            </button>

            {selected.pdfFile && selected.pdfPage ? (
              <div className="rounded-t-2xl overflow-hidden">
                <ExercisePdfImage
                  pdfFile={selected.pdfFile}
                  page={selected.pdfPage}
                  position={selected.photoPosition ?? 'top'}
                />
              </div>
            ) : selected.videoUrl ? (
              <div className="p-6 pb-0">
                <a
                  href={selected.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center p-4 rounded-xl border border-dashed border-[#D5D8DD] hover:bg-gray-50 text-sm font-bold text-[#4A4F57]"
                >
                  📺 Ver video de demostración
                </a>
              </div>
            ) : null}

            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
              {selected.description && (
                <p className="text-sm text-[#7A7E85] leading-relaxed">{selected.description}</p>
              )}

              {(selected.series || selected.reps) && (
                <div className="flex gap-3">
                  {selected.series && (
                    <div className="bg-[#F5F5F6] rounded-xl p-3 text-center flex-1">
                      <p className="text-xs font-bold text-gray-900">{selected.series}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">Series</p>
                    </div>
                  )}
                  {selected.reps && (
                    <div className="bg-[#F5F5F6] rounded-xl p-3 text-center flex-1">
                      <p className="text-xs font-bold text-gray-900">{selected.reps}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">Repeticiones</p>
                    </div>
                  )}
                </div>
              )}

              {selected.tips && selected.tips.length > 0 && (
                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wide">💡 Tips de ejecución</h4>
                  <ul className="space-y-1.5">
                    {selected.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-gray-700 flex gap-2">
                        <span className="text-amber-400 flex-shrink-0">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.instructions && (
                <div className="bg-[#F5F5F6] border border-[#E8E9EB] rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Instrucciones de Ejecución</h4>
                  <p className="text-xs text-[#4A4F57] whitespace-pre-line leading-relaxed">{selected.instructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
