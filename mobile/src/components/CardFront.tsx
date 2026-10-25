import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { resolveImageUri } from '../services/fileStorage';
import { colors, radius } from '../theme';

interface Props {
  imagePath: string;
  frontText?: string | null;
  /** Font size for the front text; scale with the card's width. */
  textSize?: number;
}

/**
 * The card front: the design with the front text overlaid by the app, never baked into the
 * image (FR-4.3). The text sits in the upper third, which the prompt asks the model to keep calm.
 */
export function CardFront({ imagePath, frontText, textSize = 26 }: Props) {
  const text = frontText?.trim();
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: resolveImageUri(imagePath) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
      {text ? (
        <Text
          style={[styles.text, { fontSize: textSize }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 5 / 7,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  text: {
    position: 'absolute',
    top: '9%',
    left: '8%',
    right: '8%',
    textAlign: 'center',
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
