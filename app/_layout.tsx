import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WakePointProvider } from '../context/WakePointContext';
import '../services/backgroundTask'; // Ensure background task is registered at bundle entry

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WakePointProvider>
        <StatusBar style="light" backgroundColor="#0B0F19" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0B0F19' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'WakePoint Map' }} />
        </Stack>
      </WakePointProvider>
    </SafeAreaProvider>
  );
}
