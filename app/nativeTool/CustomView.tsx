// nativeTool/CustomView.tsx
import React, { forwardRef } from 'react';
import type { StyleProp } from 'react-native';
import { requireNativeComponent, ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  text?: string;
};

const RCTCustomView = requireNativeComponent<Props>('CustomView');

const CustomView = forwardRef<any, Props>((props, ref) => {
  return <RCTCustomView {...props} ref={ref} />;
});

export default CustomView;
