export type Exercise = {
  id: number;
  name: string;
  category: string;
  muscle_group: string;
}

export type WorkoutSet = {
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

export type WorkoutLog = {
  id: number;
  date: string;
  title: string;
  notes: string | null;
  duration_minutes: number | null;
  sets?: WorkoutSet[];
}

export type Routine = {
  id: number;
  name: string;
  description: string | null;
  exercises?: RoutineExercise[];
}

export type RoutineExercise = {
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
  WorkoutEdit: { logId?: number; date?: string; routineId?: number };
  RoutineDetail: { routineId: number };
  RoutineEdit: { routineId?: number };
  StartWorkout: { routineId?: number };
  ExerciseHistory: { exerciseName: string };
  ActiveWorkout: { routineId?: number; exercises?: string[] };
};

export type MainTabParamList = {
  Home: undefined;
  StartWorkout: undefined;
  Routines: undefined;
  Stats: undefined;
  Calendar: undefined;
};
