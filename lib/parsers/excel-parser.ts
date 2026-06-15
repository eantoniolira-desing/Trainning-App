import * as XLSX from 'xlsx'
import type { Exercise } from '../types'

export interface ParsedSession {
  id: string
  date: string
  dayLabel: string
  exercises: Exercise[]
}

const COLUMN_PATTERNS: Record<string, string[]> = {
  date:     ['fecha', 'date', 'día', 'dia', 'day'],
  dayLabel: ['dia semana', 'día semana', 'jornada', 'día', 'dia'],
  name:     ['ejercicio', 'nombre', 'exercise', 'name', 'actividad', 'movimiento'],
  type:     ['tipo', 'type', 'categoria', 'categoría', 'modalidad'],
  sets:     ['series', 'sets', 'serie'],
  reps:     ['reps', 'repeticiones', 'rep', 'repeticion'],
  weight:   ['peso', 'weight', 'carga', 'kg', 'kilos'],
  rest:     ['descanso', 'rest', 'recuperacion', 'recuperación', 'pausa'],
  distance: ['distancia', 'distance', 'km', 'kilometros', 'kilómetros'],
  duration: ['tiempo', 'time', 'duration', 'minutos', 'min', 'duracion'],
  pace:     ['ritmo', 'pace', 'min/km', 'cadencia'],
  zone:     ['zona', 'zone', 'fc', 'frecuencia', 'zona fc', 'heart rate'],
  notes:    ['notas', 'notes', 'observaciones', 'comentarios', 'indicaciones'],
}

function detectHeaders(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const header of headers) {
    const h = header.toLowerCase().trim()
    for (const [key, synonyms] of Object.entries(COLUMN_PATTERNS)) {
      if (!map[key] && synonyms.some(s => h.includes(s))) {
        map[key] = header
      }
    }
  }
  return map
}

function cell(row: Record<string, unknown>, header?: string): string {
  if (!header) return ''
  return String(row[header] ?? '').trim()
}

function num(val: string): number | undefined {
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? undefined : n
}

export function parseExcel(buffer: ArrayBuffer): ParsedSession[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  if (!rows.length) return []

  const headers = Object.keys(rows[0])
  const map = detectHeaders(headers)

  const sessions: Record<string, ParsedSession> = {}

  for (const row of rows) {
    const name = cell(row, map.name)
    if (!name) continue

    const date = cell(row, map.date) || 'Sin fecha'
    const dayLabel = cell(row, map.dayLabel) || date

    const typeRaw = cell(row, map.type).toLowerCase()
    const isCardio =
      typeRaw.includes('card') ||
      typeRaw.includes('corr') ||
      typeRaw.includes('run') ||
      typeRaw.includes('cardi') ||
      typeRaw.includes('aerob')

    const exercise: Exercise = {
      id: Math.random().toString(36).slice(2),
      type: isCardio ? 'cardio' : 'strength',
      name,
      sets:          num(cell(row, map.sets)),
      reps:          num(cell(row, map.reps)),
      weight:        num(cell(row, map.weight)),
      rest:          num(cell(row, map.rest)),
      distance:      num(cell(row, map.distance)),
      duration:      num(cell(row, map.duration)),
      pace:          cell(row, map.pace) || undefined,
      heartRateZone: num(cell(row, map.zone)),
      notes:         cell(row, map.notes) || undefined,
    }

    if (!sessions[date]) {
      sessions[date] = {
        id: Math.random().toString(36).slice(2),
        date,
        dayLabel,
        exercises: [],
      }
    }
    sessions[date].exercises.push(exercise)
  }

  return Object.values(sessions)
}

export function downloadTemplate() {
  const headers = [
    'Fecha', 'Día', 'Ejercicio', 'Tipo (Fuerza/Cardio)',
    'Series', 'Reps', 'Peso (kg)', 'Descanso (seg)',
    'Distancia (km)', 'Tiempo (min)', 'Ritmo (min/km)', 'Zona FC', 'Notas',
  ]
  const example = [
    ['2026-06-16', 'Lunes', 'Carrera continua', 'Cardio', '', '', '', '', '8', '45', '5:30', '2', 'Ritmo conversacional'],
    ['2026-06-16', 'Lunes', 'Sentadillas', 'Fuerza', '3', '12', '60', '90', '', '', '', '', ''],
    ['2026-06-18', 'Miércoles', 'Intervalos 400m', 'Cardio', '', '', '', '', '6', '35', '', '', '8 repeticiones'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plan')
  XLSX.writeFile(wb, 'plantilla-entrenamiento.xlsx')
}
