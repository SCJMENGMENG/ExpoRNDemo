import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Canvas,
  Path,
  Rect,
  Paint,
  Skia,
  DashPathEffect,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useDerivedValue,
} from 'react-native-reanimated';

const HANDLE = 16;
const HANDLE_HALF = HANDLE / 2;

type End = 'start' | 'end' | null;

export default function LineEditorSkia() {
  /** ======================
   * 基础状态
   ====================== */
  const cx = useSharedValue(200);
  const cy = useSharedValue(300);
  const length = useSharedValue(200);
  const rotation = useSharedValue(0);

  const activeEnd = useSharedValue<End>(null);
  const isDragging = useSharedValue(false);

  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);

  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);

  const startLen = useSharedValue(0);
  const startAngle = useSharedValue(0);

  /** ======================
   * 端点计算
   ====================== */
  const start = useDerivedValue(() => {
    const dx = Math.cos(rotation.value) * length.value / 2;
    const dy = Math.sin(rotation.value) * length.value / 2;
    return { x: cx.value - dx, y: cy.value - dy };
  });

  const end = useDerivedValue(() => {
    const dx = Math.cos(rotation.value) * length.value / 2;
    const dy = Math.sin(rotation.value) * length.value / 2;
    return { x: cx.value + dx, y: cy.value + dy };
  });

  /** ======================
   * 虚线路径
   ====================== */
  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.moveTo(start.value.x, start.value.y);
    p.lineTo(end.value.x, end.value.y);
    return p;
  });

  /** ======================
   * 手势
   ====================== */
  const pan = Gesture.Pan()
    .onBegin(e => {
      'worklet';

      const hit = (p: { x: number; y: number }) => {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        return dx * dx + dy * dy <= HANDLE * HANDLE;
      };

      if (hit(start.value)) {
        activeEnd.value = 'start';

        anchorX.value = end.value.x;
        anchorY.value = end.value.y;

      } else if (hit(end.value)) {
        activeEnd.value = 'end';

        anchorX.value = start.value.x;
        anchorY.value = start.value.y;

      } else {
        isDragging.value = true;
        lastX.value = 0;
        lastY.value = 0;
        return;
      }

      // 冻结初始几何状态
      const dx = e.x - anchorX.value;
      const dy = e.y - anchorY.value;

      startLen.value = Math.sqrt(dx * dx + dy * dy);
      startAngle.value = Math.atan2(dy, dx);
    })
    .onUpdate(e => {
      'worklet';

      // 端点拖拽：缩放 + 旋转
      if (activeEnd.value) {
        const dx = e.x - anchorX.value;
        const dy = e.y - anchorY.value;

        const newLen = Math.max(40, Math.sqrt(dx * dx + dy * dy));
        const newAngle = Math.atan2(dy, dx);

        length.value = newLen;
        rotation.value = newAngle;

        // 中心 = 锚点 + 向量的一半
        cx.value = anchorX.value + Math.cos(newAngle) * newLen / 2;
        cy.value = anchorY.value + Math.sin(newAngle) * newLen / 2;
        return;
      }

      // 拖动整条线
      if (isDragging.value) {
        const dx = e.translationX - lastX.value;
        const dy = e.translationY - lastY.value;
        lastX.value = e.translationX;
        lastY.value = e.translationY;
        cx.value += dx;
        cy.value += dy;
      }
    })
    .onFinalize(() => {
      'worklet';
      activeEnd.value = null;
      isDragging.value = false;
    });

  /** ======================
   * 渲染
   ====================== */
  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* 虚线 */}
            <Path
              path={path}
              color="#2196F3"
              style="stroke"
              strokeWidth={2}
            >
              <DashPathEffect intervals={[10, 6]} />
            </Path>

            {/* 起点 */}
            <Rect
              x={useDerivedValue(() => start.value.x - HANDLE_HALF)}
              y={useDerivedValue(() => start.value.y - HANDLE_HALF)}
              width={HANDLE}
              height={HANDLE}
              color="#fff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={4} />
            </Rect>

            {/* 终点 */}
            <Rect
              x={useDerivedValue(() => end.value.x - HANDLE_HALF)}
              y={useDerivedValue(() => end.value.y - HANDLE_HALF)}
              width={HANDLE}
              height={HANDLE}
              color="#fff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={4} />
            </Rect>
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}
