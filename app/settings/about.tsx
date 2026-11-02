import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import type { ComponentProps } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  ADMIN_CONTACT_EMAIL,
  ADMIN_CONTACT_WHATSAPP,
  API_BASE_URL,
  APP_BUILD,
  APP_NAME,
  APP_VERSION,
} from '@/constants/config';
import { colors, radii, spacing, typography } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type InfoRow = {
  key: string;
  label: string;
  value: string;
  icon: IoniconName;
  onPress?: () => void;
};

function apiLabel(url: string) {
  if (url.includes('thezoomit.com')) return 'Staging / cloud';
  if (/localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url)) return 'Local';
  return 'Custom';
}

function platformLabel() {
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';
  return 'Web';
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const nativeVersion =
    Constants.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    APP_VERSION;
  // Expo Go often has no nativeBuildVersion for this app — fall back to config.
  const configBuild =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode;
  const buildNumber =
    Constants.nativeBuildVersion ||
    (configBuild != null && String(configBuild)) ||
    APP_BUILD;
  const env = apiLabel(API_BASE_URL);

  const rows: InfoRow[] = [
    {
      key: 'version',
      label: 'Version',
      value: nativeVersion,
      icon: 'pricetag-outline',
    },
    {
      key: 'build',
      label: 'Build',
      value: String(buildNumber),
      icon: 'construct-outline',
    },
    {
      key: 'platform',
      label: 'Platform',
      value: `${platformLabel()} · ${String(Platform.Version)}`,
      icon: 'phone-portrait-outline',
    },
    {
      key: 'env',
      label: 'API environment',
      value: env,
      icon: 'cloud-outline',
    },
    {
      key: 'api',
      label: 'API endpoint',
      value: API_BASE_URL,
      icon: 'link-outline',
    },
  ];

  const supportRows: InfoRow[] = [
    {
      key: 'email',
      label: 'Support email',
      value: ADMIN_CONTACT_EMAIL,
      icon: 'mail-outline',
      onPress: () => {
        void Linking.openURL(`mailto:${ADMIN_CONTACT_EMAIL}`);
      },
    },
  ];
  if (ADMIN_CONTACT_WHATSAPP) {
    supportRows.push({
      key: 'whatsapp',
      label: 'WhatsApp',
      value: ADMIN_CONTACT_WHATSAPP,
      icon: 'logo-whatsapp',
      onPress: () => {
        void Linking.openURL(`https://wa.me/${ADMIN_CONTACT_WHATSAPP}`);
      },
    });
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="App info" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/salesfast-favicon.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>Sales CRM for field agents</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionPillText}>v{nativeVersion}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.card}>
          {rows.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <View style={styles.iconSlot}>
                  <Ionicons name={row.icon} size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue} selectable>
                    {row.value}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          {supportRows.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={row.onPress}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.iconSlot}>
                  <Ionicons name={row.icon} size={18} color={colors.brand} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={[styles.rowValue, styles.rowValueLink]}>
                    {row.value}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} ZOOMIT · Salesfast CRM
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 6,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  appName: {
    ...typography.title,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  versionPill: {
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  versionPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#EEF2F7',
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowValue: {
    ...typography.subtitle,
    fontSize: 14,
    color: colors.text,
  },
  rowValueLink: {
    color: colors.brand,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 62,
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
