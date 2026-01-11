
export enum GoalType {
  GYM = 'Siłownia (ogólny)',
  FOOTBALL = 'Piłka nożna',
  TENIS = 'Tenis',
  PADEL = 'Padel',
  BASKETBALL = 'Koszykówka',
  RUNNING = 'Bieganie',
  CYCLING = 'Rower',
  STRENGTH = 'Siła maksymalna',
  HYPERTROPHY = 'Masa mięśniowa'
}

export interface SetLog {
  reps: number;
  weight: number;
  difficulty: number; // 1-5 scale
  completed: boolean;
}

export interface ExerciseLog {
  id: string;
  name: string;
  type?: 'STRENGTH' | 'CARDIO';
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  goal: GoalType;
  exercises: ExerciseLog[];
  note?: string;
}

export interface UserProfile {
  name: string;
  goal: GoalType;
  goalDescription: string;
  age: number;
  weight: number;
  height: number;
  injuries: string;
  level: 'początkujący' | 'średniozaawansowany' | 'zaawansowany';
  onboarded: boolean;
}

export interface AppState {
  profile: UserProfile | null;
  history: WorkoutSession[];
  activeWorkout: WorkoutSession | null;
}
