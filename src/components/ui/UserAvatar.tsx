import {
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Same default as salesfast.admin `/assets/user-profile.png`. */
const DEFAULT_AVATAR = require('../../../assets/images/user-profile.png');

type Props = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Kept for call-site compat; default image replaces initials. */
  muted?: boolean;
};

/** Profile photo, or admin default avatar when none is set. */
export function UserAvatar({ uri, size = 48, style }: Props) {
  const radius = size / 2;

  return (
    <Image
      source={uri ? { uri } : DEFAULT_AVATAR}
      style={[
        styles.image,
        { width: size, height: size, borderRadius: radius },
        style as object,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#EEF2F7',
  },
});
