import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { radius } from '../theme';
import { Button } from './Button';
import { CardFront } from './CardFront';
import { CardInside, PAPER } from './CardInside';

interface Props {
  imagePath: string;
  frontText: string | null;
  insideMessage: string;
  /** Width available for the open card (two pages side by side). */
  width: number;
}

const DURATION_MS = 550;
// The closed card is shown larger, then shrinks to fit two pages side by side as it opens.
const CLOSED_SCALE = 1.4;

/**
 * FR-5.1: a card that opens like a real one. The front cover swings open on its left edge,
 * showing the blank back of the cover on the left and the message on the right.
 * Tap the card or swipe left to open; tap or swipe right to close.
 */
export function CardPreview({ imagePath, frontText, insideMessage, width }: Props) {
  const page = Math.floor(width / 2);
  const pageHeight = (page * 7) / 5;
  // 0 = closed, 1 = fully open.
  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const [open, setOpen] = useState(false);

  const animateTo = (target: 0 | 1) => {
    progress.set(withTiming(target, { duration: DURATION_MS }));
    setOpen(target === 1);
  };

  const tap = useTapGesture({
    onActivate: () => {
      'worklet';
      const target = progress.get() > 0.5 ? 0 : 1;
      progress.set(withTiming(target, { duration: DURATION_MS }));
      scheduleOnRN(setOpen, target === 1);
    },
  });

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-20, 20],
    onActivate: () => {
      'worklet';
      dragStart.set(progress.get());
    },
    onUpdate: (event) => {
      'worklet';
      // Dragging left by one page width opens the card fully.
      const next = dragStart.get() - event.translationX / page;
      progress.set(Math.min(1, Math.max(0, next)));
    },
    onDeactivate: (event) => {
      'worklet';
      const flick = Math.abs(event.velocityX) > 400;
      const target = flick ? (event.velocityX < 0 ? 1 : 0) : progress.get() > 0.5 ? 1 : 0;
      progress.set(withTiming(target, { duration: DURATION_MS / 2 }));
      scheduleOnRN(setOpen, target === 1);
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  // The spread is two pages wide with the hinge in the middle. Closed, only the right half (the
  // cover) shows, so shift it left to centre it.
  const spreadStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.get(), [0, 1], [CLOSED_SCALE, 1]);
    return {
      transform: [{ translateX: (-page / 2) * scale * (1 - progress.get()) }, { scale }],
    };
  });

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: page * 6 }, { rotateY: `${-180 * progress.get()}deg` }],
  }));
  // Swap the cover's face at the halfway point (more reliable than backfaceVisibility).
  const frontFaceStyle = useAnimatedStyle(() => ({ opacity: progress.get() < 0.5 ? 1 : 0 }));
  const backFaceStyle = useAnimatedStyle(() => ({ opacity: progress.get() < 0.5 ? 0 : 1 }));
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5, 1], [0, 0.25, 0]),
  }));

  return (
    <View style={styles.container}>
      <View style={{ height: pageHeight * CLOSED_SCALE, justifyContent: 'center' }}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[styles.spread, { width: page * 2, height: pageHeight }, spreadStyle]}
          >
            {/* Inside right-hand page, under the cover. */}
            <View style={[styles.rightPage, { left: page }]}>
              <CardInside message={insideMessage} width={page} />
            </View>

            {/* The cover, hinged on its left edge (the spread's centre line). */}
            <Animated.View
              style={[
                styles.cover,
                { left: page, width: page, height: pageHeight, transformOrigin: 'left center' },
                coverStyle,
              ]}
            >
              <Animated.View style={[StyleSheet.absoluteFill, frontFaceStyle]}>
                <CardFront imagePath={imagePath} frontText={frontText} textSize={page * 0.11} />
              </Animated.View>
              {/* Back of the cover: blank paper, seen on the left once the card is open. */}
              <Animated.View style={[styles.coverBack, backFaceStyle]} />
              <Animated.View style={[styles.shade, shadeStyle]} pointerEvents="none" />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
      <Button
        label={open ? 'Close card' : 'Open card'}
        variant="secondary"
        onPress={() => animateTo(open ? 0 : 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16, alignSelf: 'stretch' },
  spread: { alignSelf: 'center' },
  rightPage: {
    position: 'absolute',
    top: 0,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    backgroundColor: PAPER,
  },
  cover: { position: 'absolute', top: 0 },
  coverBack: {
    ...StyleSheet.absoluteFill,
    backgroundColor: PAPER,
    borderRadius: radius.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#e6e0d4',
  },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: '#000', borderRadius: radius.sm },
});
