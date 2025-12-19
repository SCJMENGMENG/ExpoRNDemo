import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export default function RectEditorSkia() {
  // 矩形参数
  const x = useSharedValue(100);
  const y = useSharedValue(200);
  const w = useSharedValue(160);
  const h = useSharedValue(120);

  // 是否激活拖拽（命中后才为 true）
  const isActive = useSharedValue(false);

  // delta 计算
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);

  // Skia Path
  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addRect({
      x: x.value,
      y: y.value,
      width: w.value,
      height: h.value,
    });
    return p;
  });

  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';

      const px = e.x;
      const py = e.y;

      const hit =
        px >= x.value &&
        px <= x.value + w.value &&
        py >= y.value &&
        py <= y.value + h.value;

      isActive.value = hit;

      if (hit) {
        lastX.value = 0;
        lastY.value = 0;
      }
    })
    .onUpdate(e => {
      'worklet';

      // ❗️关键拦截点
      if (!isActive.value) return;

      const dx = e.translationX - lastX.value;
      const dy = e.translationY - lastY.value;

      lastX.value = e.translationX;
      lastY.value = e.translationY;

      x.value += dx;
      y.value += dy;
    })
    .onFinalize(() => {
      'worklet';
      isActive.value = false;
    });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Path
              path={path}
              color="rgba(33,150,243,0.3)"
              style="fill"
            />
            <Path
              path={path}
              color="#2196F3"
              style="stroke"
              strokeWidth={2}
            />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}
