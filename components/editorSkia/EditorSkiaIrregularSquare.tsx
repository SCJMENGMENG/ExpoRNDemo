import {
  Canvas,
  DashPathEffect,
  Paint,
  Path,
  Rect,
  Skia,
} from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useDerivedValue, useSharedValue } from 'react-native-reanimated';

const HANDLE_SIZE = 16;
const HANDLE_HALF = HANDLE_SIZE / 2;
const HANDLE_STROKE = 4;

type Corner = 0 | 1 | 2 | 3 | null;

export default function QuadEditor() {
  /** 四个角点（世界坐标） */
  const p0 = useSharedValue({ x: 100, y: 100 });
  const p1 = useSharedValue({ x: 260, y: 100 });
  const p2 = useSharedValue({ x: 260, y: 260 });
  const p3 = useSharedValue({ x: 100, y: 260 });

  const activeCorner = useSharedValue<Corner>(null);

  /** Path */
  const quadPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.moveTo(p0.value.x, p0.value.y);
    p.lineTo(p1.value.x, p1.value.y);
    p.lineTo(p2.value.x, p2.value.y);
    p.lineTo(p3.value.x, p3.value.y);
    p.close();
    return p;
  });

  /** 命中检测 */
  const hitCorner = (x: number, y: number) => {
    'worklet';
    const pts = [p0, p1, p2, p3];
    for (let i = 0; i < 4; i++) {
      const dx = x - pts[i].value.x;
      const dy = y - pts[i].value.y;
      if (dx * dx + dy * dy <= HANDLE_SIZE * HANDLE_SIZE) {
        return i as Corner;
      }
    }
    return null;
  };

  /** 手势 */
  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';
      activeCorner.value = hitCorner(e.x, e.y);
    })
    .onUpdate(e => {
      'worklet';
      if (activeCorner.value === null) return;

      const target = [p0, p1, p2, p3][activeCorner.value];
      target.value = { x: e.x, y: e.y };
    })
    .onFinalize(() => {
      'worklet';
      activeCorner.value = null;
    });

  /** 角点 Rect 坐标 */
  const handle = (p: Animated.SharedValue<{ x: number; y: number }>) => ({
    x: useDerivedValue(() => p.value.x - HANDLE_HALF),
    y: useDerivedValue(() => p.value.y - HANDLE_HALF),
  });

  const h0 = handle(p0);
  const h1 = handle(p1);
  const h2 = handle(p2);
  const h3 = handle(p3);

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* 填充 */}
            <Path path={quadPath} color="rgba(33,150,243,0.25)" />

            {/* 边框 */}
            <Path path={quadPath} style="stroke" color="#2196F3" strokeWidth={2}>
              <DashPathEffect intervals={[8, 4]} />
            </Path>

            {/* 四个角点 */}
            {[h0, h1, h2, h3].map((h, i) => (
              <Rect
                key={i}
                x={h.x}
                y={h.y}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                color="#fff"
              >
                <Paint
                  style="stroke"
                  strokeWidth={HANDLE_STROKE}
                  color="#4CAF50"
                />
              </Rect>
            ))}
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}
