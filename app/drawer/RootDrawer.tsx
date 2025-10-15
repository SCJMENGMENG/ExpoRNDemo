import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { Extrapolate, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';
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
const TAP_SLOP_PX = 3; // 轻点最小位移
const TAP_VELOCITY_PX = 50; // 轻点最大速度（px/s）

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
  // 用 SharedValue 同步 isHome、EDGE_WIDTH，避免重建手势
  const isHomeSV = useSharedValue<boolean>(isHome);
  const edgeWidthSV = useSharedValue<number>(isHome ? DEFAULT_EDGE_WIDTH : 0);// 首页允许从边缘拖出，其他页面禁用边缘手势

  useEffect(() => {
    isHomeSV.value = isHome;
    edgeWidthSV.value = isHome ? DEFAULT_EDGE_WIDTH : 0;
  }, [isHome, isHomeSV, edgeWidthSV]);

  const isDrawerOpenRef = useRef(false);
  const dragValueRef = useRef(0);

  // 单一共享值，0 ~ (SCREEN_WIDTH - EDGE_WIDTH)
  const dragX = useSharedValue(0);
  const startX = useSharedValue(0);

  // 基于 edgeWidthSV 推导最大/打开位置
  const openPos = useDerivedValue(() => SCREEN_WIDTH - edgeWidthSV.value);
  const midPos = useDerivedValue(() => openPos.value / 2);

  const springCfg = { damping: 18, stiffness: 180 };

  const openDrawer = () => {
    dragX.value = withSpring(openPos.value, springCfg);
  };
  const closeDrawer = () => {
    dragX.value = withSpring(0, springCfg);
  };

  // 样式派生
  // Drawer 层保持与base右侧恒定间距（right: DRAWER_RIGHT），不再做水平平移
  // 这样在拖动过程中，白色 Drawer 与base容器的间距始终为 DRAWER_RIGHT，避免“半屏才出现/半屏就消失”的现象
  const drawerStyle = useAnimatedStyle(() => {
    return {};
  });
  const baseStyle = useAnimatedStyle(() => {
    const w = interpolate(
      dragX.value,
      [0, openPos.value],
      [edgeWidthSV.value, SCREEN_WIDTH],
      Extrapolate.CLAMP
    );
    return { width: w };
  });
  const maskStyle = useAnimatedStyle(() => {
    const start = Math.max(40, edgeWidthSV.value);
    return {
      opacity: interpolate(
        dragX.value,
        [0, start, openPos.value],
        [0, 0.2, 0.2],
        Extrapolate.CLAMP
      ),
    };
  });

  // 遮罩可点状态，仅在开合状态切换时同步到 JS
  const [maskTouchable, setMaskTouchable] = useState(false);
  const setOpenJS = (open: boolean) => {
    isDrawerOpenRef.current = open;
    setMaskTouchable(open);
  };
  useAnimatedReaction(
    () => dragX.value >= Math.max(8, edgeWidthSV.value * 0.5),
    (isOpen, wasOpen) => {
      if (isOpen !== wasOpen) runOnJS(setOpenJS)(isOpen);
    },
  );

  // 完全展开状态（仅当抽屉到达最右位置才为 true，用于右侧关闭热区渲染）
  const [isFullyOpen, setIsFullyOpen] = useState(false);
  const setFullyOpenJS = (full: boolean) => setIsFullyOpen(full);
  useAnimatedReaction(
    () => dragX.value >= openPos.value - 2,
    (full, wasFull) => {
      if (full !== wasFull) runOnJS(setFullyOpenJS)(full);
    },
  );

  // 手势（Pan + Tap, 只创建一次，逻辑依赖 sharedValue）
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart(() => {
        'worklet';
        startX.value = dragX.value;
      })
      .onUpdate((e) => {
        'worklet';
        // 非首页且当前是完全关闭，不允许从边缘拉开
        if (!isHomeSV.value && startX.value === 0 && e.translationX > 0) {
          return;
        }
        let x = startX.value + e.translationX;
        if (x < 0) x = 0;
        const max = openPos.value;
        if (x > max) x = max;
        dragX.value = x;
      })
      .onEnd((e) => {
        'worklet';
        // 忽略轻点
        if (Math.abs(e.translationX) < TAP_SLOP_PX && Math.abs(e.velocityX) < TAP_VELOCITY_PX) {
          return;
        }
        const endValue = Math.max(0, Math.min(startX.value + e.translationX, openPos.value));
        const vNorm = e.velocityX / 1000; // 归一化速度
        // 速度优先
        if (vNorm <= LEFT_VELOCITY_THRESHOLD) {
          dragX.value = withSpring(0, springCfg);
          return;
        }
        if (vNorm >= RIGHT_VELOCITY_THRESHOLD) {
          // 非首页且从完全关闭开始，不允许“速度展开”
          if (!isHomeSV.value && startX.value === 0) {
            dragX.value = withSpring(0, springCfg);
          } else {
            dragX.value = withSpring(openPos.value, springCfg);
          }
          return;
        }
        // 距离兜底（取中点）
        dragX.value = withSpring(endValue >= midPos.value ? openPos.value : 0, springCfg);
      });
  }, []); // 不依赖 EDGE_WIDTH/isHome，全部从 sharedValue 读取

  // base点击：仅在完全展开时触发关闭；若点击命中白色 DrawerContent 区域则不关闭
  const tapDrawerGesture = useMemo(() =>
    Gesture.Tap().onEnd((e) => {
      'worklet';
      // 计算当前base宽度
      const w = interpolate(
        dragX.value,
        [0, openPos.value],
        [edgeWidthSV.value, SCREEN_WIDTH],
        Extrapolate.CLAMP,
      );
      // 白板区域（相对base坐标系）
      const drawerLeft = w - DRAWER_RIGHT - DRAWER_WIDTH;
      const drawerRight = w - DRAWER_RIGHT;
      const insideWhiteDrawer = e.x >= drawerLeft && e.x <= drawerRight;
      if (insideWhiteDrawer) {
        return; // 点击在 DrawerContent 上，不触发收起
      }
      // 仅在完全展开时允许点击base空白处收起
      if (dragX.value >= openPos.value - 2) {
        dragX.value = withSpring(0, springCfg);
      }
    })
    , []);
  // 抽屉容器（base）手势：始终 Tap+Pan 组合，避免切换导致的手势中断
  const drawerAreaGesture = useMemo(() => Gesture.Race(tapDrawerGesture, panGesture), [tapDrawerGesture, panGesture]);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      <View style={{ flex: 1 }}>
        {/* 左侧可拖动baseview（展开时支持点击关闭） */}
        <GestureDetector gesture={drawerAreaGesture}>
          <Reanimated.View style={[styles.drawerBase, baseStyle]}>
            {/* Drawer 层 */}
            <Reanimated.View style={[styles.drawer, drawerStyle]}>
              <DrawerContent />
            </Reanimated.View>
          </Reanimated.View>
        </GestureDetector>

        {/* 主内容 */}
        {children}

        {/* 遮罩层：仅展示，不拦截点击 */}
        {maskTouchable ? (
          <Reanimated.View pointerEvents="none" style={[styles.mask, maskStyle]} />
        ) : null}

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
  menuItem: {
    fontSize: 20,
    marginVertical: 10,
  },
});
