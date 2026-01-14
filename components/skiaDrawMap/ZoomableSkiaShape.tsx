// ZoomableSkiaShape.tsx
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Paint,
  Path,
  Skia,
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
  // 线段（替换原方形）的世界坐标几何与交互状态
  const lineCx = useSharedValue(0);
  const lineCy = useSharedValue(0);
  const lineLen = useSharedValue(100);
  const lineRot = useSharedValue(0);
  const savedLineCenter = useSharedValue({ x: 0, y: 0 });
  const activeTarget = useSharedValue<'line-start' | 'line-end' | 'line' | 'group' | null>(null);
  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);
  const startLen = useSharedValue(0);
  const startAngle = useSharedValue(0);

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

    const layout = {
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
      rectCenterX: x1,
    };

    // 初始化线段中心与长度（与原方形位置一致）
    lineCx.value = layout.rectCenterX;
    lineCy.value = layout.cy;
    lineLen.value = layout.size * 0.8;
    lineRot.value = 0;

    return layout;
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
      savedLineCenter.value = {
        x: lineCx.value,
        y: lineCy.value,
      };

      // 将触点从屏幕坐标转换到世界坐标用于精确命中
      const sx = (event as any)?.x ?? 0;
      const sy = (event as any)?.y ?? 0;
      const wx = (sx - translateX.value) / scale.value;
      const wy = (sy - translateY.value) / scale.value;

      // 线段端点（世界坐标）
      const dx = Math.cos(lineRot.value) * lineLen.value / 2;
      const dy = Math.sin(lineRot.value) * lineLen.value / 2;
      const startX = lineCx.value - dx;
      const startY = lineCy.value - dy;
      const endX = lineCx.value + dx;
      const endY = lineCy.value + dy;

      const hitRadius = 12 / scale.value; // 端点命中半径（缩放自适应）
      const dist2 = (ax: number, ay: number, bx: number, by: number) => {
        const dx = ax - bx;
        const dy = ay - by;
        return dx * dx + dy * dy;
      };

      if (dist2(wx, wy, startX, startY) <= hitRadius * hitRadius) {
        activeTarget.value = 'line-start';
        anchorX.value = endX;
        anchorY.value = endY;
        startLen.value = Math.hypot(wx - anchorX.value, wy - anchorY.value);
        startAngle.value = Math.atan2(wy - anchorY.value, wx - anchorX.value);
      } else if (dist2(wx, wy, endX, endY) <= hitRadius * hitRadius) {
        activeTarget.value = 'line-end';
        anchorX.value = startX;
        anchorY.value = startY;
        startLen.value = Math.hypot(wx - anchorX.value, wy - anchorY.value);
        startAngle.value = Math.atan2(wy - anchorY.value, wx - anchorX.value);
      } else {
        // 点到线段的最短距离（世界坐标）
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
          if (c1 <= 0) return Math.hypot(px - x1, py - y1);
          const c2 = vx * vx + vy * vy;
          if (c2 <= c1) return Math.hypot(px - x2, py - y2);
          const t = c1 / c2;
          const projX = x1 + t * vx;
          const projY = y1 + t * vy;
          return Math.hypot(px - projX, py - projY);
        };
        const hitTol = 10 / scale.value; // 线段宽度命中容差
        const d = pointToSegmentDistance(wx, wy, startX, startY, endX, endY);
        activeTarget.value = d <= hitTol ? 'line' : 'group';
      }
    })
    .onUpdate((event) => {
      const pointers = event.numberOfPointers ?? 1;
      if (pointers !== 1) return; // 双指不支持平移
      if (activeTarget.value === 'line') {
        // 拖动整条线：按世界坐标更新中心
        lineCx.value = savedLineCenter.value.x + event.translationX / scale.value;
        lineCy.value = savedLineCenter.value.y + event.translationY / scale.value;
      } else if (activeTarget.value === 'line-start' || activeTarget.value === 'line-end') {
        // 端点拖拽：旋转+长度变化，世界坐标
        const wx = ((event as any).x - translateX.value) / scale.value;
        const wy = ((event as any).y - translateY.value) / scale.value;
        const newLen = Math.max(40, Math.hypot(wx - anchorX.value, wy - anchorY.value));
        const newAngle = Math.atan2(wy - anchorY.value, wx - anchorX.value);
        lineLen.value = newLen;
        lineRot.value = newAngle;
        // 中心位于锚点与拖拽点中点
        lineCx.value = anchorX.value + Math.cos(newAngle) * newLen / 2;
        lineCy.value = anchorY.value + Math.sin(newAngle) * newLen / 2;
      } else if (activeTarget.value === 'group') {
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

  // 线段的路径与端点（世界坐标），随后受整体 Group 的缩放/平移影响
  const lineStart = useDerivedValue(() => {
    const dx = Math.cos(lineRot.value) * lineLen.value / 2;
    const dy = Math.sin(lineRot.value) * lineLen.value / 2;
    return { x: lineCx.value - dx, y: lineCy.value - dy };
  });
  const lineEnd = useDerivedValue(() => {
    const dx = Math.cos(lineRot.value) * lineLen.value / 2;
    const dy = Math.sin(lineRot.value) * lineLen.value / 2;
    return { x: lineCx.value + dx, y: lineCy.value + dy };
  });
  const linePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.moveTo(lineStart.value.x, lineStart.value.y);
    p.lineTo(lineEnd.value.x, lineEnd.value.y);
    return p;
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

            {/* 2) Line - 替换原方形，支持独立拖拽与端点调整 */}
            <Path path={linePath} color="#E2474A" style="stroke" strokeWidth={strokeWidth}>
              <DashPathEffect intervals={[10, 6]} />
            </Path>
            {/* 端点方块 */}
            <Path
              path={useDerivedValue(() => {
                const p = Skia.Path.Make();
                const h = 12; // 端点可视尺寸随缩放可视保持，受 Group 缩放影响，视觉足够
                p.addRect({ x: lineStart.value.x - h / 2, y: lineStart.value.y - h / 2, width: h, height: h });
                return p;
              })}
              color="#fff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={strokeWidth} />
            </Path>
            <Path
              path={useDerivedValue(() => {
                const p = Skia.Path.Make();
                const h = 12;
                p.addRect({ x: lineEnd.value.x - h / 2, y: lineEnd.value.y - h / 2, width: h, height: h });
                return p;
              })}
              color="#fff"
            >
              <Paint color="#4CAF50" style="stroke" strokeWidth={strokeWidth} />
            </Path>

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