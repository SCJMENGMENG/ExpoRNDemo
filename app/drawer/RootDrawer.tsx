import React, { createContext, useContext, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;
const EDGE_WIDTH = 10;

type DrawerContextType = {
    openDrawer: () => void;
    closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextType>({
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

    const gesture = Gesture.Pan()
        .onUpdate((e) => {
            const newX = -DRAWER_WIDTH + e.translationX;
            translateX.value = Math.min(0, Math.max(-DRAWER_WIDTH, newX));
        })
        .onEnd(() => {
            if (translateX.value > -DRAWER_WIDTH / 2) {
                runOnJS(openDrawer)();
            } else {
                runOnJS(closeDrawer)();
            }
        });

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: 1 + translateX.value / DRAWER_WIDTH,
        display: translateX.value === -DRAWER_WIDTH ? 'none' : 'flex',
    }));

    // 拖动红色view动画
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
        inputRange: [0, 40, SCREEN_WIDTH - EDGE_WIDTH],
        outputRange: [0, 0.3, 0.5],
        extrapolate: 'clamp',
    });
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (evt, gestureState) => evt.nativeEvent.pageX < 40,
            onPanResponderMove: Animated.event(
                [null, { dx: dragX }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                Animated.spring(dragX, {
                    toValue: 0,
                    useNativeDriver: false,
                }).start();
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
                    <Animated.Text style={{ color: '#fff', fontSize: fontSizeAnim, marginLeft: 8, marginTop: 8 }}>
                        123
                    </Animated.Text>
                </Animated.View>

                {/* 主内容 */}
                {children}

                {/* 遮罩层 */}
                {/* <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: 'rgba(0,0,0,0.3)',
                        },
                        backdropStyle,
                    ]}
                /> */}
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

                {/* Drawer 层 */}
                {/* <Animated.View style={[styles.drawer, drawerStyle]}>
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>菜单</Text>
            <Text style={styles.menuItem}>🏠 首页</Text>
            <Text style={styles.menuItem}>👤 个人中心</Text>
            <Text style={styles.menuItem}>⚙️ 设置</Text>
            <Text style={styles.menuItem}>🚪 退出登录</Text>
          </View>
        </Animated.View> */}
            </View>
        </DrawerContext.Provider>
    );
};

const styles = StyleSheet.create({
    drawer: {
        position: 'absolute',
        left: 300,
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
