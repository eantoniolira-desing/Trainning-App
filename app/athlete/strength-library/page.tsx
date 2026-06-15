'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getStrengthLibrary } from '@/lib/db'
import type { StrengthExercise } from '@/lib/types'

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Pierna':  { bg: 'rgba(168,255,0,0.10)', text: '#4a7200' },
  'Glúteo':  { bg: 'rgba(255,107,53,0.10)', text: '#c94a00' },
  'Cadera':  { bg: 'rgba(93,117,255,0.10)', text: '#2c44d0' },
  'Core':    { bg: 'rgba(255,214,10,0.12)', text: '#9a7700' },
  'Superior':{ bg: 'rgba(0,200,200,0.10)',  text: '#007070' },
}

export default function AthleteStrengthLibrary() {
  const [exercises, setExercises] = useState<StrengthExercise[]>([])
  const [selected, setSelected] = useState<StrengthExercise | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('Todos')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setExercises(getStrengthLibrary())
    setMounted(true)
  }, [])

  const categories = ['Todos', ...Array.from(new Set(exercises.map(e => e.category).filter((c): c is string => Boolean(c))))]

  const filtered = exercises.filter(e => {
    const matchCat = filterCat === 'Todos' || e.category === filterCat
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto p-5 pt-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-1/3 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const catColors = (cat?: string) =>
    cat && CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat] : { bg: '#F5F5F6', text: '#4A4F57' }

  return (
    <div className="max-w-5xl mx-auto p-5 pt-8">

      {/* Back navigation */}
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

      {/* Header */}
      <div className="mb-8">
        <span className="eyebrow text-[#7A7E85]">Tu programa</span>
        <h1 className="text-3xl font-bold text-gray-900 mt-1" style={{ letterSpacing: '-0.025em' }}>
          Biblioteca de Fuerza 🏋️
        </h1>
        <p className="text-sm text-[#7A7E85] mt-1">
          Ejercicios de tu plan con guías técnicas, videos e instrucciones de ejecución.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-7">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="flex-1 bg-white border border-[#D5D8DD] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-500 text-gray-900"
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer"
              style={{
                background: filterCat === cat ? '#1C1F23' : '#FFFFFF',
                color: filterCat === cat ? '#FFFFFF' : '#4A4F57',
                border: `1px solid ${filterCat === cat ? '#1C1F23' : '#D5D8DD'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-4xl block mb-3">🔍</span>
          <p className="font-semibold">No se encontraron ejercicios</p>
          <p className="text-xs mt-1">Prueba otro filtro o término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(ex => {
            const colors = catColors(ex.category)
            const embedUrl = getYoutubeEmbedUrl(ex.videoUrl)
            return (
              <div
                key={ex.id}
                className="bg-white rounded-2xl border border-[#E8E9EB] shadow-sm overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                onClick={() => setSelected(ex)}
              >
                {/* Video thumbnail or image */}
                {embedUrl ? (
                  <div className="w-full aspect-video bg-black relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <span className="text-white text-xl ml-1">▶</span>
                      </div>
                    </div>
                    <img
                      src={`https://img.youtube.com/vi/${embedUrl.split('/embed/')[1]}/hqdefault.jpg`}
                      alt={ex.name}
                      className="w-full h-full object-cover opacity-70"
                    />
                  </div>
                ) : ex.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ex.imageUrl} alt={ex.name} className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-4xl">💪</span>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col">
                  {ex.category && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md mb-2 self-start"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {ex.category}
                    </span>
                  )}
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
            )
          })}
        </div>
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

            {/* Video or Image */}
            {getYoutubeEmbedUrl(selected.videoUrl) ? (
              <div className="w-full aspect-video rounded-t-2xl overflow-hidden bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={getYoutubeEmbedUrl(selected.videoUrl)!}
                  title={selected.name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
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
            ) : selected.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.imageUrl} alt={selected.name} className="w-full aspect-video object-cover rounded-t-2xl" />
            ) : null}

            <div className="p-6 space-y-4">
              {selected.category && (
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded inline-block"
                  style={{ background: catColors(selected.category).bg, color: catColors(selected.category).text }}
                >
                  {selected.category}
                </span>
              )}
              <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
              {selected.description && (
                <p className="text-sm text-[#7A7E85] leading-relaxed">{selected.description}</p>
              )}

              {/* Series & Reps */}
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

              {/* Tips */}
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

              {/* Instructions */}
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
