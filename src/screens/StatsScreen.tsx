import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart } from 'react-native-chart-kit';
import { getWorkoutLogs, getRecentVolume, getMuscleGroupStats } from '../db/database';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;

type VolumeEntry = { date: string; volume: number };
type MuscleEntry = { muscle_group: string; count: number };
type ChartDataPoint = { label: string; volume: number };

function computeStreak(uniqueDates: string[]): number {
  if (uniqueDates.length === 0) return 0;
  const sorted = [...uniqueDates].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let cursor = new Date(today);

  for (const d of sorted) {
    const day = new Date(d + 'T00:00:00');
    day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((cursor.getTime() - day.getTime()) / 86400000);
    if (diffDays === 0 || (streak === 0 && diffDays === 1)) {
      streak += 1;
      cursor = new Date(day.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

function getThisMonthCount(uniqueDates: string[]): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return uniqueDates.filter((d) => d.startsWith(prefix)).length;
}

function formatBarLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function StatsScreen() {
  const navigation = useNavigation<Nav>();
  const [totalCount, setTotalCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [muscleData, setMuscleData] = useState<MuscleEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      const logs = getWorkoutLogs();
      const uniqueDates = [...new Set(logs.map((l) => l.date))];
      setTotalCount(logs.length);
      setStreak(computeStreak(uniqueDates));
      setMonthCount(getThisMonthCount(uniqueDates));

      const vol: VolumeEntry[] = getRecentVolume(30);
      const last7 = vol.slice(-7);
      setChartData(last7.map((v) => ({ label: formatBarLabel(v.date), volume: v.volume })));

      const muscle = getMuscleGroupStats();
      setMuscleData(muscle);
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary cards */}
      <View style={styles.statRow}>
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Text style={styles.statValueLight}>{totalCount}</Text>
          <Text style={styles.statLabelLight}>총 운동 횟수</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>연속 운동일</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{monthCount}</Text>
          <Text style={styles.statLabel}>이번 달</Text>
        </View>
      </View>

      {/* Volume chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>최근 7일 볼륨 추이</Text>
        {chartData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>운동 데이터가 없어요</Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <BarChart
              data={{
                labels: chartData.map((d) => d.label),
                datasets: [{ data: chartData.map((d) => d.volume || 0) }],
              }}
              width={SCREEN_WIDTH - 64}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: () => COLORS.primary,
                labelColor: () => COLORS.textSecondary,
                barPercentage: 0.6,
              }}
              style={{ borderRadius: 8 }}
              showValuesOnTopOfBars
            />
            <Text style={styles.chartCaption}>볼륨 = 무게(kg) × 횟수 합계</Text>
          </View>
        )}
      </View>

      {/* Top exercises */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>많이 한 운동 TOP 10</Text>
        {muscleData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>운동 데이터가 없어요</Text>
          </View>
        ) : (
          <View style={styles.exerciseList}>
            {muscleData.map((item, index) => {
              const maxCount = muscleData[0]?.count ?? 1;
              const barWidth = (item.count / maxCount) * 100;
              return (
                <TouchableOpacity
                  key={`${item.muscle_group}-${index}`}
                  style={styles.exerciseRow}
                  onPress={() => navigation.navigate('ExerciseHistory', { exerciseName: item.muscle_group })}
                  activeOpacity={0.7}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <View style={styles.exerciseNameRow}>
                      <Text style={styles.exerciseName} numberOfLines={1}>
                        {item.muscle_group}
                      </Text>
                      <Text style={styles.exerciseCount}>{item.count}세트</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${barWidth}%` }]} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const CHART_HEIGHT = 200;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  statValueLight: { fontSize: 28, fontWeight: '800', color: '#000000' },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  statLabelLight: { fontSize: 11, color: 'rgba(0,0,0,0.6)', marginTop: 4, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    height: CHART_HEIGHT + 60,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartCaption: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  emptyChart: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  exerciseList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  exerciseInfo: { flex: 1 },
  exerciseNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  exerciseCount: { fontSize: 13, color: COLORS.textSecondary },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
});
