import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, Button, Dimensions, FlatList, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const DRAWER_RIGHT = SCREEN_WIDTH * 0.25;
const DEFAULT_EDGE_WIDTH = 15;

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
    const router = useRouter();
    const translateX = useSharedValue(-DRAWER_WIDTH);
    const isDrawerOpenRef = useRef(false);
    const EDGE_WIDTH = isHome ? DEFAULT_EDGE_WIDTH : 0; // 首页允许从边缘拖出，其他页面禁用边缘手势

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

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // 拖动红色view动画
    const dragX = useRef(new Animated.Value(0)).current;

    // 滑动速度阈值常量
    const LEFT_VELOCITY_THRESHOLD = -0.5; // 左滑收起
    const RIGHT_VELOCITY_THRESHOLD = 0.5; // 右滑展开

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
                const dragValue = dragX.__getValue();
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
                // 判断是否为“点击”右侧关闭区域
                if (
                    startDragXRef.current >= SCREEN_WIDTH - EDGE_WIDTH - 2 &&
                    evt.nativeEvent.pageX > SCREEN_WIDTH - DRAWER_RIGHT &&
                    Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5
                ) {
                    closeDrawer();
                    return;
                }
                let endValue = startDragXRef.current + gestureState.dx;
                if (endValue < 0) endValue = 0;
                if (endValue > SCREEN_WIDTH - EDGE_WIDTH) endValue = SCREEN_WIDTH - EDGE_WIDTH;
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
        });
        return () => {
            dragX.removeListener(listener);
        };
    }, [dragX, SCREEN_WIDTH, EDGE_WIDTH]);

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
                        <View style={{ flex: 1, padding: 20 }}>
                            <View style={{ height: 50 }} />
                            <Button title="关闭菜单" onPress={() => {
                                closeDrawer()
                                console.log('closeDrawer')
                            }} />
                            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>菜单</Text>
                            {/* 菜单列表可上下滑动 */}
                            <FlatList
                                data={[
                                    { icon: '🏠', label: '首页', route: '/child/target' },
                                    { icon: '👤', label: '个人中心', route: '/child/threads' },
                                    { icon: '⚙️', label: '设置', route: '/settings' },
                                    { icon: '🚪', label: '退出登录', route: '/logout' },
                                    // 可继续添加更多菜单项
                                ]}
                                keyExtractor={item => item.label}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => {
                                            router.push(item.route as any);
                                            closeDrawer();
                                        }}
                                    >
                                        <Text style={styles.menuItem}>{item.icon} {item.label}</Text>
                                    </TouchableOpacity>
                                )}
                                showsVerticalScrollIndicator={false}
                                style={{ flex: 1 }}
                            />
                        </View>
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
