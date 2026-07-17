# Documentación de Desarrollo — Training App (Óscar Barrón)

> Última actualización: julio 2026  
> Repositorio: github.com/eantoniolira-desing/Trainning-App  
> Deploy: Vercel (auto-deploy desde `git push origin main`)

---

## 1. Resumen del proyecto

Plataforma web para el entrenador personal **Óscar Barrón**. Permite gestionar atletas, crear y asignar planes de entrenamiento, registrar progreso diario y mantener comunicación entrenador-atleta.

Hay dos roles: **Coach** (Óscar) y **Atleta** (cada deportista con sus credenciales).

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | Supabase (PostgreSQL via PostgREST) |
| Cache local | `localStorage` del navegador |
| Deploy | Vercel |
| Repo | GitHub (`main` → Vercel auto-deploy) |

---

## 3. Arquitectura de datos

### Patrón general: localStorage + Supabase

La app usa **dos capas de almacenamiento**:

1. **`localStorage`** — fuente de verdad local. Las páginas leen de aquí para renderizado inmediato sin esperar red.
2. **Supabase** — fuente de verdad cross-device. Sincroniza cambios entre todos los dispositivos.

El patrón es *stale-while-revalidate*:
- La página carga datos de `localStorage` inmediatamente (UI responsiva)
- En paralelo, `syncFromSupabase()` corre en background
- Al completarse, actualiza el estado React con los datos frescos de Supabase

### Claves de localStorage

| Clave | Contenido |
|---|---|
| `athletes` | Array de todos los atletas |
| `training_plans` | Array de todos los planes |
| `active_athlete_id` | ID del atleta con sesión activa |
| `coach_profile` | Perfil del coach |
| `notifications` | Notificaciones del coach |
| `athlete_notifications` | Notificaciones para atletas |
| `strength_library` | Biblioteca de ejercicios de fuerza |
| `athlete-photo-{id}` | Foto de perfil en base64 (por atleta) |

---

## 4. Tablas en Supabase

### `athletes`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | text (PK) | ID secuencial asignado por Supabase |
| `name` | text | Nombre completo |
| `age` | int | Edad |
| `sport` | text | Deporte |
| `goal` | text | Objetivo deportivo |
| `email` | text | |
| `phone` | text | |
| `active` | boolean | |
| `joined_at` | text | Fecha de registro |
| `username` | text | Para login del atleta |
| `password` | text | Para login del atleta (texto plano) |
| `zone1/2/3` | text | Zonas de carrera (ritmos) |
| `gender` | text | `hombre` o `mujer` |
| `status` | text | `por_trabajar`, `trabajando`, `activo` |
| `start_of_week_day` | text | Día de inicio de semana |
| `personal_bests` | jsonb | PBs de 5k/10k/21k/42k |
| `goals` | jsonb | Array de metas personales |
| `photo` | text | Foto en base64 (puede ser grande) |

**RLS:** Política `public_all` — acceso completo para `anon` y `authenticated`.

### `training_plans`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | text (PK) | |
| `name` | text | Nombre del plan |
| `athlete_id` | text | FK a `athletes.id` |
| `start_date` | text | |
| `end_date` | text | |
| `weeks` | jsonb | Estructura completa de semanas/días/ejercicios |
| `created_at` | text | |

### `coach_profile`

| Columna | Tipo |
|---|---|
| `id` | int (siempre 1) |
| `name` | text |
| `age` | int |
| `phone` | text |
| `email` | text |
| `photo` | text |

### `notifications` / `athlete_notifications`

Registros de feedback de sesiones completadas y comunicación coach-atleta.

---

## 5. Funciones principales en `lib/db.ts`

### Sincronización

```typescript
syncFromSupabase()
```
Lee **todas las tablas** de Supabase y sobreescribe localStorage. Es la función central de sync cross-device. Se llama:
- En el login (antes de verificar credenciales)
- Al montar cada página en background
- Al recuperar visibilidad de tab (`visibilitychange`)

**Lógica especial de planes:** Al sincronizar, no sobreescribe ciegamente. Compara los días completados locales vs Supabase y conserva la versión con más progreso (no se pierde trabajo local).

