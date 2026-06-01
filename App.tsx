import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './src/db/database';
import { COLORS } from './src/utils/colors';
import { RootStackParamList, MainTabParamList } from './src/types';

import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import StatsScreen from './src/screens/StatsScreen';
import RoutinesScreen from './src/screens/RoutinesScreen';
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';
import WorkoutEditScreen from './src/screens/WorkoutEditScreen';
import RoutineDetailScreen from './src/screens/RoutineDetailScreen';
import RoutineEditScreen from './src/screens/RoutineEditScreen';
import ExerciseHistoryScreen from './src/screens/ExerciseHistoryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
            Home: { active: 'barbell', inactive: 'barbell-outline' },
            Calendar: { active: 'calendar', inactive: 'calendar-outline' },
            Stats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
            Routines: { active: 'list', inactive: 'list-outline' },
          };
          const icon = icons[route.name];
          const iconName: IoniconName = focused ? icon.active : icon.inactive;
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: '캘린더' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '통계' }} />
      <Tab.Screen name="Routines" component={RoutinesScreen} options={{ title: '루틴' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="WorkoutDetail"
              component={WorkoutDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="WorkoutEdit"
              component={WorkoutEditScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen
              name="RoutineDetail"
              component={RoutineDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="RoutineEdit"
              component={RoutineEditScreen}
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
            <Stack.Screen
              name="ExerciseHistory"
              component={ExerciseHistoryScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
