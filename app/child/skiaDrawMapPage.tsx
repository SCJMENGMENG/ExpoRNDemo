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

  const zones = [
    { hashId: 'zone1', name: 'Zone 1', points: [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 100 }, { x: 10, y: 100 }] },
    { hashId: 'zone2', name: 'Zone 2', points: [{ x: 150, y: 150 }, { x: 250, y: 150 }, { x: 250, y: 250 }, { x: 150, y: 250 }] },
    { hashId: 'zone2', name: 'Zone 2', points: [{ x: 10, y: 450 }, { x: 100, y: 450 }, { x: 100, y: 550 }, { x: 10, y: 550 }] },
  ];

  return (
    <View>
      <Text>skiaDrawMapPage</Text>
      <MultiplePolygonsCanvas
        width={width}
        viewH={width}
        zones={zones}
        stripeAngleValue={60}
        activeZoneIndex={1}
      />
    </View>
  );
};

export default skiaDrawMapPage;