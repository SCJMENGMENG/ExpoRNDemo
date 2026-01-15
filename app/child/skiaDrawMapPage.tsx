import MultiplePolygonsMapCanvas, { PolygonData, ZoneData } from '@/components/skiaDrawMap/MultiplePolygonsCanvasMap';
import React, { useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import eventBus from '../utils/EventBus';

const skiaDrawMapPage = () => {
  const { width, height } = useWindowDimensions();

  const [activeTabIndex, setActiveTabIndex] = React.useState(0);

  useEffect(() => {
    eventBus.emit('changePage', false); // 非首页，禁用边缘手势
  }, []);

  const data: PolygonData[] = [
    { type: 0, data: { hashId: 'zone1', name: 'Zone 1', points: [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 100 }, { x: 10, y: 100 }] } },
    { type: 0, data: { hashId: 'zone2', name: 'Zone 2', points: [{ x: 150, y: 150 }, { x: 250, y: 150 }, { x: 250, y: 250 }, { x: 150, y: 250 }] } },
    { type: 0, data: { hashId: 'zone3', name: 'Zone 3', points: [{ x: 10, y: 450 }, { x: 100, y: 450 }, { x: 100, y: 550 }, { x: 10, y: 550 }] } },
    { type: 0, data: { hashId: 'zone4', name: 'Zone 5', points: [{ x: 55, y: 55 }, { x: 145, y: 55 }, { x: 145, y: 145 }, { x: 55, y: 145 }] } },
    { type: 1, data: { hashId: 'channel1', points: [{ x: 170, y: 200 }, { x: 150, y: 280 }, { x: 130, y: 350 }, { x: 100, y: 380 }, { x: 80, y: 480 }] } },
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
        activeTabIndex={activeTabIndex}
        onItemPress={(index) => {
          setActiveTabIndex(index);
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
        {data.map((item, index) => (
          <TouchableOpacity
            style={{
              width: 70, height: 30,
              backgroundColor: activeTabIndex === index ? '#4CAF50' : '#FF9800',
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              setActiveTabIndex(index)
            }}
          >
            <Text>{item.type === 0 ? (item.data as ZoneData).name : 'channel1'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default skiaDrawMapPage;