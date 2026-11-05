import { HugeiconsIcon } from '@hugeicons/react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CountryCode } from 'libphonenumber-js';

import { Search02Icon } from '@/components/icons/hugeicons';
import {
  listCountries,
  DEFAULT_COUNTRY_CODE,
  findCountry,
  toE164,
  type CountryOption,
} from '../data/countries';
import { useTheme, type ThemeColors } from '@/theme';

type Props = {
  /** National number only (digits), or full value handled via onChangeE164. */
  value: string;
  onChangeNational: (national: string) => void;
  /** Called with full E.164 whenever country or national digits change. */
  onChangeE164?: (e164: string) => void;
  countryCode?: CountryCode;
  onChangeCountry?: (code: CountryCode) => void;
  error?: string;
  label?: string;
};

export function CountryPhoneInput({
  value,
  onChangeNational,
  onChangeE164,
  countryCode = DEFAULT_COUNTRY_CODE,
  onChangeCountry,
  error,
  label = 'Phone number',
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const country = findCountry(countryCode);
  const hasError = Boolean(error);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listCountries();
    return listCountries().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q.replace(/^\+/, '')) ||
        c.code.toLowerCase().includes(q)
    );
  }, [query]);

  function emit(nextCountry: CountryOption, national: string) {
    onChangeE164?.(toE164(nextCountry.dialCode, national));
  }

  function selectCountry(next: CountryOption) {
    onChangeCountry?.(next.code);
    emit(next, value);
    setPickerOpen(false);
    setQuery('');
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && !hasError ? styles.fieldFocused : null,
          hasError ? styles.fieldError : null,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country ${country.name}`}
          onPress={() => setPickerOpen(true)}
          style={styles.countryBtn}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dial}>+{country.dialCode}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          value={value}
          onChangeText={(text) => {
            const national = text.replace(/[^\d\s-]/g, '');
            onChangeNational(national);
            emit(country, national);
          }}
          placeholder="Enter your phone number"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          style={styles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {hasError ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={[styles.modal, { paddingTop: insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select country</Text>
            <Pressable
              onPress={() => {
                setPickerOpen(false);
                setQuery('');
              }}
              hitSlop={8}
            >
              <Text style={styles.modalClose}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <HugeiconsIcon
              icon={Search02Icon}
              size={16}
              color={colors.textMuted}
              strokeWidth={1.5}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const selected = item.code === country.code;
              return (
                <Pressable
                  onPress={() => selectCountry(item)}
                  style={[styles.row, selected ? styles.rowSelected : null]}
                >
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowDial}>+{item.dialCode}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 18,
    },
    label: {
      marginBottom: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    field: {
      minHeight: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surface : colors.white,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    fieldFocused: {
      borderColor: colors.brand,
      borderWidth: 1.5,
    },
    fieldError: {
      borderColor: colors.danger,
    },
    countryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    flag: {
      fontSize: 18,
    },
    dial: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    divider: {
      width: 1,
      height: 22,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 14,
    },
    error: {
      marginTop: 4,
      marginLeft: 12,
      fontSize: 12,
      color: colors.danger,
    },
    modal: {
      flex: 1,
      backgroundColor: isDark ? colors.background : colors.white,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modalClose: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.brand,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surface : '#FAFAFA',
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowSelected: {
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.14)'
        : 'rgba(10, 79, 192, 0.06)',
    },
    rowFlag: {
      fontSize: 22,
    },
    rowName: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    rowDial: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}
