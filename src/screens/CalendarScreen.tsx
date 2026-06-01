import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  getWorkoutDates,
  getMonthlyWorkoutCount,
  getWorkoutLogsByDate,
} from '../db/database';
import { WorkoutLog, RootStackParamList } from '../types';
import { COLORS } from '../utils/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type DotEntry = { marked: boolean; dotColor: string };
type SelectedEntry = { marked: boolean; dotColor: string; selected: boolean; selectedColor: string };
type MarkedDates = Record<string, DotEntry | SelectedEntry>;

export default function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [monthCount, setMonthCount] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [dayLogs, setDayLogs] = useState<WorkoutLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      refreshMarks(currentMonth, selectedDate);
    }, [currentMonth, selectedDate])
  );

  function buildMarks(dates: string[], selected: string): MarkedDates {
    const marks: MarkedDates = {};
    for (const d of dates) {
      marks[d] = { marked: true, dotColor: COLORS.primary };
    }
    if (selected) {
      marks[selected] = {
        marked: true,
        dotColor: '#fff',
        selected: true,
        selectedColor: COLORS.primary,
      };
    }
    return marks;
  }

  function refreshMarks(month: Date, selected: string) {
    const dates = getWorkoutDates();
    setMarkedDates(buildMarks(dates, selected));
    const count = getMonthlyWorkoutCount(month.getFullYear(), month.getMonth() + 1);
    setMonthCount(count);
  }

  function handleDayPress(day: DateData) {
    const dateStr = day.dateString;
    setSelectedDate(dateStr);

    const dates = getWorkoutDates();
    setMarkedDates(buildMarks(dates, dateStr));

    const logs = getWorkoutLogsByDate(dateStr);
    if (logs.length > 0) {
      setDayLogs(logs);
      setModalVisible(true);
    } else {
      navigation.navigate('WorkoutEdit', { date: dateStr });
    }
  }

  function handleMonthChange(month: DateData) {
    const newMonth = new Date(month.year, month.month - 1, 1);
    setCurrentMonth(newMonth);
    const count = getMonthlyWorkoutCount(month.year, month.month);
    setMonthCount(count);
  }

  function formatMonthHeader(date: Date) {
    return format(date, 'yyyy년 M월', { locale: ko });
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryMonth}>{formatMonthHeader(currentMonth)}</Text>
          <Text style={styles.summaryLabel}>이달의 운동</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryCount}>{monthCount}</Text>
          <Text style={styles.summaryUnit}>회</Text>
        </View>
      </View>

      <Calendar
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markedDates={markedDates}
        theme={{
          backgroundColor: COLORS.background,
          calendarBackground: COLORS.surface,
          textSectionTitleColor: COLORS.textSecondary,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: '#000000',
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.text,
          textDisabledColor: COLORS.muted,
          dotColor: COLORS.primary,
          selectedDotColor: '#000000',
          arrowColor: COLORS.primary,
          monthTextColor: COLORS.text,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
        }}
        style={styles.calendar}
      />

      <Text style={styles.hint}>날짜를 탭하면 운동을 기록하거나 확인할 수 있어요</Text>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDate
                ? `${format(new Date(selectedDate + 'T00:00:00'), 'M월 d일 (EEE)', { locale: ko })} 운동`
                : '운동 기록'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={dayLogs}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.logCard}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('WorkoutDetail', { logId: item.id });
                }}
              >
                <View style={styles.logCardLeft}>
                  <Text style={styles.logTitle}>{item.title}</Text>
                  {item.duration_minutes != null && (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={13} color={COLORS.muted} />
                      <Text style={styles.metaText}>{item.duration_minutes}분</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={styles.newWorkoutBtn}
            onPress={() => {
              setModalVisible(false);
              navigation.navigate('WorkoutEdit', { date: selectedDate });
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newWorkoutBtnText}>이 날 운동 추가</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: { gap: 4 },
  summaryMonth: { fontSize: 18, fontWeight: '700', color: '#000000' },
  summaryLabel: { fontSize: 13, color: 'rgba(0,0,0,0.6)' },
  summaryRight: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  summaryCount: { fontSize: 40, fontWeight: '800', color: '#000000', lineHeight: 44 },
  summaryUnit: { fontSize: 16, color: 'rgba(0,0,0,0.6)', marginBottom: 6 },
  calendar: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 12,
    paddingHorizontal: 20,
  },
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
  modalList: { padding: 16, paddingBottom: 100 },
  logCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logCardLeft: { flex: 1 },
  logTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  newWorkoutBtn: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newWorkoutBtnText: { color: '#000000', fontWeight: '700', fontSize: 16 },
});
