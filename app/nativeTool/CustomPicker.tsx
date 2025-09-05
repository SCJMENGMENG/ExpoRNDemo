import React from 'react';
import type { StyleProp } from 'react-native';
import { requireNativeComponent, ViewStyle } from 'react-native';

const NativePicker = requireNativeComponent('CustomPicker');

type CustomPickerProps = {
  style?: StyleProp<ViewStyle>;
  model: {
    selectIndexs: number[];
    dataList: string[][];
    columnWidth: number;
    columnSpacing: number;
  };
  onChange?: (event: any) => void;
};

export default function CustomPicker({ 
    style,
    model,
    onChange, 
}: CustomPickerProps) {
  return (
    <NativePicker
      style={style}
      model={model}
      onChange={(event: any) => {
        onChange?.(event.nativeEvent);
      }}
    />
  );
}
