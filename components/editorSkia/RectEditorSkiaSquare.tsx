import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Circle, Skia, Paint, DashPathEffect, Rect } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const circleW = 16;
const cornerCubeW = 16;
const cornerCubeHalfW = cornerCubeW / 2;
const cornerCubeStrokeW = 5;

type Corner = 'tl' | 'tr' | 'br' | 'bl' | null;

export default function RectEditorSkiaSquare() {
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
  const activeCorner = useSharedValue<Corner>(null);

  // delta / angle 计算
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastAngle = useSharedValue(0);

  // 矩形中心
  const center = useDerivedValue(() => ({
    cx: x.value + w.value / 2,
    cy: y.value + h.value / 2,
  }));

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

  // 角点位置（带旋转）
  const corners = useDerivedValue(() => {
    const cx = x.value + w.value / 2;
    const cy = y.value + h.value / 2;
    const hw = w.value / 2;
    const hh = h.value / 2;

    const cos = Math.cos(rotation.value);
    const sin = Math.sin(rotation.value);

    const rotate = (dx: number, dy: number) => ({
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    });

    return {
      tl: rotate(-hw, -hh),
      tr: rotate(hw, -hh),
      br: rotate(hw, hh),
      bl: rotate(-hw, hh),
    };
  });

  // 角点坐标拆分
  const cornerTLX = useDerivedValue(() => corners.value.tl.x - cornerCubeHalfW);
  const cornerTLY = useDerivedValue(() => corners.value.tl.y - cornerCubeHalfW);

  const cornerTRX = useDerivedValue(() => corners.value.tr.x - cornerCubeHalfW);
  const cornerTRY = useDerivedValue(() => corners.value.tr.y - cornerCubeHalfW);

  const cornerBRX = useDerivedValue(() => corners.value.br.x - cornerCubeHalfW);
  const cornerBRY = useDerivedValue(() => corners.value.br.y - cornerCubeHalfW);

  const cornerBLX = useDerivedValue(() => corners.value.bl.x - cornerCubeHalfW);
  const cornerBLY = useDerivedValue(() => corners.value.bl.y - cornerCubeHalfW);

  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';
      const px = e.x;
      const py = e.y;

      // 1️⃣ 命中旋转手柄
      const dxH = px - rotateHandleX.value;
      const dyH = py - rotateHandleY.value;
      const hitRotate = dxH * dxH + dyH * dyH <= circleW * circleW;

      if (hitRotate) {
        isRotating.value = true;
        lastAngle.value = Math.atan2(
          py - center.value.cy,
          px - center.value.cx
        );
        return;
      }

      // 2️⃣ 命中角点
      const r2 = cornerCubeW * cornerCubeW;
      for (const k of ['tl', 'tr', 'br', 'bl'] as Exclude<Corner, null>[]) {
        const dx = px - corners.value[k].x;
        const dy = py - corners.value[k].y;
        if (dx * dx + dy * dy <= r2) {
          activeCorner.value = k;

          const opposite = {
            tl: 'br',
            tr: 'bl',
            br: 'tl',
            bl: 'tr',
          }[k];

          anchorX.value = corners.value[opposite as keyof typeof corners.value].x;
          anchorY.value = corners.value[opposite as keyof typeof corners.value].y;

          return;
        }
      }

      // 3️⃣ 命中矩形本体（轴对齐命中）
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

      // 角点调整大小
      if (activeCorner.value) {
        // 世界坐标下：anchor → 手指
        const dx = e.x - anchorX.value;
        const dy = e.y - anchorY.value;

        // 反向旋转，转到矩形本地坐标
        const cos = Math.cos(-rotation.value);
        const sin = Math.sin(-rotation.value);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;

        // 新尺寸
        const newW = Math.max(20, Math.abs(lx));
        const newH = Math.max(20, Math.abs(ly));

        w.value = newW;
        h.value = newH;

        // 新中心（anchor + 半尺寸，再旋回世界坐标）
        const cxLocal = lx / 2;
        const cyLocal = ly / 2;

        const cosR = Math.cos(rotation.value);
        const sinR = Math.sin(rotation.value);

        const cxWorld =
          anchorX.value + cxLocal * cosR - cyLocal * sinR;
        const cyWorld =
          anchorY.value + cxLocal * sinR + cyLocal * cosR;

        x.value = cxWorld - newW / 2;
        y.value = cyWorld - newH / 2;

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
      activeCorner.value = null;
    });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* 矩形 */}
            <Path path={path} color="rgba(33,150,243,0.3)" style="fill" />
            <Path path={path} color="#2196F3" style="stroke" strokeWidth={2}>
              <DashPathEffect intervals={[10, 5]} />
            </Path>

            {/* 角点 */}
            <Rect
              x={cornerTLX}
              y={cornerTLY}
              width={cornerCubeW}
              height={cornerCubeW}
              color="#ffffff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={cornerCubeStrokeW} />
            </Rect>
            <Rect
              x={cornerTRX}
              y={cornerTRY}
              width={cornerCubeW}
              height={cornerCubeW}
              color="#ffffff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={cornerCubeStrokeW} />
            </Rect>
            <Rect
              x={cornerBRX}
              y={cornerBRY}
              width={cornerCubeW}
              height={cornerCubeW}
              color="#ffffff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={cornerCubeStrokeW} />
            </Rect>
            <Rect
              x={cornerBLX}
              y={cornerBLY}
              width={cornerCubeW}
              height={cornerCubeW}
              color="#ffffff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={cornerCubeStrokeW} />
            </Rect>

            {/* 旋转手柄 */}
            <Circle
              cx={rotateHandleX}
              cy={rotateHandleY}
              r={circleW/2}
              color="#FF9800"
            />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}
