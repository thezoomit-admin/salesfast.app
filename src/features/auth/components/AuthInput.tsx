import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { useThemeColors, type ThemeColors } from '@/theme';

type Props = TextInputProps & {
  /** Shown above the field (design-kit style). */
  label?: string;
  error?: string;
  password?: boolean;
  prefix?: string;
  containerStyle?: ViewStyle;
};

/** Outlined field — label above, placeholder inside, brand focus. */
export function AuthInput({
  label,
  error,
  password,
  prefix,
  containerStyle,
  style,
  placeholder,
  ...rest
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const secure = password && !visible;
  const hasError = Boolean(error);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && !hasError ? styles.fieldFocused : null,
          hasError ? styles.fieldError : null,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          {...rest}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure}
          style={[styles.input, password ? styles.inputWithEye : null, style]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            hitSlop={10}
            onPress={() => setVisible((v) => !v)}
            style={styles.eye}
          >
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {hasError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
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
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
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
    prefix: {
      fontSize: 15,
      color: colors.textSecondary,
      marginRight: 8,
      fontWeight: '500',
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 14,
    },
    inputWithEye: {
      paddingRight: 8,
    },
    eye: {
      paddingLeft: 8,
      paddingVertical: 4,
    },
    error: {
      marginTop: 6,
      fontSize: 12,
      color: colors.danger,
    },
  });
}
