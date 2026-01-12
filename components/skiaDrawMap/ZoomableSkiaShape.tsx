// ZoomableSkiaShape.tsx
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { 
  Canvas, 
  Circle, 
  Group, 
  Path,
  Skia
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { 
  useSharedValue, 
  useDerivedValue, 
  withSpring,
  runOnJS 
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
      savedTranslate.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      // 计算新的缩放比例，限制在minScale和maxScale之间
      const newScale = Math.max(minScale, Math.min(maxScale, savedScale.value * event.scale));
      
      if (event.numberOfPointers === 2) {
        // 获取手势焦点（两指中心点）
        const focalX = event.focalX;
        const focalY = event.focalY;
        
        // 计算缩放中心点对应的画布坐标
        const centerX = (focalX - savedTranslate.value.x) / savedScale.value;
        const centerY = (focalY - savedTranslate.value.y) / savedScale.value;
        
        // 基于缩放中心点计算新的平移量
        translateX.value = focalX - centerX * newScale;
        translateY.value = focalY - centerY * newScale;
      }
      
      scale.value = newScale;
    })
    .onEnd(() => {
      // 手势结束时添加弹性动画
      scale.value = withSpring(scale.value, {
        damping: 20,
        stiffness: 90,
      });
    });

  // 处理拖拽手势[1](@ref)
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTranslate.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      const newTranslateX = savedTranslate.value.x + event.translationX;
      const newTranslateY = savedTranslate.value.y + event.translationY;
      
      // 添加边界限制，防止视图移出画布太远
      const maxTranslateX = width * (scale.value - 1) / 2;
      const maxTranslateY = height * (scale.value - 1) / 2;
      
      translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, newTranslateX));
      translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, newTranslateY));
    })
    .onEnd(() => {
      // 拖拽结束时添加弹性动画
      translateX.value = withSpring(translateX.value, {
        damping: 20,
        stiffness: 90,
      });
      translateY.value = withSpring(translateY.value, {
        damping: 20,
        stiffness: 90,
      });
    });

  // 双击重置手势
  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // 双击重置缩放和平移
      scale.value = withSpring(initialScale, {
        damping: 20,
        stiffness: 90,
      });
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
    });

  // 组合手势[7](@ref)
  const composedGestures = Gesture.Race(
    Gesture.Simultaneous(pinchGesture, panGesture),
    tapGesture
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