import * as XLSX from 'xlsx'

export interface Activity {
  id: string
  fileType: string
  type: string
  name: string
  date: string
  durationSeconds: number
  distanceMeters?: number
  avgHeartRate?: number
  maxHeartRate?: number
  calories?: number
  elevationGainMeters?: number
  avgCadence?: number
  importedAt: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function durationToSeconds(time: string): number {
  const parts = time.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parseFloat(time) || 0
}

function typeToSpanish(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('run') || t.includes('corr')) return 'Carrera'
  if (t.includes('cycl') || t.includes('bike') || t.includes('ride') || t.includes('cicl')) return 'Ciclismo'
  if (t.includes('swim') || t.includes('nat')) return 'Natación'
  if (t.includes('walk') || t.includes('cam')) return 'Caminata'
  if (t.includes('hike') || t.includes('trail') || t.includes('sende')) return 'Senderismo'
  if (t.includes('strength') || t.includes('fuerza') || t.includes('weight')) return 'Fuerza'
  if (t.includes('yoga')) return 'Yoga'
  return type || 'Actividad'
}

// ─── GPX ────────────────────────────────────────────────────────────────────

export function parseGPX(text: string, fileName: string): Activity {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const name = doc.querySelector('name')?.textContent || fileName.replace('.gpx', '')
  const timeEls = doc.querySelectorAll('trkpt time')
  const trkpts = doc.querySelectorAll('trkpt')

  let durationSeconds = 0
  if (timeEls.length >= 2) {
    const t1 = new Date(timeEls[0].textContent!).getTime()
    const t2 = new Date(timeEls[timeEls.length - 1].textContent!).getTime()
    durationSeconds = (t2 - t1) / 1000
  }

  let distanceMeters = 0
  const pts: { lat: number; lon: number }[] = []
  trkpts.forEach(pt => pts.push({ lat: +pt.getAttribute('lat')!, lon: +pt.getAttribute('lon')! }))
  for (let i = 1; i < pts.length; i++)
    distanceMeters += haversine(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon)

  const hrEls = Array.from(doc.querySelectorAll('trkpt extensions *')).filter(el =>
    el.tagName.toLowerCase().includes('hr')
  )
  let avgHeartRate: number | undefined
  if (hrEls.length) {
    const hrs = hrEls.map(el => parseInt(el.textContent || '0')).filter(n => n > 30 && n < 250)
    if (hrs.length) avgHeartRate = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
  }

  let elevationGainMeters = 0
  let prevEle: number | null = null
  doc.querySelectorAll('trkpt ele').forEach(el => {
    const ele = parseFloat(el.textContent || '0')
    if (prevEle !== null && ele > prevEle) elevationGainMeters += ele - prevEle
    prevEle = ele
  })

  const date = timeEls[0]?.textContent
    ? new Date(timeEls[0].textContent).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  return {
    id: Math.random().toString(36).slice(2),
    fileType: 'GPX',
    type: 'Carrera',
    name,
    date,
    durationSeconds,
    distanceMeters: distanceMeters || undefined,
    avgHeartRate,
    elevationGainMeters: Math.round(elevationGainMeters) || undefined,
    importedAt: new Date().toISOString(),
  }
}

// ─── TCX ────────────────────────────────────────────────────────────────────

export function parseTCX(text: string): Activity[] {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const activities: Activity[] = []

  doc.querySelectorAll('Activity').forEach(act => {
    const sport = act.getAttribute('Sport') || 'Running'
    const startTime = act.querySelector('Id')?.textContent || ''
    const totalTime = parseFloat(act.querySelector('TotalTimeSeconds')?.textContent || '0')
    const distance = parseFloat(act.querySelector('DistanceMeters')?.textContent || '0')
    const calories = parseInt(act.querySelector('Calories')?.textContent || '0')
    const avgHR = parseInt(act.querySelector('AverageHeartRateBpm Value')?.textContent || '0')
    const maxHR = parseInt(act.querySelector('MaximumHeartRateBpm Value')?.textContent || '0')
    const avgCadence = parseInt(act.querySelector('Cadence')?.textContent || '0')

    let elevGain = 0
    let prevAlt: number | null = null
    act.querySelectorAll('AltitudeMeters').forEach(el => {
      const alt = parseFloat(el.textContent || '0')
      if (prevAlt !== null && alt > prevAlt) elevGain += alt - prevAlt
      prevAlt = alt
    })

    const date = startTime ? new Date(startTime).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    const type = typeToSpanish(sport)

    activities.push({
      id: Math.random().toString(36).slice(2),
      fileType: 'TCX',
      type,
      name: `${type} – ${date}`,
      date,
      durationSeconds: totalTime,
      distanceMeters: distance || undefined,
      avgHeartRate: avgHR || undefined,
      maxHeartRate: maxHR || undefined,
      calories: calories || undefined,
      elevationGainMeters: Math.round(elevGain) || undefined,
      avgCadence: avgCadence || undefined,
      importedAt: new Date().toISOString(),
    })
  })

  return activities
}

// ─── FIT ────────────────────────────────────────────────────────────────────

