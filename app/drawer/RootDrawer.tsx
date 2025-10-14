import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { Extrapolate, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import DrawerContent from './DrawerContent';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;
const DRAWER_RIGHT = SCREEN_WIDTH * 0.2;
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


export const DrawerProvider = ({ children, isHome }: { children: React.ReactNode; isHome: boolean }) => {
  const isDrawerOpenRef = useRef(false);
  const EDGE_WIDTH = isHome ? DEFAULT_EDGE_WIDTH : 0; // 首页允许从边缘拖出，其他页面禁用边缘手势
  const dragValueRef = useRef(0);

  const clamp = (x: number) => {
    const max = SCREEN_WIDTH - EDGE_WIDTH;
    if (x < 0) return 0;
    if (x > max) return max;
    return x;
  };

  // 单一共享值，0 ~ (SCREEN_WIDTH - EDGE_WIDTH)
  const dragX = useSharedValue(0);
  const startX = useSharedValue(0);

  const springCfg = { damping: 18, stiffness: 180 };

  const openDrawer = () => {
    dragX.value = withSpring(SCREEN_WIDTH - EDGE_WIDTH, springCfg);
  };
  const closeDrawer = () => {
    dragX.value = withSpring(0, springCfg);
  };

  // 样式派生
  const drawerStyle = useAnimatedStyle(() => {
    const tx = interpolate(dragX.value, [0, SCREEN_WIDTH - EDGE_WIDTH], [-DRAWER_WIDTH, 0], Extrapolate.CLAMP);
    return { transform: [{ translateX: tx }] };
  });
  const redStyle = useAnimatedStyle(() => {
    const w = interpolate(dragX.value, [0, SCREEN_WIDTH - EDGE_WIDTH], [EDGE_WIDTH, SCREEN_WIDTH], Extrapolate.CLAMP);
    return { width: w };
  });
  const maskStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, Math.max(40, EDGE_WIDTH), SCREEN_WIDTH - EDGE_WIDTH], [0, 0.1, 0.4], Extrapolate.CLAMP),
  }));

  // 遮罩可点状态，仅在开合状态切换时同步到 JS
  const [maskTouchable, setMaskTouchable] = useState(false);
  const setOpenJS = (open: boolean) => {
    isDrawerOpenRef.current = open;
    setMaskTouchable(open);
  };
  useAnimatedReaction(
    () => dragX.value >= Math.max(8, EDGE_WIDTH * 0.5),
    (isOpen, wasOpen) => {
      if (isOpen !== wasOpen) {
        runOnJS(setOpenJS)(isOpen);
      }
    },
  );

  // 完全展开状态（仅当抽屉到达最右位置才为 true，用于右侧关闭热区渲染）
  const [isFullyOpen, setIsFullyOpen] = useState(false);
  const setFullyOpenJS = (full: boolean) => setIsFullyOpen(full);
  useAnimatedReaction(
    () => dragX.value >= SCREEN_WIDTH - EDGE_WIDTH - 2,
    (full, wasFull) => {
      if (full !== wasFull) {
        runOnJS(setFullyOpenJS)(full);
      }
    },
  );

  // 手势（Pan + Tap）
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart(() => {
        'worklet';
        startX.value = dragX.value;
      })
      .onUpdate((e) => {
        'worklet';
        let x = startX.value + e.translationX;
        if (x < 0) x = 0;
        const max = SCREEN_WIDTH - EDGE_WIDTH;
        if (x > max) x = max;
        dragX.value = x;
      })
      .onEnd((e) => {
        'worklet';
        const endValue = Math.max(0, Math.min(startX.value + e.translationX, SCREEN_WIDTH - EDGE_WIDTH));
        const vNorm = e.velocityX / 1000; // normalize to ~PanResponder scale
        if (endValue > DRAWER_DISTANCE_THRESHOLD || vNorm > RIGHT_VELOCITY_THRESHOLD) {
          dragX.value = withSpring(SCREEN_WIDTH - EDGE_WIDTH, springCfg);
        } else if (vNorm < LEFT_VELOCITY_THRESHOLD) {
          dragX.value = withSpring(0, springCfg);
        } else {
          const mid = (SCREEN_WIDTH - EDGE_WIDTH) / 2;
          dragX.value = withSpring(endValue >= mid ? (SCREEN_WIDTH - EDGE_WIDTH) : 0, springCfg);
        }
      });
  }, [EDGE_WIDTH]);

  // 左边缘只在首页可触发
  const edgeGesture = useMemo(() => {
    return Gesture.Pan()
      .hitSlop({ left: 0, width: EDGE_WIDTH })
      .onStart(() => { 'worklet'; startX.value = dragX.value; })
      .onUpdate((e) => {
        'worklet';
        let x = startX.value + e.translationX;
        if (x < 0) x = 0;
        const max = SCREEN_WIDTH - EDGE_WIDTH;
        if (x > max) x = max;
        dragX.value = x;
      })
      .onEnd((e) => {
        'worklet';
        const endValue = Math.max(0, Math.min(startX.value + e.translationX, SCREEN_WIDTH - EDGE_WIDTH));
        const vNorm = e.velocityX / 1000;
        if (endValue > DRAWER_DISTANCE_THRESHOLD || vNorm > RIGHT_VELOCITY_THRESHOLD) {
          dragX.value = withSpring(SCREEN_WIDTH - EDGE_WIDTH, springCfg);
        } else {
          dragX.value = withSpring(0, springCfg);
        }
      });
  }, [EDGE_WIDTH]);

  const tapMaskGesture = useMemo(() => Gesture.Tap().onEnd(() => { 'worklet'; dragX.value = withSpring(0, springCfg); }), []);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        {/* 左侧可拖动红色view（手势控制） */}
        <GestureDetector gesture={panGesture}>
          <Reanimated.View style={[styles.drawerBase, redStyle]}>
            {/* Drawer 层 */}
            <Reanimated.View style={[styles.drawer, drawerStyle]}>
              <DrawerContent closeDrawer={closeDrawer} />
            </Reanimated.View>
          </Reanimated.View>
        </GestureDetector>

        {/* 主内容 */}
        {children}

        {/* 遮罩层：仅展示，不拦截点击 */}
        {maskTouchable ? (
          <Reanimated.View pointerEvents="none" style={[styles.mask, maskStyle]} />
        ) : null}

        {/* 右侧关闭热区：抽屉展开后，点击右侧 DRAWER_RIGHT 关闭（置于抽屉之上） */}
  {isFullyOpen ? (
          <GestureDetector gesture={tapMaskGesture}>
            <View style={[styles.rightCloseArea, { width: DRAWER_RIGHT, height: SCREEN_HEIGHT }]} />
          </GestureDetector>
        ) : null}

        {/* 左侧边缘打开热区（仅首页启用） */}
        {EDGE_WIDTH > 0 && (
          <GestureDetector gesture={edgeGesture}>
            <View style={[styles.edgeArea, { width: EDGE_WIDTH, height: SCREEN_HEIGHT }]} />
          </GestureDetector>
        )}
      </View>
    </DrawerContext.Provider>
  );
};

const styles = StyleSheet.create({
  drawerBase: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'red',//'transparent',
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
    backgroundColor: 'yellow',//'rgba(0,0,0,1)',
    zIndex: 9,
  },
  edgeArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'cyan',//'transparent',
    zIndex: 11,
  },
  rightCloseArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'blue',//'transparent',
    zIndex: 200,
  },
  menuItem: {
    fontSize: 20,
    marginVertical: 10,
  },
});
