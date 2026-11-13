import { useMemo } from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function AuthLayout() {
  const { colors, resolved } = useTheme();
  const contentStyle = useMemo(
    () => ({ backgroundColor: colors.background }),
    [colors.background]
  );

  return (
    <Stack
      key={resolved}
      screenOptions={{
        headerShown: false,
        contentStyle,
        animation: 'slide_from_right',
        gestureEnabled: true,
        animationMatchesGesture: true,
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="forgot-password"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="reset-password"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
