import * as SQLite from 'expo-sqlite';
import { WorkoutLog, WorkoutSet, Routine, RoutineExercise, Exercise } from '../types';

const db = SQLite.openDatabaseSync('workout.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      muscle_group TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      duration_minutes INTEGER
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL,
      exercise_id INTEGER,
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight REAL,
      reps INTEGER,
      duration_seconds INTEGER,
      notes TEXT,
      FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      exercise_id INTEGER,
      exercise_name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      target_sets INTEGER NOT NULL DEFAULT 3,
      target_reps INTEGER,
      target_weight REAL,
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
    );
  `);

  // Seed default exercises if empty
  const count = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (count?.count === 0) {
    seedExercises();
  }
}

function seedExercises() {
  const exercises = [
    ['벤치프레스', '가슴', '가슴'],
    ['인클라인 벤치프레스', '가슴', '상부 가슴'],
    ['덤벨 플라이', '가슴', '가슴'],
    ['스쿼트', '하체', '대퇴사두'],
    ['레그프레스', '하체', '대퇴사두'],
    ['런지', '하체', '하체 전체'],
    ['데드리프트', '등', '등 전체'],
    ['풀업', '등', '광배근'],
    ['바벨로우', '등', '광배근'],
    ['오버헤드프레스', '어깨', '어깨'],
    ['사이드 레터럴 레이즈', '어깨', '측면 어깨'],
    ['바벨 컬', '팔', '이두'],
    ['트라이셉스 푸시다운', '팔', '삼두'],
    ['플랭크', '코어', '복근'],
    ['크런치', '코어', '복근'],
    ['달리기', '유산소', '전신'],
    ['자전거', '유산소', '하체'],
  ];

  for (const [name, category, muscle_group] of exercises) {
    db.runSync(
      'INSERT INTO exercises (name, category, muscle_group) VALUES (?, ?, ?)',
      [name, category, muscle_group]
    );
  }
}

// Workout Logs
export function getWorkoutLogs(): WorkoutLog[] {
  return db.getAllSync<WorkoutLog>(
    'SELECT * FROM workout_logs ORDER BY date DESC'
  );
}

export function getWorkoutLogsByDate(date: string): WorkoutLog[] {
  return db.getAllSync<WorkoutLog>(
    'SELECT * FROM workout_logs WHERE date = ? ORDER BY id DESC',
    [date]
  );
}

export function getWorkoutLogWithSets(logId: number): WorkoutLog | null {
  const log = db.getFirstSync<WorkoutLog>(
    'SELECT * FROM workout_logs WHERE id = ?',
    [logId]
  );
  if (!log) return null;

  log.sets = db.getAllSync<WorkoutSet>(
    'SELECT * FROM workout_sets WHERE workout_log_id = ? ORDER BY exercise_name, set_number',
    [logId]
  );
  return log;
}

export function createWorkoutLog(
  date: string,
  title: string,
  notes?: string,
  durationMinutes?: number
): number {
  const result = db.runSync(
    'INSERT INTO workout_logs (date, title, notes, duration_minutes) VALUES (?, ?, ?, ?)',
    [date, title, notes ?? null, durationMinutes ?? null]
  );
  return result.lastInsertRowId;
}

export function updateWorkoutLog(
  id: number,
  title: string,
  notes?: string,
  durationMinutes?: number
) {
  db.runSync(
    'UPDATE workout_logs SET title = ?, notes = ?, duration_minutes = ? WHERE id = ?',
    [title, notes ?? null, durationMinutes ?? null, id]
  );
}

export function deleteWorkoutLog(id: number) {
  db.runSync('DELETE FROM workout_logs WHERE id = ?', [id]);
}

// Workout Sets
export function addWorkoutSet(
  workoutLogId: number,
  exerciseName: string,
  setNumber: number,
  weight?: number,
  reps?: number,
  durationSeconds?: number,
  notes?: string,
  exerciseId?: number
): number {
  const result = db.runSync(
    `INSERT INTO workout_sets
      (workout_log_id, exercise_id, exercise_name, set_number, weight, reps, duration_seconds, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      workoutLogId,
      exerciseId ?? null,
      exerciseName,
      setNumber,
      weight ?? null,
      reps ?? null,
      durationSeconds ?? null,
      notes ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export function updateWorkoutSet(
  id: number,
  weight?: number,
  reps?: number,
  durationSeconds?: number,
  notes?: string
) {
  db.runSync(
    'UPDATE workout_sets SET weight = ?, reps = ?, duration_seconds = ?, notes = ? WHERE id = ?',
    [weight ?? null, reps ?? null, durationSeconds ?? null, notes ?? null, id]
  );
}

export function deleteWorkoutSet(id: number) {
  db.runSync('DELETE FROM workout_sets WHERE id = ?', [id]);
}

export function deleteSetsByLogAndExercise(logId: number, exerciseName: string) {
  db.runSync(
    'DELETE FROM workout_sets WHERE workout_log_id = ? AND exercise_name = ?',
    [logId, exerciseName]
  );
}

// Routines
export function getRoutines(): Routine[] {
  return db.getAllSync<Routine>('SELECT * FROM routines ORDER BY name');
}

export function getRoutineWithExercises(routineId: number): Routine | null {
  const routine = db.getFirstSync<Routine>(
    'SELECT * FROM routines WHERE id = ?',
    [routineId]
  );
  if (!routine) return null;

  routine.exercises = db.getAllSync<RoutineExercise>(
    'SELECT * FROM routine_exercises WHERE routine_id = ? ORDER BY order_index',
    [routineId]
  );
  return routine;
}

export function createRoutine(name: string, description?: string): number {
  const result = db.runSync(
    'INSERT INTO routines (name, description) VALUES (?, ?)',
    [name, description ?? null]
  );
  return result.lastInsertRowId;
}

export function updateRoutine(id: number, name: string, description?: string) {
  db.runSync(
    'UPDATE routines SET name = ?, description = ? WHERE id = ?',
    [name, description ?? null, id]
  );
}

export function deleteRoutine(id: number) {
  db.runSync('DELETE FROM routines WHERE id = ?', [id]);
}

export function addRoutineExercise(
  routineId: number,
  exerciseName: string,
  orderIndex: number,
  targetSets: number,
  targetReps?: number,
  targetWeight?: number,
  exerciseId?: number
): number {
  const result = db.runSync(
    `INSERT INTO routine_exercises
      (routine_id, exercise_id, exercise_name, order_index, target_sets, target_reps, target_weight)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [routineId, exerciseId ?? null, exerciseName, orderIndex, targetSets, targetReps ?? null, targetWeight ?? null]
  );
  return result.lastInsertRowId;
}

export function deleteRoutineExercise(id: number) {
  db.runSync('DELETE FROM routine_exercises WHERE id = ?', [id]);
}

// Exercises
export function getExercises(): Exercise[] {
  return db.getAllSync<Exercise>('SELECT * FROM exercises ORDER BY category, name');
}

export function searchExercises(query: string): Exercise[] {
  return db.getAllSync<Exercise>(
    'SELECT * FROM exercises WHERE name LIKE ? OR muscle_group LIKE ? ORDER BY name',
    [`%${query}%`, `%${query}%`]
  );
}

// Stats
export function getWorkoutDates(): string[] {
  const rows = db.getAllSync<{ date: string }>('SELECT DISTINCT date FROM workout_logs ORDER BY date');
  return rows.map(r => r.date);
}

export function getMonthlyWorkoutCount(year: number, month: number): number {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const result = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(DISTINCT date) as count FROM workout_logs WHERE date LIKE ?",
    [`${monthStr}%`]
  );
  return result?.count ?? 0;
}

export function getExerciseHistory(exerciseName: string): { date: string; max_weight: number; total_volume: number }[] {
  return db.getAllSync(
    `SELECT wl.date,
      MAX(ws.weight) as max_weight,
      SUM(ws.weight * ws.reps) as total_volume
    FROM workout_sets ws
    JOIN workout_logs wl ON ws.workout_log_id = wl.id
    WHERE ws.exercise_name = ? AND ws.weight IS NOT NULL
    GROUP BY wl.date
    ORDER BY wl.date ASC`,
    [exerciseName]
  );
}

export function getRecentVolume(days: number): { date: string; volume: number }[] {
  return db.getAllSync(
    `SELECT wl.date,
      SUM(COALESCE(ws.weight, 0) * COALESCE(ws.reps, 1)) as volume
    FROM workout_logs wl
    LEFT JOIN workout_sets ws ON ws.workout_log_id = wl.id
    WHERE wl.date >= date('now', '-' || ? || ' days')
    GROUP BY wl.date
    ORDER BY wl.date ASC`,
    [days]
  );
}

export function getMuscleGroupStats(): { muscle_group: string; count: number }[] {
  return db.getAllSync(
    `SELECT ws.exercise_name AS muscle_group,
      COUNT(*) as count
    FROM workout_sets ws
    GROUP BY ws.exercise_name
    ORDER BY count DESC
    LIMIT 10`
  );
}
