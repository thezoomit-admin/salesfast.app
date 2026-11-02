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
        fullScreenGestureEnabled: true,
        animationDuration: 280,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
