import {
  Canvas,
  Circle,
  DashPathEffect,
  Paint,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useEditorBounds } from './useEditorBounds';

const HANDLE_R = 24;
const MIN_RADIUS = 30;

export default function EditorSkiaCircle() {
  const rotateImg = useImage(require('@/assets/images/favicon.png'));

  // 设置边界hook
  const bounds = useEditorBounds(412, 412);

  // 圆心 & 半径
  const cx = useSharedValue(180);
  const cy = useSharedValue(300);
  const r = useSharedValue(80);

  // 状态
  const isDragging = useSharedValue(false);
  const isScaling = useSharedValue(false);

  // 手势中间变量
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const startDist = useSharedValue(0);
  const startR = useSharedValue(0);

  // 顶部缩放手柄位置
  const handleX = useDerivedValue(() => cx.value);
  const handleY = useDerivedValue(() => cy.value - r.value - 30);

  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';
      const px = e.x;
      const py = e.y;

      // 1️⃣ 命中缩放手柄
      const dxH = px - handleX.value;
      const dyH = py - handleY.value;
      if (dxH * dxH + dyH * dyH <= HANDLE_R * HANDLE_R) {
        isScaling.value = true;

        const dx = px - cx.value;
        const dy = py - cy.value;
        startDist.value = Math.sqrt(dx * dx + dy * dy);
        startR.value = r.value;
        return;
      }

      // 2️⃣ 命中圆内部 → 拖动
      const dx = px - cx.value;
      const dy = py - cy.value;
      if (dx * dx + dy * dy <= r.value * r.value) {
        isDragging.value = true;
        lastX.value = px;
        lastY.value = py;
      }
    })
    .onUpdate(e => {
      'worklet';

      // 缩放
      if (isScaling.value) {
        const dx = e.x - cx.value;
        const dy = e.y - cy.value;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let nextR = startR.value + (dist - startDist.value);
        nextR = Math.max(MIN_RADIUS, nextR);

        // 可出界
        // r.value = nextR;

        // 禁止出界
        const maxR = bounds.maxRadiusAt(cx.value, cy.value);
        r.value = Math.min(nextR, maxR);
        return;
      }

      // 拖动
      if (isDragging.value) {
        const dx = e.x - lastX.value;
        const dy = e.y - lastY.value;
        lastX.value = e.x;
        lastY.value = e.y;

        // 可出界
        // cx.value += dx;
        // cy.value += dy;

        // 禁止出界
        cx.value = bounds.clampX(cx.value + dx, r.value);
        cy.value = bounds.clampY(cy.value + dy, r.value);
      }
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      isScaling.value = false;
    });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <Canvas style={StyleSheet.absoluteFill}>

          {/* 缩放手柄 */}
          <SkiaImage
            image={rotateImg}
            x={handleX}
            y={handleY}
            width={HANDLE_R}
            height={HANDLE_R}
            fit="contain"
          />
          
          {/* 圆形虚线边框 */}
          <Circle cx={cx} cy={cy} r={r} color="#2196F3">
            {/* 边框 */}
            <Paint
              style="stroke"
              strokeWidth={2}
              color="#E91E63"
            >
              <DashPathEffect intervals={[8, 6]} />
            </Paint>
          </Circle>
        </Canvas>
      </GestureDetector>
    </View>
  );
}
