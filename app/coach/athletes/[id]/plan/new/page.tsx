'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAthletes, getPlans, savePlans } from '@/lib/db'
import { Athlete, TrainingPlan, TrainingDay } from '@/lib/types'
import type { ParsedSession } from '@/lib/parsers/excel-parser'

type Method = 'manual' | 'excel' | 'word'
type ExType = 'strength' | 'cardio'

interface ExForm {
  id: string; type: ExType; name: string
  sets: string; reps: string; weight: string; rest: string
  distance: string; duration: string; pace: string; heartRateZone: string; notes: string
}

interface SessionForm {
  id: string; date: string; dayLabel: string; exercises: ExForm[]
}

const newEx = (): ExForm => ({
  id: Math.random().toString(36).slice(2), type: 'strength', name: '',
  sets: '', reps: '', weight: '', rest: '', distance: '', duration: '',
  pace: '', heartRateZone: '', notes: '',
})

const newSession = (): SessionForm => ({
  id: Math.random().toString(36).slice(2), date: '', dayLabel: '', exercises: [newEx()],
})

function parsedToForm(parsed: ParsedSession[]): SessionForm[] {
  return parsed.map(s => ({
    id: s.id,
    date: s.date,
    dayLabel: s.dayLabel,
    exercises: s.exercises.map(e => ({
      id: e.id,
      type: e.type,
      name: e.name,
      sets: e.sets != null ? String(e.sets) : '',
      reps: e.reps != null ? String(e.reps) : '',
      weight: e.weight != null ? String(e.weight) : '',
      rest: e.rest != null ? String(e.rest) : '',
      distance: e.distance != null ? String(e.distance) : '',
      duration: e.duration != null ? String(e.duration) : '',
      pace: e.pace ?? '',
      heartRateZone: e.heartRateZone != null ? String(e.heartRateZone) : '',
      notes: e.notes ?? '',
    })),
  }))
}

