import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useRunOnJS, useWorklet } from "react-native-worklets-core";
import { useDrawer } from '../drawer/RootDrawer';
import eventBus from '../utils/EventBus';

const MainThreadBlockExample = () => {
  const [result, setResult] = useState<number>(0);
  const [uiStatus, setUiStatus] = useState('界面可交互');
  const [isComputing, setIsComputing] = useState(false);
  const isMountedRef = useRef(true);
      
  const { openDrawer } = useDrawer();

  useEffect(() => {
    eventBus.emit('changePage', false); // 非首页，禁用边缘手势
    return () => {
      isMountedRef.current = false; // 页面卸载
    };
  }, []);

  // 模拟一个复杂的同步计算任务（例如复杂数据处理或大量循环）
  // const expensiveCalculation = () => {
  //   'worklet';
  //   let sum = 0;
  //   for (let i = 0; i < 1000000000; i++) { // 大量循环模拟CPU密集型任务
  //     sum += i;
  //   }
  //   console.log('----scj----', sum)//499999999067109000
  //   return sum;
  // };

  // const handleBlockingTask = () => {
  //   setUiStatus('界面已卡住...');
  //   // 这个耗时操作将阻塞JavaScript线程
  //   const calcResult = expensiveCalculation();
  //   setResult(calcResult);
  //   setUiStatus('计算完成，界面恢复');
  //   Alert.alert('计算完成', `结果: ${calcResult}`);
  // };

  // 1. 包装主线程回调
  const onDone = useRunOnJS((res: number) => {
    console.log('----scj222----')
    if (!isMountedRef.current) {
      console.log("页面已卸载，丢弃结果");
      return;
    }
    setResult(res);
    setUiStatus("计算完成");
    setIsComputing(false);
  }, []);

  // 2. 定义 Worklet 任务
  const expensiveCalculation = useWorklet(
    "default",
    (callback: (res: number) => void) => {
      "worklet";
      let total = 0;
      console.log('----scj111----')
      for (let i = 0; i < 1000000000; i++) {
        total += i;
      }
      console.log('----scj----', total)
      callback(total); // ✅ 调用回到 JS 的 callback
    }
  );

  // 3. 执行任务
  const handleBlockingTask = () => {
    if (isComputing) {
      console.log("已有任务在执行，忽略本次点击");
      return;
    }
    setIsComputing(true);
    setUiStatus("计算中...");
    expensiveCalculation(onDone); // ✅ 传入已经包装过的回调
  };

  // 用于测试界面是否卡住
  const testUIResponsiveness = () => {
    Alert.alert('UI测试', '如果点击后能立即弹出此框，说明界面未卡住。');
  };

  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>UI状态: {uiStatus}</Text>
      <Text>计算结果: {result}</Text>
      
      <TouchableOpacity 
        style={{ backgroundColor: 'red', padding: 15, margin: 10 }}
        onPress={handleBlockingTask}
      >
        <Text style={{ color: 'white' }}>执行阻塞主线程的任务</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{ backgroundColor: 'green', padding: 15, margin: 10 }}
        onPress={testUIResponsiveness}
      >
        <Text style={{ color: 'white' }}>测试界面响应性</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{ backgroundColor: 'green', padding: 15, margin: 10 }}
        onPress={() => {
          eventBus.emit('changePage', true); // 返回首页，启用边缘手势
          router.back();
        }}
      >
        <Text style={{ color: 'white' }}>返回上一页</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={{ backgroundColor: 'green', padding: 15, margin: 10 }}
        onPress={() => {
          openDrawer();
        }}
      >
        <Text style={{ color: 'white' }}>打开抽屉</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MainThreadBlockExample;