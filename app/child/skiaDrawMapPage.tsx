import MultiplePolygonsCanvas from '@/components/skiaDrawMap/MultiplePolygonsCanvas';
import React, { useEffect } from 'react';
import {
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import eventBus from '../utils/EventBus';

const skiaDrawMapPage = () => {
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    eventBus.emit('changePage', false); // 非首页，禁用边缘手势
  }, []);
  return (
    <View>
      <Text>skiaDrawMapPage</Text>
      <MultiplePolygonsCanvas
        width={width}
        viewH={width}
        zones={[]}
        stripeAngleValue={0}
      />
    </View>
  );
};

export default skiaDrawMapPage;