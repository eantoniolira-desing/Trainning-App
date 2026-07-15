import type { Exercise } from '../types'
import type { ParsedSession } from './excel-parser'

// ─── Regexps ────────────────────────────────────────────────────────────────
const WEEK_RE   = /^\s*semana\s+(\d+)/i
const DAY_RE    = /^\s*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i
const DATE_NUM  = /\b(\d{1,2})\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)?/i
const DURATION  = /(\d+)\s*(?:min\b|'|minutos)/i
const KM_RE     = /(\d+(?:[.,]\d+)?)\s*k(?:m\b)?/i
const PACE_RE   = /\(?((?:\d+:\d{2}(?:\s*-\s*\d+:\d{2})?)\s*(?:min\/km)?)\)?/
const ZONE_RE   = /\b(?:z(?:ona)?\s*(\d)|z(\d))\b/i
const INTERVAL  = /(\d+)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(k(?:m\b)?|m(?:\b|etros?))?/i
const PAUSE_RE  = /(?:p(?:ausa)?|descanso|recuperaci[oó]n)\s*(\d+[':]\d{0,2}|\d+\s*(?:min|'))/i

const DAY_MAP: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes',
  miercoles: 'Miércoles', miércoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes',
  sabado: 'Sábado', sábado: 'Sábado', domingo: 'Domingo',
}
const MONTH_MAP: Record<string, string> = {
  ene:'01', enero:'01', feb:'02', febrero:'02', mar:'03', marzo:'03',
  abr:'04', abril:'04', may:'05', mayo:'05', jun:'06', junio:'06',
  jul:'07', julio:'07', ago:'08', agosto:'08', sep:'09', septiembre:'09',
  oct:'10', octubre:'10', nov:'11', noviembre:'11', dic:'12', diciembre:'12',
}

const STRENGTH_KW = /\b(fuerza|core|pesas|musculaci[oó]n|gym|sentad|press|curl|hip|isquio|glut|banda|el[aá]stica)\b/i
const CARDIO_KW   = /\b(nataci[oó]n|natacion|bici|ciclismo|rodaje|tirada|tl\b|competencia|carrera|maratón|maraton|sprint|aceleracion|aceleración|swim|run)\b/i

// ─── Classify & parse one exercise segment ──────────────────────────────────
function parseSegment(raw: string): Exercise | null {
  const text = raw.trim()
  if (!text || text.length < 2) return null

  const durationM = text.match(DURATION)
  const kmM       = text.match(KM_RE)
  const paceM     = text.match(PACE_RE)
  const zoneM     = text.match(ZONE_RE)
  const intervalM = text.match(INTERVAL)
  const pauseM    = text.match(PAUSE_RE)

  const isStrength = STRENGTH_KW.test(text) && !CARDIO_KW.test(text)
  const isCardio   = !isStrength && (
    CARDIO_KW.test(text) || !!durationM || !!kmM || !!zoneM || !!intervalM
  )
  const type: 'strength' | 'cardio' = isStrength ? 'strength' : 'cardio'

  // Build name: strip numeric suffixes and parenthetical pace info
  let name = text
    .replace(/\(.*?\)/g, '')        // remove parentheses
    .replace(DURATION, '')
    .replace(KM_RE, '')
    .replace(ZONE_RE, (_, z1, z2) => `ZONA ${z1 ?? z2}`)  // keep zone label
    .replace(INTERVAL, m => m)      // keep interval as-is in name
    .replace(PAUSE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[-–—:,]+|[-–—:,]+$/g, '')
    .trim()

  // For intervals keep the raw text as a more meaningful name
  if (intervalM) {
    const reps    = parseInt(intervalM[1])
    const distNum = parseFloat(intervalM[2].replace(',', '.'))
    const unit    = (intervalM[3] || 'm').toLowerCase()
    const distKm  = unit.startsWith('k') ? distNum : distNum / 1000
    const zoneLabel = zoneM ? ` Z${zoneM[1] ?? zoneM[2]}` : ''
    const pauseLabel = pauseM ? ` p${pauseM[1]}` : ''
    name = `${reps}×${intervalM[2]}${unit === 'k' || unit === 'km' ? 'km' : 'm'}${zoneLabel}${pauseLabel}`
    return {
      id: Math.random().toString(36).slice(2),
      type: 'cardio',
      name,
      distance: Math.round(reps * distKm * 100) / 100 || undefined,
      notes: raw.replace(INTERVAL, '').replace(PAUSE_RE, '').trim() || undefined,
    }
  }

  if (!name || name.length < 2) name = text.slice(0, 40)

  // Zone label normalization
  name = name.replace(/\b(zona|z)\s*(\d)/gi, 'ZONA $2')

  const duration = durationM ? parseInt(durationM[1]) : undefined
  const distance = kmM ? parseFloat(kmM[1].replace(',', '.')) : undefined
  const pace     = paceM ? paceM[1].trim() : undefined
  const zone     = zoneM ? parseInt(zoneM[1] ?? zoneM[2]) : undefined
  const notes    = pauseM ? `Pausa: ${pauseM[1]}` : undefined

  return {
    id: Math.random().toString(36).slice(2),
    type,
    name,
    duration,
    distance,
    pace,
    heartRateZone: zone,
    notes,
  }
}

