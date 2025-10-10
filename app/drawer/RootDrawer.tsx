import React, { createContext, useContext, useRef } from 'react';
import { Animated, Button, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';
import {
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;
const DRAWER_Right = width * 0.25;
const EDGE_WIDTH = 15;

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

export const DrawerProvider = ({ children }: { children: React.ReactNode }) => {
    const translateX = useSharedValue(-DRAWER_WIDTH);

    const openDrawer = () => {
        Animated.spring(dragX, {
            toValue: SCREEN_WIDTH - EDGE_WIDTH,
            useNativeDriver: false,
        }).start();
    };

    const closeDrawer = () => {
        Animated.spring(dragX, {
            toValue: 0,
            useNativeDriver: false,
        }).start();
    };

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // 拖动红色view动画
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
    const dragX = useRef(new Animated.Value(0)).current;

    // 滑动速度阈值常量
    const LEFT_VELOCITY_THRESHOLD = -1.2; // 左滑收起
    const RIGHT_VELOCITY_THRESHOLD = 1.2; // 右滑展开

    // 距离阈值常量
    const DRAWER_DISTANCE_THRESHOLD = SCREEN_WIDTH / 2; // 展开/收起距离

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
        inputRange: [0, 40, SCREEN_WIDTH - EDGE_WIDTH],
        outputRange: [0, 0.16, 0.3],
        extrapolate: 'clamp',
    });
    // 跟手拖动：记录初始dragX
    const startDragXRef = useRef(0);
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (evt, gestureState) => {
                // 只在左侧40px或红色view区域响应
                const dragValue = dragX.__getValue();
                return evt.nativeEvent.pageX < 40 || dragValue > 0;
            },
            onPanResponderGrant: () => {
                startDragXRef.current = dragX.__getValue();
            },
            onPanResponderMove: (evt, gestureState) => {
                // 跟手拖动，允许来回拖动
                let newDx = startDragXRef.current + gestureState.dx;
                if (newDx < 0) newDx = 0;
                if (newDx > SCREEN_WIDTH - EDGE_WIDTH) newDx = SCREEN_WIDTH - EDGE_WIDTH;
                dragX.setValue(newDx);
            },
            onPanResponderRelease: (evt, gestureState) => {
                console.log('滑动速度 vx:', gestureState.vx);
                let endValue = startDragXRef.current + gestureState.dx;
                if (endValue < 0) endValue = 0;
                if (endValue > SCREEN_WIDTH - EDGE_WIDTH) endValue = SCREEN_WIDTH - EDGE_WIDTH;
                const velocity = gestureState.vx;

                // 如果完全展开且左滑速度足够大，直接收起
                if (
                    startDragXRef.current >= SCREEN_WIDTH - EDGE_WIDTH - 2 &&
                    velocity < LEFT_VELOCITY_THRESHOLD
                ) {
                    Animated.spring(dragX, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
                    return;
                }
                if (
                    endValue > DRAWER_DISTANCE_THRESHOLD ||
                    velocity > RIGHT_VELOCITY_THRESHOLD
                ) {
                    // 展开到全屏
                    Animated.spring(dragX, {
                        toValue: SCREEN_WIDTH - EDGE_WIDTH,
                        useNativeDriver: false,
                    }).start();
                } else {
                    // 收起
                    Animated.spring(dragX, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(dragX, {
                    toValue: 0,
                    useNativeDriver: false,
                }).start();
            },
        })
    ).current;

    return (
        <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
            <View style={{ flex: 1 }}>
                {/* 左侧可拖动红色view */}
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            backgroundColor: 'red',
                            justifyContent: 'flex-start',
                            alignItems: 'flex-start',
                            borderTopRightRadius: 16,
                            borderBottomRightRadius: 16,
                            overflow: 'hidden',
                            width: widthAnim,
                            height: SCREEN_HEIGHT,
                            zIndex: 10,
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* <Animated.Text style={{ color: '#fff', fontSize: fontSizeAnim, marginLeft: 8, marginTop: 8 }}>
                        123
                    </Animated.Text> */}
                    {/* Drawer 层 */}
                    <Animated.View style={[styles.drawer, drawerStyle]}>
                        <View style={{ flex: 1, padding: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>菜单</Text>
                            <Text style={styles.menuItem}>🏠 首页</Text>
                            <Text style={styles.menuItem}>👤 个人中心</Text>
                            <Text style={styles.menuItem}>⚙️ 设置</Text>
                            <Text style={styles.menuItem}>🚪 退出登录</Text>
                            <Button title="关闭菜单" onPress={() => {
                                closeDrawer()
                                console.log('closeDrawer')
                            }} />
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* 主内容 */}
                {children}

                {/* 遮罩层 */}
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: SCREEN_WIDTH,
                        height: SCREEN_HEIGHT,
                        backgroundColor: 'rgba(0,0,0,1)',
                        opacity: maskOpacity,
                        zIndex: 9,
                    }}
                />
            </View>
        </DrawerContext.Provider>
    );
};

const styles = StyleSheet.create({
    drawer: {
        position: 'absolute',
        right: DRAWER_Right,
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
    menuItem: {
        fontSize: 20,
        marginVertical: 10,
    },
});
