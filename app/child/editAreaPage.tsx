import RectEditor from '@/components/editorSkia/RectEditorSkia';
import React from 'react';
import {
  Dimensions,
  Text,
  View
} from 'react-native';

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

const EditAreaPage = () => {

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  return (
    <View style={{ flex: 1, backgroundColor: 'cyan' }}>
      <Text>11111</Text>
      <RectEditor />
    </View>
  )
}

export default EditAreaPage;