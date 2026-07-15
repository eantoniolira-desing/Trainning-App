import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres un asistente especializado en planes de entrenamiento deportivo.
Tu tarea es leer texto de un plan de entrenamiento (en cualquier formato) y convertirlo en JSON estructurado.

REGLAS CRÍTICAS:
- Siempre responde SOLO con JSON válido, sin texto extra, sin markdown, sin bloques de código.
- El JSON debe tener exactamente esta estructura.
- Para type usa "cardio" o "strength" (nunca otro valor).
- Los IDs deben ser únicos: usa el prefijo dado + índice numérico.
- Si no hay dato para un campo numérico, omite ese campo (no pongas null ni 0).
- Las notas incluyen calentamiento, enfriamiento, instrucciones de series/repeticiones, etc.
- dayLabel es el nombre del día en español con fecha, ej: "Lunes 13 jul".
- Cada semana agrupa los días de la semana (7 días).
- Si el plan dice "Fuerza" o "Fuerza Recovery" o "Fuerza + Natación", crea un ejercicio con type:"strength" y name con el nombre de fuerza, y si hay natación agrega otro ejercicio separado.
- Si hay calentamiento y enfriamiento (warm up / cool down), créalos como ejercicios de cardio separados.`

export async function POST(req: NextRequest) {
  try {
    const { text, planId } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No se recibió texto' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
    }

    const userPrompt = `Convierte este plan de entrenamiento en JSON con la siguiente estructura exacta:

{
  "name": "Nombre del plan",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "weeks": [
    {
      "id": "${planId}-w1",
      "weekNumber": 1,
      "days": [
        {
          "id": "${planId}-w1d1",
          "date": "YYYY-MM-DD",
          "dayLabel": "Lunes 13 jul",
          "exercises": [
            {
              "id": "${planId}-w1d1e1",
              "type": "cardio",
              "name": "Nombre del ejercicio",
              "duration": 60,
              "distance": 10,
              "pace": "5:30 min/km",
              "notes": "Instrucciones adicionales"
            },
            {
              "id": "${planId}-w1d1e2",
              "type": "strength",
              "name": "Fuerza",
              "notes": "Core y movilidad"
            }
          ]
        }
      ]
    }
  ]
}

TEXTO DEL PLAN:
${text}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ plan: parsed })
  } catch (err) {
    console.error('parse-plan error:', err)
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