export async function parseFIT(buffer: ArrayBuffer): Promise<Activity[]> {
  const FitParser = (await import('fit-file-parser')).default
  return new Promise((resolve, reject) => {
    const parser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'km', temperatureUnit: 'celsius' })
    parser.parse(buffer, (err: Error | null, data: Record<string, unknown>) => {
      if (err) { reject(err); return }
      const activities: Activity[] = []
      const sessions = (data?.activity as Record<string, unknown>)?.sessions as Record<string, unknown>[] | undefined
      if (!sessions?.length) { resolve([]); return }
      for (const session of sessions) {
        const sport = typeToSpanish(String(session.sport || 'running'))
        const startTime = session.start_time instanceof Date ? session.start_time : new Date(String(session.start_time))
        const date = startTime.toISOString().slice(0, 10)
        activities.push({
          id: Math.random().toString(36).slice(2),
          fileType: 'FIT',
          type: sport,
          name: `${sport} – ${date}`,
          date,
          durationSeconds: Number(session.total_elapsed_time || 0),
          distanceMeters: session.total_distance ? Number(session.total_distance) * 1000 : undefined,
          avgHeartRate: Number(session.avg_heart_rate) || undefined,
          maxHeartRate: Number(session.max_heart_rate) || undefined,
          calories: Number(session.total_calories) || undefined,
          elevationGainMeters: Number(session.total_ascent) || undefined,
          avgCadence: Number(session.avg_running_cadence || session.avg_cadence) || undefined,
          importedAt: new Date().toISOString(),
        })
      }
      resolve(activities)
    })
  })
}

// ─── CSV (Garmin Connect / COROS) ────────────────────────────────────────────

export function parseActivityCSV(buffer: ArrayBuffer): Activity[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  const get = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const found = Object.entries(row).find(([col]) => col.toLowerCase().includes(k.toLowerCase()))
      if (found && found[1]) return found[1]
    }
    return ''
  }

  return rows.map(row => {
    const type = typeToSpanish(get(row, 'activity type', 'tipo actividad', 'type') || 'run')
    const date = (get(row, 'date', 'fecha') || new Date().toISOString()).slice(0, 10)
    const name = get(row, 'title', 'nombre', 'name') || `${type} – ${date}`
    const durationRaw = get(row, 'time', 'tiempo', 'duration', 'elapsed time')
    const distRaw = get(row, 'distance', 'distancia')
    const avgHrRaw = get(row, 'avg hr', 'avg heart', 'fc media', 'average heart')
    const maxHrRaw = get(row, 'max hr', 'max heart', 'fc max', 'maximum heart')
    const calRaw = get(row, 'calories', 'calorias', 'calorías', 'kcal')
    const elevRaw = get(row, 'total ascent', 'ascenso', 'elevation gain', 'desnivel')
    const cadRaw = get(row, 'cadence', 'cadencia', 'avg run cadence')

    const duration = durationRaw.includes(':') ? durationToSeconds(durationRaw) : parseFloat(durationRaw) * 60
    const distKm = parseFloat(distRaw.replace(',', '.')) || 0

    return {
      id: Math.random().toString(36).slice(2),
      fileType: 'CSV',
      type,
      name,
      date,
      durationSeconds: duration,
      distanceMeters: distKm ? distKm * 1000 : undefined,
      avgHeartRate: parseInt(avgHrRaw) || undefined,
      maxHeartRate: parseInt(maxHrRaw) || undefined,
      calories: parseInt(calRaw) || undefined,
      elevationGainMeters: parseInt(elevRaw) || undefined,
      avgCadence: parseInt(cadRaw) || undefined,
      importedAt: new Date().toISOString(),
    }
  }).filter(a => a.durationSeconds > 0 || a.distanceMeters)
}

// ─── Unified entry ────────────────────────────────────────────────────────────

export async function parseActivityFile(file: File): Promise<Activity[]> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'gpx') return [parseGPX(await file.text(), file.name)]
  if (ext === 'tcx') return parseTCX(await file.text())
  if (ext === 'fit') return parseFIT(await file.arrayBuffer())
  if (ext === 'csv') return parseActivityCSV(await file.arrayBuffer())
  throw new Error(`Formato no soportado: .${ext}`)
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export function formatDistance(meters?: number): string {
  if (!meters) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
}

export function formatPace(distMeters?: number, durationSecs?: number): string {
  if (!distMeters || !durationSecs) return '—'
  const sPerKm = durationSecs / (distMeters / 1000)
  const min = Math.floor(sPerKm / 60)
  const sec = Math.floor(sPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')} /km`
}

export function activityIcon(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('carre') || t.includes('run')) return '🏃'
  if (t.includes('cicl') || t.includes('bike') || t.includes('ride')) return '🚴'
  if (t.includes('nat') || t.includes('swim')) return '🏊'
  if (t.includes('cam') || t.includes('walk')) return '🚶'
  if (t.includes('sende') || t.includes('hike') || t.includes('trail')) return '⛰️'
  if (t.includes('fuerza') || t.includes('strength')) return '💪'
  if (t.includes('yoga')) return '🧘'
  return '⌚'
}
