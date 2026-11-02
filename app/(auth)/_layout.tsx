import { Stack } from 'expo-router';

import { authColors } from '@/features/auth/authTheme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: authColors.cream },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
