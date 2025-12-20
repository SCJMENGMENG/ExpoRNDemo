import EditorSkiaCircle from '@/components/editorSkia/EditorSkiaCircle';
import EditorSkiaHeart from '@/components/editorSkia/EditorSkiaHeart';
import EditorSkiaLine from '@/components/editorSkia/EditorSkiaLine';
import EditorSkiaSquare from '@/components/editorSkia/EditorSkiaSquare';
import React, { useState } from 'react';
import {
  Dimensions,
  Text,
  TouchableOpacity,
  View,
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
  const [editorSkiaType, setEditorSkiaType] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: '#e9e9e9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <TouchableOpacity
          style={{ marginTop: 20, alignSelf: 'center', width: 100, height: 30, backgroundColor: '#4CAF50', justifyContent: 'center', borderRadius: 5 }}
          onPress={() => {
            setEditorSkiaType(0);
          }}
        >
          <Text style={{ alignSelf: 'center', color: 'white' }}>{"方块编辑器"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 20, alignSelf: 'center', width: 100, height: 30, backgroundColor: '#4CAF50', justifyContent: 'center', borderRadius: 5 }}
          onPress={() => {
            setEditorSkiaType(1);
          }}
        >
          <Text style={{ alignSelf: 'center', color: 'white' }}>{"线段编辑器"}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <TouchableOpacity
          style={{ marginTop: 20, alignSelf: 'center', width: 100, height: 30, backgroundColor: '#4CAF50', justifyContent: 'center', borderRadius: 5 }}
          onPress={() => {
            setEditorSkiaType(2);
          }}
        >
          <Text style={{ alignSelf: 'center', color: 'white' }}>{"圆形编辑器"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 20, alignSelf: 'center', width: 100, height: 30, backgroundColor: '#4CAF50', justifyContent: 'center', borderRadius: 5 }}
          onPress={() => {
            setEditorSkiaType(3);
          }}
        >
          <Text style={{ alignSelf: 'center', color: 'white' }}>{"心形编辑器"}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ backgroundColor: 'cyan', width: 412, height: 412 }}>
        {
          editorSkiaType === 0 ?
            <EditorSkiaSquare />
            :
            editorSkiaType === 1 ?
              <EditorSkiaLine />
              :
              editorSkiaType === 2 ?
                <EditorSkiaCircle />
                :
                <EditorSkiaHeart />
        }
      </View>
    </View>
  )
}

export default EditAreaPage;