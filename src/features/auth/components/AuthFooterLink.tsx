import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '../authTheme';

type Props = {
  prompt: string;
  actionLabel: string;
  onPress?: () => void;
};

export function AuthFooterLink({ prompt, actionLabel, onPress }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.prompt}>{prompt} </Text>
      <Pressable onPress={onPress} hitSlop={6}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingTop: 24,
  },
  prompt: {
    fontSize: 14,
    color: authColors.textSecondary,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: authColors.link,
  },
});
