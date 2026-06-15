export type ExerciseType = 'strength' | 'cardio'

export interface Exercise {
  id: string
  type: ExerciseType
  name: string
  sets?: number
  reps?: number
  weight?: number
  rest?: number
  distance?: number
  duration?: number
  pace?: string
  heartRateZone?: number
  notes?: string
}

export interface CommentReply {
  id: string
  sender: 'coach' | 'athlete'
  senderName: string
  text: string
  createdAt: string
}

export interface TrainingDay {
  id: string
  date: string
  dayLabel: string
  exercises: Exercise[]
  feedback?: {
    completed: boolean
    feelingRating: number
    feelingEmoji: string
    comments?: string
    loggedAt: string
    replies?: CommentReply[]
  }
  logs?: Record<string, ExerciseLog>
}

export interface TrainingWeek {
  id: string
  weekNumber: number
  days: TrainingDay[]
}

export interface TrainingPlan {
  id: string
  name: string
  athleteId: string
  startDate: string
  endDate: string
  weeks: TrainingWeek[]
  createdAt: string
}

export interface GoalEntry {
  id: string
  title: string
  targetDate: string
  completed: boolean
  createdAt: string
}

export interface Athlete {
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
  zone1?: string
  zone2?: string
  zone3?: string
  gender: 'hombre' | 'mujer'
  status: 'por_trabajar' | 'trabajando' | 'activo'
  startOfWeekDay?: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'
  personalBests?: {
    pb5k?: string
    pb10k?: string
    pb21k?: string
    pb42k?: string
  }
  goals?: GoalEntry[]
}

export interface CoachProfile {
  name: string
  age: number
  phone: string
  email: string
  photo?: string
}

export interface ExerciseLog {
  exerciseId: string
  completed: boolean
  actualSets?: number
  actualReps?: number
  actualWeight?: number
  actualDistance?: number
  actualDuration?: number
  actualPace?: string
  rpe?: number
  notes?: string
}

export interface StrengthExercise {
  id: string
  name: string
  description?: string
  imageUrl?: string
  videoUrl?: string
  category?: string
  instructions?: string
  routine?: string
  reps?: string
  series?: number
  tips?: string[]
  pdfFile?: string
  pdfPage?: number
  photoPosition?: 'top' | 'bottom' | 'single'
}

export interface NotificationEntry {
  id: string
  athleteId: string
  athleteName: string
  planId: string
  dayId: string
  dayLabel: string
  comments?: string
  feelingRating: number
  feelingEmoji: string
  createdAt: string
  read: boolean
}

export interface AthleteNotificationEntry {
  id: string
  athleteId: string
  planId: string
  dayId: string
  dayLabel: string
  text: string
  createdAt: string
  read: boolean
}
