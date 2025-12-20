import {
  Canvas,
  Circle,
  DashPathEffect,
  Paint,
  Path,
  Rect,
  Skia,
} from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

const HANDLE = 16;
const HANDLE_HALF = HANDLE / 2;
const ROTATE_R = 16;
const ROTATE_OFFSET = 40;

type Corner = 0 | 1 | 2 | 3 | null;

export default function QuadEditorFull() {
  /** 四个角点（世界坐标） */
  const p0 = useSharedValue({ x: 120, y: 120 });
  const p1 = useSharedValue({ x: 280, y: 140 });
  const p2 = useSharedValue({ x: 260, y: 280 });
  const p3 = useSharedValue({ x: 140, y: 260 });

  const points = [p0, p1, p2, p3];

  /** 状态 */
  const activeCorner = useSharedValue<Corner>(null);
  const isDragging = useSharedValue(false);
  const isRotating = useSharedValue(false);

  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastAngle = useSharedValue(0);

  /** 四边形中心 */
  const center = useDerivedValue(() => {
    const cx =
      (p0.value.x + p1.value.x + p2.value.x + p3.value.x) / 4;
    const cy =
      (p0.value.y + p1.value.y + p2.value.y + p3.value.y) / 4;
    return { x: cx, y: cy };
  });
  const cornerX = points.map(p =>
    useDerivedValue(() => p.value.x - HANDLE_HALF)
  );
  const cornerY = points.map(p =>
    useDerivedValue(() => p.value.y - HANDLE_HALF)
  );

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

  /** 旋转手柄（始终在“正上方”） */
  const rotateHandle = useDerivedValue(() => ({
    x: center.value.x,
    y: center.value.y - ROTATE_OFFSET,
  }));
  const rotateHandleX = useDerivedValue(() => rotateHandle.value.x)
  const rotateHandleY = useDerivedValue(() => rotateHandle.value.y)

  /** 命中角点 */
  const hitCorner = (x: number, y: number) => {
    'worklet';
    for (let i = 0; i < 4; i++) {
      const dx = x - points[i].value.x;
      const dy = y - points[i].value.y;
      if (dx * dx + dy * dy <= HANDLE * HANDLE) {
        return i as Corner;
      }
    }
    return null;
  };

  /** 点是否在四边形内（射线法） */
  const hitQuad = (x: number, y: number) => {
    'worklet';
    const pts = points.map(p => p.value);
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const xi = pts[i].x,
        yi = pts[i].y;
      const xj = pts[j].x,
        yj = pts[j].y;

      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  /** 手势 */
  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';

      // 1️⃣ 旋转手柄
      const dxR = e.x - rotateHandle.value.x;
      const dyR = e.y - rotateHandle.value.y;
      if (dxR * dxR + dyR * dyR <= ROTATE_R * ROTATE_R) {
        isRotating.value = true;
        lastAngle.value = Math.atan2(
          e.y - center.value.y,
          e.x - center.value.x
        );
        return;
      }

      // 2️⃣ 角点
      const c = hitCorner(e.x, e.y);
      if (c !== null) {
        activeCorner.value = c;
        return;
      }

      // 3️⃣ 内部拖动
      if (hitQuad(e.x, e.y)) {
        isDragging.value = true;
        lastX.value = e.x;
        lastY.value = e.y;
      }
    })
    .onUpdate(e => {
      'worklet';

      // 旋转
      if (isRotating.value) {
        const angle = Math.atan2(
          e.y - center.value.y,
          e.x - center.value.x
        );
        const delta = angle - lastAngle.value;
        lastAngle.value = angle;

        const cx = center.value.x;
        const cy = center.value.y;
        const cos = Math.cos(delta);
        const sin = Math.sin(delta);

        for (const p of points) {
          const dx = p.value.x - cx;
          const dy = p.value.y - cy;
          p.value = {
            x: cx + dx * cos - dy * sin,
            y: cy + dx * sin + dy * cos,
          };
        }
        return;
      }

      // 拖角点
      if (activeCorner.value !== null) {
        points[activeCorner.value].value = {
          x: e.x,
          y: e.y,
        };
        return;
      }

      // 整体平移
      if (isDragging.value) {
        const dx = e.x - lastX.value;
        const dy = e.y - lastY.value;
        lastX.value = e.x;
        lastY.value = e.y;

        for (const p of points) {
          p.value = {
            x: p.value.x + dx,
            y: p.value.y + dy,
          };
        }
      }
    })
    .onFinalize(() => {
      'worklet';
      activeCorner.value = null;
      isDragging.value = false;
      isRotating.value = false;
    });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* 填充 */}
            <Path path={quadPath} color="rgba(33,150,243,0.25)" />

            {/* 边框 */}
            <Path path={quadPath} style="stroke" strokeWidth={2} color="#2196F3">
              <DashPathEffect intervals={[8, 4]} />
            </Path>

            {/* 角点 */}
            {points.map((p, i) => (
              <Rect
                key={i}
                x={cornerX[i]}
                y={cornerY[i]}
                width={HANDLE}
                height={HANDLE}
                color="#fff"
              >
                <Paint
                  style="stroke"
                  strokeWidth={3}
                  color="#4CAF50"
                />
              </Rect>
            ))}

            {/* 旋转手柄 */}
            <Circle
              cx={rotateHandleX}
              cy={rotateHandleY}
              r={ROTATE_R / 2}
              color="#FF9800"
            />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

/** 
 * 四边形的四个边可相交版本
*/