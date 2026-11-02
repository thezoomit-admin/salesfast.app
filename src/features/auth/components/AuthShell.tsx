import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from './BrandMark';
import { authColors } from '../authTheme';

type Props = {
  title: string;
  subtitle: string;
  switchPrompt?: string;
  switchAction?: ReactNode;
  children: ReactNode;
};

/** Centered auth form layout — Hisab AuthShell pattern. */
export function AuthShell({
  title,
  subtitle,
  switchPrompt,
  switchAction,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showSwitch = Boolean(switchPrompt || switchAction);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 28,
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
      >
        <View style={styles.column}>
          <View style={styles.brandBlock}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Salesfast"
              onPress={() => router.replace('/(auth)/index')}
              style={styles.logoPress}
            >
              <BrandMark variant="icon" size={64} />
            </Pressable>
            <Text style={styles.brandName}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.form}>{children}</View>

          {showSwitch ? (
            <View style={styles.switchRow}>
              {switchPrompt ? (
                <Text style={styles.switchPrompt}>{switchPrompt} </Text>
              ) : null}
              {switchAction}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.cream,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  column: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingVertical: 12,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoPress: {
    alignItems: 'center',
  },
  brandName: {
    marginTop: 14,
    color: authColors.text,
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    color: authColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchPrompt: {
    color: authColors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
});
