import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getWorkoutLogs, deleteWorkoutLog } from '../db/database';
import { WorkoutLog, RootStackParamList } from '../types';
import { COLORS } from '../utils/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLogs(getWorkoutLogs());
    }, [])
  );

  function handleDelete(id: number, title: string) {
    Alert.alert('운동 기록 삭제', `"${title}" 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteWorkoutLog(id);
          setLogs(getWorkoutLogs());
        },
      },
    ]);
  }

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), 'M월 d일 (EEE)', { locale: ko });
    } catch {
      return dateStr;
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={64} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>아직 운동 기록이 없어요</Text>
            <Text style={styles.emptySubtitle}>첫 번째 운동을 기록해보세요!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('WorkoutDetail', { logId: item.id })}
            onLongPress={() => handleDelete(item.id, item.title)}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.duration_minutes != null && (
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color={COLORS.muted} />
                  <Text style={styles.metaText}>{item.duration_minutes}분</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('WorkoutEdit', {})}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLeft: { flex: 1 },
  cardDate: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  metaText: { fontSize: 12, color: COLORS.muted },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.muted },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
