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
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';

const HANDLE = 16;
const HANDLE_HALF = HANDLE / 2;
const ROTATE_R = 16;
const ROTATE_OFFSET = 40;

const BTN_SIZE = 28;
const BTN_OFFSET_Y = 20;

type Corner = 0 | 1 | 2 | 3 | null;

export default function QuadEditorNoSelfIntersect() {
  /** 四个角点 */
  const points = [
    useSharedValue({ x: 120, y: 120 }),
    useSharedValue({ x: 280, y: 140 }),
    useSharedValue({ x: 260, y: 280 }),
    useSharedValue({ x: 140, y: 260 }),
  ];

  const activeCorner = useSharedValue<Corner>(null);
  const isDragging = useSharedValue(false);
  const isRotating = useSharedValue(false);

  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const lastAngle = useSharedValue(0);

  /** 四边形中心 */
  const center = useDerivedValue(() => {
    const cx = points.reduce((s, p) => s + p.value.x, 0) / 4;
    const cy = points.reduce((s, p) => s + p.value.y, 0) / 4;
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
    p.moveTo(points[0].value.x, points[0].value.y);
    for (let i = 1; i < 4; i++) {
      p.lineTo(points[i].value.x, points[i].value.y);
    }
    p.close();
    return p;
  });

  /** 旋转手柄 */
  const rotateHandle = useDerivedValue(() => ({
    x: center.value.x,
    y: center.value.y - ROTATE_OFFSET,
  }));
  const rotateHandleX = useDerivedValue(() => rotateHandle.value.x)
  const rotateHandleY = useDerivedValue(() => rotateHandle.value.y)

  /* ---------- 几何工具 ---------- */

  const segmentsIntersect = (a: any, b: any, c: any, d: any) => {
    'worklet';
    const cross = (p: any, q: any, r: any) =>
      (q.x - p.x) * (r.y - p.y) -
      (q.y - p.y) * (r.x - p.x);

    const d1 = cross(a, b, c);
    const d2 = cross(a, b, d);
    const d3 = cross(c, d, a);
    const d4 = cross(c, d, b);

    return d1 * d2 < 0 && d3 * d4 < 0;
  };

  const isSelfIntersecting = (pts: any[]) => {
    'worklet';
    return (
      segmentsIntersect(pts[0], pts[1], pts[2], pts[3]) ||
      segmentsIntersect(pts[1], pts[2], pts[3], pts[0])
    );
  };

  /* ---------- 手势 ---------- */

  const panGesture = Gesture.Pan()
    .onBegin(e => {
      'worklet';

      // 旋转手柄
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

      // 命中角点
      for (let i = 0; i < 4; i++) {
        const dx = e.x - points[i].value.x;
        const dy = e.y - points[i].value.y;
        if (dx * dx + dy * dy <= HANDLE * HANDLE) {
          activeCorner.value = i as Corner;
          return;
        }
      }

      // 内部拖动
      isDragging.value = true;
      lastX.value = e.x;
      lastY.value = e.y;
    })
    .onUpdate(e => {
      'worklet';

      /** 旋转 */
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

        const rotated = points.map(p => {
          const dx = p.value.x - cx;
          const dy = p.value.y - cy;
          return {
            x: cx + dx * cos - dy * sin,
            y: cy + dx * sin + dy * cos,
          };
        });

        for (let i = 0; i < 4; i++) {
          points[i].value = rotated[i];
        }
        return;
      }

      /** 方式一：拖动角点（防自交）
       * 单点提交 适合：角点拖拽
       * 1.只拖一个角点 
       * 2.逻辑直观：假设这个角点挪过去 → 看看会不会自交 → 不会就真的挪
       * 3.更高效
       * 4.snapshot 是 纯 JS 数据，isSelfIntersecting(snapshot) 是 纯几何判断
       * 5.无回退、无一帧内多次写同一个 SharedValue、无读写混用
       * */
      if (activeCorner.value !== null) {
        const idx = activeCorner.value;
        const candidate = { x: e.x, y: e.y };

        const snapshot = points.map((p, i) =>
          i === idx ? candidate : p.value
        );

        if (!isSelfIntersecting(snapshot)) {
          points[idx].value = candidate;
        }
        return;
      }
      /** 方式二：拖动角点（防自交） 
       * 整组提交 适合：旋转 / 平移 / resize
       * 1.拖一个点，会联动改变其他点（等比缩放、拖角 + 对边跟随）
       * 2.旋转、整体平移、自动修正形状（例如强制凸多边形）
       * */
      // if (activeCorner.value !== null) {
      //   const idx = activeCorner.value;

      //   const nextPoints = points.map(p => ({ ...p.value }));
      //   nextPoints[idx] = { x: e.x, y: e.y };

      //   if (!isSelfIntersecting(nextPoints)) {
      //     for (let i = 0; i < 4; i++) {
      //       points[i].value = nextPoints[i];
      //     }
      //   }
      //   return;
      // }

      /** 整体平移 */
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

  const cancelBtnStyle = useAnimatedStyle(() => {
    const p = points[3].value; // 左下角
    // console.log('----scj----confirmBtnStyle:', p, p.x - BTN_SIZE / 2, p.y + BTN_OFFSET_Y);
    return {
      position: 'absolute',
      left: p.x - BTN_SIZE / 2,
      top: p.y + BTN_OFFSET_Y,
    };
  });
  const confirmBtnStyle = useAnimatedStyle(() => {
    const p = points[2].value; // 右下角
    // console.log('----scj----confirmBtnStyle:', p, p.x - BTN_SIZE / 2, p.y + BTN_OFFSET_Y);
    return {
      position: 'absolute',
      left: p.x - BTN_SIZE / 2,
      top: p.y + BTN_OFFSET_Y,
    };
  });

  const onCancel = () => {
    console.log('取消四边形坐标');
  };
  const onConfirm = () => {
    const result = points.map(p => p.value);
    console.log('四边形坐标:', result);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
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
              <Paint style="stroke" strokeWidth={3} color="#4CAF50" />
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
      </GestureDetector>

      {/* ✅ 左下角取消按钮 */}
      <Animated.View style={cancelBtnStyle}>
        <Pressable onPress={onCancel}>
          <Image
            source={require('@/assets/images/favicon.png')}
            style={{ width: BTN_SIZE, height: BTN_SIZE }}
          />
        </Pressable>
      </Animated.View>

      {/* ✅ 右下角确认按钮 */}
      <Animated.View style={confirmBtnStyle}>
        <Pressable onPress={onConfirm}>
          <Image
            source={require('@/assets/images/favicon.png')}
            style={{ width: BTN_SIZE, height: BTN_SIZE }}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * 四边形的四条边不可相交版本
 */