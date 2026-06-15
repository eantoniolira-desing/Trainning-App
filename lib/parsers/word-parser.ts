import type { Exercise } from '../types'
import type { ParsedSession } from './excel-parser'

const DAY_NAMES: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', 'miércoles': 'Miércoles', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', 'sábado': 'Sábado', sabado: 'Sábado', domingo: 'Domingo',
}

const DAY_RE = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i
const DATE_RE = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/
const SETS_REPS_RE = /(\d+)\s*[xX×]\s*(\d+)/
const KG_RE = /(\d+(?:[.,]\d+)?)\s*kg/i
const KM_RE = /(\d+(?:[.,]\d+)?)\s*km/i
const MIN_RE = /(\d+)\s*min/i
const PACE_RE = /(\d+:\d{2})\s*(?:min\/km|\/km)?/
const ZONE_RE = /zona\s*(\d)|z(\d)\b/i
const REST_RE = /(\d+)\s*s(?:eg|egundos)?(?:\s*descanso)?|descanso\s*(\d+)/i

function extractExercise(line: string): Exercise | null {
  const setsReps = line.match(SETS_REPS_RE)
  const kg = line.match(KG_RE)
  const km = line.match(KM_RE)
  const min = line.match(MIN_RE)
  const pace = line.match(PACE_RE)
  const zone = line.match(ZONE_RE)
  const rest = line.match(REST_RE)

  const isCardio = !!km || (!setsReps && !!min)
  const type = isCardio ? 'cardio' : 'strength'

  // Extract name: text before first number sequence or keyword
  let name = line
    .replace(/^[-•*·\s]+/, '')
    .replace(/\s*\d+\s*[xX×]\s*\d+.*/, '')
    .replace(/\s*\d+(?:[.,]\d+)?\s*kg.*/i, '')
    .replace(/\s*\d+(?:[.,]\d+)?\s*km.*/i, '')
    .replace(/\s*\d+:\d{2}.*/,'')
    .replace(/\s*\d+\s*min.*/i, '')
    .trim()

  if (!name || name.length < 2) return null

  return {
    id: Math.random().toString(36).slice(2),
    type,
    name,
    sets:          setsReps ? parseInt(setsReps[1]) : undefined,
    reps:          setsReps ? parseInt(setsReps[2]) : undefined,
    weight:        kg ? parseFloat(kg[1].replace(',', '.')) : undefined,
    rest:          rest ? parseInt(rest[1] || rest[2]) : undefined,
    distance:      km ? parseFloat(km[1].replace(',', '.')) : undefined,
    duration:      min ? parseInt(min[1]) : undefined,
    pace:          pace ? pace[1] : undefined,
    heartRateZone: zone ? parseInt(zone[1] || zone[2]) : undefined,
  }
}

export async function parseWord(buffer: ArrayBuffer): Promise<{ sessions: ParsedSession[]; rawText: string }> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  const rawText = result.value

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const sessions: ParsedSession[] = []
  let current: ParsedSession | null = null

  for (const line of lines) {
    const dayMatch = line.match(DAY_RE)
    if (dayMatch) {
      if (current && current.exercises.length > 0) sessions.push(current)
      const dateMatch = line.match(DATE_RE)
      const dayKey = dayMatch[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      const dayName = DAY_NAMES[dayMatch[1].toLowerCase()] ?? dayMatch[1]
      const dateStr = dateMatch
        ? `${dateMatch[3] ?? '2026'}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`
        : ''
      current = {
        id: Math.random().toString(36).slice(2),
        date: dateStr,
        dayLabel: line.slice(0, 40),
        exercises: [],
      }
      continue
    }

    if (current) {
      const ex = extractExercise(line)
      if (ex) current.exercises.push(ex)
    }
  }

  if (current && current.exercises.length > 0) sessions.push(current)

  return { sessions, rawText }
}
