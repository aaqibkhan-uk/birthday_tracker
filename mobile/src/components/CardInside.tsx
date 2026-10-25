import { StyleSheet, Text, View } from 'react-native';
import {
  getInsideMessageFontSize,
  INSIDE_LINE_HEIGHT,
  INSIDE_PAGE_PADDING,
} from '../domain/insideMessage';
import { colors } from '../theme';

export const PAPER = '#fffdf8';

interface Props {
  message: string;
  width: number;
}

/** The inside right-hand page: the message, sized so it always fits (FR-4.8). */
export function CardInside({ message, width }: Props) {
  const text = message.trim();
  const fontSize = getInsideMessageFontSize(text, width);
  return (
    <View style={[styles.page, { width, padding: width * INSIDE_PAGE_PADDING }]}>
      <Text
        style={[styles.text, { fontSize, lineHeight: fontSize * INSIDE_LINE_HEIGHT }]}
        accessibilityLabel={`Inside message: ${text}`}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    aspectRatio: 5 / 7,
    backgroundColor: PAPER,
    justifyContent: 'center',
    // Last resort if the size estimate is ever too generous.
    overflow: 'hidden',
  },
  text: { color: colors.text, textAlign: 'center' },
});
