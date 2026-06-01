import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getWorkoutLogWithSets, deleteWorkoutLog } from '../db/database';
import { WorkoutLog, WorkoutSet, RootStackParamList } from '../types';
import { COLORS } from '../utils/colors';

type Route = RouteProp<RootStackParamList, 'WorkoutDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WorkoutDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const [log, setLog] = useState<WorkoutLog | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLog(getWorkoutLogWithSets(route.params.logId));
    }, [route.params.logId])
  );

  function handleDelete() {
    if (!log) return;
    Alert.alert('삭제', '이 운동 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteWorkoutLog(log.id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!log) return null;

  // Group sets by exercise
  const grouped: Record<string, WorkoutSet[]> = {};
  for (const set of log.sets ?? []) {
    if (!grouped[set.exercise_name]) grouped[set.exercise_name] = [];
    grouped[set.exercise_name].push(set);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('WorkoutEdit', { logId: log.id })}
          >
            <Ionicons name="create-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>
          {format(new Date(log.date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}
        </Text>
        <Text style={styles.title}>{log.title}</Text>

        <View style={styles.metaRow}>
          {log.duration_minutes != null && (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={14} color={COLORS.primary} />
              <Text style={styles.metaText}>{log.duration_minutes}분</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Ionicons name="barbell-outline" size={14} color={COLORS.primary} />
            <Text style={styles.metaText}>{Object.keys(grouped).length}개 운동</Text>
          </View>
        </View>

        {log.notes != null && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{log.notes}</Text>
          </View>
        )}

        {Object.entries(grouped).map(([exerciseName, sets]) => (
          <View key={exerciseName} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{exerciseName}</Text>
            <View style={styles.setHeader}>
              <Text style={[styles.setCol, styles.setLabel]}>세트</Text>
              <Text style={[styles.setCol, styles.setLabel]}>무게 (kg)</Text>
              <Text style={[styles.setCol, styles.setLabel]}>횟수</Text>
            </View>
            {sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setCol}>{set.set_number}</Text>
                <Text style={styles.setCol}>{set.weight ?? '-'}</Text>
                <Text style={styles.setCol}>{set.reps ?? '-'}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  date: { fontSize: 13, color: COLORS.muted, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaText: { fontSize: 13, color: COLORS.text },
  notesBox: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
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
  exerciseName: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  setHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
    marginBottom: 6,
  },
  setLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  setRow: { flexDirection: 'row', paddingVertical: 6 },
  setCol: { flex: 1, textAlign: 'center', fontSize: 15, color: COLORS.text },
});