```typescript
pushAthletesToSupabase(athletes)
```
Upsert completo de atletas. Incluye la columna `photo`. Si falla por columna faltante, reintenta sin photo.

```typescript
pushAthletePhotoToSupabase(athleteId, photo, username?)
```
UPDATE directo de la columna `photo`. Intenta primero por `id`, si no encuentra filas intenta por `username` como fallback (maneja el caso donde el ID local no coincide con Supabase).

```typescript
fetchAthletePhotoFromSupabase(athleteId)
```
SELECT directo de la columna `photo` para un atleta específico. Usado para polling cada 30s en el dashboard del atleta.

### CRUD local

```typescript
getAthletes() / saveAthletes(athletes)
getPlans() / savePlans(plans)
getCoachProfile() / saveCoachProfile(profile)
```
Leen/escriben en localStorage y disparan el push correspondiente a Supabase.

---

## 6. Tipos principales (`lib/types.ts`)

### `Athlete`
```typescript
interface Athlete {
  id: string
  name: string
  age: number
  sport: string
  goal: string
  email?: string
  phone?: string
  active: boolean
  joinedAt: string
  username?: string
  password?: string
  zone1?: string        // Zonas de carrera (ritmos)
  zone2?: string
  zone3?: string
  gender: 'hombre' | 'mujer'
  status: 'por_trabajar' | 'trabajando' | 'activo'
  startOfWeekDay?: string
  personalBests?: { pb5k?; pb10k?; pb21k?; pb42k? }
  goals?: GoalEntry[]
  photo?: string        // base64 de la foto de perfil
}
```

### `TrainingPlan`
```typescript
interface TrainingPlan {
  id: string
  name: string
  athleteId: string
  startDate: string
  endDate: string
  weeks: TrainingWeek[]
  createdAt: string
}
```

### `TrainingDay`
```typescript
interface TrainingDay {
  id: string
  date: string
  dayLabel: string
  exercises: Exercise[]
  feedback?: {
    completed: boolean
    feelingRating: number   // 1-10
    feelingEmoji: string
    comments?: string
    loggedAt: string
    replies?: CommentReply[]
  }
  logs?: Record<string, ExerciseLog>
}
```

---

## 7. Rutas de la aplicación

| Ruta | Descripción |
|---|---|
| `/` | Login — coach o atleta |
| `/coach/dashboard` | Panel del coach — kanban de atletas |
| `/coach/profile` | Perfil del coach |
| `/coach/athletes/new` | Crear nuevo atleta |
| `/coach/athletes/[id]` | Perfil completo del atleta |
| `/coach/athletes/[id]/edit` | Editar datos del atleta |
| `/coach/athletes/[id]/metrics` | Métricas del atleta |
| `/coach/athletes/[id]/plan/new` | Crear plan de entrenamiento |
| `/coach/athletes/[id]/plan/[planId]/edit` | Editar plan existente |
| `/coach/strength-library` | Biblioteca de ejercicios de fuerza |
| `/athlete/dashboard` | Dashboard del atleta |
| `/athlete/strength-library` | Biblioteca de ejercicios (vista atleta) |

---

## 8. Flujos clave

### Login

```
Ingresar usuario/contraseña
  → Si es coach: verifica contra CoachProfile en localStorage
  → Si es atleta:
      1. syncFromSupabase() — descarga datos frescos (incluye credenciales actualizadas)
      2. getAthletes() — busca usuario/contraseña en localStorage
      3. Si encuentra → setItem('active_athlete_id', found.id)
      4. Redirige a /athlete/dashboard
```

**Importante:** El sync antes del login garantiza que cambios de credenciales hechos desde el panel del coach sean inmediatamente efectivos en cualquier dispositivo.

### Subida de foto de perfil (atleta)

```
Presionar "📷 Cambiar foto"
  → openPhotoPicker() crea un <input type="file"> dinámicamente
  → Usuario selecciona foto de la galería
  → FileReader lee el archivo como base64
  → Canvas comprime a máximo 400×400px, calidad JPEG 0.82
     (si > 400KB reduce a 0.6, luego 0.4)
  → setPhoto(dataUrl) — aparece en pantalla
  → localStorage.setItem('athlete-photo-{id}', dataUrl)
  → pushAthletePhotoToSupabase(id, dataUrl, username)
     → Intento 1: UPDATE WHERE id = athleteId
     → Intento 2: UPDATE WHERE username = username (fallback si ID no coincide)
  → Banner superior muestra ✅ o ❌ con el ID usado
```

