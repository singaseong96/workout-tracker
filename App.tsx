import 'react-native-gesture-handler';
import React, { useEffect, lazy, Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './src/db/database';
import { RootStackParamList, MainTabParamList } from './src/types';

const HomeScreen = lazy(() => import('./src/screens/HomeScreen'));
const CalendarScreen = lazy(() => import('./src/screens/CalendarScreen'));
const StatsScreen = lazy(() => import('./src/screens/StatsScreen'));
const RoutinesScreen = lazy(() => import('./src/screens/RoutinesScreen'));
const WorkoutDetailScreen = lazy(() => import('./src/screens/WorkoutDetailScreen'));
const WorkoutEditScreen = lazy(() => import('./src/screens/WorkoutEditScreen'));
const RoutineDetailScreen = lazy(() => import('./src/screens/RoutineDetailScreen'));
const RoutineEditScreen = lazy(() => import('./src/screens/RoutineEditScreen'));
const ExerciseHistoryScreen = lazy(() => import('./src/screens/ExerciseHistoryScreen'));
const ActiveWorkoutScreen = lazy(() => import('./src/screens/ActiveWorkoutScreen'));

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const LazyFallback = (
  <View style={{ flex: 1, backgroundColor: '#0F0F0F', justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator color="#FFD600" size="large" />
  </View>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withSuspense(
  Component: React.LazyExoticComponent<React.ComponentType<any>>,
): React.ComponentType<any> {
  return function SuspenseWrapper(props: Record<string, unknown>) {
    return <Suspense fallback={LazyFallback}><Component {...props} /></Suspense>;
  };
}

const HomeScreenLazy = withSuspense(HomeScreen);
const CalendarScreenLazy = withSuspense(CalendarScreen);
const StatsScreenLazy = withSuspense(StatsScreen);
const RoutinesScreenLazy = withSuspense(RoutinesScreen);
const WorkoutDetailScreenLazy = withSuspense(WorkoutDetailScreen);
const WorkoutEditScreenLazy = withSuspense(WorkoutEditScreen);
const RoutineDetailScreenLazy = withSuspense(RoutineDetailScreen);
const RoutineEditScreenLazy = withSuspense(RoutineEditScreen);
const ExerciseHistoryScreenLazy = withSuspense(ExerciseHistoryScreen);
const ActiveWorkoutScreenLazy = withSuspense(ActiveWorkoutScreen);

// 운동 시작 탭을 위한 더미 화면 (tabPress listener에서 ActiveWorkout으로 navigate)
function StartWorkoutTab() {
  return <View style={{ flex: 1, backgroundColor: '#0F0F0F' }} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFD600',
        tabBarInactiveTintColor: '#5A5A5A',
        tabBarStyle: {
          backgroundColor: '#1C1C1C',
          borderTopColor: '#2E2E2E',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreenLazy}
        options={{
          tabBarLabel: '홈',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StartWorkout"
        component={StartWorkoutTab}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation as unknown as NativeStackNavigationProp<RootStackParamList>).navigate('ActiveWorkout', {});
          },
        })}
        options={{
          tabBarLabel: '운동',
          tabBarIcon: ({ color }) => <Ionicons name="barbell-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Routines"
        component={RoutinesScreenLazy}
        options={{
          tabBarLabel: '루틴',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreenLazy}
        options={{
          tabBarLabel: '통계',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreenLazy}
        options={{
          tabBarLabel: '기록',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
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
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="WorkoutDetail"
              component={WorkoutDetailScreenLazy}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="WorkoutEdit"
              component={WorkoutEditScreenLazy}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="RoutineDetail"
              component={RoutineDetailScreenLazy}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="RoutineEdit"
              component={RoutineEditScreenLazy}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="ActiveWorkout"
              component={ActiveWorkoutScreenLazy}
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="ExerciseHistory"
              component={ExerciseHistoryScreenLazy}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
