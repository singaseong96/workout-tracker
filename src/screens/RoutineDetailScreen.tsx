import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getRoutineWithExercises, deleteRoutine } from '../db/database';
import { Routine, RootStackParamList } from '../types';
import { COLORS } from '../utils/colors';

type Route = RouteProp<RootStackParamList, 'RoutineDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function RoutineDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const [routine, setRoutine] = useState<Routine | null>(null);

  useFocusEffect(
    useCallback(() => {
      const r = getRoutineWithExercises(route.params.routineId);
      setRoutine(r);
    }, [route.params.routineId])
  );

  function handleDelete() {
    if (!routine) return;
    Alert.alert('루틴 삭제', `"${routine.name}" 루틴을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteRoutine(routine.id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!routine) return null;

  const exercises = routine.exercises ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('RoutineEdit', { routineId: routine.id })}
          >
            <Ionicons name="create-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.routineName}>{routine.name}</Text>
        {routine.description ? (
          <Text style={styles.routineDesc}>{routine.description}</Text>
        ) : null}

        <View style={styles.metaChip}>
          <Ionicons name="barbell-outline" size={14} color={COLORS.primary} />
          <Text style={styles.metaText}>{exercises.length}개 운동</Text>
        </View>

        <Text style={styles.sectionTitle}>운동 구성</Text>

        {exercises.length === 0 ? (
          <View style={styles.emptyExercises}>
            <Text style={styles.emptyText}>등록된 운동이 없어요</Text>
            <Text style={styles.emptySubText}>편집 버튼으로 운동을 추가해보세요</Text>
          </View>
        ) : (
          exercises.map((ex, index) => (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
                <View style={styles.targetRow}>
                  <View style={styles.targetChip}>
                    <Text style={styles.targetLabel}>세트</Text>
                    <Text style={styles.targetValue}>{ex.target_sets}</Text>
                  </View>
                  {ex.target_reps != null && (
                    <View style={styles.targetChip}>
                      <Text style={styles.targetLabel}>횟수</Text>
                      <Text style={styles.targetValue}>{ex.target_reps}</Text>
                    </View>
                  )}
                  {ex.target_weight != null && (
                    <View style={styles.targetChip}>
                      <Text style={styles.targetLabel}>무게</Text>
                      <Text style={styles.targetValue}>{ex.target_weight}kg</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.startBtn}
        onPress={() =>
          navigation.navigate('WorkoutEdit', { date: new Date().toISOString().slice(0, 10) })
        }
      >
        <Ionicons name="play" size={20} color="#fff" />
        <Text style={styles.startBtnText}>운동 시작</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  backBtn: { padding: 4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  content: { padding: 20, paddingBottom: 100 },
  routineName: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  routineDesc: { fontSize: 15, color: COLORS.muted, marginBottom: 12, lineHeight: 22 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 24,
  },
  metaText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  emptyExercises: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.muted },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  orderText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  targetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetLabel: { fontSize: 11, color: COLORS.muted },
  targetValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  startBtn: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
