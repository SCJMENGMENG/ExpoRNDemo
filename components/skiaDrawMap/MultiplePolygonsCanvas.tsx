// src/components/MapPreviewCanvas.tsx
import { Canvas, Group, Image, Path, Skia, useImage } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

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
}

const MultiplePolygonsCanvas: React.FC<MultiplePolygonsCanvasProps> = ({
  width,
  viewH,
  zones,
  stripeAngleValue,
}) => {
  const image = useImage(require('../../assets/images/lawn.png'));

  // 计算所有多边形的整体边界
  const { globalBounds, scale, offset } = useMemo(() => {
    if (!zones || zones.length === 0) {
      return { globalBounds: null, scale: 1, offset: { x: 0, y: 0 } };
    }

    // 计算所有点的全局边界
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

    // 计算缩放比例，考虑内边距
    const padding = 40;
    const scaleX = (width - padding * 2) / boundsWidth;
    const scaleY = (viewH - padding * 2) / boundsHeight;
    const scale = Math.min(scaleX, scaleY);

    // 计算偏移量，使图形居中
    const offsetX = (width - boundsWidth * scale) / 2 - minX * scale;
    const offsetY = (viewH - boundsHeight * scale) / 2 - minY * scale;

    return { globalBounds, scale, offset: { x: offsetX, y: offsetY } };
  }, [zones, width, viewH]);

  // 为不同区域生成不同颜色
  const getZoneColor = (index: number) => {
    const colors = ['transparent'];
    return colors[index % colors.length];
  };

  const getBorderColor = (index: number) => {
    const colors = ['#5F7280'];
    return colors[index % colors.length];
  };

  // 生成所有多边形路径（保持相对位置）
  const zonePaths = useMemo(() => {
    if (!zones || !globalBounds) return [];

    return zones.map((zone, zoneIndex) => {
      const { points } = zone;

      const path = Skia.Path.Make();

      if (points.length > 0) {
        // 移动到第一个点
        const firstPoint = points[0];
        const startX = firstPoint.x * scale + offset.x;
        const startY = firstPoint.y * scale + offset.y;
        path.moveTo(startX, startY);

        // 连接所有点
        for (let i = 1; i < points.length; i++) {
          const point = points[i];
          const x = point.x * scale + offset.x;
          const y = point.y * scale + offset.y;
          path.lineTo(x, y);
        }

        // 闭合路径
        path.close();
      }

      return {
        path,
        fillColor: getZoneColor(zoneIndex),
        borderColor: getBorderColor(zoneIndex)
      };
    });
  }, [zones, globalBounds, scale, offset]);

  // 创建用于图形裁剪的合并路径
  const clipPath = useMemo(() => {
    if (!zonePaths || zonePaths.length === 0) return null;

    const combinedPath = Skia.Path.Make();
    zonePaths.forEach((zone, index) => {
      if (index === 0) {
        combinedPath.addPath(zone.path);
      } else {
        combinedPath.addPath(zone.path);
      }
    });
    return combinedPath;
  }, [zonePaths]);

  // 图片的旋转变换
  const imageTransform = useMemo(() => [
    { translateX: width / 2 },
    { translateY: viewH / 2 },
    { rotate: -stripeAngleValue * (Math.PI / 180) }, // 将角度转换为弧度
    { translateX: -width / 2 },
    { translateY: -viewH / 2 },
  ], [width, viewH, stripeAngleValue]);

  // 如果没有区域数据，显示提示
  if (!zones || zones.length === 0) {
    return (
      <View>
        <Text>No zone data available.</Text>
      </View>
    );
  }

  return (
    <Canvas style={{ width, height: viewH }}>
      {/* 外层Group：应用裁剪，只显示图形区域的内容 */}
      {clipPath && (
        <Group clip={clipPath} invertClip={false}>
          {/* 图片Group：应用旋转变换 */}
          <Group transform={imageTransform}>
            <Image
              image={image}
              fit="cover"
              width={width * 1.2}
              height={viewH * 1.2}
              x={-width / 12}
              y={-viewH / 12}
            />
          </Group>

          {/* 图形Group：不应用旋转，保持静止 */}
          <Group>
            {/* 绘制所有多边形填充 */}
            {zonePaths.map((shape, index) => (
              <Path
                key={`fill-${index}`}
                path={shape.path}
                color={Skia.Color(shape.fillColor)}
              />
            ))}
          </Group>
        </Group>
      )}

      {/* 图形边框：在裁剪区域外绘制，保持静止 */}
      <Group>
        {zonePaths.map((shape, index) => (
          <Path
            key={`border-${index}`}
            path={shape.path}
            color={Skia.Color(shape.borderColor)}
            style="stroke"
            strokeWidth={2}
          />
        ))}
      </Group>
    </Canvas>
  );
};

export default MultiplePolygonsCanvas;