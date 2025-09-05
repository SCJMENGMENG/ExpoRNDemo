import BottomSheet, { BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, NativeModules, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from "react-native-wheel-pick";
import DownloadFiles from '../awsDownloadFiles/DownloadFiles';
import CustomView from '../nativeTool/CustomView';
import RemoteConfigContentIOS from '../nativeTool/RemoteConfigContentIOS';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TargetScreen() {
  // snapPoints: 1/5, 2/5, 3/5 屏幕高度
  const snapPoints = [
    SCREEN_HEIGHT * 0.2,
    SCREEN_HEIGHT * 0.4,
    SCREEN_HEIGHT * 0.6,
  ];

  const bottomSheetRef = useRef<BottomSheet>(null);
  const { NativeMethodObject } = NativeModules;
  const [showPicker, setShowPicker] = useState(false);
  const [selectedValue, setSelectedValue] = useState("option1");

  const renderBackground = useCallback(
    ({ style }: BottomSheetBackgroundProps) => (
      <View
        // start={{ x: 0.1, y: 0 }}
        // colors={["#bcc7cd", "#bdc8cd"]}
        style={[style, { borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: 'cyan' }]}
      />
    ),
    []
  );

  return (
    <View style={styles.container}>
      <Text style={styles.text}>这是目标页面</Text>
      <DownloadFiles />
      <CustomView text='123123123123123122312' style={{ width: 200, height: 40 }} />
      <TouchableOpacity style={{ width: 200, height: 40 }} onPress={() => {
        NativeMethodObject.nativeMethodTest();
      }}>
        <Text>原生方法测试</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ width: 200, height: 40 }} onPress={() => {
        setShowPicker(!showPicker);
      }}>
        <Text>showPicker</Text>
      </TouchableOpacity>
      {/* BottomSheet建议放在页面最顶层 */}
      <View style={{ backgroundColor: 'red', flex: 1 }}>
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          style={{ backgroundColor: 'yellow', paddingHorizontal: 12 }}
          backgroundComponent={renderBackground}
          android_keyboardInputMode="adjustResize"
        >
          <View style={styles.sheetContent}>
            <Text style={styles.sheetText}>这是底部弹窗内容</Text>
          </View>
        </BottomSheet>
      </View>
      {
        showPicker &&
        <View style={{ backgroundColor: 'white', position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Picker
            style={{
              backgroundColor: 'transparent',
              width: 400,
              // height: 215,
              textTransform: "capitalize",
            }}
            selectedValue='item4'
            selectBackgroundColor="#8080801A"
            selectLineSize={2}
            selectLineColor="black"
            isShowSelectBackground={true}
            isShowSelectLine={true}
            pickerData={[
              { label: 'item1', value: 'item1' },
              { label: 'item2', value: 'item2' },
              { label: 'item3', value: 'item3' },
              { label: 'item4', value: 'item4' },
              { label: 'item5', value: 'item5' },
              { label: 'item6', value: 'item6' },
              { label: 'item7', value: 'item7' },
            ]}
            onValueChange={(value: string) => { console.log(value) }}
          />
          <RemoteConfigContentIOS
            dataList={[
              ['0.3 m/s', '0.4 m/s', '0.5 m/s', '0.6 m/s', '0.8 m/s', '1.0 m/s'],
              ['3.00 cm', '3.50 cm', '4.00 cm', '4.50 cm', '5.00 cm', '5.50 cm', '6.00 cm', '6.50 cm', '7.00 cm', '7.50 cm', '8.00 cm', '8.50 cm', '9.00 cm', '9.50 cm'],
              ['1.20 in', '1.40 in', '1.55 in', '1.75 in', '2.00 in', '2.15 in', '2.35 in', '2.55 in', '2.75 in', '3.00 in', '3.15 in', '3.35 in', '3.55 in', '3.75 in']
            ]}
            selectIndexs={[0, 1, 0]}
            width={SCREEN_WIDTH}
            onChangeValue={(key, value) => {
              console.log(`Changed ${key} to ${value}`);
            }}
            onSave={() => {
              console.log('Saved');
            }}
            onClose={() => {
              console.log('Closed');
            }}
          />
          <TouchableOpacity style={{ width: 200, height: 40 }} onPress={() => {
            setShowPicker(!showPicker);
          }}>
            <Text>hidePicker</Text>
          </TouchableOpacity>
        </View>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    margin: 20,
    textAlign: 'center',
  },
  sheetContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetText: {
    fontSize: 18,
    color: '#333',
  },
});