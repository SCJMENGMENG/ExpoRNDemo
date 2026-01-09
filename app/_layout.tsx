import { DarkTheme, DefaultTheme, NavigationContainer, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useEffect, useState } from 'react';
import { DrawerProvider } from './drawer/RootDrawer';
import eventBus from './utils/EventBus';

import { RootSiblingParent } from 'react-native-root-siblings';

import ToastControl from '@/components/toast/ToastControl';


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // state and subscriptions must be declared before any early return to keep hook order stable
  const [isHome, setIsHome] = useState(true);

  useEffect(() => {
    const handler = (isHomePage: boolean) => setIsHome(isHomePage);
    eventBus.on('changePage', handler);
    return () => {
      eventBus.off('changePage', handler);
    };
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }


  return (
    <RootSiblingParent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* <View style={{flex: 1, justifyContent: 'center', alignItems: 'center',
                 backgroundColor:'cyan'}} >
                <Text>1111</Text>
              </View> */}
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NavigationContainer>
            <DrawerProvider isHome={isHome}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </DrawerProvider>
          </NavigationContainer>
        </ThemeProvider>
        <ToastControl />
      </GestureHandlerRootView>
    </RootSiblingParent>
  );
}
