import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  getWorkoutLogWithSets,
  getRoutineWithExercises,
  createWorkoutLog,
  updateWorkoutLog,
  addWorkoutSet,
  deleteSetsByLogAndExercise,
  searchExercises,
} from '../db/database';
import { RootStackParamList, Exercise } from '../types';
import { COLORS } from '../utils/colors';

type Route = RouteProp<RootStackParamList, 'WorkoutEdit'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type SetEntry = {
  weight: string;
  reps: string;
  done: boolean;
}

type ExerciseEntry = {
  name: string;
  sets: SetEntry[];
}

export default function WorkoutEditScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const logId = route.params?.logId;
  const routineId = route.params?.routineId;
  const initialDate = route.params?.date ?? format(new Date(), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (initialized) return;
      if (logId) {
        const log = getWorkoutLogWithSets(logId);
        if (log) {
          setTitle(log.title);
          setDate(log.date);
          setNotes(log.notes ?? '');
          setDuration(String(log.duration_minutes ?? ''));
          const grouped: Record<string, SetEntry[]> = {};
          for (const s of log.sets ?? []) {
            if (!grouped[s.exercise_name]) grouped[s.exercise_name] = [];
            grouped[s.exercise_name].push({
              weight: String(s.weight ?? ''),
              reps: String(s.reps ?? ''),
              done: false,
            });
          }
          setExercises(Object.entries(grouped).map(([name, sets]) => ({ name, sets })));
        }
      } else if (routineId) {
        const routine = getRoutineWithExercises(routineId);
        if (routine) {
          setTitle(routine.name);
          const exEntries: ExerciseEntry[] = (routine.exercises ?? []).map((ex) => ({
            name: ex.exercise_name,
            sets: Array.from({ length: ex.target_sets }, () => ({
              weight: ex.target_weight != null ? String(ex.target_weight) : '',
              reps: ex.target_reps != null ? String(ex.target_reps) : '',
              done: false,
            })),
          }));
          setExercises(exEntries);
        } else {
          setTitle('오늘의 운동');
        }
      } else {
        setTitle('오늘의 운동');
      }
      setInitialized(true);
    }, [logId, routineId, initialized])
  );

  function handleDateChange(_event: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(false);
    if (selected) {
      setDate(format(selected, 'yyyy-MM-dd'));
    }
  }

  function handleSearchExercise(q: string) {
    setSearchQuery(q);
    setSearchResults(searchExercises(q));
  }

  function addExercise(name: string) {
    setExercises((prev) => [...prev, { name, sets: [{ weight: '', reps: '', done: false }] }]);
    setSearchModal(false);
    setSearchQuery('');
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx ? { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] } : ex
      )
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const newSets = ex.sets.filter((_, si) => si !== setIdx);
        return { ...ex, sets: newSets.length > 0 ? newSets : ex.sets };
      })
    );
  }

  function removeExercise(exIdx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  }

  function updateSet(exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, [field]: value }
              ),
            }
      )
    );
  }

  function toggleDone(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, done: !s.done }
              ),
            }
      )
    );
  }

  function handleSave() {
    if (!title.trim()) {
      Alert.alert('오류', '운동 제목을 입력해주세요.');
      return;
    }

    const durationNum = parseInt(duration) || undefined;

    let targetLogId = logId;
    if (logId) {
      updateWorkoutLog(logId, title.trim(), notes.trim() || undefined, durationNum);
    } else {
      targetLogId = createWorkoutLog(date, title.trim(), notes.trim() || undefined, durationNum);
    }

    if (logId) {
      for (const ex of exercises) {
        deleteSetsByLogAndExercise(logId, ex.name);
      }
    }

    for (const ex of exercises) {
      ex.sets.forEach((s, idx) => {
        const w = parseFloat(s.weight) || undefined;
        const r = parseInt(s.reps) || undefined;
        addWorkoutSet(targetLogId!, ex.name, idx + 1, w, r);
      });
    }

    Alert.alert('저장 완료', '운동이 저장되었습니다.', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  }

  const dateValue = (() => {
    const parsed = new Date(date + 'T00:00:00');
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  })();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{logId ? '운동 수정' : '운동 기록'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="운동 제목"
          placeholderTextColor={COLORS.muted}
        />

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>날짜</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 15, color: COLORS.text }}>{date}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>시간 (분)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={COLORS.muted}
            />
          </View>
        </View>

        <Text style={styles.label}>메모</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="오늘의 운동 메모..."
          placeholderTextColor={COLORS.muted}
        />

        <Text style={styles.sectionTitle}>운동 목록</Text>

        {exercises.map((ex, exIdx) => (
          <View key={exIdx} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(exIdx)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.setHeader}>
              <View style={{ width: 28 }} />
              <Text style={[styles.setCol, styles.setLabel]}>세트</Text>
              <Text style={[styles.setColWide, styles.setLabel]}>무게 (kg)</Text>
              <Text style={[styles.setColWide, styles.setLabel]}>횟수</Text>
              <View style={{ width: 28 }} />
            </View>

            {ex.sets.map((s, setIdx) => (
              <View
                key={setIdx}
                style={[
                  styles.setRow,
                  s.done && { backgroundColor: `${COLORS.success}22`, borderRadius: 8 },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleDone(exIdx, setIdx)}
                  style={{ width: 28, alignItems: 'center' }}
                >
                  <Ionicons
                    name={s.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={s.done ? COLORS.success : COLORS.muted}
                  />
                </TouchableOpacity>
                <Text style={styles.setCol}>{setIdx + 1}</Text>
                <TextInput
                  style={[styles.setInput, styles.setColWide]}
                  value={s.weight}
                  onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={COLORS.muted}
                />
                <TextInput
                  style={[styles.setInput, styles.setColWide]}
                  value={s.reps}
                  onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.muted}
                />
                <TouchableOpacity onPress={() => removeSet(exIdx, setIdx)} style={{ width: 28 }}>
                  <Ionicons name="remove-circle-outline" size={20} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
              <Ionicons name="add" size={16} color={COLORS.primary} />
              <Text style={styles.addSetText}>세트 추가</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => { setSearchModal(true); setSearchResults(searchExercises('')); }}
        >
          <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.addExerciseText}>운동 추가</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={searchModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>운동 선택</Text>
            <TouchableOpacity onPress={() => setSearchModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchExercise}
            placeholder="운동 이름 검색..."
            placeholderTextColor={COLORS.muted}
            autoFocus
          />
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchItem}
                onPress={() => addExercise(item.name)}
              >
                <View>
                  <Text style={styles.searchItemName}>{item.name}</Text>
                  <Text style={styles.searchItemMeta}>{item.category} · {item.muscle_group}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.customExerciseBtn}
                onPress={() => {
                  if (searchQuery.trim()) addExercise(searchQuery.trim());
                }}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                <Text style={styles.customExerciseText}>
                  "{searchQuery}" 직접 추가
                </Text>
              </TouchableOpacity>
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
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: { color: '#000000', fontWeight: '700', fontSize: 15 },
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  field: { flex: 1 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesInput: { height: 80, textAlignVertical: 'top', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  exerciseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  setLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 2 },
  setCol: { width: 36, textAlign: 'center', fontSize: 14, color: COLORS.text },
  setColWide: { flex: 1, textAlign: 'center' },
  setInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  addSetText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addExerciseText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchInput: {
    margin: 16,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchItemName: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  searchItemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  customExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  customExerciseText: { fontSize: 15, color: COLORS.primary },
});
