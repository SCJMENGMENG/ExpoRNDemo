import ZoomableSkiaShape from '@/components/skiaDrawMap/ZoomableSkiaShape';
import React, { useEffect } from 'react';
import {
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import eventBus from '../utils/EventBus';

const skiaDrawOnlkyPinch = () => {
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    eventBus.emit('changePage', false); // 非首页，禁用边缘手势
  }, []);

  return (
    <View>
      <Text>skiaDrawOnlkyPinch</Text>
      <ZoomableSkiaShape
        width={width}
        height={width}
        shapeType={'star'}
      />
    </View>
  );
};

export default skiaDrawOnlkyPinch;