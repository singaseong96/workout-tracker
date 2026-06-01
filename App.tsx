import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './src/db/database';
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
import ActiveWorkoutScreen from './src/screens/ActiveWorkoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// 운동 시작 탭을 위한 더미 화면 (탭 탭 시 ActiveWorkout으로 navigate)
function StartWorkoutTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    navigation.navigate('ActiveWorkout', {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        component={HomeScreen}
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
        component={RoutinesScreen}
        options={{
          tabBarLabel: '루틴',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: '통계',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
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
              component={WorkoutDetailScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="WorkoutEdit"
              component={WorkoutEditScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="RoutineDetail"
              component={RoutineDetailScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="RoutineEdit"
              component={RoutineEditScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="ActiveWorkout"
              component={ActiveWorkoutScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="ExerciseHistory"
              component={ExerciseHistoryScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
