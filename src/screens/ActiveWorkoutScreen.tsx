import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  addWorkoutSet,
  createWorkoutLog,
  getLastSetsForExercise,
  getRoutineWithExercises,
  searchExercises,
} from '../db/database';
import { Exercise, RootStackParamList } from '../types';

// 다크 테마 전용 색상
const DC = {
  background: '#0F0F0F',
  surface: '#1C1C1C',
  surface2: '#2A2A2A',
  primary: '#FFD600',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2E2E2E',
  completedBg: '#FFD60015',
};

const REST_DEFAULT = 90; // seconds

type Route = RouteProp<RootStackParamList, 'ActiveWorkout'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type SetEntry = {
  id: string; // 로컬 고유 키
  weight: string;
  reps: string;
  completed: boolean;
};

type LastSet = {
  set_number: number;
  weight: number | null;
  reps: number | null;
};

type ExerciseEntry = {
  id: string; // 로컬 고유 키
  name: string;
  sets: SetEntry[];
  lastSets: LastSet[];
};

let _idCounter = 0;
function uid(): string {
  _idCounter += 1;
  return String(_idCounter);
}

function buildExerciseEntry(name: string): ExerciseEntry {
  const lastSets = getLastSetsForExercise(name);
  const initialSets: SetEntry[] = lastSets.length > 0
    ? lastSets.map(() => ({ id: uid(), weight: '', reps: '', completed: false }))
    : [{ id: uid(), weight: '', reps: '', completed: false }];
  return { id: uid(), name, sets: initialSets, lastSets };
}

// ------ 휴식 타이머 모달 ------
type RestTimerModalProps = {
  visible: boolean;
  onClose: () => void;
};

function RestTimerModal({ visible, onClose }: RestTimerModalProps) {
  const [remaining, setRemaining] = useState(REST_DEFAULT);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setRemaining(REST_DEFAULT);
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            // 타이머 종료 시 자동 닫기
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const progress = remaining / REST_DEFAULT; // 1 → 0

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={restStyles.overlay}>
        <View style={restStyles.card}>
          <Text style={restStyles.label}>휴식 중</Text>
          <Text style={restStyles.time}>{timeStr}</Text>
          {/* 진행 바 */}
          <View style={restStyles.barBg}>
            <View style={[restStyles.barFill, { width: `${progress * 100}%` }]} />
          </View>
          <TouchableOpacity style={restStyles.skipBtn} onPress={onClose}>
            <Text style={restStyles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const restStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: DC.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: 280,
  },
  label: { fontSize: 14, color: DC.textSecondary, marginBottom: 8 },
  time: { fontSize: 56, fontWeight: '700', color: DC.primary, marginBottom: 24 },
  barBg: {
    width: '100%',
    height: 6,
    backgroundColor: DC.surface2,
    borderRadius: 3,
    marginBottom: 24,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: DC.primary,
    borderRadius: 3,
  },
  skipBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: DC.surface2,
    borderRadius: 24,
  },
  skipText: { fontSize: 16, color: DC.text, fontWeight: '600' },
});

// ------ 운동 카드 ------
type ExerciseCardProps = {
  entry: ExerciseEntry;
  onAddSet: () => void;
  onCompleteSet: (setIdx: number) => void;
  onWeightChange: (setIdx: number, value: string) => void;
  onRepsChange: (setIdx: number, value: string) => void;
};