export default function NewPlanPage() {
  const params = useParams()
  const router = useRouter()
  const athleteId = params.id as string
  
  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [mounted, setMounted] = useState(false)

  const [method, setMethod] = useState<Method>('manual')
  const [planName, setPlanName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sessions, setSessions] = useState<SessionForm[]>([newSession()])
  const [saved, setSaved] = useState(false)

  // File upload state
  const excelRef = useRef<HTMLInputElement>(null)
  const wordRef = useRef<HTMLInputElement>(null)
  const [fileStatus, setFileStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [fileError, setFileError] = useState('')
  const [wordRawText, setWordRawText] = useState('')
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    const all = getAthletes()
    const found = all.find(a => a.id === athleteId)
    if (found) {
      setAthlete(found)
    }
    setMounted(true)
  }, [athleteId])

  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-12"></div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    )
  }

  if (!athlete) return <div className="p-8 text-gray-500">Atleta no encontrado</div>

  // Session/exercise helpers
  const addSession = () => setSessions(s => [...s, newSession()])
  const removeSession = (id: string) => setSessions(s => s.filter(x => x.id !== id))
  const updateSession = (id: string, field: string, value: string) =>
    setSessions(s => s.map(x => x.id === id ? { ...x, [field]: value } : x))
  const addExercise = (sid: string) =>
    setSessions(s => s.map(x => x.id === sid ? { ...x, exercises: [...x.exercises, newEx()] } : x))
  const removeExercise = (sid: string, eid: string) =>
    setSessions(s => s.map(x => x.id === sid ? { ...x, exercises: x.exercises.filter(e => e.id !== eid) } : x))
  const updateEx = (sid: string, eid: string, field: string, value: string) =>
    setSessions(s => s.map(x => x.id === sid
      ? { ...x, exercises: x.exercises.map(e => e.id === eid ? { ...e, [field]: value } : e) }
      : x))

  // Excel upload
  async function handleExcelUpload(file: File) {
    setFileStatus('loading')
    setFileError('')
    setFileName(file.name)
    try {
      const { parseExcel } = await import('@/lib/parsers/excel-parser')
      const buffer = await file.arrayBuffer()
      const parsed = parseExcel(buffer)
      if (!parsed.length) throw new Error('No se detectaron ejercicios. Revisa que el archivo tenga datos.')
      setSessions(parsedToForm(parsed))
      setFileStatus('done')
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Error al leer el archivo.')
      setFileStatus('error')
    }
  }

  // Word upload
  async function handleWordUpload(file: File) {
    setFileStatus('loading')
    setFileError('')
    setFileName(file.name)
    try {
      const { parseWord } = await import('@/lib/parsers/word-parser')
      const buffer = await file.arrayBuffer()
      const { sessions: parsed, rawText } = await parseWord(buffer)
      setWordRawText(rawText)
      if (parsed.length) {
        setSessions(parsedToForm(parsed))
        setFileStatus('done')
      } else {
        setFileStatus('done')
        setFileError('No se detectó estructura de días. Revisa el texto extraído y carga los ejercicios manualmente.')
      }
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : 'Error al leer el archivo Word.')
      setFileStatus('error')
    }
  }

  const handleSave = () => {
    if (!planName || !startDate || !endDate) return

    // Map sessions to db models
    const mappedDays = sessions.map((session, sIdx) => ({
      id: session.id || Math.random().toString(36).slice(2),
      date: session.date || new Date().toISOString().split('T')[0],
      dayLabel: session.dayLabel || `Día ${sIdx + 1}`,
      exercises: session.exercises.map(e => ({
        id: e.id || Math.random().toString(36).slice(2),
        type: e.type,
        name: e.name || 'Ejercicio sin nombre',
        sets: e.sets ? parseInt(e.sets) : undefined,
        reps: e.reps ? parseInt(e.reps) : undefined,
        weight: e.weight ? parseFloat(e.weight) : undefined,
        rest: e.rest ? parseInt(e.rest) : undefined,
        distance: e.distance ? parseFloat(e.distance) : undefined,
        duration: e.duration ? parseFloat(e.duration) : undefined,
        pace: e.pace || undefined,
        heartRateZone: e.heartRateZone ? parseInt(e.heartRateZone) : undefined,
        notes: e.notes || undefined,
      }))
    }))

    const newPlan: TrainingPlan = {
      id: 'plan-' + Date.now().toString(),
      name: planName,
      athleteId: athleteId,
      startDate: startDate,
      endDate: endDate,
      createdAt: new Date().toISOString().split('T')[0],
      weeks: [
        {
          id: 'week-' + Math.random().toString(36).slice(2),
          weekNumber: 1,
          days: mappedDays
        }
      ]
    }

    const currentPlans = getPlans()
    savePlans([...currentPlans, newPlan])

    setSaved(true)
    setTimeout(() => router.push(`/coach/athletes/${athleteId}`), 1500)
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-xl font-semibold text-gray-800">¡Plan guardado!</p>
          <p className="text-gray-500">Redirigiendo al perfil del atleta...</p>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A7E85] bg-white'
  const smallCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A7E85] bg-white'

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <Link href={`/coach/athletes/${athleteId}`} className="text-[#4A4F57] hover:text-indigo-800 text-sm inline-block mb-2">
          ← Volver al perfil de {athlete.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo plan de entrenamiento</h1>
        <p className="text-gray-500 text-sm">Para {athlete.name}</p>
      </div>

      {/* Plan info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Información del plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del plan</label>
            <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
              placeholder="Ej. Base aeróbica – 4 semanas" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Method selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">¿Cómo cargar los ejercicios?</h2>
        <div className="grid grid-cols-3 gap-3">
          {([
            { id: 'manual', icon: '✏️', label: 'Manual', desc: 'Ingresa ejercicio por ejercicio' },
            { id: 'excel', icon: '📊', label: 'Excel / CSV', desc: '.xlsx, .xls, .csv' },
            { id: 'word', icon: '📝', label: 'Word', desc: '.docx, .doc' },
          ] as const).map(opt => (
            <button key={opt.id} onClick={() => { setMethod(opt.id); setFileStatus('idle'); setFileError(''); setWordRawText('') }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${method === opt.id ? 'border-[#7A7E85] bg-[#F5F5F6]' : 'border-gray-200 hover:border-[#D5D8DD]'}`}>
              <div className="text-2xl mb-2">{opt.icon}</div>
              <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Excel upload panel */}
      {method === 'excel' && fileStatus === 'idle' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Subir archivo Excel / CSV</h3>
            <button
              onClick={async () => { const { downloadTemplate } = await import('@/lib/parsers/excel-parser'); downloadTemplate() }}
              className="text-[#4A4F57] hover:text-indigo-800 text-sm underline"
            >
              Descargar plantilla
            </button>
          </div>
          <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleExcelUpload(e.target.files[0]) }} />
          <div
            onClick={() => excelRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-[#F5F5F6] transition-colors"
          >
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-600 font-medium">Haz clic para seleccionar un archivo</p>
            <p className="text-gray-400 text-sm mt-1">.xlsx · .xls · .csv</p>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <strong>Tip:</strong> Descarga la plantilla para mejores resultados. Columnas recomendadas: Fecha, Ejercicio, Tipo, Series, Reps, Peso, Distancia, Tiempo, etc.
          </div>
        </div>
      )}

      {/* Word upload panel */}
      {method === 'word' && fileStatus === 'idle' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Subir archivo Word</h3>
          <input ref={wordRef} type="file" accept=".docx,.doc" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleWordUpload(e.target.files[0]) }} />
          <div
            onClick={() => wordRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-[#F5F5F6] transition-colors"
          >
            <div className="text-4xl mb-3">📝</div>
            <p className="text-gray-600 font-medium">Haz clic para seleccionar un archivo Word</p>
            <p className="text-gray-400 text-sm mt-1">.docx · .doc</p>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>Formato recomendado:</strong> Usa encabezados de día (&quot;Lunes 16/06&quot;) y guiones para cada ejercicio: &quot;– Sentadillas 3x12 60kg&quot;
          </div>
        </div>
      )}

      {/* Loading */}
      {fileStatus === 'loading' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6 text-center">
          <div className="text-3xl mb-3 animate-pulse">⏳</div>
          <p className="text-gray-600">Leyendo {fileName}...</p>
        </div>
      )}

      {/* File error */}
      {fileStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
          <p className="text-red-700 font-medium">⚠️ {fileError}</p>
          <button onClick={() => { setFileStatus('idle'); setFileError('') }}
            className="mt-3 text-sm text-red-600 hover:text-red-800 underline">
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Success + raw text for Word */}
      {method === 'word' && fileStatus === 'done' && wordRawText && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-800">📄 Texto extraído de {fileName}</p>
            <button onClick={() => setWordRawText('')} className="text-xs text-gray-400 hover:text-gray-600">Ocultar</button>
          </div>
          <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-auto">
            {wordRawText}
          </pre>
          {fileError && <p className="mt-3 text-amber-600 text-sm">⚠️ {fileError}</p>}
        </div>
      )}

      {/* File done banner */}
      {fileStatus === 'done' && !fileError && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <span className="text-emerald-600 text-xl">✅</span>
          <div>
            <p className="text-emerald-700 font-medium text-sm">Archivo importado correctamente</p>
            <p className="text-emerald-600 text-xs">{sessions.length} sesión(es) detectada(s). Revisa y edita antes de guardar.</p>
          </div>
          <button onClick={() => { setFileStatus('idle'); setSessions([newSession()]) }}
            className="ml-auto text-xs text-emerald-600 hover:text-emerald-800 underline">
            Subir otro archivo
          </button>
        </div>
      )}

      {/* Sessions editor — shown for manual always, and after import for file methods */}
      {(method === 'manual' || fileStatus === 'done') && (
        <>
          <div className="space-y-4 mb-4">
            {sessions.map((session, sIdx) => (
              <div key={session.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Sesión {sIdx + 1}</h3>
                  {sessions.length > 1 && (
                    <button onClick={() => removeSession(session.id)} className="text-red-500 hover:text-red-700 text-sm">
                      Eliminar sesión
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input type="date" value={session.date}
                      onChange={e => updateSession(session.id, 'date', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A7E85]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta del día</label>
                    <input type="text" value={session.dayLabel} placeholder="Ej. Lunes 16 jun"
                      onChange={e => updateSession(session.id, 'dayLabel', e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A7E85] w-full" />
                  </div>
                </div>

                <div className="space-y-4">
                  {session.exercises.map((ex, eIdx) => (
                    <div key={ex.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">Ejercicio {eIdx + 1}</span>
                        {session.exercises.length > 1 && (
                          <button onClick={() => removeExercise(session.id, ex.id)} className="text-red-400 hover:text-red-600 text-xs">
                            ✕ Eliminar
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 mb-3">
                        {(['strength', 'cardio'] as const).map(t => (
                          <button type="button" key={t} onClick={() => updateEx(session.id, ex.id, 'type', t)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              ex.type === t
                                ? t === 'strength' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}>
                            {t === 'strength' ? '💪 Fuerza' : '🏃 Cardio'}
                          </button>
                        ))}
                      </div>

                      <div className="mb-3">
                        <input type="text" value={ex.name} placeholder="Nombre del ejercicio"
                          onChange={e => updateEx(session.id, ex.id, 'name', e.target.value)} className={inputCls} />
                      </div>

                      {ex.type === 'strength' ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Series', field: 'sets', placeholder: '3' },
                            { label: 'Reps', field: 'reps', placeholder: '12' },
                            { label: 'Peso (kg)', field: 'weight', placeholder: '60' },
                            { label: 'Descanso (seg)', field: 'rest', placeholder: '90' },
                          ].map(({ label, field, placeholder }) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1">{label}</label>
                              <input type="number" value={(ex as unknown as Record<string, string>)[field]}
                                onChange={e => updateEx(session.id, ex.id, field, e.target.value)}
                                placeholder={placeholder} className={smallCls} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Distancia (km)', field: 'distance', placeholder: '8', type: 'number' },
                            { label: 'Tiempo (min)', field: 'duration', placeholder: '45', type: 'number' },
                            { label: 'Ritmo (min/km)', field: 'pace', placeholder: '5:30', type: 'text' },
                          ].map(({ label, field, placeholder, type }) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1">{label}</label>
                              <input type={type} value={(ex as unknown as Record<string, string>)[field]}
                                onChange={e => updateEx(session.id, ex.id, field, e.target.value)}
                                placeholder={placeholder} className={smallCls} />
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Zona FC</label>
                            <select value={ex.heartRateZone}
                              onChange={e => updateEx(session.id, ex.id, 'heartRateZone', e.target.value)} className={smallCls}>
                              <option value="">—</option>
                              {['Z1 – Recuperación','Z2 – Base aeróbica','Z3 – Umbral aeróbico','Z4 – Umbral anaeróbico','Z5 – Máximo'].map((z, i) => (
                                <option key={i+1} value={i+1}>{z}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="mt-3">
                        <input type="text" value={ex.notes} placeholder="Notas adicionales (opcional)"
                          onChange={e => updateEx(session.id, ex.id, 'notes', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A7E85] bg-white" />
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => addExercise(session.id)}
                  className="mt-4 w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-[#4A4F57] transition-colors">
                  + Agregar ejercicio
                </button>
              </div>
            ))}
          </div>

          <button onClick={addSession}
            className="w-full border-2 border-dashed border-[#D5D8DD] rounded-xl py-3 text-sm text-[#4A4F57] hover:border-[#7A7E85] hover:bg-[#F5F5F6] transition-colors mb-6">
            + Agregar sesión
          </button>
        </>
      )}

      <div className="flex gap-3 justify-end">
        <Link href={`/coach/athletes/${athleteId}`}
          className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          Cancelar
        </Link>
        <button onClick={handleSave} disabled={!planName || !startDate || !endDate}
          className="px-6 py-2 bg-[#4A4F57] text-white rounded-lg text-sm font-medium hover:bg-[#3a3f47] disabled:opacity-50 disabled:cursor-not-allowed">
          Guardar plan
        </button>
      </div>
    </div>
  )
}
