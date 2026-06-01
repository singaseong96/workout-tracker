import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { getExerciseHistory } from '../db/database';
import { RootStackParamList } from '../types';
import { COLORS } from '../utils/colors';

type Route = RouteProp<RootStackParamList, 'ExerciseHistory'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

type HistoryEntry = { date: string; max_weight: number; total_volume: number };

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ExerciseHistoryScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { exerciseName } = route.params;

  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      const data = getExerciseHistory(exerciseName);
      setHistory(data);
    }, [exerciseName])
  );

  const chartData = history.slice(-10);
  const hasData = chartData.length >= 2;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>최고 중량 추이</Text>

        {!hasData ? (
          <View style={styles.emptyChart}>
            <Ionicons name="analytics-outline" size={40} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              {history.length === 0
                ? '아직 기록이 없어요'
                : '차트를 그리려면 2개 이상의 날짜 데이터가 필요해요'}
            </Text>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <LineChart
              data={{
                labels: chartData.map((d) => formatDateLabel(d.date)),
                datasets: [{ data: chartData.map((d) => d.max_weight || 0) }],
              }}
              width={SCREEN_WIDTH - 64}
              height={200}
              yAxisSuffix="kg"
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 1,
                color: () => COLORS.primary,
                labelColor: () => COLORS.textSecondary,
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: COLORS.primary,
                },
              }}
              bezier
              style={{ borderRadius: 8 }}
            />
            <Text style={styles.chartCaption}>날짜별 최고 중량 (kg)</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>기록 목록</Text>

        {history.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>기록이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={[...history].reverse()}
            keyExtractor={(item) => item.date}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.historyRow}>
                <Text style={styles.historyDate}>{item.date}</Text>
                <View style={styles.historyStats}>
                  <View style={styles.statChip}>
                    <Text style={styles.statLabel}>최고</Text>
                    <Text style={styles.statValue}>{item.max_weight}kg</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statLabel}>볼륨</Text>
                    <Text style={styles.statValue}>{Math.round(item.total_volume)}kg</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartCaption: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6 },
  emptyChart: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  historyRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyDate: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  historyStats: { flexDirection: 'row', gap: 8 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  statValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});
