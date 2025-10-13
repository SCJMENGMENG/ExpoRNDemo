import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import DrawerContent from './DrawerContent';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const DRAWER_RIGHT = SCREEN_WIDTH * 0.25;
const DEFAULT_EDGE_WIDTH = 15;

// 滑动速度阈值常量
const LEFT_VELOCITY_THRESHOLD = -0.5; // 左滑收起
const RIGHT_VELOCITY_THRESHOLD = 0.5; // 右滑展开

// 距离阈值常量
const DRAWER_DISTANCE_THRESHOLD = SCREEN_WIDTH / 2; // 展开/收起距离

type DrawerContextType = {
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const useDrawer = () => {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used within a DrawerProvider');
  return ctx;
};

export const DrawerProvider = ({ children, isHome }: { children: React.ReactNode, isHome: boolean }) => {
  const isDrawerOpenRef = useRef(false);
  const EDGE_WIDTH = isHome ? DEFAULT_EDGE_WIDTH : 0; // 首页允许从边缘拖出，其他页面禁用边缘手势
  const dragValueRef = useRef(0);

  const clamp = (x: number) => {
    const max = SCREEN_WIDTH - EDGE_WIDTH;
    if (x < 0) return 0;
    if (x > max) return max;
    return x;
  };

  // 展开到全屏
  const openDrawer = () => {
    Animated.spring(dragX, {
      toValue: SCREEN_WIDTH - EDGE_WIDTH,
      useNativeDriver: false,
    }).start();
  };
  // 收起
  const closeDrawer = () => {
    Animated.spring(dragX, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  // 拖动红色view动画
  const dragX = useRef(new Animated.Value(0)).current;

  const widthAnim = dragX.interpolate({
    inputRange: [0, SCREEN_WIDTH - EDGE_WIDTH],
    outputRange: [EDGE_WIDTH, SCREEN_WIDTH],
    extrapolate: 'clamp',
  });
  const fontSizeAnim = dragX.interpolate({
    inputRange: [0, SCREEN_WIDTH - EDGE_WIDTH],
    outputRange: [10, 60],
    extrapolate: 'clamp',
  });
  // 遮罩层透明度，拖动时显示，未拖动时隐藏
  const maskOpacity = dragX.interpolate({
    inputRange: [0, Math.max(40, EDGE_WIDTH), SCREEN_WIDTH - EDGE_WIDTH],
    outputRange: [0, 0.1, 0.4],
    extrapolate: 'clamp',
  });
  // 跟手拖动：记录初始dragX
  const startDragXRef = useRef(0);
  // 右侧关闭区域支持滑动和点击
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        const dragValue = dragValueRef.current;
        // 只在左侧 EDGE_WIDTH 区域或红色view区域或右侧关闭区域响应
        if ((EDGE_WIDTH > 0 && evt.nativeEvent.pageX < EDGE_WIDTH) || dragValue > 0) return true;
        // 右侧关闭区域
        if (
          dragValue >= SCREEN_WIDTH - EDGE_WIDTH - 2 &&
          evt.nativeEvent.pageX > SCREEN_WIDTH - DRAWER_RIGHT
        ) return true;
        return false;
      },
      onPanResponderGrant: () => {
        startDragXRef.current = dragValueRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        // 跟手拖动，允许来回拖动
        const newDx = clamp(startDragXRef.current + gestureState.dx);
        dragX.setValue(newDx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        console.log('滑动速度 vx:', gestureState.vx);
        // 判断是否为“点击”右侧关闭区域
        if (
          startDragXRef.current >= SCREEN_WIDTH - EDGE_WIDTH - 2 &&
          evt.nativeEvent.pageX > SCREEN_WIDTH - DRAWER_RIGHT &&
          Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5
        ) {
          closeDrawer();
          return;
        }
        const endValue = clamp(startDragXRef.current + gestureState.dx);
        const velocity = gestureState.vx;
        // 如果完全展开且左滑速度足够大，直接收起
        if (
          startDragXRef.current >= SCREEN_WIDTH - EDGE_WIDTH - 2 &&
          velocity < LEFT_VELOCITY_THRESHOLD
        ) {
          closeDrawer();
          return;
        }
        if (
          endValue > DRAWER_DISTANCE_THRESHOLD ||
          velocity > RIGHT_VELOCITY_THRESHOLD
        ) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
      onPanResponderTerminate: () => {
        closeDrawer();
      },
    })
  ).current;

  useEffect(() => {
    const listener = dragX.addListener(({ value }) => {
      isDrawerOpenRef.current = value >= SCREEN_WIDTH - EDGE_WIDTH - 2;
      dragValueRef.current = value;
    });
    return () => {
      dragX.removeListener(listener);
    };
  }, [dragX, SCREEN_WIDTH, EDGE_WIDTH]);

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // 用Animated插值版：根据 dragX 更新 translateX
  const drawerTranslate = dragX.interpolate({
    inputRange: [0, SCREEN_WIDTH - EDGE_WIDTH],
    outputRange: [-DRAWER_WIDTH, 0],
    extrapolate: 'clamp',
  });

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        {/* 左侧可拖动红色view */}
        <Animated.View
          style={[styles.drawerBase, { width: widthAnim }]}
          {...panResponder.panHandlers}
        >
          {/* <Animated.Text style={{ color: '#fff', fontSize: fontSizeAnim, marginLeft: 8, marginTop: 8 }}>
                        123
                    </Animated.Text> */}
          {/* Drawer 层 */}
          <Animated.View style={[styles.drawer, drawerStyle]}>
          {/* <Animated.View style={[ // Animated插值版
            styles.drawer,
            { transform: [{ translateX: drawerTranslate }] },
          ]}> */}
            <DrawerContent closeDrawer={closeDrawer} />
          </Animated.View>
          {/* 右侧关闭区域：透明View，支持滑动和点击 */}
          {isDrawerOpenRef.current && (
            <View
              style={{
                position: 'absolute',
                zIndex: 101,
                right: 0,
                top: 0,
                width: DRAWER_RIGHT,
                height: SCREEN_HEIGHT,
                backgroundColor: 'transparent',
              }}
            />
          )}
        </Animated.View>

        {/* 主内容 */}
        {children}

        {/* 遮罩层 */}
        <Animated.View
          pointerEvents="none"
          style={[styles.mask, { opacity: maskOpacity }]}
        />
      </View>
    </DrawerContext.Provider>
  );
};

const styles = StyleSheet.create({
  drawerBase: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'red',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',

    height: SCREEN_HEIGHT,
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    right: DRAWER_RIGHT,
    // left: 0, // Animated插值版
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  mask: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0,0,0,1)',
    zIndex: 9,
  },
  menuItem: {
    fontSize: 20,
    marginVertical: 10,
  },
});
