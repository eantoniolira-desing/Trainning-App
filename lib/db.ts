import { Athlete, TrainingPlan, CoachProfile, StrengthExercise, NotificationEntry, AthleteNotificationEntry, CommentReply } from './types';
import { supabase } from './supabase';
import { MOCK_ATHLETES, MOCK_PLANS } from './mock-data';

const KEY_ATHLETES = 'athlete_tracker_athletes';
const KEY_PLANS = 'athlete_tracker_plans';
const KEY_COACH = 'athlete_tracker_coach';
const KEY_STRENGTH_LIBRARY = 'athlete_tracker_strength_library';
const KEY_NOTIFICATIONS = 'athlete_tracker_notifications';
const KEY_ATHLETE_NOTIFICATIONS = 'athlete_tracker_athlete_notifications';

const DEFAULT_COACH: CoachProfile = {
  name: 'Óscar Barrón',
  age: 32,
  phone: '+52 55 9876 5432',
  email: 'contacto@oscarbarron.fit',
  photo: '',
  username: 'Oscar',
  password: 'Tocayo',
};

// Seed default athletes with usernames & passwords & zones & details
const SEED_ATHLETES: Athlete[] = [
  {
    id: '1',
    name: 'Carlos Mendoza',
    age: 24,
    sport: 'Atletismo',
    goal: 'Preparación para maratón en octubre',
    email: 'carlos@atletismo.com',
    phone: '+52 55 1234 5678',
    active: true,
    joinedAt: '2026-01-15',
    username: 'carlos',
    password: '123',
    zone1: '5:45-5:55 min/km',
    zone2: '4:45-4:55 min/km',
    zone3: '4:30-4:40 min/km',
    gender: 'hombre',
    status: 'activo',
    startOfWeekDay: 'lunes',
    personalBests: { pb5k: '19:45', pb10k: '42:10', pb21k: '1h 35m', pb42k: '3h 25m' },
    goals: [
      { id: 'g1', title: 'Completar rodaje de 14km a ritmo Z2', targetDate: '2026-06-20', completed: false, createdAt: '2026-06-01' },
      { id: 'g2', title: 'Mejorar fuerza en sentadillas a 80kg', targetDate: '2026-06-15', completed: true, createdAt: '2026-05-15' }
    ]
  },
  {
    id: '2',
    name: 'Ana Torres',
    age: 28,
    sport: 'CrossFit',
    goal: 'Ganar masa muscular y mejorar resistencia',
    email: 'ana@crossfit.com',
    active: true,
    joinedAt: '2026-02-20',
    username: 'ana',
    password: '123',
    zone1: '5:45-5:55 min/km',
    zone2: '4:45-4:55 min/km',
    zone3: '4:30-4:40 min/km',
    gender: 'mujer',
    status: 'por_trabajar',
    startOfWeekDay: 'lunes',
    personalBests: { pb5k: '22:15', pb10k: '48:30', pb21k: '1h 50m' },
    goals: [
      { id: 'g3', title: 'Establecer plan de fuerza base', targetDate: '2026-06-25', completed: false, createdAt: '2026-06-10' }
    ]
  },
  {
    id: '3',
    name: 'Luis Ramírez',
    age: 21,
    sport: 'Fútbol',
    goal: 'Mejorar velocidad y fuerza explosiva para temporada',
    email: 'luis@futbol.com',
    active: true,
    joinedAt: '2026-03-10',
    username: 'luis',
    password: '123',
    zone1: '5:45-5:55 min/km',
    zone2: '4:45-4:55 min/km',
    zone3: '4:30-4:40 min/km',
    gender: 'hombre',
    status: 'trabajando',
    startOfWeekDay: 'miercoles',
    personalBests: { pb5k: '17:50', pb10k: '38:15' },
    goals: [
      { id: 'g4', title: 'Correr 5k por debajo de 18 min', targetDate: '2026-07-01', completed: true, createdAt: '2026-05-01' }
    ]
  },
  {
    id: '4',
    name: 'Enrique Antonio Lira',
    age: 35,
    sport: 'Atletismo / Running',
    goal: 'Medio Maratón CDMX (12 Jul)',
    email: 'enrique@lira.com',
    phone: '+52 55 2222 3333',
    active: true,
    joinedAt: '2026-06-01',
    username: 'enrique',
    password: '123',
    zone1: '5:45-5:55 min/km',
    zone2: '4:45-4:55 min/km',
    zone3: '4:30-4:40 min/km',
    gender: 'hombre',
    status: 'activo',
    startOfWeekDay: 'lunes',
    personalBests: { pb5k: '24:30', pb10k: '51:15', pb21k: '1h 55m' },
    goals: [
      { id: 'g5', title: 'Medio Maratón CDMX - Finalizar en ritmo Z3 (4:30-4:40)', targetDate: '2026-07-12', completed: false, createdAt: '2026-06-05' },
      { id: 'g6', title: 'Test de 5K y 10K Asics', targetDate: '2026-05-10', completed: true, createdAt: '2026-05-01' }
    ]
  }
];

