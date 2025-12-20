import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Button, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SwiperFlatList } from 'react-native-swiper-flatlist';
import { useDrawer } from '../drawer/RootDrawer';

const EDGE_WIDTH = 60;

const data = [
    { key: '1', title: '卡片一', color: '#FFB6C1' },
    { key: '2', title: '卡片二', color: '#87CEFA' },
    { key: '3', title: '卡片三', color: '#90EE90' },
    { key: '4', title: '卡片四', color: '#FFD700' },
];

const { width } = Dimensions.get('window');


export default function TabTwoScreen() {
    const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

    const { openDrawer, closeDrawer } = useDrawer();
    const router = useRouter();

    const dragX = useRef(new Animated.Value(0)).current;
    const widthAnim = dragX.interpolate({
        inputRange: [0, SCREEN_WIDTH - 40],
        outputRange: [40, SCREEN_WIDTH],
        extrapolate: 'clamp',
    });
    const fontSizeAnim = dragX.interpolate({
        inputRange: [0, SCREEN_WIDTH - 40],
        outputRange: [10, 60],
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
        <View style={{ flex: 1 }}>
            <View style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'cyan', marginVertical: 100, }}>
                <SwiperFlatList
                    data={data}
                    renderItem={({ item }) => (
                        <View style={[styles.card, { backgroundColor: item.color }]}>
                            <Text style={styles.cardText}>{item.title}</Text>
                        </View>
                    )}
                    showPagination
                    paginationActiveColor="#007AFF"
                    paginationDefaultColor="#ccc"
                    paginationStyleItem={{ width: 8, height: 8 }}
                />
            </View>
            <Button title="打开菜单" onPress={() => {
                openDrawer()
                console.log('openDrawer')
            }} />
            <TouchableOpacity
                style={{ height: 50, width: 120, backgroundColor: 'red', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
                onPress={() => {
                    closeDrawer();
                    router.push('/child/editAreaPage')
                }}
            >
                <Text>Editor Skia组件</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: width * 0.8,
        height: 220,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: width * 0.1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    cardText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
});