// ─── Split a line into exercise segments (split on " + " or " / ") ──────────
function splitSegments(text: string): string[] {
  // Protect interval patterns from splitting (e.g. "3×3000m")
  // Split on " + " but not inside parentheses
  const parts: string[] = []
  let depth = 0, buf = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (depth === 0 && ch === '+' && text[i-1] === ' ' && text[i+1] === ' ') {
      parts.push(buf.trim())
      buf = ''
      i++ // skip trailing space
      continue
    }
    buf += ch
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts.filter(Boolean)
}

// ─── Parse date from "Lunes 13 julio" or "Lunes 13" lines ──────────────────
function parseDate(dayLine: string, year = 2026): string {
  const m = dayLine.match(/\b(\d{1,2})\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mo = MONTH_MAP[m[2].toLowerCase()] ?? '01'
    return `${year}-${mo}-${d}`
  }
  // Fall back to bare number ("Lunes 13")
  const n = dayLine.match(/\b(\d{1,2})\b/)
  if (n) return `${year}-01-${n[1].padStart(2, '0')}` // month unknown
  return ''
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function parseWord(
  buffer: ArrayBuffer
): Promise<{ sessions: ParsedSession[]; rawText: string }> {
  const mammoth = await import('mammoth')
  const result  = await mammoth.extractRawText({ arrayBuffer: buffer })
  const rawText = result.value

  const lines: string[] = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const sessions: ParsedSession[] = []

  let currentWeek = 1
  let current: ParsedSession | null = null

  const flush = () => {
    if (current && current.exercises.length > 0) sessions.push(current)
    current = null
  }

  for (const line of lines) {
    // ── Week header ──────────────────────────────────────────────────────────
    const weekM = line.match(WEEK_RE)
    if (weekM) {
      flush()
      currentWeek = parseInt(weekM[1])
      continue
    }

    // ── Day line ─────────────────────────────────────────────────────────────
    const dayM = line.match(DAY_RE)
    if (dayM) {
      flush()
      const dayKey  = dayM[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      const dayName = DAY_MAP[dayKey] ?? dayM[1]
      const date    = parseDate(line)

      // Extract the exercise text: everything after the day name + optional date/month
      // Typically: "Lunes 13 julio: Fuerza + Natación" → after ":"
      //        or: "Lunes: Rodaje Z1 60'"             → after ":"
      const colonIdx = line.indexOf(':')
      const exerciseText = colonIdx >= 0 ? line.slice(colonIdx + 1).trim() : ''

      // dayLabel = "Lunes 13 jul"
      const dateShort = line
        .replace(DAY_RE, '')
        .replace(/:.*/,'')
        .trim()
        .replace(/\bde\b/gi, '')
        .replace(/\s+/g,' ')
        .trim()

      current = {
        id: Math.random().toString(36).slice(2),
        date,
        dayLabel: `${dayName}${dateShort ? ' ' + dateShort : ''}`,
        exercises: [],
        weekNumber: currentWeek,
      }

      // Parse exercises from the same line
      if (exerciseText) {
        for (const seg of splitSegments(exerciseText)) {
          const ex = parseSegment(seg)
          if (ex) current.exercises.push(ex)
        }
      }
      continue
    }

    // ── Exercise line (under current day) ────────────────────────────────────
    if (current) {
      // Lines that look like continuation exercises (start with dash/bullet or have content)
      const cleaned = line.replace(/^[-•*·–—]\s*/, '')
      for (const seg of splitSegments(cleaned)) {
        const ex = parseSegment(seg)
        if (ex) current.exercises.push(ex)
      }
    }
  }

  flush()
  return { sessions, rawText }
}