La foto se sincroniza a otros dispositivos vía `syncFromSupabase()` que lee el campo `photo` de Supabase y lo guarda en `athlete-photo-{id}` en localStorage. El dashboard también hace polling cada 30 segundos y al recuperar visibilidad de tab.

### Progreso de entrenamiento cross-device

```
Atleta marca día como completado
  → savePlans(updated) → pushPlansToSupabase()
  
En otro dispositivo:
  → syncFromSupabase() lee plans de Supabase
  → Merge: para cada plan, compara días completados locales vs Supabase
  → Conserva la versión con MÁS días completados (nunca pierde progreso)
```

### Cambio de credenciales (coach edita atleta)

```
Coach va a /coach/athletes/[id]/edit
  → syncFromSupabase() al montar (obtiene datos frescos)
  → Edita username/password
  → Guardar → saveAthletes(updated) → pushAthletesToSupabase()
  → Supabase queda actualizado
  
Atleta en otro dispositivo:
  → Al hacer login → syncFromSupabase() descarga credenciales nuevas
  → Login funciona con las nuevas credenciales
```

---

## 9. Capacidades por rol

### Coach (Óscar)

- Ver tablero Kanban de todos los atletas (columnas: Por trabajar / Trabajando / Plan activo)
- Crear, editar y eliminar atletas
- Asignar planes de entrenamiento con semanas y días
- Crear/editar ejercicios por día (cardio y fuerza)
- Ver métricas del atleta
- Ver y responder feedback de sesiones completadas
- Editar biblioteca de ejercicios de fuerza
- Ver/editar su propio perfil
- Mover atletas entre columnas del kanban con drag & drop

### Atleta

- Ver su plan de entrenamiento activo
- Marcar días como completados
- Registrar feedback por sesión (rating 1-10, emoji, comentarios)
- Ver historial de planes anteriores
- Ver y editar sus metas personales
- Ver sus zonas de carrera y PBs
- Subir y sincronizar foto de perfil
- Ver biblioteca de ejercicios de fuerza con videos e instrucciones
- Recibir y responder notificaciones del coach

---

## 10. Consideraciones técnicas importantes

### IDs de atletas
Los atletas creados desde la app reciben un ID `Date.now().toString()` (timestamp de 13 dígitos). Supabase puede tener IDs diferentes (ej. `'4'`). Por eso:
- `pushAthletePhotoToSupabase` intenta por ID y luego por username como fallback
- Hacer login fresco en un dispositivo nuevo resuelve el desajuste (syncFromSupabase reemplaza el ID local con el de Supabase)

### Schema cache de Supabase
Si se agrega una columna nueva a Supabase, el cliente PostgREST puede ignorarla hasta que se recargue la caché. Recargar con:
```sql
NOTIFY pgrst, 'reload schema';
```
O desde el dashboard de Supabase: Settings → API → Reload schema cache.

### Foto de perfil
Se almacena como base64 en una columna `TEXT` de Supabase. El límite práctico es ~400KB después de compresión. Si la foto es muy grande, el canvas reduce la calidad hasta que entre.

### Deploy
**Cualquier cambio de código requiere `git push origin main` para verse en producción.** El celular y otros dispositivos acceden a Vercel, no al servidor de desarrollo local. Vercel tarda 1-2 minutos en redesplegar.

---

## 11. Cómo agregar un atleta nuevo

1. Coach va a `/coach/athletes/new`
2. Llena el formulario (nombre, edad, deporte, usuario, contraseña, etc.)
3. El atleta se guarda en localStorage y se hace push a Supabase
4. El atleta puede hacer login desde cualquier dispositivo usando su usuario/contraseña

---

## 12. Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Configuradas en Vercel. Para desarrollo local, crear `.env.local` en la raíz con las mismas variables.
