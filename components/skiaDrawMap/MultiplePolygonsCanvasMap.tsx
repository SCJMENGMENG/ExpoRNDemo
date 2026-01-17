import { Canvas, DashPathEffect, Group, Image, Path, Skia, SkPath, useImage } from '@shopify/react-native-skia';
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

export type ZoneData = {
  hashId: string;
  name: string;
  points: Point[];
};

export type ChannelData = {
  hashId: string;
  points: Point[];
};

export type PolygonData = {
  type: number; // 0表示区域，1表示通道
  data: ZoneData | ChannelData
};

const minS = 1; // 最小缩放比例
const maxS = 5; // 最大缩放比例
const IMAGE_FIXED_SCALE = 0.5; // 图片固定缩放系数（<1 让图片略小于画布）

interface MultiplePolygonsCanvasMapProps {
  width: number;
  viewH: number;
  data: PolygonData[] | undefined;
  stripeAngleValue: number;
  activeTabIndex: number;
  onItemPress?: (index: number) => void;
}

const MultiplePolygonsMapCanvas: React.FC<MultiplePolygonsCanvasMapProps> = ({
  width,
  viewH,
  data,
  stripeAngleValue,
  activeTabIndex = -1,
  onItemPress,
}) => {
  const image = useImage(require('../../assets/images/lawn.png'));
  const [internalActiveIndex, setInternalActiveIndex] = useState(activeTabIndex);

  // 缩放和平移状态
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslate = useSharedValue({ x: 0, y: 0 });

  // 计算所有多边形的整体边界
  const { globalBounds, layoutScale, offset } = useMemo(() => {
    if (!data || data.length === 0) {
      return { globalBounds: null, layoutScale: 1, offset: { x: 0, y: 0 } };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    data.forEach(item => {
      item.data?.points?.forEach((point: any) => {
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

  const mapYToScreenY = (y: number) => {
    if (!globalBounds) return y;
    // 关键公式：用 maxY 做镜像
    // 依据全局边界和缩放，计算用于垂直翻转的中心偏移
    // 垂直翻转：使用 (maxY - y) 将坐标系从数学坐标系转换为屏幕坐标系
    const boundsHeight = globalBounds.maxY - globalBounds.minY;
    const centerY = (viewH - boundsHeight * layoutScale) / 2;
    return (globalBounds.maxY - y) * layoutScale + centerY;
  };

  const mapXToScreenX = (x: number) => {
    return x * layoutScale + offset.x;
  };

  // 计算并聚焦到某个区域中心（在UI线程执行动画）
  const focusToWorklet = (cx: number, cy: number, targetScale: number) => {
    'worklet';
    const s = Math.max(minS, Math.min(maxS, targetScale));
    scale.value = withSpring(s);
    // 注意：当前Group的变换顺序为 scale -> translate
    // 屏幕中心对齐公式（scale -> translate）：T = screenCenter - s * contentCenter
    translateX.value = withSpring(width / 2 - s * cx);
    translateY.value = withSpring(viewH / 2 - s * cy);
  };

  type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

  const channelBoundsRef = useRef<Map<number, Bounds>>(new Map());

  // 同步内部状态和外部props
  useEffect(() => {
    setInternalActiveIndex(activeTabIndex);

    // 当activeTabIndex变化时，使对应图形居中显示
    if (activeTabIndex !== -1 && data && data[activeTabIndex]) {
      const item = data[activeTabIndex];
      if (item && item.data && item.data.points && item.data.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of item.data.points) {
          const px = mapXToScreenX(p.x);
          const py = mapYToScreenY(p.y);
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
        // 对于区域，我们希望完全显示，因此不限制只能放大
        const desired = fitScale;
        scheduleOnUI(focusToWorklet, cx, cy, desired);
      }
    }
  }, [activeTabIndex, data, layoutScale, offset, width, viewH, scale, focusToWorklet]);

  // 生成所有多边形/线条路径，保留原始索引
  const shapePaths = useMemo(() => {
    if (!data || !globalBounds) return [];

    // 创建包含原始索引的路径数组
    return data.map((item, originalIndex) => {
      const { data, type } = item;
      const { points } = data;
      const path = Skia.Path.Make();

      if (points.length > 0) {
        const firstPoint = points[0];
        const startX = mapXToScreenX(firstPoint.x);
        const startY = mapYToScreenY(firstPoint.y);
        path.moveTo(startX, startY);

        for (let i = 1; i < points.length; i++) {
          const p = points[i];
          path.lineTo(
            mapXToScreenX(p.x),
            mapYToScreenY(p.y)
          );
        }

        // 如果是区域(type === 0)，则闭合路径；如果是通道(type === 1)，则不闭合
        if (type === 0) {
          path.close();
        }
      }

      return {
        path,
        type,
        originalIndex, // 保存原始索引
      };
    });
  }, [data, globalBounds, layoutScale, offset]);

  // 根据类型排序，以便先绘制通道(type 1)，再绘制区域(type 0)
  const sortedShapePaths = useMemo(() => {
    if (!shapePaths.length) return [];

    return [...shapePaths].sort((a, b) => {
      // 先绘制 type 1 (通道)，再绘制 type 0 (区域)
      if (a.type === 1 && b.type === 0) return -1;
      if (a.type === 0 && b.type === 1) return 1;
      // 如果类型相同，保持原始顺序
      return a.originalIndex - b.originalIndex;
    });
  }, [shapePaths]);



  useEffect(() => {
    channelBoundsRef.current.clear();

    shapePaths.forEach(p => {
      if (p.type !== 1) return;

      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      const points = data?.[p.originalIndex]?.data.points ?? [];
      for (const pt of points) {
        const x = mapXToScreenX(pt.x);
        const y = mapYToScreenY(pt.y);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      channelBoundsRef.current.set(p.originalIndex, {
        minX,
        minY,
        maxX,
        maxY,
      });
    });
  }, [shapePaths, data]);

  // 创建激活区域的裁剪路径 - 只适用于type为0的区域，使用原始索引
  const clipPathRef = useRef<Map<number, SkPath>>(new Map());
  useEffect(() => {
    shapePaths.forEach(p => {
      if (p.type === 0) {
        clipPathRef.current.set(p.originalIndex, p.path);
      }
    });
  }, [shapePaths]);
  const activeClipPath = clipPathRef.current.get(internalActiveIndex) ?? null;

  // 计算当前激活图形的中心（屏幕坐标），用于作为图片旋转枢轴
  const activePivot = useMemo(() => {
    if (data && internalActiveIndex >= 0 && data[internalActiveIndex]?.data?.points?.length) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of data[internalActiveIndex]!.data!.points!) {
        const px = mapXToScreenX(p.x);
        const py = mapYToScreenY(p.y);
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      return { x: cx, y: cy };
    }
    return { x: width / 2, y: viewH / 2 };
  }, [data, internalActiveIndex, layoutScale, offset, width, viewH]);

  // 图片的旋转变换（围绕激活图形中心旋转，并应用固定缩放系数）
  const imageTransform = useMemo(() => {
    const pivotX = activePivot.x;
    const pivotY = activePivot.y;
    return [
      { translateX: pivotX },
      { translateY: pivotY },
      { rotate: -stripeAngleValue * (Math.PI / 180) },
      { scale: IMAGE_FIXED_SCALE },
      { translateX: -pivotX },
      { translateY: -pivotY },
    ];
  }, [activePivot, stripeAngleValue]);

  // 使用ref存储排序后的路径数据
  const shapePathsRef = useRef(sortedShapePaths);
  useEffect(() => {
    shapePathsRef.current = sortedShapePaths;
  }, [sortedShapePaths]);

  // 处理点击事件（考虑缩放和平移）
  const handleTap = (x: number, y: number) => {
    console.log('----点击事件处理开始----', x, y, shapePathsRef.current);
    if (!shapePathsRef.current) return;

    // 关键修正：正确转换坐标到缩放前的坐标系
    const originalX = (x - translateX.value) / scale.value;
    const originalY = (y - translateY.value) / scale.value;

    // 逆序遍历（因为最后绘制的在最上层，应该优先检测）
    for (let i = shapePathsRef.current.length - 1; i >= 0; i--) {
      const pathItem = shapePathsRef.current[i];
      const originalIndex = pathItem.originalIndex; // 使用原始索引

      // 对于type为0的区域，使用contains检查
      if (pathItem.type === 0) {
        if (pathItem.path.contains(originalX, originalY)) {
          setInternalActiveIndex(originalIndex); // 设置原始索引
          if (onItemPress) {
            onItemPress(originalIndex); // 使用原始索引
          }
          // 计算该区域的包围盒与居中缩放
          const zone = data?.[originalIndex];
          if (zone && zone.data && zone.data.points && zone.data.points.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of zone.data.points) {
              const px = mapXToScreenX(p.x);
              const py = mapYToScreenY(p.y);
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
            // 对于区域，我们希望完全显示，因此不限制只能放大
            const desired = fitScale;
            scheduleOnUI(focusToWorklet, cx, cy, desired);
          }
          return;
        }
      } else if (pathItem.type === 1) {
        // 对于type为1的线段，使用原始数据点来检测点击
        const line = data?.[originalIndex]; // 使用原始索引
        if (line && line.data && line.data.points && line.data.points.length > 1) {
          const bounds = channelBoundsRef.current.get(originalIndex);
          if (!bounds) continue;
          const tolerance = 30 / scale.value;
          if (
            originalX < bounds.minX - tolerance ||
            originalX > bounds.maxX + tolerance ||
            originalY < bounds.minY - tolerance ||
            originalY > bounds.maxY + tolerance
          ) {
            continue; // ⭐ 直接跳过，不做线段距离计算
          }

          // 使用原始数据中的点来计算点到线段的距离
          if (isPointNearLineByOriginalPoints(originalX, originalY, line.data.points, 30 / scale.value)) {
            setInternalActiveIndex(originalIndex); // 设置原始索引
            if (onItemPress) {
              onItemPress(originalIndex); // 使用原始索引
            }

            // 为线段计算中心点并居中显示
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of line.data.points) {
              const px = mapXToScreenX(p.x);
              const py = mapYToScreenY(p.y);
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
            // 对于区域，我们希望完全显示，因此不限制只能放大
            const desired = fitScale;
            scheduleOnUI(focusToWorklet, cx, cy, desired);
            return;
          }
        }
      }
    }
  };

  // 辅助函数：检查点是否靠近线段
  const isPointNearLineByOriginalPoints = (x: number, y: number, points: Point[], threshold: number) => {
    const tolerance = threshold || 15;

    if (points.length < 2) return false;

    // 遍历每条线段检查距离
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // 将原始坐标转换为屏幕坐标
      const x1 = mapXToScreenX(p1.x);
      const y1 = mapYToScreenY(p1.y);
      const x2 = mapXToScreenX(p2.x);
      const y2 = mapYToScreenY(p2.y);

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

  // 修正手势处理 - 简化实现
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      console.log('----缩放开始，当前scale：', scale.value);
      savedScale.value = scale.value;
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value,
      };
    })
    .onUpdate((event) => {
      const newScale = Math.max(minS, Math.min(maxS, savedScale.value * event.scale));
      const ratio = newScale / savedScale.value;

      const focalX = event.focalX;
      const focalY = event.focalY;

      translateX.value =
        focalX - (focalX - savedTranslate.value.x) * ratio;
      translateY.value =
        focalY - (focalY - savedTranslate.value.y) * ratio;

      scale.value = newScale;
    })
    .onEnd(() => {
      console.log('----缩放结束，当前scale：', scale.value);
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1) // ⭐ 关键：禁止双指
    .minDistance(3) // ⭐ 确保手势有效
    .onStart(() => {
      console.log('----平移开始，当前translate：', translateX.value, translateY.value);
      savedTranslate.value = {
        x: translateX.value,
        y: translateY.value,
      };
    })
    .onUpdate((event) => {
      translateX.value = savedTranslate.value.x + event.translationX;
      translateY.value = savedTranslate.value.y + event.translationY;
    })
    .onEnd(() => {
      console.log('----平移结束，当前translate：', translateX.value, translateY.value);
    });

  // 取消双击重置：不再注册双击手势

  const singleTapGesture = Gesture.Tap()
    .maxDeltaX(5) // 允许的最大横向偏移
    .maxDeltaY(5) // 允许的最大纵向偏移
    .requireExternalGestureToFail(pinchGesture) // 关键修正：单指点击需要等待缩放手势失败
    .requireExternalGestureToFail(panGesture) // 关键修正：单指点击需要等待平移手势失败
    .onStart(() => {
      console.log('----单指点击开始，当前translate：', translateX.value, translateY.value);
    })
    .onEnd((event) => {
      console.log('----单指点击结束，当前translate：', translateX.value, translateY.value);
      scheduleOnRN(handleTap, event.x, event.y);
    });

  // 关键修正：正确的手势组合
  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(panGesture, singleTapGesture) // 竞态：单指点击和缩放/平移手势不能同时进行
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
          {/* 按类型绘制：先绘制所有通道(type 1)，再绘制区域(type 0)，这样通道就在底层 */}
          {sortedShapePaths.map((shape, displayIndex) => {
            // 跳过type为0且被选中的区域，这些将在最后绘制
            if (data && data[shape.originalIndex]?.type === 0 && shape.originalIndex === internalActiveIndex) {
              return null;
            }

            return (
              <Group key={`shape-${shape.originalIndex}`}>
                {shape.type === 0 ? (
                  shape.originalIndex !== internalActiveIndex &&
                  <>
                    {/* 绘制区域填充 */}
                    <Path
                      path={shape.path}
                      color={Skia.Color('#E6E9F0')}
                    />
                    {/* 绘制区域边框 */}
                    <Path
                      path={shape.path}
                      color={Skia.Color('#5F7280')}
                      style="stroke"
                      strokeWidth={1}
                    />
                  </>
                ) : (
                  <>
                    {/* 绘制通道线段 - 实线背景 */}
                    <Path
                      path={shape.path}
                      color={Skia.Color(
                        shape.originalIndex === internalActiveIndex
                          ? '#4CDAA2'
                          : '#70A4D2'
                      )}
                      style="stroke"
                      strokeJoin="round"
                      strokeCap="round"
                      strokeWidth={4}
                    />
                    {/* 绘制通道线段 - 虚线前景 */}
                    <Path
                      path={shape.path}
                      color={'#ffffff'}
                      style="stroke"
                      strokeJoin="round"
                      strokeCap="round"
                      strokeWidth={1}
                    >
                      <DashPathEffect intervals={[6, 3]} />
                    </Path>
                  </>
                )}
              </Group>
            );
          })}

          {/* 最后绘制type为0且被选中的区域，使其位于最顶层 */}
          {data && sortedShapePaths.map((shape, displayIndex) => {
            if (data[shape.originalIndex]?.type === 0 && shape.originalIndex === internalActiveIndex) {
              return (
                <Group key={`top-shape-${shape.originalIndex}`}>
                  {/* 绘制区域填充 */}
                  <Path
                    path={shape.path}
                    color={Skia.Color('transparent')}
                  />

                  {/* 绘制图片 */}
                  {activeClipPath && (
                    <Group clip={activeClipPath} invertClip={false}>
                      <Group transform={imageTransform}>
                        {
                          (() => {
                            const diag = Math.sqrt(width * width + viewH * viewH);
                            const imgW = diag;
                            const imgH = diag;
                            const imgX = activePivot.x - imgW / 2;
                            const imgY = activePivot.y - imgH / 2;
                            return (
                              <Image
                                image={image}
                                fit="cover"
                                width={imgW}
                                height={imgH}
                                x={imgX}
                                y={imgY}
                              />
                            );
                          })()
                        }
                      </Group>
                    </Group>
                  )}

                  {/* 绘制区域边框 */}
                  <Path
                    path={shape.path}
                    color={Skia.Color('#4CDAA2')}
                    style="stroke"
                    strokeWidth={1}
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