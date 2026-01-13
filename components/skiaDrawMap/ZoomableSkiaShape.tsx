// ZoomableSkiaShape.tsx
import {
  Canvas,
  Circle,
  Group,
  Path,
  Skia
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring
} from 'react-native-reanimated';

interface ZoomableSkiaShapeProps {
  width: number;
  height: number;
  shapeType?: 'circle' | 'rectangle' | 'triangle' | 'star';
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
}

const ZoomableSkiaShape: React.FC<ZoomableSkiaShapeProps> = ({
  width,
  height,
  shapeType = 'circle',
  initialScale = 1,
  minScale = 0.5,
  maxScale = 3,
}) => {
  // 缩放和平移的共享值
  const scale = useSharedValue(initialScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(initialScale);
  const savedTranslate = useSharedValue({ x: 0, y: 0 });

  // 生成不同形状的路径[1,4](@ref)
  const shapePath = useMemo(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.3;

    switch (shapeType) {
      case 'circle':
        return null; // 圆形使用Circle组件单独处理

      case 'rectangle':
        const rectPath = Skia.Path.Make();
        rectPath.addRect({
          x: centerX - size / 2,
          y: centerY - size / 2,
          width: size,
          height: size,
        });
        return rectPath;

      case 'triangle':
        const trianglePath = Skia.Path.Make();
        trianglePath.moveTo(centerX, centerY - size / 2);
        trianglePath.lineTo(centerX - size / 2, centerY + size / 2);
        trianglePath.lineTo(centerX + size / 2, centerY + size / 2);
        trianglePath.close();
        return trianglePath;

      case 'star':
        const starPath = Skia.Path.Make();
        const points = 5;
        const outerRadius = size / 2;
        const innerRadius = size / 4;

        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / points) * i - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          if (i === 0) {
            starPath.moveTo(x, y);
          } else {
            starPath.lineTo(x, y);
          }
        }
        starPath.close();
        return starPath;

      default:
        return null;
    }
  }, [width, height, shapeType]);

  // 处理捏合手势[7](@ref)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value,
      };
    })
    .onUpdate((event) => {
      // 仅在双指时处理缩放
      if ((event.numberOfPointers ?? 2) < 2) {
        return;
      }
      const nextScale = Math.max(
        minScale,
        Math.min(maxScale, savedScale.value * event.scale)
      );

      const scaleRatio = nextScale / savedScale.value;

      const focalX = event.focalX ?? width / 2;
      const focalY = event.focalY ?? height / 2;

      // ⭐ 核心修正公式
      translateX.value =
        focalX - (focalX - savedTranslate.value.x) * scaleRatio;
      translateY.value =
        focalY - (focalY - savedTranslate.value.y) * scaleRatio;

      scale.value = nextScale;
    })
    .onEnd(() => {
      scale.value = withSpring(scale.value);
    });

  // 处理拖拽手势[1](@ref)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value,
      };
    })
    .onUpdate((event) => {
      // 仅处理单指平移；双指平移交由捏合的焦点移动感受提供
      const pointers = event.numberOfPointers ?? 1;
      if (pointers === 1) {
        translateX.value = savedTranslate.value.x + event.translationX;
        translateY.value = savedTranslate.value.y + event.translationY;
      }
      // else if (pointers === 2) {
      //   translateX.value = translateX.value + event.translationX;
      //   translateY.value = translateY.value + event.translationY;
      // }
    })
    .onEnd((event) => {
      // 使用动量衰减以获得更贴近地图的滑动手感（兼容TS类型）
      const ev: any = event as any;
      const vx = ev?.velocityX ?? 0;
      const vy = ev?.velocityY ?? 0;
      translateX.value = withDecay({ velocity: vx });
      translateY.value = withDecay({ velocity: vy });
    });

  // 组合手势[7](@ref)
  const composedGestures = Gesture.Race(
    pinchGesture,
    panGesture,
  );

  // 使用派生值计算变换矩阵[1](@ref)
  const transform = useDerivedValue(() => {
    return [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ];
  });

  // 边框宽度随缩放反向变化，保持视觉一致性
  const strokeWidth = useDerivedValue(() => {
    return 2 / scale.value;
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <GestureDetector gesture={composedGestures}>
        <Canvas style={styles.canvas}>
          <Group transform={transform}>
            {shapeType === 'circle' ? (
              // 圆形使用Circle组件[1](@ref)
              <Circle
                cx={width / 2}
                cy={height / 2}
                r={Math.min(width, height) * 0.15}
                color="#4A90E2"
                style="stroke"
                strokeWidth={strokeWidth}
              />
            ) : shapePath ? (
              // 其他形状使用Path组件[1](@ref)
              <Path
                path={shapePath}
                color="#E2474A"
                style="stroke"
                strokeWidth={strokeWidth}
                strokeJoin="round"
                strokeCap="round"
              />
            ) : null}

            {/* 添加填充版本用于更好的视觉反馈 */}
            {shapeType === 'circle' ? (
              <Circle
                cx={width / 2}
                cy={height / 2}
                r={Math.min(width, height) * 0.15}
                color="rgba(74, 144, 226, 0.1)"
              />
            ) : shapePath ? (
              <Path
                path={shapePath}
                color="rgba(226, 71, 74, 0.1)"
              />
            ) : null}
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});

export default ZoomableSkiaShape;