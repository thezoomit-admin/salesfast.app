import { StyleSheet, Text, View } from 'react-native';

import { authColors } from '../authTheme';

export function OrDivider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>or</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: authColors.border,
  },
  label: {
    fontSize: 13,
    color: authColors.textMuted,
    fontWeight: '500',
  },
});
