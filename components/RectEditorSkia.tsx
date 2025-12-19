import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Circle, Skia } from '@shopify/react-native-skia';
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

  // 旋转角度（弧度）
  const rotation = useSharedValue(0);

  // 命中状态
  const isDragging = useSharedValue(false);
  const isRotating = useSharedValue(false);

  // delta / angle 计算
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastAngle = useSharedValue(0);

  // 矩形中心
  const center = useDerivedValue(() => {
    return {
      cx: x.value + w.value / 2,
      cy: y.value + h.value / 2,
    };
  });

  // 旋转手柄位置（始终在矩形正上方，随旋转和移动变化）
  const rotateHandleX = useDerivedValue(() => {
    const r = h.value / 2 + 30;
    const angle = -Math.PI / 2 + rotation.value;
    return center.value.cx + r * Math.cos(angle);
  });

  const rotateHandleY = useDerivedValue(() => {
    const r = h.value / 2 + 30;
    const angle = -Math.PI / 2 + rotation.value;
    return center.value.cy + r * Math.sin(angle);
  });

  // Path（带旋转）
  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.addRect({ x: x.value, y: y.value, width: w.value, height: h.value });

    const m = Skia.Matrix();
    m.translate(center.value.cx, center.value.cy);
    m.rotate(rotation.value);
    m.translate(-center.value.cx, -center.value.cy);

    p.transform(m);
    return p;
  });

  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';

      const px = e.x;
      const py = e.y;

      // 1️⃣ 命中旋转手柄
      const dxH = px - rotateHandleX.value;
      const dyH = py - rotateHandleY.value;
      const hitRotate = dxH * dxH + dyH * dyH <= 16 * 16;

      if (hitRotate) {
        isRotating.value = true;
        lastAngle.value = Math.atan2(
          py - center.value.cy,
          px - center.value.cx
        );
        return;
      }

      // 2️⃣ 命中矩形本体（轴对齐命中）
      const hitRect =
        px >= x.value &&
        px <= x.value + w.value &&
        py >= y.value &&
        py <= y.value + h.value;

      isDragging.value = hitRect;
      lastX.value = 0;
      lastY.value = 0;
    })
    .onUpdate(e => {
      'worklet';

      // 旋转
      if (isRotating.value) {
        const angle = Math.atan2(
          e.y - center.value.cy,
          e.x - center.value.cx
        );
        rotation.value += angle - lastAngle.value;
        lastAngle.value = angle;
        return;
      }

      // 平移
      if (isDragging.value) {
        const dx = e.translationX - lastX.value;
        const dy = e.translationY - lastY.value;
        lastX.value = e.translationX;
        lastY.value = e.translationY;
        x.value += dx;
        y.value += dy;
      }
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      isRotating.value = false;
    });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* 矩形 */}
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

            {/* 旋转手柄 */}
            <Circle
              cx={rotateHandleX}
              cy={rotateHandleY}
              r={8}
              color="#FF9800"
            />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}
