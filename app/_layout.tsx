import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { BrandSplash } from '@/features/auth/components/BrandSplash';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { CallSyncBootstrap } from '@/features/call-tracking/CallSyncBootstrap';
import { NotificationsBootstrap } from '@/features/notifications/NotificationsBootstrap';
import { colors } from '@/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (bootstrapping) return;
    // Wait until the root navigator exists — avoids ROUTE_NAMES_CHANGED noise.
    if (!navigationState?.key) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, bootstrapping, segments, router, navigationState?.key]);

  useEffect(() => {
    if (!bootstrapping) {
      SplashScreen.hideAsync();
    }
  }, [bootstrapping]);

  // Keep Stack mounted during bootstrap so navigators aren't torn down/recreated.
  return (
    <View style={styles.gate}>
      {children}
      {bootstrapping ? (
        <View style={styles.splashOverlay} pointerEvents="auto">
          <BrandSplash mode="logo" />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <CallSyncBootstrap />
          <NotificationsBootstrap />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="leads/[id]"
              options={{
                headerShown: true,
                title: 'Lead details',
                headerTintColor: colors.brand,
              }}
            />
            <Stack.Screen
              name="notifications"
              options={{
                headerShown: true,
                title: 'Notifications',
                headerTintColor: colors.brand,
              }}
            />
            <Stack.Screen
              name="activities"
              options={{
                headerShown: true,
                title: 'Activities',
                headerTintColor: colors.brand,
              }}
            />
            <Stack.Screen
              name="call-sync/setup"
              options={{
                headerShown: true,
                title: 'Call sync setup',
                headerTintColor: colors.brand,
              }}
            />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
