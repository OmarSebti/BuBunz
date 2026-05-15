import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Canvas,
  Circle,
  RadialGradient,
  Rect,
  vec,
  BlurMask,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Accelerometer } from 'expo-sensors';
import { useScore } from './hooks/useScore';

const DAMPING = 0.97;
const ACCEL_FACTOR = 0.9;
const MAX_SPEED = 35;
const VERSION = 'v1.0.1';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BALL_R = Math.round(Math.min(SCREEN_W, SCREEN_H) * 0.07);

export function GameScreen() {
  const [playing, setPlaying] = useState(false);
  const { count, reportBounce } = useScore();

  const bx = useSharedValue(SCREEN_W / 2);
  const by = useSharedValue(SCREEN_H / 2);
  const vx = useSharedValue(5);
  const vy = useSharedValue(3);
  const accelX = useSharedValue(0);
  const accelY = useSharedValue(0);
  const isPlaying = useSharedValue(false);

  const touchingLeft = useSharedValue(false);
  const touchingRight = useSharedValue(false);
  const touchingTop = useSharedValue(false);
  const touchingBottom = useSharedValue(false);

  const onBounce = useCallback(() => {
    reportBounce();
  }, [reportBounce]);

  useEffect(() => {
    if (!playing) return;

    let sub: ReturnType<typeof Accelerometer.addListener> | null = null;

    Accelerometer.isAvailableAsync().then((available) => {
      if (!available) return;
      Accelerometer.setUpdateInterval(16);
      sub = Accelerometer.addListener(({ x, y }) => {
        accelX.value = x * ACCEL_FACTOR;
        accelY.value = -y * ACCEL_FACTOR;
      });
    });

    return () => {
      sub?.remove();
    };
  }, [playing, accelX, accelY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        accelX.value = gs.vx * 0.08;
        accelY.value = gs.vy * 0.08;
      },
      onPanResponderRelease: () => {
        accelX.value = 0;
        accelY.value = 0;
      },
    })
  ).current;

  // Physics loop runs as a Reanimated worklet on the UI thread
  useFrameCallback(() => {
    'worklet';
    if (!isPlaying.value) return;

    vx.value += accelX.value;
    vy.value += accelY.value;
    vx.value *= DAMPING;
    vy.value *= DAMPING;
    vx.value = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vx.value));
    vy.value = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, vy.value));
    bx.value += vx.value;
    by.value += vy.value;

    let bounced = false;

    if (bx.value <= BALL_R) {
      bx.value = BALL_R;
      vx.value = Math.abs(vx.value);
      if (!touchingLeft.value) {
        touchingLeft.value = true;
        bounced = true;
      }
    } else {
      touchingLeft.value = false;
    }

    if (bx.value >= SCREEN_W - BALL_R) {
      bx.value = SCREEN_W - BALL_R;
      vx.value = -Math.abs(vx.value);
      if (!touchingRight.value) {
        touchingRight.value = true;
        bounced = true;
      }
    } else {
      touchingRight.value = false;
    }

    if (by.value <= BALL_R) {
      by.value = BALL_R;
      vy.value = Math.abs(vy.value);
      if (!touchingTop.value) {
        touchingTop.value = true;
        bounced = true;
      }
    } else {
      touchingTop.value = false;
    }

    if (by.value >= SCREEN_H - BALL_R) {
      by.value = SCREEN_H - BALL_R;
      vy.value = -Math.abs(vy.value);
      if (!touchingBottom.value) {
        touchingBottom.value = true;
        bounced = true;
      }
    } else {
      touchingBottom.value = false;
    }

    if (bounced) {
      // runOnJS bridges the worklet back to the JS thread to update score
      runOnJS(onBounce)();
    }
  });

  const shadowCx = useDerivedValue(() => bx.value + 3);
  const shadowCy = useDerivedValue(() => by.value + 6);
  const ballCx = useDerivedValue(() => bx.value);
  const ballCy = useDerivedValue(() => by.value);
  const gradCenter = useDerivedValue(() =>
    vec(bx.value - BALL_R * 0.3, by.value - BALL_R * 0.3)
  );
  const gradFocal = useDerivedValue(() =>
    vec(bx.value, by.value)
  );
  const highlightCx = useDerivedValue(() => bx.value - BALL_R * 0.3);
  const highlightCy = useDerivedValue(() => by.value - BALL_R * 0.3);

  function handleStart() {
    isPlaying.value = true;
    setPlaying(true);
  }

  return (
    <View style={styles.container} {...(playing ? panResponder.panHandlers : {})}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} color="#228B22" />

        {/* Ball shadow */}
        <Circle cx={shadowCx} cy={shadowCy} r={BALL_R} color="rgba(0,0,0,0.22)">
          <BlurMask blur={6} style="normal" />
        </Circle>

        {/* Ball with radial gradient */}
        <Circle cx={ballCx} cy={ballCy} r={BALL_R}>
          <RadialGradient
            c={gradCenter}
            r={BALL_R}
            colors={['#fff176', '#FFD700', '#b8860b']}
            positions={[0, 0.45, 1]}
          />
        </Circle>

        {/* Specular highlight */}
        <Circle
          cx={highlightCx}
          cy={highlightCy}
          r={BALL_R * 0.22}
          color="rgba(255,255,255,0.35)"
        />
      </Canvas>

      {/* Version string bottom-left */}
      <View style={styles.versionContainer} pointerEvents="none">
        <Text style={styles.versionText}>{VERSION}</Text>
      </View>

      {/* Score counter top-right */}
      <View style={styles.scoreContainer} pointerEvents="none">
        <Text style={styles.scoreLabel}>BuBunz</Text>
        <Text style={styles.scoreValue}>{count}</Text>
      </View>

      {/* Splash overlay */}
      {!playing && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>BuBunz</Text>
          <Text style={styles.overlaySubtitle}>
            Tilt your phone to move the ball. It bounces off the walls!
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>Tap to Play</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#228B22',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  versionText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scoreContainer: {
    position: 'absolute',
    top: 48,
    right: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scoreValue: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,50,10,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  overlaySubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  startButton: {
    marginTop: 12,
    backgroundColor: '#E30000',
    borderRadius: 50,
    paddingHorizontal: 52,
    paddingVertical: 18,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
