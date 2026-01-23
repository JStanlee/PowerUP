
export enum GoalType {
  GYM = 'Siłownia (ogólny)',
  FOOTBALL = 'Piłka nożna',
  TENIS = 'Tenis',
  PADEL = 'Padel',
  BASKETBALL = 'Koszykówka',
  RUNNING = 'Bieganie',
  CYCLING = 'Rower',
  STRENGTH = 'Siła maksymalna',
  HYPERTROPHY = 'Masa mięśniowa',
  BOXING = 'Boks / MMA',
  CROSSFIT = 'Crossfit',
  SWIMMING = 'Pływanie',
  YOGA = 'Joga / Mobility'
}

export enum PlanType {
  AI_ADVISOR = 'Doradca AI',
  FBW = 'Full Body Workout',
  PPL = 'Push Pull Legs',
  SPLIT = 'Split',
  HOME_BODYWEIGHT = 'Trening Domowy',
  CARDIO = 'Cardio'
}

export type Gender = 'mężczyzna' | 'kobieta' | 'nie chcę podawać';
export type Language = 'pl' | 'en';

export interface SetLog {
  reps: number;
  weight: number;
  difficulty: number;
  rpe?: number;
  completed: boolean;
  restTime?: number;
  durationMinutes?: number;
}

export interface ExerciseLog {
  id: string;
  name: string;
  muscleGroup: string;
  type?: 'STRENGTH' | 'CARDIO';
  isBodyweight?: boolean;
  isTimed?: boolean;
  sets: SetLog[];
}

export interface WarmupExercise {
  name: string;
  duration: string;
  instructions: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  goal: GoalType;
  planType?: PlanType;
  workoutTitle?: string;
  exercises: ExerciseLog[];
  warmup: WarmupExercise[];
  warmupCompleted: boolean;
  swapsUsed: number;
  visualsUsed: number;
  tipsUsed: number;
  note?: string;
  durationSeconds?: number;
}

export interface GymRatStatus {
  name: string;
  energy: number;
  level: number;
  xp: number;
  lastUpdate: string;
}

export interface UserProfile {
  name: string;
  gender: Gender;
  goal: GoalType;
  goalDescription: string;
  age: number;
  weight: number;
  height: number;
  injuries: string;
  level: 'początkujący' | 'średniozaawansowany' | 'zaawansowany';
  trainingFrequency: number;
  preferredDays: number[];
  onboarded: boolean;
  isPro: boolean;
  hapticsEnabled: boolean; // Nowe pole
  defaultPlan?: PlanType;
  gymRat: GymRatStatus;
  language: Language;
  preferredRestTime?: number;
  lastPlanType?: PlanType;
  weightHistory: {date: string, weight: number}[];
}

export interface AppState {
  profile: UserProfile | null;
  history: WorkoutSession[];
  activeWorkout: WorkoutSession | null;
}