function ExerciseCard({
  entry,
  onAddSet,
  onCompleteSet,
  onWeightChange,
  onRepsChange,
}: ExerciseCardProps) {
  return (
    <View style={cardStyles.container}>
      <Text style={cardStyles.name}>{entry.name}</Text>

      {/* 헤더 행 */}
      <View style={cardStyles.headerRow}>
        <Text style={[cardStyles.colSet, cardStyles.headerText]}>세트</Text>
        <Text style={[cardStyles.colPrev, cardStyles.headerText]}>이전</Text>
        <Text style={[cardStyles.colInput, cardStyles.headerText]}>무게(kg)</Text>
        <Text style={[cardStyles.colInput, cardStyles.headerText]}>횟수</Text>
        <View style={cardStyles.colCheck} />
      </View>

      {entry.sets.map((s, setIdx) => {
        const prev = entry.lastSets[setIdx];
        const prevText = prev
          ? `${prev.weight ?? '-'}×${prev.reps ?? '-'}`
          : '-';
        return (
          <View
            key={s.id}
            style={[cardStyles.setRow, s.completed && cardStyles.setRowDone]}
          >
            <Text style={[cardStyles.colSet, cardStyles.setNum]}>{setIdx + 1}</Text>
            <Text style={[cardStyles.colPrev, cardStyles.prevText]}>{prevText}</Text>
            <TextInput
              style={[cardStyles.colInput, cardStyles.input, s.completed && cardStyles.inputDone]}
              value={s.weight}
              onChangeText={(v) => onWeightChange(setIdx, v)}
              keyboardType="decimal-pad"
              placeholder={prev?.weight != null ? String(prev.weight) : '0'}
              placeholderTextColor={DC.textSecondary}
              editable={!s.completed}
            />
            <TextInput
              style={[cardStyles.colInput, cardStyles.input, s.completed && cardStyles.inputDone]}
              value={s.reps}
              onChangeText={(v) => onRepsChange(setIdx, v)}
              keyboardType="numeric"
              placeholder={prev?.reps != null ? String(prev.reps) : '0'}
              placeholderTextColor={DC.textSecondary}
              editable={!s.completed}
            />
            <TouchableOpacity
              style={cardStyles.colCheck}
              onPress={() => onCompleteSet(setIdx)}
            >
              <Ionicons
                name={s.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={26}
                color={s.completed ? DC.primary : DC.textSecondary}
              />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={cardStyles.addSetBtn} onPress={onAddSet}>
        <Ionicons name="add" size={16} color={DC.primary} />
        <Text style={cardStyles.addSetText}>세트 추가</Text>
      </TouchableOpacity>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: DC.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: '700', color: DC.text, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  headerText: { fontSize: 11, color: DC.textSecondary, fontWeight: '600', textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 4,
  },
  setRowDone: { backgroundColor: DC.completedBg },
  setNum: { fontSize: 14, color: DC.text, textAlign: 'center' },
  prevText: { fontSize: 12, color: DC.textSecondary, textAlign: 'center' },
  input: {
    backgroundColor: DC.surface2,
    borderRadius: 8,
    paddingVertical: 8,
    fontSize: 15,
    color: DC.text,
    textAlign: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: DC.border,
  },
  inputDone: { opacity: 0.6 },
  colSet: { width: 32 },
  colPrev: { width: 64 },
  colInput: { flex: 1 },
  colCheck: { width: 36, alignItems: 'center' },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: DC.border,
    marginTop: 4,
  },
  addSetText: { fontSize: 14, color: DC.primary, fontWeight: '600' },
});

// ------ 메인 화면 ------
export default function ActiveWorkoutScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { routineId, exercises: initExercises } = route.params ?? {};

  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  // 타이머
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 휴식 타이머 모달
  const [restVisible, setRestVisible] = useState(false);

  // 운동 검색 모달
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);

  // 초기화 - useFocusEffect 사용 (IIFE 금지)
  useFocusEffect(
    useCallback(() => {
      if (initialized) return;
      if (routineId) {
        const routine = getRoutineWithExercises(routineId);
        if (routine?.exercises) {
          setExercises(routine.exercises.map((re) => buildExerciseEntry(re.exercise_name)));
        }
      } else if (initExercises && initExercises.length > 0) {
        setExercises(initExercises.map(buildExerciseEntry));
      }
      setInitialized(true);
    }, [routineId, initExercises, initialized])
  );

  // 타이머 시작
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const timerText = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

  // 운동 검색
  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setSearchResults(searchExercises(q));
  }

  function handleAddExercise(name: string) {
    setExercises((prev) => [...prev, buildExerciseEntry(name)]);
    setSearchModal(false);
    setSearchQuery('');
  }

  function openSearchModal() {
    setSearchResults(searchExercises(''));
    setSearchModal(true);
  }

  // 세트 완료
  function handleCompleteSet(exId: string, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = ex.sets.map((s, i) =>
          i === setIdx ? { ...s, completed: !s.completed } : s
        );
        return { ...ex, sets: newSets };
      })
    );
    // 완료 처리 시 휴식 타이머 표시
    const ex = exercises.find((e) => e.id === exId);
    if (ex && !ex.sets[setIdx].completed) {
      setRestVisible(true);
    }
  }

  // 세트 추가
  function handleAddSet(exId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : { ...ex, sets: [...ex.sets, { id: uid(), weight: '', reps: '', completed: false }] }
      )
    );
  }

  // 무게/횟수 변경
  function handleWeightChange(exId: string, setIdx: number, value: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, weight: value } : s)),
            }
      )
    );
  }

  function handleRepsChange(exId: string, setIdx: number, value: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, reps: value } : s)),
            }
      )
    );
  }

  // 운동 종료 및 저장
  function handleFinish() {
    const totalMin = Math.max(1, Math.round(elapsedSec / 60));
    Alert.alert(
      '운동 종료',
      `총 ${totalMin}분 운동했습니다. 저장할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: () => {
            const today = new Date().toISOString().slice(0, 10);
            const logId = createWorkoutLog(today, '오늘의 운동', undefined, totalMin);
            for (const ex of exercises) {
              ex.sets.forEach((s, idx) => {
                const w = parseFloat(s.weight) || undefined;
                const r = parseInt(s.reps) || undefined;
                if (w !== undefined || r !== undefined) {
                  addWorkoutSet(logId, ex.name, idx + 1, w, r);
                }
              });
            }
            navigation.navigate('MainTabs');
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: DC.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.timerText}>{timerText}</Text>
        <Text style={styles.headerTitle}>운동 중</Text>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>완료</Text>
        </TouchableOpacity>
      </View>

      {/* 운동 목록 */}
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ExerciseCard
            entry={item}
            onAddSet={() => handleAddSet(item.id)}
            onCompleteSet={(setIdx) => handleCompleteSet(item.id, setIdx)}
            onWeightChange={(setIdx, v) => handleWeightChange(item.id, setIdx, v)}
            onRepsChange={(setIdx, v) => handleRepsChange(item.id, setIdx, v)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="barbell-outline" size={48} color={DC.textSecondary} />
            <Text style={styles.emptyText}>운동을 추가해주세요</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* 하단 운동 추가 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.addExBtn} onPress={openSearchModal}>
          <Ionicons name="add-circle-outline" size={20} color={DC.primary} />
          <Text style={styles.addExText}>운동 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 휴식 타이머 모달 */}
      <RestTimerModal visible={restVisible} onClose={() => setRestVisible(false)} />

      {/* 운동 검색 모달 */}
      <Modal visible={searchModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.searchModal}>
          <View style={styles.searchModalHeader}>
            <Text style={styles.searchModalTitle}>운동 선택</Text>
            <TouchableOpacity onPress={() => setSearchModal(false)}>
              <Ionicons name="close" size={24} color={DC.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="운동 이름 검색..."
            placeholderTextColor={DC.textSecondary}
            autoFocus
          />
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchItem}
                onPress={() => handleAddExercise(item.name)}
              >
                <View>
                  <Text style={styles.searchItemName}>{item.name}</Text>
                  <Text style={styles.searchItemMeta}>{item.category} · {item.muscle_group}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={DC.primary} />
              </TouchableOpacity>
            )}
            ListFooterComponent={
              searchQuery.trim() ? (
                <TouchableOpacity
                  style={styles.customExBtn}
                  onPress={() => handleAddExercise(searchQuery.trim())}
                >
                  <Ionicons name="create-outline" size={18} color={DC.primary} />
                  <Text style={styles.customExText}>"{searchQuery}" 직접 추가</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: DC.surface,
    borderBottomWidth: 1,
    borderBottomColor: DC.border,
  },
  timerText: { fontSize: 16, fontWeight: '700', color: DC.primary, minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DC.text },
  finishBtn: {
    backgroundColor: DC.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  finishBtnText: { color: '#000000', fontWeight: '700', fontSize: 15 },
  listContent: { padding: 16, paddingBottom: 20 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: DC.textSecondary },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: DC.surface,
    borderTopWidth: 1,
    borderTopColor: DC.border,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DC.surface2,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: DC.primary,
  },
  addExText: { fontSize: 15, color: DC.primary, fontWeight: '600' },
  // 검색 모달
  searchModal: { flex: 1, backgroundColor: DC.background },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
    backgroundColor: DC.surface,
    borderBottomWidth: 1,
    borderBottomColor: DC.border,
  },
  searchModalTitle: { fontSize: 18, fontWeight: '700', color: DC.text },
  searchInput: {
    margin: 16,
    backgroundColor: DC.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: DC.text,
    borderWidth: 1,
    borderColor: DC.border,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: DC.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  searchItemName: { fontSize: 16, color: DC.text, fontWeight: '500' },
  searchItemMeta: { fontSize: 12, color: DC.textSecondary, marginTop: 2 },
  customExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  customExText: { fontSize: 15, color: DC.primary },
});
