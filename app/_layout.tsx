import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WaypointProvider } from '../context/WaypointContext';
import '../services/backgroundTask'; // Ensure background task is registered at bundle entry

export default function RootLayout() {
  return (
    <WaypointProvider>
      <StatusBar style="light" backgroundColor="#0F172A" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F172A' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'WayPoint Map' }} />
      </Stack>
    </WaypointProvider>
  );
}
