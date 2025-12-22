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
import {
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

const HANDLE = 16;
const HANDLE_HALF = HANDLE / 2;

type End = 'start' | 'end' | null;

export default function EditorSkiaLine() {
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
   * 是否命中 手指点到线段的最短距离
   ====================== */
  const pointToSegmentDistance = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    'worklet';

    const vx = x2 - x1;
    const vy = y2 - y1;
    const wx = px - x1;
    const wy = py - y1;

    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) {
      return Math.hypot(px - x1, py - y1);
    }

    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) {
      return Math.hypot(px - x2, py - y2);
    }

    const t = c1 / c2;
    const projX = x1 + t * vx;
    const projY = y1 + t * vy;

    return Math.hypot(px - projX, py - projY);
  };


  /** ======================
   * 手势
   ====================== */
  const pan = Gesture.Pan()
    .onBegin(e => {
      'worklet';

      const hitPoint = (p: { x: number; y: number }) => {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        return dx * dx + dy * dy <= HANDLE * HANDLE;
      };

      // 1️⃣ 命中起点
      if (hitPoint(start.value)) {
        activeEnd.value = 'start';
        anchorX.value = end.value.x;
        anchorY.value = end.value.y;
      }
      // 2️⃣ 命中终点
      else if (hitPoint(end.value)) {
        activeEnd.value = 'end';
        anchorX.value = start.value.x;
        anchorY.value = start.value.y;
      }
      // 3️⃣ 命中线段（距离判断）
      else {
        const dist = pointToSegmentDistance(
          e.x,
          e.y,
          start.value.x,
          start.value.y,
          end.value.x,
          end.value.y
        );

        const HIT_TOLERANCE = 12; // 线段可点宽度

        if (dist <= HIT_TOLERANCE) {
          isDragging.value = true;
          lastX.value = e.translationX;
          lastY.value = e.translationY;
        }
      }

      // 如果是端点操作，冻结初始几何
      if (activeEnd.value) {
        const dx = e.x - anchorX.value;
        const dy = e.y - anchorY.value;
        startLen.value = Math.hypot(dx, dy);
        startAngle.value = Math.atan2(dy, dx);
      }
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
      </GestureDetector>
    </View>
  );
}
