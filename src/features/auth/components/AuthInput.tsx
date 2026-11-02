import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { authColors } from '../authTheme';

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
          placeholderTextColor={authColors.textMuted}
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
              color={authColors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {hasError ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: authColors.text,
  },
  field: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldFocused: {
    borderColor: authColors.borderFocus,
    borderWidth: 1.5,
  },
  fieldError: {
    borderColor: authColors.danger,
  },
  prefix: {
    fontSize: 15,
    color: authColors.textSecondary,
    marginRight: 8,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: authColors.text,
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
    color: authColors.danger,
  },
});