// Seed plans including Enrique's real 5-week plan
const SEED_PLANS: TrainingPlan[] = [
  ...MOCK_PLANS,
  {
    id: 'plan-enrique-1',
    name: 'Preparación Medio Maratón CDMX',
    athleteId: '4',
    startDate: '2026-06-08',
    endDate: '2026-07-12',
    createdAt: '2026-06-05',
    weeks: [
      {
        id: 'w-enr-1',
        weekNumber: 1,
        days: [
          {
            id: 'we1d1',
            date: '2026-06-08',
            dayLabel: 'Lunes 8 jun',
            exercises: [
              { id: 'ee1', type: 'strength', name: 'Fuerza (Recovery)', notes: 'Trabajo de movilidad y estiramientos activos en casa' },
              { id: 'ee2', type: 'cardio', name: 'Natación suave', duration: 45, notes: 'Estilo libre de baja intensidad' }
            ]
          },
          {
            id: 'we1d2',
            date: '2026-06-09',
            dayLabel: 'Martes 9 jun',
            exercises: [
              { id: 'ee3', type: 'cardio', name: 'Rodaje ZONA 1', duration: 40, pace: '5:45-5:55 min/km', notes: 'Ritmo suave de rodaje' }
            ]
          },
          {
            id: 'we1d3',
            date: '2026-06-10',
            dayLabel: 'Miércoles 10 jun',
            exercises: [
              { id: 'ee4', type: 'cardio', name: 'Bici', duration: 30, notes: 'Rodada ligera' },
              { id: 'ee5', type: 'strength', name: 'Fuerza', notes: 'Rutina de Core y Fuerza General' }
            ]
          },
          {
            id: 'we1d4',
            date: '2026-06-11',
            dayLabel: 'Jueves 11 jun',
            exercises: [
              { id: 'ee6', type: 'cardio', name: 'Rodaje ZONA 1', duration: 50, pace: '5:45-5:55 min/km', notes: 'Ritmo suave cómodo' }
            ]
          },
          {
            id: 'we1d5',
            date: '2026-06-12',
            dayLabel: 'Viernes 12 jun',
            exercises: [
              { id: 'ee7', type: 'strength', name: 'Fuerza', notes: 'Rutina de Core y Movilidad' },
              { id: 'ee8', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we1d6',
            date: '2026-06-13',
            dayLabel: 'Sábado 13 jun',
            exercises: [
              { id: 'ee9', type: 'cardio', name: 'Warm up', duration: 20, notes: 'Calentamiento y trote muy suave' },
              { id: 'ee10', type: 'cardio', name: 'Tempo Run ZONA 2', distance: 8, pace: '4:45-4:55 min/km', notes: 'Ritmo de umbral láctico sostenido' },
              { id: 'ee11', type: 'cardio', name: 'Intervalo ZONA 3', distance: 1, pace: '4:30-4:40 min/km', notes: 'Ritmo Vo2max / Competición. Pausa de 3 min de caminata al terminar' },
              { id: 'ee12', type: 'cardio', name: 'Cool down', duration: 10, notes: 'Enfriamiento y caminata libre' }
            ]
          },
          {
            id: 'we1d7',
            date: '2026-06-14',
            dayLabel: 'Domingo 14 jun',
            exercises: [
              { id: 'ee13', type: 'cardio', name: 'Rodaje ZONA 1', duration: 75, pace: '5:45-5:55 min/km', notes: 'Tirada larga aeróbica' }
            ]
          }
        ]
      },
      {
        id: 'w-enr-2',
        weekNumber: 2,
        days: [
          {
            id: 'we2d1',
            date: '2026-06-15',
            dayLabel: 'Lunes 15 jun',
            exercises: [
              { id: 'ee14', type: 'strength', name: 'Fuerza (Recovery)', notes: 'Movilidad y estiramientos activos' },
              { id: 'ee15', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we2d2',
            date: '2026-06-16',
            dayLabel: 'Martes 16 jun',
            exercises: [
              { id: 'ee16', type: 'cardio', name: 'Rodaje ZONA 1', duration: 55, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we2d3',
            date: '2026-06-17',
            dayLabel: 'Miércoles 17 jun',
            exercises: [
              { id: 'ee17', type: 'cardio', name: 'Bici', duration: 30 },
              { id: 'ee18', type: 'strength', name: 'Fuerza', notes: 'Rutina de Core y Fuerza General' }
            ]
          },
          {
            id: 'we2d4',
            date: '2026-06-18',
            dayLabel: 'Jueves 18 jun',
            exercises: [
              { id: 'ee19', type: 'cardio', name: 'Rodaje ZONA 1', duration: 60, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we2d5',
            date: '2026-06-19',
            dayLabel: 'Viernes 19 jun',
            exercises: [
              { id: 'ee20', type: 'strength', name: 'Fuerza', notes: 'Core y Movilidad' },
              { id: 'ee21', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we2d6',
            date: '2026-06-20',
            dayLabel: 'Sábado 20 jun',
            exercises: [
              { id: 'ee22', type: 'cardio', name: 'Warm up', duration: 20 },
              { id: 'ee23', type: 'cardio', name: 'Intervalos 3 x 4000 ZONA 2', distance: 12, pace: '4:45-4:55 min/km', notes: '3 repeticiones de 4 km en Z2 con pausa de 3 min entre series' },
              { id: 'ee24', type: 'cardio', name: 'Cool down', duration: 10 }
            ]
          },
          {
            id: 'we2d7',
            date: '2026-06-21',
            dayLabel: 'Domingo 21 jun',
            exercises: [
              { id: 'ee25', type: 'cardio', name: 'Rodaje ZONA 1', duration: 80, pace: '5:45-5:55 min/km' }
            ]
          }
        ]
      },
      {
        id: 'w-enr-3',
        weekNumber: 3,
        days: [
          {
            id: 'we3d1',
            date: '2026-06-22',
            dayLabel: 'Lunes 22 jun',
            exercises: [
              { id: 'ee26', type: 'strength', name: 'Fuerza (Recovery)' },
              { id: 'ee27', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we3d2',
            date: '2026-06-23',
            dayLabel: 'Martes 23 jun',
            exercises: [
              { id: 'ee28', type: 'cardio', name: 'Rodaje ZONA 1', duration: 60, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we3d3',
            date: '2026-06-24',
            dayLabel: 'Miércoles 24 jun',
            exercises: [
              { id: 'ee29', type: 'cardio', name: 'Bici', duration: 30 },
              { id: 'ee30', type: 'strength', name: 'Fuerza' }
            ]
          },
          {
            id: 'we3d4',
            date: '2026-06-25',
            dayLabel: 'Jueves 25 jun',
            exercises: [
              { id: 'ee31', type: 'cardio', name: 'Rodaje ZONA 1', duration: 65, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we3d5',
            date: '2026-06-26',
            dayLabel: 'Viernes 26 jun',
            exercises: [
              { id: 'ee32', type: 'strength', name: 'Fuerza' },
              { id: 'ee33', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we3d6',
            date: '2026-06-27',
            dayLabel: 'Sábado 27 jun',
            exercises: [
              { id: 'ee34', type: 'cardio', name: 'Warm up', duration: 20 },
              { id: 'ee35', type: 'cardio', name: 'Tempo Run ZONA 2', distance: 5, pace: '4:45-4:55 min/km', notes: '5000 metros en ZONA 2. Pausa de 3 min al finalizar' },
              { id: 'ee36', type: 'cardio', name: 'Intervalos 5 x 1000 ZONA 3', distance: 5, pace: '4:30-4:40 min/km', notes: '5 series de 1 km en Z3 con pausa de 2 min entre series' },
              { id: 'ee37', type: 'cardio', name: 'Cool down', duration: 10 }
            ]
          },
          {
            id: 'we3d7',
            date: '2026-06-28',
            dayLabel: 'Domingo 28 jun',
            exercises: [
              { id: 'ee38', type: 'cardio', name: 'Rodaje ZONA 1', duration: 95, pace: '5:45-5:55 min/km' }
            ]
          }
        ]
      },
      {
        id: 'w-enr-4',
        weekNumber: 4,
        days: [
          {
            id: 'we4d1',
            date: '2026-06-29',
            dayLabel: 'Lunes 29 jun',
            exercises: [
              { id: 'ee39', type: 'strength', name: 'Fuerza (Recovery)' },
              { id: 'ee40', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we4d2',
            date: '2026-06-30',
            dayLabel: 'Martes 30 jun',
            exercises: [
              { id: 'ee41', type: 'cardio', name: 'Rodaje ZONA 1', duration: 60, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we4d3',
            date: '2026-07-01',
            dayLabel: 'Miércoles 1 jul',
            exercises: [
              { id: 'ee42', type: 'cardio', name: 'Bici', duration: 30 },
              { id: 'ee43', type: 'strength', name: 'Fuerza' }
            ]
          },
          {
            id: 'we4d4',
            date: '2026-07-02',
            dayLabel: 'Jueves 2 jul',
            exercises: [
              { id: 'ee44', type: 'cardio', name: 'Rodaje ZONA 1', duration: 70, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we4d5',
            date: '2026-07-03',
            dayLabel: 'Viernes 3 jul',
            exercises: [
              { id: 'ee45', type: 'strength', name: 'Fuerza' },
              { id: 'ee46', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we4d6',
            date: '2026-07-04',
            dayLabel: 'Sábado 4 jul',
            exercises: [
              { id: 'ee47', type: 'cardio', name: 'Warm up', duration: 20 },
              { id: 'ee48', type: 'cardio', name: 'Rodaje ZONA 2', distance: 10, pace: '4:45-4:55 min/km', notes: '10 km sostenidos en ZONA 2' },
              { id: 'ee49', type: 'cardio', name: 'Cool down', duration: 10 }
            ]
          },
          {
            id: 'we4d7',
            date: '2026-07-05',
            dayLabel: 'Domingo 5 jul',
            exercises: [
              { id: 'ee50', type: 'cardio', name: 'Rodaje ZONA 1', duration: 85, pace: '5:45-5:55 min/km' }
            ]
          }
        ]
      },
      {
        id: 'w-enr-5',
        weekNumber: 5,
        days: [
          {
            id: 'we5d1',
            date: '2026-07-06',
            dayLabel: 'Lunes 6 jul',
            exercises: [
              { id: 'ee51', type: 'strength', name: 'Fuerza (Recovery)' },
              { id: 'ee52', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we5d2',
            date: '2026-07-07',
            dayLabel: 'Martes 7 jul',
            exercises: [
              { id: 'ee53', type: 'cardio', name: 'Rodaje ZONA 1', duration: 70, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we5d3',
            date: '2026-07-08',
            dayLabel: 'Miércoles 8 jul',
            exercises: [
              { id: 'ee54', type: 'cardio', name: 'Bici', duration: 30 },
              { id: 'ee55', type: 'strength', name: 'Fuerza' }
            ]
          },
          {
            id: 'we5d4',
            date: '2026-07-09',
            dayLabel: 'Jueves 9 jul',
            exercises: [
              { id: 'ee56', type: 'cardio', name: 'Rodaje ZONA 1', duration: 50, pace: '5:45-5:55 min/km' }
            ]
          },
          {
            id: 'we5d5',
            date: '2026-07-10',
            dayLabel: 'Viernes 10 jul',
            exercises: [
              { id: 'ee57', type: 'strength', name: 'Fuerza' },
              { id: 'ee58', type: 'cardio', name: 'Natación suave', duration: 45 }
            ]
          },
          {
            id: 'we5d6',
            date: '2026-07-11',
            dayLabel: 'Sábado 11 jul',
            exercises: [
              { id: 'ee59', type: 'cardio', name: 'Rodaje ZONA 1', duration: 25, pace: '5:45-5:55 min/km', notes: 'Trote suave pre-carrera' },
              { id: 'ee60', type: 'cardio', name: 'Aceleraciones', distance: 0.8, notes: '8 x 100 metros progresivos con pausa de 1 min' }
            ]
          },
          {
            id: 'we5d7',
            date: '2026-07-12',
            dayLabel: 'Domingo 12 jul',
            exercises: [
              { id: 'ee61', type: 'cardio', name: 'MEDIO MARATÓN CDMX 🏁', distance: 21, pace: '4:30-4:40 min/km', notes: 'Día de competencia! A romperla!' }
            ]
          }
        ]
      }
    ]
  }
];

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function initDB(forceSeed = false) {
  if (!isBrowser()) return;

  const currentAthletesRaw = localStorage.getItem(KEY_ATHLETES);
  let hasEnrique = false;
  let isMigrated = false;
  if (currentAthletesRaw) {
    try {
      const parsed: Athlete[] = JSON.parse(currentAthletesRaw);
      hasEnrique = parsed.some(a => a.id === '4');
      isMigrated = parsed.every(a => a.gender !== undefined);
    } catch (e) {
      // JSON parse error, reseed
    }
  }

  if (forceSeed || !currentAthletesRaw || !hasEnrique || !isMigrated) {
    localStorage.setItem(KEY_ATHLETES, JSON.stringify(SEED_ATHLETES));
    localStorage.setItem(KEY_PLANS, JSON.stringify(SEED_PLANS));
    localStorage.setItem(KEY_COACH, JSON.stringify(DEFAULT_COACH));
  }

  const currentLib = localStorage.getItem(KEY_STRENGTH_LIBRARY);
  if (!currentLib) {
    localStorage.setItem(KEY_STRENGTH_LIBRARY, JSON.stringify(DEFAULT_STRENGTH_LIBRARY));
  } else {
    try {
      const parsed: StrengthExercise[] = JSON.parse(currentLib);
      const hasOldIds = parsed.some(ex => ['s1', 's2', 's3', 's4'].includes(ex.id))
      const hasCasa = parsed.some(ex => ex.id === 'casa-1')
      if (hasOldIds || !hasCasa) {
        localStorage.setItem(KEY_STRENGTH_LIBRARY, JSON.stringify(DEFAULT_STRENGTH_LIBRARY));
      }
    } catch {
      localStorage.setItem(KEY_STRENGTH_LIBRARY, JSON.stringify(DEFAULT_STRENGTH_LIBRARY));
    }
  }
}

export function getAthletes(): Athlete[] {
  if (!isBrowser()) return SEED_ATHLETES;
  initDB();
  const data = localStorage.getItem(KEY_ATHLETES);
  return data ? JSON.parse(data) : SEED_ATHLETES;
}

export function saveAthletes(athletes: Athlete[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_ATHLETES, JSON.stringify(athletes));
  pushAthletesToSupabase(athletes).catch(() => {});
}

export function getPlans(): TrainingPlan[] {
  if (!isBrowser()) return SEED_PLANS;
  initDB();
  const data = localStorage.getItem(KEY_PLANS);
  return data ? JSON.parse(data) : SEED_PLANS;
}

export function savePlans(plans: TrainingPlan[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_PLANS, JSON.stringify(plans));
  pushPlansToSupabase(plans).catch(() => {});
}

export function getCoachProfile(): CoachProfile {
  if (!isBrowser()) return DEFAULT_COACH;
  initDB();
  const data = localStorage.getItem(KEY_COACH);
  return data ? JSON.parse(data) : DEFAULT_COACH;
}

export function saveCoachProfile(profile: CoachProfile) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_COACH, JSON.stringify(profile));
  pushCoachProfileToSupabase(profile).catch(() => {});
}

export const DEFAULT_STRENGTH_LIBRARY: StrengthExercise[] = [
  // ── TRONCO INFERIOR ──────────────────────────────────────────────────────
  {
    id: 'inf-1', name: 'Extensión de Cuádriceps',
    description: 'Ejercicio de aislamiento para los cuádriceps en máquina.',
    category: 'Pierna', routine: 'inferior', reps: '6 reps por pierna', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 2, photoPosition: 'top',
    tips: [
      'Cadera inmóvil, sin balanceos',
      'Espalda bien apoyada en el respaldo',
      'Pies con puntas hacia adelante',
      'Agárrate de las asas para mantener el cuerpo bloqueado',
    ],
  },
  {
    id: 'inf-2', name: 'Curl Isquio Sentado',
    description: 'Flexión de rodilla en máquina para trabajar los isquiotibiales.',
    category: 'Pierna', routine: 'inferior', reps: '6 reps por pierna', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 2, photoPosition: 'bottom',
    tips: [
      'Almohadilla sobre el tendón de Aquiles',
      'Almohadilla para fijar las piernas',
      'Trabajar a 1 pierna para evitar compensaciones',
      'Punta del pie hacia arriba',
    ],
  },
  {
    id: 'inf-3', name: 'Curl Isquio Tumbado',
    description: 'Flexión de rodilla horizontal. Alternativa al curl sentado.',
    category: 'Pierna', routine: 'inferior', reps: '6 reps por pierna', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 3, photoPosition: 'top',
    tips: [
      'Ajustar bien la máquina antes de empezar',
      'Pelvis bien colocada y estable durante todo el movimiento',
      'Almohadilla sobre el tendón de Aquiles',
      'Peso controlado, sin impulsos',
    ],
  },
  {
    id: 'inf-4', name: 'Hip Thrust Guiado',
    description: 'Puente de glúteo en máquina guiada. Máxima activación glútea.',
    category: 'Glúteo', routine: 'inferior', reps: '6 repeticiones', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 3, photoPosition: 'bottom',
    tips: [
      'Usar colchoneta para mayor comodidad en la pelvis',
      'Descalzarse para sentir mejor la fuerza aplicada en el suelo',
      'Rodillas a 90 grados en la posición final',
      'Aplicar la fuerza empujando contra el suelo',
    ],
  },
  {
    id: 'inf-5', name: 'Patada de Glúteo',
    description: 'Alternativa al Hip Thrust. Activa el glúteo de forma unilateral.',
    category: 'Glúteo', routine: 'inferior', reps: '6 reps por pierna', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 4, photoPosition: 'top',
    tips: [
      'Apoyar el pecho en la almohadilla',
      'Sujetar las agarraderas para mayor estabilidad',
      'Asegurar una postura firme y estable',
      'Movimiento con velocidad sostenida y controlada',
    ],
  },
  {
    id: 'inf-6', name: 'Sóleos',
    description: 'Ejercicio específico para el músculo sóleo con rodillas flexionadas.',
    category: 'Pierna', routine: 'inferior', reps: '4–6 repeticiones', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 4, photoPosition: 'bottom',
    tips: [
      'Rodillas dobladas durante todo el movimiento',
      'Bajar y subir con control, sin rebotes',
      'Mantener velocidad lenta para mayor activación muscular',
    ],
  },
  {
    id: 'inf-7', name: 'Gemelos',
    description: 'Elevación de talones en escalón. Prevención tendón de Aquiles.',
    category: 'Pierna', routine: 'inferior', reps: '8 reps por pierna', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 5, photoPosition: 'top',
    tips: [
      'Colocarse en un escalón con la punta del pie',
      'Subir a puntillas y bajar lentamente con una pierna',
      'Controlar el descenso para mayor efectividad',
      'Ejercicio clave para la prevención del tendón de Aquiles',
    ],
  },
  {
    id: 'inf-8', name: 'Prensa',
    description: 'Prensa de piernas en máquina. Fortalece cuádriceps, glúteos e isquiotibiales.',
    category: 'Pierna', routine: 'inferior', reps: '6 repeticiones', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 5, photoPosition: 'bottom',
    tips: [
      'No bajar demasiado ni flexionar excesivamente las rodillas',
      'No agregar peso o agregar muy poco',
      'Pies descalzos en la plataforma para mejor percepción del apoyo',
      'Pies ligeramente orientados hacia afuera',
      'Bajar hasta los 90 grados',
    ],
  },
  {
    id: 'inf-9', name: 'Abducción de Cadera en Polea',
    description: 'Activa el glúteo medio mediante apertura de cadera con polea.',
    category: 'Cadera', routine: 'inferior', reps: '6 reps por pierna', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 6, photoPosition: 'top',
    tips: [
      'Apertura de cadera: activa el glúteo medio',
      'Usar polea con cargas bajas',
      'La pierna que no trabaja se flexiona y se mantiene quieta',
    ],
  },
  {
    id: 'inf-10', name: 'Aducción de Cadera en Polea',
    description: 'Trabaja los aductores mediante cierre de cadera con polea.',
    category: 'Cadera', routine: 'inferior', reps: '6 reps por pierna', series: 2,
    pdfFile: 'tronco-inferior', pdfPage: 6, photoPosition: 'bottom',
    tips: [
      'Cierre de cadera: trabaja los aductores',
      'Usar polea con cargas bajas',
      'La pierna que no trabaja se flexiona y se mantiene quieta',
    ],
  },
  // ── TRONCO SUPERIOR ──────────────────────────────────────────────────────
  {
    id: 'sup-1', name: 'Press de Banca',
    description: 'Empuje horizontal en banco plano. Pecho, hombros y tríceps.',
    category: 'Empuje', routine: 'superior', reps: '8 repeticiones', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 2, photoPosition: 'top',
    tips: [
      'Tumbado boca arriba pies firmes en suelo',
      'Rodear la barra con el dedo pulgar',
      'Llevar la barra hacia el pecho y empujar hacia arriba',
    ],
  },
  {
    id: 'sup-2', name: 'Press Militar',
    description: 'Empuje vertical sobre la cabeza. Hombros y tríceps.',
    category: 'Empuje', routine: 'superior', reps: '8 repeticiones', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 2, photoPosition: 'bottom',
    tips: [
      'Agarre más ancho que los hombros',
      'El dedo pulgar abraza la barra',
      'Pies con mayor amplitud que caderas, rodillas ligeramente flexionadas',
      'Al empujar llevar cabeza atrás; arriba, cabeza al frente',
      'Apoyar la barra en el pecho y volver a empujar',
    ],
  },
  {
    id: 'sup-3', name: 'Remo en Polea',
    description: 'Tirón horizontal en polea baja. Espalda media y bíceps.',
    category: 'Tirón', routine: 'superior', reps: '6–8 repeticiones', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 3, photoPosition: 'top',
    tips: [
      'Pies bien apoyados en plataforma, espalda recta al coger agarre',
      'Llevar manos justo debajo del pecho contrayendo omoplatos sacando pecho',
    ],
  },
  {
    id: 'sup-4', name: 'Plancha Frontal',
    description: 'Ejercicio de core en posición prono sobre los codos.',
    category: 'Core', routine: 'superior', reps: '30–40 seg', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 3, photoPosition: 'bottom',
    tips: [
      'Posición boca abajo',
      'Mantener tobillos, caderas y hombros alineados',
      'Codos debajo de los hombros, cuello neutro y mirada hacia abajo',
    ],
  },
  {
    id: 'sup-5', name: 'Plancha Lateral',
    description: 'Estabilización lateral del core sobre un codo.',
    category: 'Core', routine: 'superior', reps: '30–40 seg', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 4, photoPosition: 'top',
    tips: [
      'Codo a la altura del hombro',
      'Tobillos, cadera y hombros alineados',
      'Mirada al frente; brazo libre apoyado en la cadera',
      'Primero un lado y luego el otro',
    ],
  },
  {
    id: 'sup-6', name: 'Puente de Glúteos',
    description: 'Puente isométrico boca arriba. Glúteos y core.',
    category: 'Core', routine: 'superior', reps: '30–40 seg', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 4, photoPosition: 'bottom',
    tips: [
      'Colócate boca arriba y eleva glúteos y cadera',
      'Espalda neutra',
      'Apoya tus talones, no la planta del pie',
      'Mantén el cuello relajado y mirada hacia arriba',
    ],
  },
  {
    id: 'sup-7', name: 'Plancha con Toque de Hombros',
    description: 'Plancha dinámica alternando toque de hombro. Anti-rotación.',
    category: 'Core', routine: 'superior', reps: '30–40 seg', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 5, photoPosition: 'top',
    tips: [
      'Boca abajo en plancha, palmas en suelo',
      'Con una mano toca el hombro contrario, alternando',
      'Cuerpo completamente alineado, evitando balanceos',
      'Manos a la altura de los hombros, pies separados',
    ],
  },
  {
    id: 'sup-8', name: 'Plancha Lateral con Apertura de Pierna',
    description: 'Plancha lateral con elevación de pierna. Glúteo y core lateral.',
    category: 'Core', routine: 'superior', reps: '30–40 seg', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 5, photoPosition: 'bottom',
    tips: [
      'Mantén la cadera elevada sin que caiga al abrir la pierna',
      'Codo apoyado en el suelo a la altura del hombro',
      'Tobillo, cadera y hombros alineados',
      'Mirada al frente y eleva la pierna exterior',
      'Primero un lado y luego el otro',
    ],
  },
  {
    id: 'sup-9', name: 'Puente de Glúteos Elevando Pierna',
    description: 'Puente unilateral alternando pierna. Mayor activación glútea.',
    category: 'Core', routine: 'superior', reps: '30–40 seg', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 6, photoPosition: 'top',
    tips: [
      'Boca arriba, eleva glúteos y cadera sin dejarla caer',
      'Apoya tus talones, no la planta del pie',
      'Eleva una pierna y luego la otra, alternando',
    ],
  },
  {
    id: 'sup-10', name: 'Dead Bug (La Cucaracha)',
    description: 'Coordinación brazo–pierna contralateral. Estabilización lumbar.',
    category: 'Core', routine: 'superior', reps: '10 reps c/pierna y brazo', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 6, photoPosition: 'bottom',
    tips: [
      'Boca arriba con espalda apoyada en el suelo',
      'Inicia con las 2 piernas a 90 grados y brazos hacia el frente',
      'Extiende mano y pierna contraria',
    ],
  },
  {
    id: 'sup-11', name: 'Lumbares',
    description: 'Superman en cuadrupedia. Erector espinal y glúteo.',
    category: 'Core', routine: 'superior', reps: '10–20 repeticiones', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 7, photoPosition: 'top',
    tips: [
      'Colócate a 4 patas',
      'Extiende un brazo y la pierna contraria alternando',
      'Subir pierna hasta altura de la cadera y el brazo hasta la altura del hombro',
    ],
  },
  {
    id: 'sup-12', name: 'Lumbares (Progresión)',
    description: 'Superman con toque codo–rodilla. Versión más desafiante.',
    category: 'Core', routine: 'superior', reps: '10 reps c/pierna y brazo', series: 2,
    pdfFile: 'tronco-superior', pdfPage: 7, photoPosition: 'bottom',
    tips: [
      'Mismo ejercicio pero primero con la misma pierna y el mismo brazo tocando codo con rodilla',
      'Luego cambiar pierna y brazo',
    ],
  },
  // ── FUERZA EN CASA ───────────────────────────────────────────────────────
  {
    id: 'casa-1', name: 'Flexión Plantar',
    description: 'Empuje del antepié contra banda elástica. Gastrocnemio y sóleo.',
    category: 'Pie', routine: 'casa', reps: '8 reps por pie', series: 2,
    pdfFile: 'en-casa', pdfPage: 2, photoPosition: 'top',
    tips: [
      'Siéntate o apóyate en una superficie estable',
      'Coloca una banda elástica alrededor del antepié y sujétala',
      'Empuja la punta del pie hacia abajo de forma controlada',
      'Vuelve lentamente a la posición inicial, evitando rebotes',
    ],
  },
  {
    id: 'casa-2', name: 'Flexión Dorsal',
    description: 'Lleva el pie hacia la tibia con banda. Tibial anterior.',
    category: 'Pie', routine: 'casa', reps: '8 reps por pie', series: 2,
    pdfFile: 'en-casa', pdfPage: 2, photoPosition: 'bottom',
    tips: [
      'Coloca una banda elástica en un sitio fijo',
      'Introduce el pie en la banda y colócala en el empeine',
      'Lleva el pie hacia la tibia de forma controlada',
      'Vuelve lentamente a la posición inicial, evitando rebotes',
    ],
  },
  {
    id: 'casa-3', name: 'Aducción de Pie',
    description: 'Desliza el pie hacia dentro con banda. Tibial posterior e intrínsecos.',
    category: 'Pie', routine: 'casa', reps: '8 reps por pie', series: 2,
    pdfFile: 'en-casa', pdfPage: 3, photoPosition: 'top',
    tips: [
      'Coloca una banda elástica en un sitio fijo',
      'Desliza el pie desde fuera hacia dentro, generando tensión en la banda',
      'Mantén la planta del pie en contacto con el suelo durante el ejercicio',
    ],
  },
  {
    id: 'casa-4', name: 'Abducción de Pie',
    description: 'Desliza el pie hacia afuera con banda. Peroneo corto y largo.',
    category: 'Pie', routine: 'casa', reps: '8 reps por pie', series: 2,
    pdfFile: 'en-casa', pdfPage: 3, photoPosition: 'bottom',
    tips: [
      'Coloca una banda elástica en un sitio fijo',
      'Desliza el pie desde dentro hacia afuera, generando tensión en la banda',
      'Mantén la planta del pie en contacto con el suelo durante el ejercicio',
    ],
  },
  {
    id: 'casa-5', name: 'Gemelos',
    description: 'Elevación de talones en escalón unilateral. Tendón de Aquiles.',
    category: 'Pierna', routine: 'casa', reps: '8 reps por pierna', series: 2,
    pdfFile: 'en-casa', pdfPage: 4, photoPosition: 'top',
    tips: [
      'Coloca la punta de los pies en un escalón o superficie elevada',
      'Eleva el cuerpo subiendo de puntillas y baja lentamente con una sola pierna',
      'Controla el movimiento en todo el rango posible',
      'Aumenta progresivamente la carga para fortalecer el tendón de Aquiles',
    ],
  },
  {
    id: 'casa-6', name: 'Sóleos',
    description: 'Elevación de talones con rodilla flexionada. Sóleo y gastrocnemio.',
    category: 'Pierna', routine: 'casa', reps: '10 reps por pierna', series: 2,
    pdfFile: 'en-casa', pdfPage: 4, photoPosition: 'bottom',
    tips: [
      'Comienza con las dos piernas apoyadas, doblando ligeramente la rodilla',
      'Eleva los talones lentamente y desciende de forma controlada',
    ],
  },
  {
    id: 'casa-7', name: 'Elevaciones para Glúteo Medio',
    description: 'Subida lateral en escalón unilateral. Glúteo medio e isquiotibiales.',
    category: 'Glúteo', routine: 'casa', reps: '8 reps por pierna', series: 2,
    pdfFile: 'en-casa', pdfPage: 5, photoPosition: 'top',
    tips: [
      'Coloca un pie en un escalón o superficie elevada',
      'Con la pierna de apoyo, empuja el cuerpo hacia arriba mientras la otra pierna queda en el aire',
      'Baja de forma controlada hasta la posición inicial',
    ],
  },
  {
    id: 'casa-8', name: 'Rotación Externa de Cadera',
    description: 'Apertura de cadera con banda lateral. Glúteo medio y menor.',
    category: 'Cadera', routine: 'casa', reps: '6–8 reps por lado', series: 2,
    pdfFile: 'en-casa', pdfPage: 5, photoPosition: 'bottom',
    tips: [
      'Desde la posición lateral, mantén los tobillos juntos y abre la rodilla superior',
      'Realiza una apertura controlada',
      'Mantén la posición unos segundos y vuelve lentamente a la posición inicial',
    ],
  },
  {
    id: 'casa-9', name: 'Aducción de Cadera',
    description: 'Cierre de pierna hacia el centro con banda. Aductores.',
    category: 'Cadera', routine: 'casa', reps: '8 repeticiones', series: 2,
    pdfFile: 'en-casa', pdfPage: 6, photoPosition: 'top',
    tips: [
      'Desde una posición abierta, cruza la pierna hacia el centro del cuerpo',
      'Mantén el movimiento lento y controlado, sin rebotes',
      'Busca el máximo recorrido con tensión sostenida',
    ],
  },
  {
    id: 'casa-10', name: 'Abducción de Cadera',
    description: 'Apertura de pierna con banda. Glúteo medio y estabilizadores.',
    category: 'Cadera', routine: 'casa', reps: '6–8 repeticiones', series: 2,
    pdfFile: 'en-casa', pdfPage: 6, photoPosition: 'bottom',
    tips: [
      'Aleja la pierna del eje central del cuerpo de forma lenta y controlada',
      'Mantén la tensión en la banda',
      'Busca el máximo recorrido con tensión, sin perder la técnica',
      'Usa resistencia baja para empezar, el glúteo medio suele estar débil',
    ],
  },
  {
    id: 'casa-11', name: 'Glúteo Mayor',
    description: 'Patada trasera con pierna flexionada boca abajo. Glúteo mayor.',
    category: 'Glúteo', routine: 'casa', reps: '6–8 repeticiones', series: 2,
    pdfFile: 'en-casa', pdfPage: 7, photoPosition: 'top',
    tips: [
      'Acostado boca abajo, eleva la pierna flexionada 90° hacia arriba de forma lenta',
      'Fíjate en mantener la pelvis pegada al suelo durante todo el movimiento',
      'Baja despacio, controlando el descenso',
    ],
  },
  {
    id: 'casa-12', name: 'Isquiotibiales',
    description: 'Curl con discos deslizantes desde puente de glúteos. Isquiotibiales.',
    category: 'Pierna', routine: 'casa', reps: '6–8 repeticiones', series: 2,
    pdfFile: 'en-casa', pdfPage: 7, photoPosition: 'bottom',
    tips: [
      'Eleva la cadera formando un puente de glúteos',
      'Extiende lentamente las piernas deslizando los talones hacia delante',
      'Vuelve a flexionar las piernas para regresar a la posición inicial',
      'Empieza isométrico: mantén cadera elevada y talones cerca del glúteo 20–30 s',
    ],
  },
  {
    id: 'casa-13', name: 'Sentadillas (Cuádriceps)',
    description: 'Sentadilla lenta con 6 segundos de bajada y subida. Cuádriceps y glúteos.',
    category: 'Pierna', routine: 'casa', reps: '10 repeticiones', series: 2,
    pdfFile: 'en-casa', pdfPage: 8, photoPosition: 'single',
    tips: [
      'Pies separados al ancho de las caderas, ligeramente orientados hacia afuera',
      'Rodillas alineadas con la punta de los pies',
      'Baja de forma controlada durante 6 segundos; sube en otros 6 segundos',
      'Mantén la tensión constante en piernas y core durante todo el movimiento',
    ],
  },
];

export function getStrengthLibrary(): StrengthExercise[] {
  if (!isBrowser()) return DEFAULT_STRENGTH_LIBRARY;
  initDB();
  const data = localStorage.getItem(KEY_STRENGTH_LIBRARY);
  return data ? JSON.parse(data) : DEFAULT_STRENGTH_LIBRARY;
}

export function saveStrengthLibrary(exercises: StrengthExercise[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_STRENGTH_LIBRARY, JSON.stringify(exercises));
}

export function getNotifications(): NotificationEntry[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(KEY_NOTIFICATIONS);
  return data ? JSON.parse(data) : [];
}

export function saveNotifications(notifs: NotificationEntry[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(notifs));
  pushNotificationsToSupabase(notifs).catch(() => {});
}

export function getAthleteNotifications(): AthleteNotificationEntry[] {
  if (!isBrowser()) return [];
  const data = localStorage.getItem(KEY_ATHLETE_NOTIFICATIONS);
  return data ? JSON.parse(data) : [];
}

export function saveAthleteNotifications(notifs: AthleteNotificationEntry[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_ATHLETE_NOTIFICATIONS, JSON.stringify(notifs));
  pushAthleteNotificationsToSupabase(notifs).catch(() => {});
}

// ── SUPABASE SYNC ─────────────────────────────────────────────────────────────

async function pushAthletesToSupabase(athletes: Athlete[]) {
  if (!isBrowser()) return;
  const rows = athletes.map(a => ({
    id: a.id, name: a.name, age: a.age, sport: a.sport, goal: a.goal,
    email: a.email || null, phone: a.phone || null, active: a.active,
    joined_at: a.joinedAt, username: a.username || null, password: a.password || null,
    zone1: a.zone1 || null, zone2: a.zone2 || null, zone3: a.zone3 || null,
    gender: a.gender, status: a.status, start_of_week_day: a.startOfWeekDay || null,
    personal_bests: a.personalBests || null, goals: a.goals || [],
  }));
  await supabase.from('athletes').upsert(rows);
  const ids = athletes.map(a => a.id);
  if (ids.length > 0) {
    const { data: existing } = await supabase.from('athletes').select('id');
    const toDelete = (existing || []).map((r: { id: string }) => r.id).filter((id: string) => !ids.includes(id));
    if (toDelete.length > 0) await supabase.from('athletes').delete().in('id', toDelete);
  }
}

async function pushPlansToSupabase(plans: TrainingPlan[]) {
  if (!isBrowser()) return;
  const rows = plans.map(p => ({
    id: p.id, name: p.name, athlete_id: p.athleteId,
    start_date: p.startDate, end_date: p.endDate,
    weeks: p.weeks, created_at: p.createdAt,
  }));
  if (rows.length > 0) await supabase.from('training_plans').upsert(rows);
  const ids = plans.map(p => p.id);
  const { data: existing } = await supabase.from('training_plans').select('id');
  const toDelete = (existing || []).map((r: { id: string }) => r.id).filter((id: string) => !ids.includes(id));
  if (toDelete.length > 0) await supabase.from('training_plans').delete().in('id', toDelete);
}

async function pushCoachProfileToSupabase(profile: CoachProfile) {
  if (!isBrowser()) return;
  await supabase.from('coach_profile').upsert({
    id: 1, name: profile.name, age: profile.age,
    phone: profile.phone, email: profile.email, photo: profile.photo || null,
  });
}

async function pushNotificationsToSupabase(notifs: NotificationEntry[]) {
  if (!isBrowser() || notifs.length === 0) return;
  const rows = notifs.map(n => ({
    id: n.id, athlete_id: n.athleteId, athlete_name: n.athleteName,
    plan_id: n.planId, day_id: n.dayId, day_label: n.dayLabel,
    comments: n.comments || null, feeling_rating: n.feelingRating,
    feeling_emoji: n.feelingEmoji, created_at: n.createdAt, read: n.read,
  }));
  await supabase.from('notifications').upsert(rows);
}

async function pushAthleteNotificationsToSupabase(notifs: AthleteNotificationEntry[]) {
  if (!isBrowser() || notifs.length === 0) return;
  const rows = notifs.map(n => ({
    id: n.id, athlete_id: n.athleteId, plan_id: n.planId,
    day_id: n.dayId, day_label: n.dayLabel, text: n.text,
    created_at: n.createdAt, read: n.read,
  }));
  await supabase.from('athlete_notifications').upsert(rows);
}

export async function syncFromSupabase(): Promise<void> {
  if (!isBrowser()) return;
  try {
    const [
      { data: athletes },
      { data: plans },
      { data: coachData },
      { data: notifs },
      { data: athleteNotifs },
    ] = await Promise.all([
      supabase.from('athletes').select('*'),
      supabase.from('training_plans').select('*'),
      supabase.from('coach_profile').select('*').eq('id', 1).maybeSingle(),
      supabase.from('notifications').select('*'),
      supabase.from('athlete_notifications').select('*'),
    ]);

    if (athletes && athletes.length > 0) {
      const mapped: Athlete[] = athletes.map((a: Record<string, unknown>) => ({
        id: a.id as string, name: a.name as string, age: a.age as number,
        sport: a.sport as string, goal: a.goal as string,
        email: a.email as string | undefined, phone: a.phone as string | undefined,
        active: a.active as boolean, joinedAt: a.joined_at as string,
        username: a.username as string | undefined, password: a.password as string | undefined,
        zone1: a.zone1 as string | undefined, zone2: a.zone2 as string | undefined,
        zone3: a.zone3 as string | undefined, gender: a.gender as 'hombre' | 'mujer',
        status: a.status as 'por_trabajar' | 'trabajando' | 'activo',
        startOfWeekDay: a.start_of_week_day as Athlete['startOfWeekDay'],
        personalBests: a.personal_bests as Athlete['personalBests'],
        goals: (a.goals as Athlete['goals']) || [],
      }));
      localStorage.setItem(KEY_ATHLETES, JSON.stringify(mapped));
    }

    if (plans && plans.length > 0) {
      const mapped: TrainingPlan[] = plans.map((p: Record<string, unknown>) => ({
        id: p.id as string, name: p.name as string, athleteId: p.athlete_id as string,
        startDate: p.start_date as string, endDate: p.end_date as string,
        weeks: p.weeks as TrainingPlan['weeks'], createdAt: p.created_at as string,
      }));
      localStorage.setItem(KEY_PLANS, JSON.stringify(mapped));
    }

    if (coachData) {
      const profile: CoachProfile = {
        name: (coachData as Record<string, unknown>).name as string,
        age: (coachData as Record<string, unknown>).age as number,
        phone: (coachData as Record<string, unknown>).phone as string,
        email: (coachData as Record<string, unknown>).email as string,
        photo: ((coachData as Record<string, unknown>).photo as string) || '',
      };
      localStorage.setItem(KEY_COACH, JSON.stringify(profile));
    }

    if (notifs && notifs.length > 0) {
      const mapped: NotificationEntry[] = notifs.map((n: Record<string, unknown>) => ({
        id: n.id as string, athleteId: n.athlete_id as string,
        athleteName: n.athlete_name as string, planId: n.plan_id as string,
        dayId: n.day_id as string, dayLabel: n.day_label as string,
        comments: n.comments as string | undefined,
        feelingRating: n.feeling_rating as number, feelingEmoji: n.feeling_emoji as string,
        createdAt: n.created_at as string, read: n.read as boolean,
      }));
      localStorage.setItem(KEY_NOTIFICATIONS, JSON.stringify(mapped));
    }

    if (athleteNotifs && athleteNotifs.length > 0) {
      const mapped: AthleteNotificationEntry[] = athleteNotifs.map((n: Record<string, unknown>) => ({
        id: n.id as string, athleteId: n.athlete_id as string,
        planId: n.plan_id as string, dayId: n.day_id as string,
        dayLabel: n.day_label as string, text: n.text as string,
        createdAt: n.created_at as string, read: n.read as boolean,
      }));
      localStorage.setItem(KEY_ATHLETE_NOTIFICATIONS, JSON.stringify(mapped));
    }
  } catch {
    // Fail silently — app falls back to localStorage data
  }
}

export function addReplyToSession(planId: string, dayId: string, reply: CommentReply) {
  if (!isBrowser()) return;
  const plans = getPlans();
  const updatedPlans = plans.map(plan => {
    if (plan.id === planId) {
      const updatedWeeks = plan.weeks.map(week => {
        const updatedDays = week.days.map(day => {
          if (day.id === dayId) {
            const currentFeedback = day.feedback || {
              completed: true,
              feelingRating: 3,
              feelingEmoji: '😐',
              comments: '',
              loggedAt: new Date().toISOString().split('T')[0]
            };
            return {
              ...day,
              feedback: {
                ...currentFeedback,
                replies: [...(currentFeedback.replies || []), reply]
              }
            };
          }
          return day;
        });
        return { ...week, days: updatedDays };
      });
      return { ...plan, weeks: updatedWeeks };
    }
    return plan;
  });
  savePlans(updatedPlans);
}


