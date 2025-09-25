import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useWorklet, useRunOnJS } from "react-native-worklets-core";
import { useWorkletTask } from './useWorkletTask';

const MainThreadBlockExample = () => {
  const [result, setResult] = useState<number>(0);
  const [uiStatus, setUiStatus] = useState('界面可交互');

  // 定义耗时计算函数（worklet 里执行）
  const expensiveCalculation = () => {
    "worklet";
    let total = 0;
    for (let i = 0; i < 1000000000; i++) {
      total += i;
    }
    return total;
  };

  const { runTask, isComputing } = useWorkletTask(expensiveCalculation, {
    onComplete: (res) => {
      setResult(res);
      setUiStatus("计算完成");
      Alert.alert("计算完成", `结果: ${res}`);
    },
    onError: (err) => {
      setUiStatus("计算失败");
      console.error(err);
    },
  });

  // 用于测试界面是否卡住
  const testUIResponsiveness = () => {
    Alert.alert('UI测试', '如果点击后能立即弹出此框，说明界面未卡住。');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>UI状态: {uiStatus}</Text>
      <Text>计算结果: {result}</Text>
      
      <TouchableOpacity 
        style={{ backgroundColor: 'red', padding: 15, margin: 10 }}
        onPress={() => {
          setUiStatus("计算中...");
          runTask();
        }}
        // disabled={isComputing}
      >
        <Text style={{ color: 'white' }}>执行阻塞主线程的任务</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{ backgroundColor: 'green', padding: 15, margin: 10 }}
        onPress={testUIResponsiveness}
      >
        <Text style={{ color: 'white' }}>测试界面响应性</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MainThreadBlockExample;