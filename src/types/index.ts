export interface Exercise {
  id: number;
  name: string;
  category: string;
  muscle_group: string;
}

export interface WorkoutSet {
  id: number;
  workout_log_id: number;
  exercise_id: number;
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

export interface WorkoutLog {
  id: number;
  date: string;
  title: string;
  notes: string | null;
  duration_minutes: number | null;
  sets?: WorkoutSet[];
}

export interface Routine {
  id: number;
  name: string;
  description: string | null;
  exercises?: RoutineExercise[];
}

export interface RoutineExercise {
  id: number;
  routine_id: number;
  exercise_id: number;
  exercise_name: string;
  order_index: number;
  target_sets: number;
  target_reps: number | null;
  target_weight: number | null;
}

export type RootStackParamList = {
  MainTabs: undefined;
  WorkoutDetail: { logId: number };
  WorkoutEdit: { logId?: number; date?: string };
  RoutineDetail: { routineId: number };
  RoutineEdit: { routineId?: number };
  StartWorkout: { routineId?: number };
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Stats: undefined;
  Routines: undefined;
};
