import { StyleSheet, Text, View } from 'react-native';
import { avatarColors, colors, fonts } from '../theme';

interface Props {
  name: string;
  size?: number;
}

/** Up to two initials, e.g. "Sam Lee" → "SL". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part?.[0]?.toUpperCase() ?? '').join('') || '?';
}

/** The same name always gets the same colour. */
function colourFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarColors[hash % avatarColors.length] ?? avatarColors[0];
}

/** A pastel circle with the friend's initials. Decorative: the name is always shown beside it. */
export function Avatar({ name, size = 44 }: Props) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colourFor(name) },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.display, fontWeight: '700', color: colors.text },
});
