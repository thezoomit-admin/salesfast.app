import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { BrandSplash } from '@/features/auth/components/BrandSplash';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { CallSyncBootstrap } from '@/features/call-tracking/CallSyncBootstrap';
import { installLeadWriteDefaults } from '@/features/leads/leadWrites';
import { NotificationsBootstrap } from '@/features/notifications/NotificationsBootstrap';
import { installConnectivityManagers } from '@/lib/connectivity';
import { installQueryCacheMonitor } from '@/lib/perfMonitor';
import { useAccountQueryCache } from '@/lib/useAccountQueryCache';
import { ThemeProvider, useTheme } from '@/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();
installConnectivityManagers();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping: authBootstrapping } = useAuth();
  // Hold the splash until this account's saved data is in memory, so the
  // first screen paints with content instead of a spinner.
  const bootstrapping = useAccountQueryCache(user?.id ?? null, authBootstrapping);
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
      <OfflineBanner />
      {bootstrapping ? (
        <View style={styles.splashOverlay} pointerEvents="auto">
          <BrandSplash mode="logo" />
        </View>
      ) : null}
    </View>
  );
}

function ThemedStack() {
  const { colors, resolved } = useTheme();

  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          // Hisab-style native push/pop — slide + edge swipe back.
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationDuration: 280,
          animationTypeForReplace: 'push',
        }}
      >
        {/* Auth ↔ app: fade so the gate doesn't slide over tabs. */}
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        {/* Folder route: Overview / History / Calls / Views under leads/[id]/ */}
        <Stack.Screen name="leads/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="leads/new" />
        <Stack.Screen name="activities" />
        <Stack.Screen name="call-sync/setup" />
        <Stack.Screen name="settings/edit" />
        <Stack.Screen name="settings/about" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
        defaultOptions: {
          queries: {
            // Cached data renders instantly; screens refresh in the background
            // once it is older than this. Mutations invalidate what they touch.
            staleTime: 2 * 60_000,
            gcTime: 30 * 60_000,
            retry: 1,
          },
        },
      });
    // Before any saved offline write is restored, so it knows how to run.
    installLeadWriteDefaults(client);
    installQueryCacheMonitor(client);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate>
            <CallSyncBootstrap />
            <NotificationsBootstrap />
            <ThemedStack />
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
});
