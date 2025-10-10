import React, { createContext, useContext } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

const DrawerContext = createContext({
  openDrawer: () => { },
  closeDrawer: () => { },
});

export const useDrawer = () => useContext(DrawerContext);

export const DrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const translateX = useSharedValue(-DRAWER_WIDTH);

  const openDrawer = () => {
    translateX.value = withSpring(0, { damping: 15 });
  };
  const closeDrawer = () => {
    translateX.value = withSpring(-DRAWER_WIDTH, { damping: 15 });
  };

  /** ✅ 跟手手势逻辑 */
  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // 👈 限制从水平方向滑动触发
    .onBegin(() => {
      // do nothing
    })
    .onUpdate((e) => {
      const newX = translateX.value + e.changeX;
      // 限制范围 [-DRAWER_WIDTH, 0]
      translateX.value = Math.min(0, Math.max(-DRAWER_WIDTH, newX));
    })
    .onEnd(() => {
      if (translateX.value > -DRAWER_WIDTH / 2) {
        translateX.value = withSpring(0, { damping: 15 });
      } else {
        translateX.value = withSpring(-DRAWER_WIDTH, { damping: 15 });
      }
    });

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 + translateX.value / DRAWER_WIDTH,
    display: translateX.value === -DRAWER_WIDTH ? 'none' : 'flex',
  }));

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}

      {/* Drawer 组件 */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.drawer, drawerStyle]}>
          <View style={{ flex: 1, padding: 20 }}>
            <Pressable onPress={closeDrawer}>
              <View style={{ height: 40, justifyContent: 'center' }}>
                <Animated.Text style={{ fontSize: 18, fontWeight: 'bold' }}>关闭菜单</Animated.Text>
              </View>
            </Pressable>

            <View style={{ marginTop: 20 }}>
              <Animated.Text style={{ fontSize: 20 }}>🏠 首页</Animated.Text>
              <Animated.Text style={{ fontSize: 20, marginTop: 10 }}>👤 个人中心</Animated.Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* 遮罩层（只在 Drawer 打开时响应点击） */}
      <Animated.View
        pointerEvents={translateX.value === -DRAWER_WIDTH ? 'none' : 'auto'}
        style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}
      >
        <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
      </Animated.View>
    </DrawerContext.Provider>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 0 },
    zIndex: 10,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 5,
  },
});
