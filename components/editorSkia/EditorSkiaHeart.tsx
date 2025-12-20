import {
  Canvas,
  Circle,
  DashPathEffect,
  Paint,
  Path,
  Skia,
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

const HANDLE_R = 16;
const MIN_SIZE = 40;

export default function EditorSkiaHeart() {
  const rotateImg = useImage(require('@/assets/images/favicon.png'));

  // 位置 & 变换
  const cx = useSharedValue(180);
  const cy = useSharedValue(320);
  const size = useSharedValue(80);
  const rotation = useSharedValue(0);

  // 状态
  const isDragging = useSharedValue(false);
  const isScaling = useSharedValue(false);
  const isRotating = useSharedValue(false);

  // 手势中间变量
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const startDist = useSharedValue(0);
  const startSize = useSharedValue(0);
  const lastAngle = useSharedValue(0);

  /** 心形 Path（局部坐标） */
  const heartPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, -30);
    p.cubicTo(30, -60, 80, -20, 0, 60);
    p.cubicTo(-80, -20, -30, -60, 0, -30);
    p.close();

    const m = Skia.Matrix();
    m.translate(cx.value, cy.value);
    m.rotate(rotation.value);
    m.scale(size.value / 80, size.value / 80);
    p.transform(m);

    return p;
  });

  /** 缩放手柄 */
  const scaleHandleX = useDerivedValue(() => {
    const angle = -Math.PI / 2 + rotation.value;
    const dist = size.value + 30;
    return cx.value + dist * Math.cos(angle);
  });
  const scaleHandleY = useDerivedValue(() => {
    const angle = -Math.PI / 2 + rotation.value;
    const dist = size.value + 30;
    return cy.value + dist * Math.sin(angle);
  });

  /** 旋转手柄 */
  const rotateHandleX = useDerivedValue(() => {
    const angle = -Math.PI / 2 + rotation.value;
    const dist = size.value + 70;
    return cx.value + dist * Math.cos(angle);
  });

  const rotateHandleY = useDerivedValue(() => {
    const angle = -Math.PI / 2 + rotation.value;
    const dist = size.value + 70;
    return cy.value + dist * Math.sin(angle);
  });

  // 超边界回到上一次的位置
  // const lastValidX = useSharedValue(cx.value);
  // const lastValidY = useSharedValue(cy.value);

  const lastValidX = useSharedValue(180);
  const lastValidY = useSharedValue(320);

  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';
      const px = e.x;
      const py = e.y;

      // 需回到上一次的位置x、y值
      // lastValidX.value = cx.value;
      // lastValidY.value = cy.value;

      // 缩放手柄
      const dxS = px - scaleHandleX.value;
      const dyS = py - scaleHandleY.value;
      if (dxS * dxS + dyS * dyS <= HANDLE_R * HANDLE_R) {
        isScaling.value = true;
        startSize.value = size.value;
        startDist.value = Math.hypot(px - cx.value, py - cy.value);
        return;
      }

      // 旋转手柄
      const dxR = px - rotateHandleX.value;
      const dyR = py - rotateHandleY.value;
      if (dxR * dxR + dyR * dyR <= HANDLE_R * HANDLE_R) {
        isRotating.value = true;
        lastAngle.value = Math.atan2(
          py - cy.value,
          px - cx.value
        );
        return;
      }

      // 拖动（简单用距离命中）
      const dx = px - cx.value;
      const dy = py - cy.value;
      if (dx * dx + dy * dy <= size.value * size.value) {
        isDragging.value = true;
        lastX.value = px;
        lastY.value = py;
      }
    })
    .onUpdate(e => {
      'worklet';

      // 缩放
      if (isScaling.value) {
        const dist = Math.hypot(
          e.x - cx.value,
          e.y - cy.value
        );
        let next = startSize.value + (dist - startDist.value);
        size.value = Math.max(MIN_SIZE, next);
        return;
      }

      // 旋转
      if (isRotating.value) {
        const angle = Math.atan2(
          e.y - cy.value,
          e.x - cx.value
        );
        rotation.value += angle - lastAngle.value;
        lastAngle.value = angle;
        return;
      }

      // 拖动
      if (isDragging.value) {
        const dx = e.x - lastX.value;
        const dy = e.y - lastY.value;
        lastX.value = e.x;
        lastY.value = e.y;
        cx.value += dx;
        cy.value += dy;
      }
    })
    .onFinalize(() => {
      'worklet';

      // 拖动结束判断是否超出边界并回到设置的位置
      const half = - size.value / 4;// -20

      const out =
        cx.value - half < 0 ||
        cy.value - half < 0 ||
        cx.value + half > 412 ||
        cy.value + half > 412;

      console.log('----scj--:', half, cx.value, cy.value);
      console.log('-----sjc--1:', cx.value - half < 0);
      console.log('-----sjc--2:', cy.value - half < 0);
      console.log('-----sjc--3:', cx.value + half > 412);
      console.log('-----sjc--4:', cy.value + half > 412);

      if (out) {
        cx.value = lastValidX.value;
        cy.value = lastValidY.value;
      }
      // ⬆️

      isDragging.value = false;
      isScaling.value = false;
      isRotating.value = false;
    });

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {/* 心形虚线 */}
            <Path path={heartPath} color="rgba(233, 30, 99, 1)" style="fill">
              {/* 边框 */}
              <Paint
                style="stroke"
                strokeWidth={2}
                color="#2196F3"
              >
                <DashPathEffect intervals={[8, 6]} />
              </Paint>
            </Path>

            {/* 缩放手柄 */}
            <Circle
              cx={scaleHandleX}
              cy={scaleHandleY}
              r={HANDLE_R}
              color="#FF9800"
            />
            <SkiaImage
              image={rotateImg}
              x={rotateHandleX}
              y={rotateHandleY}
              width={24}
              height={24}
              fit="contain"
            />

            {/* 旋转手柄 */}
            <SkiaImage
              image={rotateImg}
              x={rotateHandleX}
              y={rotateHandleY}
              width={24}
              height={24}
              fit="contain"
            />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}
