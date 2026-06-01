import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getWorkoutLogs, deleteWorkoutLog } from '../db/database';
import { WorkoutLog, RootStackParamList } from '../types';
import { COLORS } from '../utils/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type WeekStats = {
  count: number;
  totalSets: number;
  totalVolume: number;
};

function computeWeekStats(logs: WorkoutLog[]): WeekStats {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  let count = 0;
  let totalSets = 0;
  let totalVolume = 0;

  for (const log of logs) {
    try {
      const logDate = parseISO(log.date);
      if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
        count += 1;
        const sets = log.sets ?? [];
        totalSets += sets.length;
        for (const s of sets) {
          if (s.weight != null && s.reps != null) {
            totalVolume += s.weight * s.reps;
          }
        }
      }
    } catch {
      // 날짜 파싱 실패 무시
    }
  }

  return { count, totalSets, totalVolume };
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [weekStats, setWeekStats] = useState<WeekStats>({ count: 0, totalSets: 0, totalVolume: 0 });

  useFocusEffect(
    useCallback(() => {
      const allLogs = getWorkoutLogs();
      setLogs(allLogs);
      setWeekStats(computeWeekStats(allLogs));
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
          const updated = getWorkoutLogs();
          setLogs(updated);
          setWeekStats(computeWeekStats(updated));
        },
      },
    ]);
  }

  function formatDate(dateStr: string) {
    try {
      return format(parseISO(dateStr), 'M월 d일 (EEE)', { locale: ko });
    } catch {
      return dateStr;
    }
  }

  const todayStr = format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko });
  const recentLogs = logs.slice(0, 10);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={recentLogs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* 상단 인사 영역 */}
            <View style={styles.topSection}>
              <Text style={styles.greeting}>안녕하세요 👋</Text>
              <Text style={styles.todayDate}>{todayStr}</Text>
            </View>

            {/* 빠른 시작 카드 */}
            <TouchableOpacity
              style={styles.quickStartCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ActiveWorkout', {})}
            >
              <View style={styles.quickStartLeft}>
                <Text style={styles.quickStartTitle}>운동 시작</Text>
                <Text style={styles.quickStartSub}>오늘의 운동을 기록해보세요</Text>
              </View>
              <View style={styles.quickStartIcon}>
                <Ionicons name="barbell" size={28} color="#000000" />
              </View>
            </TouchableOpacity>

            {/* 이번 주 통계 */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{weekStats.count}</Text>
                <Text style={styles.statLabel}>운동 횟수</Text>
              </View>
              <View style={[styles.statCard, styles.statCardMiddle]}>
                <Text style={styles.statValue}>{weekStats.totalSets}</Text>
                <Text style={styles.statLabel}>총 세트</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {weekStats.totalVolume >= 1000
                    ? `${(weekStats.totalVolume / 1000).toFixed(1)}t`
                    : `${Math.round(weekStats.totalVolume)}`}
                </Text>
                <Text style={styles.statLabel}>총 볼륨(kg)</Text>
              </View>
            </View>

            {/* 최근 운동 섹션 헤더 */}
            {logs.length > 0 && (
              <Text style={styles.sectionTitle}>최근 운동</Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={64} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>아직 운동 기록이 없어요</Text>
            <Text style={styles.emptySubtitle}>위 버튼으로 첫 번째 운동을 기록해보세요!</Text>
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
              <View style={styles.cardMeta}>
                {item.duration_minutes != null && (
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>{item.duration_minutes}분</Text>
                  </View>
                )}
                {(item.sets?.length ?? 0) > 0 && (
                  <View style={styles.metaChip}>
                    <Ionicons name="barbell-outline" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>
                      {new Set((item.sets ?? []).map((s) => s.exercise_name)).size}종목
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 32 },

  // 상단 인사
  topSection: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  todayDate: { fontSize: 14, color: COLORS.textSecondary },

  // 빠른 시작 카드
  quickStartCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickStartLeft: { flex: 1 },
  quickStartTitle: { fontSize: 20, fontWeight: '800', color: '#000000', marginBottom: 4 },
  quickStartSub: { fontSize: 13, color: 'rgba(0,0,0,0.6)' },
  quickStartIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 이번 주 통계
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardMiddle: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  // 섹션 타이틀
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  // 운동 카드
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLeft: { flex: 1 },
  cardDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaText: { fontSize: 11, color: COLORS.textSecondary },

  // 빈 상태
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
});
