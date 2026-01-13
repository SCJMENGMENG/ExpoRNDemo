// src/components/MapPreviewCanvas.tsx
import { Canvas, Group, Image, Path, Skia, useImage } from '@shopify/react-native-skia';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, runOnUI, useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';

export interface Point {
  x: number;
  y: number;
}

export type PointArr = [number, number];

export type ZoneData = {
  hashId: string;
  name: string;
  points: Point[];
};

interface MultiplePolygonsCanvasProps {
  width: number;
  viewH: number;
  zones: ZoneData[] | undefined;
  stripeAngleValue: number;
  activeZoneIndex: number;
  onZonePress?: (index: number) => void;
}

const MultiplePolygonsCanvas: React.FC<MultiplePolygonsCanvasProps> = ({
  width,
  viewH,
  zones,
  stripeAngleValue,
  activeZoneIndex = -1,
  onZonePress,
}) => {
  const image = useImage(require('../../assets/images/lawn.png'));
  const [internalActiveIndex, setInternalActiveIndex] = useState(activeZoneIndex);

  // 缩放和平移状态
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslate = useSharedValue({ x: 0, y: 0 });

  // 同步内部状态和外部props
  useEffect(() => {
    setInternalActiveIndex(activeZoneIndex);
  }, [activeZoneIndex]);

  // 计算所有多边形的整体边界
  const { globalBounds, layoutScale, offset } = useMemo(() => {
    if (!zones || zones.length === 0) {
      return { globalBounds: null, layoutScale: 1, offset: { x: 0, y: 0 } };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    zones.forEach(zone => {
      zone.points.forEach((point: any) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    const globalBounds = { minX, minY, maxX, maxY };
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;

    const padding = 40;
    const scaleX = (width - padding * 2) / boundsWidth;
    const scaleY = (viewH - padding * 2) / boundsHeight;
    const layoutScale = Math.min(scaleX, scaleY);

    const offsetX = (width - boundsWidth * layoutScale) / 2 - minX * layoutScale;
    const offsetY = (viewH - boundsHeight * layoutScale) / 2 - minY * layoutScale;

    return { globalBounds, layoutScale, offset: { x: offsetX, y: offsetY } };
  }, [zones, width, viewH]);

  // 为不同区域生成不同颜色
  const getZoneColor = (index: number) => {
    if (index === internalActiveIndex) {
      return 'transparent';
    }
    const colors = ['#E8F5E8', '#F0F8FF', '#FFF0F5', '#F5F5DC'];
    return colors[index % colors.length];
  };

  const getBorderColor = (index: number) => {
    if (index === internalActiveIndex) {
      return '#FF6B35';
    }
    return '#5F7280';
  };

  // 生成所有多边形路径
  const zonePaths = useMemo(() => {
    if (!zones || !globalBounds) return [];

    return zones.map((zone, zoneIndex) => {
      const { points } = zone;
      const path = Skia.Path.Make();

      if (points.length > 0) {
        const firstPoint = points[0];
        const startX = firstPoint.x * layoutScale + offset.x;
        const startY = firstPoint.y * layoutScale + offset.y;
        path.moveTo(startX, startY);

        for (let i = 1; i < points.length; i++) {
          const point = points[i];
          const x = point.x * layoutScale + offset.x;
          const y = point.y * layoutScale + offset.y;
          path.lineTo(x, y);
        }
        path.close();
      }

      return {
        path,
        fillColor: getZoneColor(zoneIndex),
        borderColor: getBorderColor(zoneIndex),
      };
    });
  }, [zones, globalBounds, layoutScale, offset, internalActiveIndex]);

  // 创建激活区域的裁剪路径
  const activeClipPath = useMemo(() => {
    if (internalActiveIndex === -1 || !zonePaths || !zonePaths[internalActiveIndex]) {
      return null;
    }
    return zonePaths[internalActiveIndex].path;
  }, [zonePaths, internalActiveIndex]);

  // 图片的旋转变换
  const imageTransform = useMemo(() => [
    { translateX: width / 2 },
    { translateY: viewH / 2 },
    { rotate: -stripeAngleValue * (Math.PI / 180) },
    { translateX: -width / 2 },
    { translateY: -viewH / 2 },
  ], [width, viewH, stripeAngleValue]);

  // 使用ref存储路径数据
  const zonePathsRef = useRef(zonePaths);
  useEffect(() => {
    zonePathsRef.current = zonePaths;
  }, [zonePaths]);

  // 处理点击事件（考虑缩放和平移）
  const handleTap = (x: number, y: number) => {
    if (!zonePathsRef.current) return;

    // 关键修正：正确转换坐标到缩放前的坐标系
    const originalX = (x - translateX.value) / scale.value;
    const originalY = (y - translateY.value) / scale.value;

    for (let i = zonePathsRef.current.length - 1; i >= 0; i--) {
      const path = zonePathsRef.current[i].path;

      if (path.contains(originalX, originalY)) {
        setInternalActiveIndex(i);
        if (onZonePress) {
          onZonePress(i);
        }
        // 计算该区域的包围盒与居中缩放
        const zone = zones?.[i];
        if (zone && zone.points.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const p of zone.points) {
            const px = p.x * layoutScale + offset.x;
            const py = p.y * layoutScale + offset.y;
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
          }
          const boxW = Math.max(1, maxX - minX);
          const boxH = Math.max(1, maxY - minY);
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const paddingRatio = 0.8; // 目标占视图 80%
          const fitScale = Math.min((width * paddingRatio) / boxW, (viewH * paddingRatio) / boxH);
          // 只放大不缩小：保持至少当前缩放
          const desired = Math.max(scale.value, fitScale);
          runOnUI(focusToWorklet)(cx, cy, desired);
        }
        return;
      }
    }
  };

  // 计算并聚焦到某个区域中心（在UI线程执行动画）
  const focusToWorklet = (cx: number, cy: number, targetScale: number) => {
    'worklet';
    const minS = 0.5;
    const maxS = 3;
    const s = Math.max(minS, Math.min(maxS, targetScale));
    scale.value = withSpring(s);
    // 注意：当前Group的变换顺序为 scale -> translate
    // 屏幕中心对齐公式（scale -> translate）：T = screenCenter - s * contentCenter
    translateX.value = withSpring(width / 2 - s * cx);
    translateY.value = withSpring(viewH / 2 - s * cy);
  };

  // 修正手势处理 - 简化实现
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value,
      };
    })
    .onUpdate((event) => {
      const newScale = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
      const ratio = newScale / savedScale.value;

      const focalX = event.focalX;
      const focalY = event.focalY;

      translateX.value =
        focalX - (focalX - savedTranslate.value.x) * ratio;
      translateY.value =
        focalY - (focalY - savedTranslate.value.y) * ratio;

      scale.value = newScale;
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1) // ⭐ 关键：禁止双指
    .onStart(() => {
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value,
      };
    })
    .onUpdate((event) => {
      translateX.value = savedTranslate.value.x + event.translationX;
      translateY.value = savedTranslate.value.y + event.translationY;
    });

  // 取消双击重置：不再注册双击手势

  const singleTapGesture = Gesture.Tap()
    .onEnd((event) => {
      runOnJS(handleTap)(event.x, event.y);
    });

  // 关键修正：正确的手势组合
  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    singleTapGesture
  );


  // 使用派生值计算变换矩阵
  const transform = useDerivedValue(() => {
    return [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ];
  });

  // 如果没有区域数据，显示提示
  if (!zones || zones.length === 0) {
    return (
      <View>
        <Text>No zone data available.</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={composedGestures}>
      <Canvas style={{ width, height: viewH }}>
        {/* 应用缩放和平移变换 */}
        <Group transform={transform}>
          {/* 首先绘制所有非激活区域的实心填充 */}
          <Group>
            {zonePaths.map((shape, index) => (
              <Path
                key={`fill-${index}`}
                path={shape.path}
                color={Skia.Color(shape.fillColor)}
              />
            ))}
          </Group>

          {/* 为激活区域单独绘制图片 */}
          {activeClipPath && (
            <Group clip={activeClipPath} invertClip={false}>
              <Group transform={imageTransform}>
                <Image
                  image={image}
                  fit="cover"
                  width={width}
                  height={viewH}
                  x={-width / 10}
                  y={-viewH / 10}
                />
              </Group>
            </Group>
          )}

          {/* 绘制所有区域的边框 */}
          <Group>
            {zonePaths.map((shape, index) => (
              <Path
                key={`border-${index}`}
                path={shape.path}
                color={Skia.Color(shape.borderColor)}
                style="stroke"
                strokeWidth={index === internalActiveIndex ? 3 / scale.value : 2 / scale.value}
              />
            ))}
          </Group>
        </Group>
      </Canvas>
    </GestureDetector>
  );
};

export default MultiplePolygonsCanvas;