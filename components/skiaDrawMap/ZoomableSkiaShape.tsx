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
  // 仅方形的局部偏移（在世界坐标中）
  const rectOffsetX = useSharedValue(0);
  const rectOffsetY = useSharedValue(0);
  const savedRectOffset = useSharedValue({ x: 0, y: 0 });
  const activeTarget = useSharedValue<'rect' | 'group' | null>(null);

  // 生成四种形状（居中尺寸一致），并计算水平排列的位置
  const layout = useMemo(() => {
    const cy = height / 2;
    // 把初始尺寸调小一些
    const size = Math.min(width, height) * 0.18;
    // 动态留白和间距，避免重叠
    const padding = Math.min(width, height) * 0.05; // 5% 边距
    const available = Math.max(width - 2 * padding - 4 * size, 0);
    const gap = Math.max(available / 3, 8); // 至少 8px 的间距

    // 四个中心点，从左到右
    const x0 = padding + size / 2;
    const x1 = x0 + size + gap;
    const x2 = x1 + size + gap;
    const x3 = x2 + size + gap;

    // 构建工具
    const makeRect = (cx: number, cy: number) => {
      const p = Skia.Path.Make();
      p.addRect({ x: cx - size / 2, y: cy - size / 2, width: size, height: size });
      return p;
    };
    const makeTriangle = (cx: number, cy: number) => {
      const p = Skia.Path.Make();
      p.moveTo(cx, cy - size / 2);
      p.lineTo(cx - size / 2, cy + size / 2);
      p.lineTo(cx + size / 2, cy + size / 2);
      p.close();
      return p;
    };
    const makeStar = (cx: number, cy: number) => {
      const p = Skia.Path.Make();
      const points = 5;
      const outerRadius = size / 2;
      const innerRadius = size / 4;
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      p.close();
      return p;
    };

    return {
      cy,
      size,
      rectangle: makeRect(x1, cy),
      triangle: makeTriangle(x2, cy),
      star: makeStar(x3, cy),
      circleCenterX: x0,
      rectMinX: x1 - size / 2,
      rectMinY: cy - size / 2,
      rectW: size,
      rectH: size,
    };
  }, [width, height]);

  // 处理捏合手势[7](@ref)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      // 双指仅缩放，不改变平移
      if ((event.numberOfPointers ?? 2) < 2) {
        return;
      }
      const nextScale = Math.max(
        minScale,
        Math.min(maxScale, savedScale.value * event.scale)
      );
      scale.value = nextScale;
    })
    .onEnd(() => {
      scale.value = withSpring(scale.value);
    });

  // 处理拖拽手势[1](@ref)
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value,
      };
      savedRectOffset.value = {
        x: rectOffsetX.value,
        y: rectOffsetY.value,
      };
      const x = (event as any)?.x ?? 0;
      const y = (event as any)?.y ?? 0;
      // 当前屏幕上的方形区域（考虑整体缩放和平移 + 局部偏移）
      const rx = translateX.value + (layout.rectMinX + rectOffsetX.value) * scale.value;
      const ry = translateY.value + (layout.rectMinY + rectOffsetY.value) * scale.value;
      const rw = layout.rectW * scale.value;
      const rh = layout.rectH * scale.value;
      const insideRect = x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
      activeTarget.value = insideRect ? 'rect' : 'group';
    })
    .onUpdate((event) => {
      const pointers = event.numberOfPointers ?? 1;
      if (pointers !== 1) return; // 双指不支持平移
      if (activeTarget.value === 'rect') {
        // 将屏幕位移转换为世界坐标偏移
        rectOffsetX.value = savedRectOffset.value.x + event.translationX / scale.value;
        rectOffsetY.value = savedRectOffset.value.y + event.translationY / scale.value;
      } else {
        translateX.value = savedTranslate.value.x + event.translationX;
        translateY.value = savedTranslate.value.y + event.translationY;
      }
    })
    .onEnd((event) => {
      if (activeTarget.value === 'group') {
        const ev: any = event as any;
        const vx = ev?.velocityX ?? 0;
        const vy = ev?.velocityY ?? 0;
        translateX.value = withDecay({ velocity: vx });
        translateY.value = withDecay({ velocity: vy });
      }
      activeTarget.value = null;
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

  // 方形的局部变换（在世界坐标，随后受整体 Group 的缩放/平移影响）
  const rectLocalTransform = useDerivedValue(() => {
    return [
      { translateX: rectOffsetX.value },
      { translateY: rectOffsetY.value },
    ];
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <GestureDetector gesture={composedGestures}>
        <Canvas style={styles.canvas}>
          <Group transform={transform}>
            {/* 1) Circle */}
            <Circle
              cx={layout.circleCenterX}
              cy={layout.cy}
              r={layout.size / 2}
              color="#4A90E2"
              style="stroke"
              strokeWidth={strokeWidth}
            />
            <Circle
              cx={layout.circleCenterX}
              cy={layout.cy}
              r={layout.size / 2}
              color="rgba(74, 144, 226, 0.1)"
            />

            {/* 2) Rectangle - 仅方形可被单指独立拖动 */}
            <Group transform={rectLocalTransform}>
              <Path
                path={layout.rectangle}
                color="#E2474A"
                style="stroke"
                strokeWidth={strokeWidth}
                strokeJoin="round"
                strokeCap="round"
              />
              <Path path={layout.rectangle} color="rgba(226, 71, 74, 0.1)" />
            </Group>

            {/* 3) Triangle */}
            <Path
              path={layout.triangle}
              color="#27AE60"
              style="stroke"
              strokeWidth={strokeWidth}
              strokeJoin="round"
              strokeCap="round"
            />
            <Path path={layout.triangle} color="rgba(39, 174, 96, 0.1)" />

            {/* 4) Star */}
            <Path
              path={layout.star}
              color="#F39C12"
              style="stroke"
              strokeWidth={strokeWidth}
              strokeJoin="round"
              strokeCap="round"
            />
            <Path path={layout.star} color="rgba(243, 156, 18, 0.1)" />
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