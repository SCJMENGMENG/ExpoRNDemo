// src/components/MapPreviewCanvas.tsx
import { Canvas, DashPathEffect, Group, Image, Path, Skia, useImage } from '@shopify/react-native-skia';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

export interface Point {
  x: number;
  y: number;
}

export type PointArr = [number, number];

export type PolygonData = {
  hashId: string;
  type: number; // 0 - zone, 1 - channel
  name: string;
  points: Point[];
};

interface MultiplePolygonsCanvasMapProps {
  width: number;
  viewH: number;
  data: PolygonData[] | undefined;
  stripeAngleValue: number;
  activeZoneIndex: number;
  onZonePress?: (index: number) => void;
}

const MultiplePolygonsMapCanvas: React.FC<MultiplePolygonsCanvasMapProps> = ({
  width,
  viewH,
  data,
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
    if (!data || data.length === 0) {
      return { globalBounds: null, layoutScale: 1, offset: { x: 0, y: 0 } };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    data.forEach(item => {
      item.points.forEach((point: any) => {
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
  }, [data, width, viewH]);

  // 为不同类型返回不同颜色
  const getShapeColor = (index: number, type: number) => {
    if (type === 1) {
      // 通道类型的线段颜色
      if (index === internalActiveIndex) {
        return '#4CDAA2'; // 激活时的颜色
      }
      return 'yellow'; // 默认颜色
    } else {
      // 区域类型的填充颜色
      if (index === internalActiveIndex) {
        return 'transparent';
      }
      return '#E6E9F0';
    }
  };

  const getShapeBorderColor = (index: number, type: number) => {
    if (type === 1) {
      // 通道类型的线段边框（实际就是线段本身）
      if (index === internalActiveIndex) {
        return '#4CDAA2'; // 激活时的颜色
      }
      return 'red'; // 默认颜色
    } else {
      // 区域类型的边框
      if (index === internalActiveIndex) {
        return '#4CDAA2';
      }
      return '#5F7280';
    }
  };

  // 生成所有多边形/线条路径
  const shapePaths = useMemo(() => {
    if (!data || !globalBounds) return [];

    return data.map((item, index) => {
      const { points, type } = item;
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

        // 如果是区域(type === 0)，则闭合路径；如果是通道(type === 1)，则不闭合
        if (type === 0) {
          path.close();
        }
      }

      return {
        path,
        type,
        fillColor: getShapeColor(index, type),
        borderColor: getShapeBorderColor(index, type),
      };
    });
  }, [data, globalBounds, layoutScale, offset, internalActiveIndex]);

  // 创建激活区域的裁剪路径 - 只适用于type为0的区域
  const activeClipPath = useMemo(() => {
    if (internalActiveIndex === -1 || !shapePaths || !shapePaths[internalActiveIndex] || shapePaths[internalActiveIndex].type !== 0) {
      return null;
    }
    return shapePaths[internalActiveIndex].path;
  }, [shapePaths, internalActiveIndex]);

  // 图片的旋转变换
  const imageTransform = useMemo(() => [
    { translateX: width / 2 },
    { translateY: viewH / 2 },
    { rotate: -stripeAngleValue * (Math.PI / 180) },
    { translateX: -width / 2 },
    { translateY: -viewH / 2 },
  ], [width, viewH, stripeAngleValue]);

  // 使用ref存储路径数据
  const shapePathsRef = useRef(shapePaths);
  useEffect(() => {
    shapePathsRef.current = shapePaths;
  }, [shapePaths]);

  // 处理点击事件（考虑缩放和平移）
  const handleTap = (x: number, y: number) => {
    if (!shapePathsRef.current) return;

    // 关键修正：正确转换坐标到缩放前的坐标系
    const originalX = (x - translateX.value) / scale.value;
    const originalY = (y - translateY.value) / scale.value;

    for (let i = shapePathsRef.current.length - 1; i >= 0; i--) {
      const pathItem = shapePathsRef.current[i];

      // 对于type为1的线段，不进行contains检查，因为线段没有面积
      // 如果需要检测线段附近的点击，需要使用点到线的距离算法
      if (pathItem.type === 0) {
        if (pathItem.path.contains(originalX, originalY)) {
          setInternalActiveIndex(i);
          if (onZonePress) {
            onZonePress(i);
          }
          // 计算该区域的包围盒与居中缩放
          const zone = data?.[i];
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
            scheduleOnUI(focusToWorklet, cx, cy, desired);
          }
          return;
        }
      } else if (pathItem.type === 1) {
        // 对于type为1的线段，我们可以检测点击是否靠近线段
        // 这里使用简化的距离检查，检测点到线段的最短距离
        if (isPointNearLine(originalX, originalY, pathItem.path, 30 / scale.value)) {
          setInternalActiveIndex(i);
          if (onZonePress) {
            onZonePress(i);
          }
          return;
        }
      }
    }
  };

  // 辅助函数：检查点是否靠近线段
  const isPointNearLine = (x: number, y: number, path: any, threshold: number) => {
    // 这里需要遍历路径上的线段来检查点到线段的距离
    // 为了简化，我们使用一个近似算法
    // 实际应用中可能需要更精确的点到折线距离算法
    const tolerance = threshold || 15;

    // 获取路径的所有点
    const verbs = path.verbs;
    const points = path.points;

    if (!points || points.length < 2) return false;

    // 遍历每条线段检查距离
    for (let i = 0; i < points.length - 2; i += 2) {
      const x1 = points[i];
      const y1 = points[i + 1];
      const x2 = points[i + 2];
      const y2 = points[i + 3];

      // 计算点(x,y)到线段(x1,y1)-(x2,y2)的距离
      const distance = pointToLineDistance(x, y, x1, y1, x2, y2);
      if (distance < tolerance) {
        return true;
      }
    }

    return false;
  };

  // 计算点到线段的距离
  const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B); // 线段长度为0的情况

    let param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
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
      scheduleOnRN(handleTap, event.x, event.y);
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
  if (!data || data.length === 0) {
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
          {/* 首先绘制所有非选中区域和type不为0的选中区域 */}
          {shapePaths.map((shape, index) => {
            // 跳过type为0且被选中的区域，这些将在最后绘制
            if (data && data[index]?.type === 0 && index === internalActiveIndex) {
              return null;
            }

            return (
              <Group key={`shape-${index}`}>
                {shape.type === 0 ? (
                  <>
                    {/* 绘制区域填充 */}
                    <Path
                      path={shape.path}
                      color={Skia.Color(getShapeColor(index, shape.type))}
                    />

                    {/* 如果是激活区域，则在其上方绘制图片 */}
                    {index === internalActiveIndex && activeClipPath && (
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

                    {/* 绘制区域边框 */}
                    <Path
                      path={shape.path}
                      color={Skia.Color(getShapeBorderColor(index, shape.type))}
                      style="stroke"
                      strokeWidth={index === internalActiveIndex ? 3 / scale.value : 2 / scale.value}
                    />
                  </>
                ) : (
                  <>
                    {/* 绘制通道线段 - 实线背景 */}
                    <Path
                      path={shape.path}
                      color={'#70A4D2'}
                      style="stroke"
                      strokeJoin="round"
                      strokeCap="round"
                      strokeWidth={10 / scale.value}
                    />
                    {/* 绘制通道线段 - 虚线前景 */}
                    <Path
                      path={shape.path}
                      color={'#ffffff'}
                      style="stroke"
                      strokeJoin="round"
                      strokeCap="round"
                      strokeWidth={2 / scale.value}
                    >
                      <DashPathEffect intervals={[6, 3]} />
                    </Path>
                  </>
                )}
              </Group>
            );
          })}

          {/* 最后绘制type为0且被选中的区域，使其位于最顶层 */}
          {data && shapePaths.map((shape, index) => {
            if (data[index]?.type === 0 && index === internalActiveIndex) {
              return (
                <Group key={`top-shape-${index}`}>
                  {/* 绘制区域填充 */}
                  <Path
                    path={shape.path}
                    color={Skia.Color(getShapeColor(index, shape.type))}
                  />

                  {/* 绘制图片 */}
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

                  {/* 绘制区域边框 */}
                  <Path
                    path={shape.path}
                    color={Skia.Color(getShapeBorderColor(index, shape.type))}
                    style="stroke"
                    strokeWidth={3 / scale.value}
                  />
                </Group>
              );
            }
            return null;
          })}
        </Group>
      </Canvas>
    </GestureDetector>
  );
};

export default MultiplePolygonsMapCanvas;