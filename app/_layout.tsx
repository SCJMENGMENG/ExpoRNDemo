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
import ToastManager from 'toastify-react-native';

import { center } from '@shopify/react-native-skia';
import { Text, View } from 'react-native';

const CustomToast = ({ text1, text2, hide, iconColor }) => (
  <View style={{
    width: '90%',
    backgroundColor: '#673AB7',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }}>
    <View style={{
      flex: 1,
      marginLeft: 10,
    }}>
      <Text style={{
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
      }}>{text1}</Text>
      {text2 && <Text style={{
        color: '#fff',
        fontSize: 14,
        marginTop: 4,
      }}>{text2}</Text>}
    </View>
  </View>
)

// Custom toast configuration
const toastConfig = {
  customSuccess: (props) => (
    <View style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#4caf4f36',
      borderRadius: 10,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }}>
      <View style={{
        flex: 1,
        marginLeft: 10,
        backgroundColor: 'cyan',
        width: 50,
        height: 50,
      }}>
        <Text style={{
          color: 'red',
          fontWeight: 'bold',
          fontSize: 16,
        }}>{props.text1}</Text>
        {props.text2 && <Text style={{
          color: '#fff',
          fontSize: 14,
          marginTop: 4,
        }}>{props.text2}</Text>}
      </View>
    </View>
  ),
  custom: (props) => <CustomToast {...props} />,
}


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
        <ToastManager
          config={toastConfig}
          theme={'light'}
          position={center}
          isRTL={false}
          showProgressBar={false}
          showCloseIcon={false}
          animationStyle='fade'
          useModal={false}
        />
      </GestureHandlerRootView>
    </RootSiblingParent>
  );
}
