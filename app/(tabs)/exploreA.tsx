import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useRef } from 'react';
import { Animated, Button, Dimensions, Image, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SwiperFlatList } from 'react-native-swiper-flatlist';

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
        <View>
            {/* <Animated.View
                style={[
                    styles.redDragView,
                    {
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
            </Animated.View> */}
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="title">Explore</ThemedText>
            </ThemedView>
            <ThemedText>This app includes example code to help you get started.</ThemedText>
            <Collapsible title="File-based routing">
                <ThemedText>
                    This app has two screens:{' '}
                    <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> and{' '}
                    <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
                </ThemedText>
                <ThemedText>
                    The layout file in <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{' '}
                    sets up the tab navigator.
                </ThemedText>
                <ExternalLink href="https://docs.expo.dev/router/introduction">
                    <ThemedText type="link">Learn more</ThemedText>
                </ExternalLink>
            </Collapsible>
            <Collapsible title="Android, iOS, and web support">
                <ThemedText>
                    You can open this project on Android, iOS, and the web. To open the web version, press{' '}
                    <ThemedText type="defaultSemiBold">w</ThemedText> in the terminal running this project.
                </ThemedText>
            </Collapsible>
            <Collapsible title="Images">
                <ThemedText>
                    For static images, you can use the <ThemedText type="defaultSemiBold">@2x</ThemedText> and{' '}
                    <ThemedText type="defaultSemiBold">@3x</ThemedText> suffixes to provide files for
                    different screen densities
                </ThemedText>
                <Image source={require('@/assets/images/react-logo.png')} style={{ alignSelf: 'center' }} />
                <ExternalLink href="https://reactnative.dev/docs/images">
                    <ThemedText type="link">Learn more</ThemedText>
                </ExternalLink>
            </Collapsible>
            <Collapsible title="Custom fonts">
                <ThemedText>
                    Open <ThemedText type="defaultSemiBold">app/_layout.tsx</ThemedText> to see how to load{' '}
                    <ThemedText style={{ fontFamily: 'SpaceMono' }}>
                        custom fonts such as this one.
                    </ThemedText>
                </ThemedText>
                <ExternalLink href="https://docs.expo.dev/versions/latest/sdk/font">
                    <ThemedText type="link">Learn more</ThemedText>
                </ExternalLink>
            </Collapsible>
            <Collapsible title="Light and dark mode components">
                <ThemedText>
                    This template has light and dark mode support. The{' '}
                    <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText> hook lets you inspect
                    what the user&apos;s current color scheme is, and so you can adjust UI colors accordingly.
                </ThemedText>
                <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
                    <ThemedText type="link">Learn more</ThemedText>
                </ExternalLink>
            </Collapsible>
            <Collapsible title="Animations">
                <ThemedText>
                    This template includes an example of an animated component. The{' '}
                    <ThemedText type="defaultSemiBold">components/HelloWave.tsx</ThemedText> component uses
                    the powerful <ThemedText type="defaultSemiBold">react-native-reanimated</ThemedText>{' '}
                    library to create a waving hand animation.
                </ThemedText>
                {Platform.select({
                    ios: (
                        <ThemedText>
                            The <ThemedText type="defaultSemiBold">components/ParallaxScrollView.tsx</ThemedText>{' '}
                            component provides a parallax effect for the header image.
                        </ThemedText>
                    ),
                })}
            </Collapsible>
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
            <Button title="打开菜单" onPress={() => {
                // openDrawer()
            }} />
        </View>
    );
}

const styles = StyleSheet.create({
    headerImage: {
        color: '#808080',
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
    },

    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'red',
    },
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
    redDragView: {
        position: 'absolute',
        left: 0,
        top: 0,
        backgroundColor: 'red',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
        overflow: 'hidden',
    },
});
