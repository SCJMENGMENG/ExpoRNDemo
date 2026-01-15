import MultiplePolygonsMapCanvas, { PolygonData } from '@/components/skiaDrawMap/MultiplePolygonsCanvasMap';
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

  const data: PolygonData[] = [
    { hashId: 'channel1', name: 'Channel 1', type: 1, points: [{ x: 170, y: 200 }, { x: 150, y: 280 }, { x: 130, y: 350 }, { x: 100, y: 380 }, { x: 80, y: 480 }] },
    { hashId: 'zone1', name: 'Zone 1', type: 0, points: [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 100 }, { x: 10, y: 100 }] },
    { hashId: 'zone2', name: 'Zone 2', type: 0, points: [{ x: 150, y: 150 }, { x: 250, y: 150 }, { x: 250, y: 250 }, { x: 150, y: 250 }] },
    { hashId: 'zone3', name: 'Zone 3', type: 0, points: [{ x: 10, y: 450 }, { x: 100, y: 450 }, { x: 100, y: 550 }, { x: 10, y: 550 }] },
    { hashId: 'zone4', name: 'Zone 5', type: 0, points: [{ x: 55, y: 55 }, { x: 145, y: 55 }, { x: 145, y: 145 }, { x: 55, y: 145 }] },
  ];

  return (
    <View style={{ backgroundColor: '#fbeef0ff' }}>
      <Text>skiaDrawMapPage</Text>
      {/* <MultiplePolygonsCanvas
        width={width}
        viewH={width}
        zones={zones}
        stripeAngleValue={60}
        activeZoneIndex={1}
      /> */}
      <MultiplePolygonsMapCanvas
        width={width}
        viewH={width}
        data={data}
        stripeAngleValue={60}
        activeZoneIndex={1}
      />
    </View>
  );
};

export default skiaDrawMapPage;