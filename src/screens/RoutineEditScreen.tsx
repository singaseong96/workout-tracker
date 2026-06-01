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
import {
  getRoutineWithExercises,
  createRoutine,
  updateRoutine,
  addRoutineExercise,
  deleteRoutineExercise,
  searchExercises,
} from '../db/database';
import { RootStackParamList, Exercise } from '../types';
import { COLORS } from '../utils/colors';

type Route = RouteProp<RootStackParamList, 'RoutineEdit'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type ExerciseEntry = {
  id?: number;
  name: string;
  targetSets: string;
  targetReps: string;
  targetWeight: string;
};

export default function RoutineEditScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const routineId = route.params?.routineId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (initialized) return;
      if (routineId) {
        const routine = getRoutineWithExercises(routineId);
        if (routine) {
          setName(routine.name);
          setDescription(routine.description ?? '');
          setExercises(
            (routine.exercises ?? []).map((ex) => ({
              id: ex.id,
              name: ex.exercise_name,
              targetSets: String(ex.target_sets),
              targetReps: ex.target_reps != null ? String(ex.target_reps) : '',
              targetWeight: ex.target_weight != null ? String(ex.target_weight) : '',
            }))
          );
        }
      }
      setInitialized(true);
    }, [routineId, initialized])
  );

  function handleSearchExercise(q: string) {
    setSearchQuery(q);
    setSearchResults(searchExercises(q));
  }

  function addExercise(exerciseName: string) {
    setExercises((prev) => [
      ...prev,
      { name: exerciseName, targetSets: '3', targetReps: '10', targetWeight: '' },
    ]);
    setSearchModal(false);
    setSearchQuery('');
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExerciseField(
    index: number,
    field: 'targetSets' | 'targetReps' | 'targetWeight',
    value: string
  ) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('오류', '루틴 이름을 입력해주세요.');
      return;
    }

    let targetId: number;

    if (routineId) {
      updateRoutine(routineId, name.trim(), description.trim() || undefined);
      targetId = routineId;
      // Delete all existing exercises, then re-insert current list
      const original = getRoutineWithExercises(routineId);
      for (const ex of original?.exercises ?? []) {
        deleteRoutineExercise(ex.id);
      }
    } else {
      targetId = createRoutine(name.trim(), description.trim() || undefined);
    }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const sets = parseInt(ex.targetSets) || 3;
      const reps = parseInt(ex.targetReps) || undefined;
      const weight = parseFloat(ex.targetWeight) || undefined;
      addRoutineExercise(targetId, ex.name, i, sets, reps, weight);
    }

    Alert.alert('저장 완료', '루틴이 저장되었습니다.', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{routineId ? '루틴 수정' : '새 루틴'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TextInput
          style={styles.titleInput}
          value={name}
          onChangeText={setName}
          placeholder="루틴 이름"
          placeholderTextColor={COLORS.muted}
        />

        <Text style={styles.label}>설명 (선택)</Text>
        <TextInput
          style={[styles.input, styles.descInput]}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="루틴에 대한 설명을 입력하세요..."
          placeholderTextColor={COLORS.muted}
        />

        <Text style={styles.sectionTitle}>운동 목록</Text>

        {exercises.map((ex, index) => (
          <View key={index} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{index + 1}</Text>
              </View>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(index)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.targetRow}>
              <View style={styles.targetField}>
                <Text style={styles.targetLabel}>세트</Text>
                <TextInput
                  style={styles.targetInput}
                  value={ex.targetSets}
                  onChangeText={(v) => updateExerciseField(index, 'targetSets', v)}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={COLORS.muted}
                />
              </View>
              <View style={styles.targetField}>
                <Text style={styles.targetLabel}>목표 횟수</Text>
                <TextInput
                  style={styles.targetInput}
                  value={ex.targetReps}
                  onChangeText={(v) => updateExerciseField(index, 'targetReps', v)}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={COLORS.muted}
                />
              </View>
              <View style={styles.targetField}>
                <Text style={styles.targetLabel}>목표 무게 (kg)</Text>
                <TextInput
                  style={styles.targetInput}
                  value={ex.targetWeight}
                  onChangeText={(v) => updateExerciseField(index, 'targetWeight', v)}
                  keyboardType="decimal-pad"
                  placeholder="선택"
                  placeholderTextColor={COLORS.muted}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => {
            setSearchModal(true);
            setSearchResults(searchExercises(''));
          }}
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
              searchQuery.trim() ? (
                <TouchableOpacity
                  style={styles.customBtn}
                  onPress={() => addExercise(searchQuery.trim())}
                >
                  <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.customBtnText}>"{searchQuery}" 직접 추가</Text>
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
    paddingBottom: 12,
    backgroundColor: COLORS.card,
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
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
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
  label: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descInput: { height: 80, textAlignVertical: 'top', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  exerciseName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  targetRow: { flexDirection: 'row', gap: 10 },
  targetField: { flex: 1 },
  targetLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600', marginBottom: 4 },
  targetInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
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
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  searchInput: {
    margin: 16,
    backgroundColor: COLORS.card,
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
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
  },
  searchItemName: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  searchItemMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  customBtnText: { fontSize: 15, color: COLORS.primary },
});
