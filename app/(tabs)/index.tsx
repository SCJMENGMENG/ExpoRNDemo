import { Image } from 'expo-image';
import {
  AppState,
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import DeviceInfo from 'react-native-device-info';

const SECONDS_TO_SCAN_FOR = 10;
const SERVICE_UUIDS: string[] = ["280f"];

const encoder = new TextEncoder();  
const SERVICE_UUID = `12345678-1234-5678-1234-56789abcdef0`;
const CHAR_OUTBOX = `12345678-1234-5678-1234-56789abcdef1`;

export default function HomeScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showScan, setShowScan] = useState(false); // 控制是否显示扫描界面
  const [isLandscape, setIsLandscape] = useState(false); // 跟踪屏幕方向状态
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<Peripheral[]>([]); // 添加设备列表状态
  const [appState, setAppState] = useState(AppState.currentState);
  const [isConnected, setIsConnected] = useState(false); // 跟踪蓝牙连接状态
  const [connectedPeripheral, setConnectedPeripheral] = useState<string | null>(null); // 当前连接的设备
  const heartbeatId = useRef<number | null>(null); // 心跳定时器引用
  const heartbeatTimer = useRef<number | null>(null);
  const router = useRouter();

  // MARK:蓝牙写入数据函数
  const writeWithoutResponse = async (peripheralId: string, base64str: string) => {
    try {
      const data = Array.from(encoder.encode(base64str));
      
      await BleManager.writeWithoutResponse(
        peripheralId,
        SERVICE_UUID,
        CHAR_OUTBOX,
        data,
        data.length
      );
      console.log('蓝牙数据发送成功:', data);
    } catch (error) {
      console.log('蓝牙数据发送失败:', error);
    }
  };

  // 477d 100306
  // "9bca0a16-a329-7e3a-1515-baec23b67666",
  // "EDE4AtoBNGlQaG9uZVhTTWF4X2lPU180QzM3M0FCRC1GOURDLTRBNDctQTZEQi01MzQ3NjZFRDc4Njk="
  // MARK:生成心跳命令
  const generateHeartbeatCommand = async () => {
    try {
      const model = await DeviceInfo.getModel();
      const systemName = DeviceInfo.getSystemName();
      const uniqueId = await DeviceInfo.getUniqueId();
      
      const deviceIdentifier = `${model.replace(/ /g, "")}_${systemName}_${uniqueId}`;
      const timestamp = Date.now();
      
      // 生成心跳命令，你可以根据具体协议修改这个格式
      const heartbeatCommand = `HEARTBEAT:${deviceIdentifier}:${timestamp}`;
      return "EDE4AtoBNGlQaG9uZVhTTWF4X2lPU180QzM3M0FCRC1GOURDLTRBNDctQTZEQi01MzQ3NjZFRDc4Njk=";// heartbeatCommand;
    } catch (error) {
      console.log('生成心跳命令失败:', error);
      return "EDE4AtoBNGlQaG9uZVhTTWF4X2lPU180QzM3M0FCRC1GOURDLTRBNDctQTZEQi01MzQ3NjZFRDc4Njk=";// `HEARTBEAT:Unknown_Device:${Date.now()}`;
    }
  };

  // MARK:切换摄像头方向
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // MARK:切换屏幕方向
  const toggleScreenOrientation = async () => {
    if (isLandscape) {
      console.log('切换到竖屏');
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsLandscape(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsLandscape(true);
    }
  };

  // MARK:处理扫码结果
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true); // 停止持续扫描
    alert(`扫描结果: ${data}`);
    // 此处可跳转页面或调用API处理数据
  };

  useEffect(() => {
    // MARK:初始化蓝牙管理器
    BleManager
      .start({ showAlert: false })
      .then(() => {
        console.log('蓝牙管理器启动成功');
        // 检查蓝牙状态
        BleManager.checkState().then((state) => {
          console.log('当前蓝牙状态:', state);
        });
      })
      .catch(error => {
        console.log('蓝牙管理器启动失败:', error);
      });

    const listeners = [
      // MARK:监听蓝牙状态更新事件
      BleManager.onDidUpdateState((args: any) => {
        console.log('BleManagerDidUpdateState:', args);
        if (args.state == 'on') {
          console.log('蓝牙已打开');
        } else {
          console.log('蓝牙状态:', args.state);
        }
      }),
      // MARK:监听蓝牙设备发现事件
      BleManager.onStopScan(() => {
        console.log('蓝牙扫描已停止');
        BleManager.getDiscoveredPeripherals()
          .then((peripheralsArray) => {
            console.log('已发现的蓝牙设备:', peripheralsArray);
            // 添加设备到列表（避免重复）
            setDiscoveredDevices(peripheralsArray.filter(device => {
              // 过滤掉没有名称的设备
              return device.name && device.name.length > 0;
            }));
          })
      }),
      // MARK:监听发现新设备事件
      BleManager.onConnectPeripheral((args: any) => {
        console.log('蓝牙设备已连接:', args);
        setIsConnected(true); // 更新连接状态
        setConnectedPeripheral(args.peripheral); // 设置连接的设备ID
        // 连接成功后可以获取设备信息
        BleManager.retrieveServices(args.peripheral)
          .then((peripheralInfo) => {
            console.log('设备信息:', peripheralInfo);
          })
          .catch(error => {
            console.log('获取设备信息失败:', error);
          });
      }),
      // MARK:监听断开连接事件
      BleManager.onDisconnectPeripheral((data: Peripheral) => {
        console.log('蓝牙设备已断开连接:', data);
        setIsConnected(false); // 更新连接状态
        setConnectedPeripheral(null); // 清除连接的设备
        // console.log('发现蓝牙设备:', data);
        // console.log('设备名称:', data.name || '未知设备');
        // console.log('设备ID:', data.id);
        // console.log('信号强度:', data.rssi);

        // // 蓝牙连接 id
        // let id: string;
        // // 蓝牙 Mac 地址
        // let macAddress: string;
        // if (Platform.OS == 'android') {
        //   macAddress = data.id;
        //   id = macAddress;
        // } else {
        //   // ios连接时不需要用到Mac地址，但跨平台识别同一设备时需要 Mac 地址
        //   // macAddress = bleProtocol.getMacFromAdvertising(data)!;
        //   id = data.id;
        // };
        // console.log('蓝牙设备ID:', id);
        // setDeviceId(id);
        // setDeviceId(null); // 清除设备ID
      })
    ];

    return () => {
      // 清理事件监听器
      for (const listener of listeners) {
        listener.remove();
      }
    }
  }, []);

  // MARK:监听应用状态变化
  useEffect(() => {
    const handleAppStateChange = (nextAppState: typeof AppState.currentState) => {
      console.log('应用状态变化:', appState, '->', nextAppState);

      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('应用从后台切换到前台');

        // 如果有设备ID但没有连接，则尝试重新连接
        if (deviceId && !isConnected) {
          console.log('检测到有设备但未连接，尝试重新连接:', deviceId);
          BleManager.connect(deviceId)
            .then(() => {
              console.log('自动重连成功:', deviceId);
              setIsConnected(true);
              setConnectedPeripheral(deviceId); // 设置连接的设备ID
            })
            .catch(error => {
              console.log('自动重连失败:', error);
            });
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('应用切换到后台或非活跃状态');
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [appState, deviceId, isConnected]);

  // MARK:心跳逻辑
  useEffect(() => {
    (async () => {
      if (connectedPeripheral && isConnected) {
        const heartbeatCommand = await generateHeartbeatCommand();
        
        // 清除之前的心跳定时器
        if (heartbeatId.current) {
          clearInterval(heartbeatId.current);
          heartbeatId.current = null;
        }
        
        // 立即发送第一次心跳
        writeWithoutResponse(connectedPeripheral, heartbeatCommand);
        
        // 设置定时器，每3秒发送一次心跳
        heartbeatId.current = setInterval(async () => {
          const cmd = await generateHeartbeatCommand();
          console.log(`发送心跳命令到机器人: cmd:${cmd}`);
          writeWithoutResponse(connectedPeripheral, cmd);
        }, 1000 * 3);
        
        console.log('心跳定时器已启动，间隔3秒');
      } else {
        // 如果没有连接，清除心跳定时器
        if (heartbeatId.current) {
          clearInterval(heartbeatId.current);
          heartbeatId.current = null;
          console.log('设备未连接，清除心跳定时器');
        }
      }
    })();

    return () => {
      if (heartbeatId.current) {
        clearInterval(heartbeatId.current);
        heartbeatId.current = null;
      }
      console.log("组件卸载，清除心跳定时器");
    };
  }, [connectedPeripheral, isConnected]);

  // MARK:开始蓝牙扫描
  const bleScan = () => {
    // 开始扫描前清除之前的设备列表
    setDiscoveredDevices([]);
    // 先清空空数组来扫描所有蓝牙设备，而不是只扫描特定服务
    BleManager.scan([], SECONDS_TO_SCAN_FOR, true).then(() => {
      console.log('蓝牙扫描开始');
    }).catch(error => {
      console.log('蓝牙扫描失败:', error);
    });
  };

  // MARK:停止蓝牙扫描
  const bleStopScan = () => {
    BleManager.stopScan().then(() => {
      console.log('蓝牙扫描停止');
    }).catch(error => {
      console.log('蓝牙停止扫描失败:', error);
    });
  };

  // MARK:连接蓝牙设备
  const bleConnect = () => {
    if (!deviceId) {
      console.log('没有可连接的蓝牙设备');
      return;
    }
    BleManager.connect(deviceId)
      .then(() => {
        console.log('蓝牙设备连接成功:', deviceId);
        setIsConnected(true); // 更新连接状态
        setConnectedPeripheral(deviceId); // 设置连接的设备ID
      })
      .catch(error => {
        console.log('蓝牙设备连接失败:', error);
        setIsConnected(false);
        setConnectedPeripheral(null);
      });
  };

  // MARK:断开连接
  const bleDisconnect = () => {
    if (!deviceId) {
      console.log('没有可断开的蓝牙设备');
      return;
    }
    BleManager.disconnect(deviceId)
      .then(() => {
        console.log('蓝牙设备断开连接成功:', deviceId);
        setDeviceId(null); // 清除设备ID
        setIsConnected(false); // 更新连接状态
        setConnectedPeripheral(null); // 清除连接的设备
      })
      .catch(error => {
        console.log('蓝牙设备断开连接失败:', error);
      });
  };

  // MARK:点击设备列表中的设备进行连接
  const clickItem = (device: Peripheral) => () => {
    console.log('点击设备:', device);
    setDeviceId(device.id);
    BleManager.connect(device.id)
      .then(() => {
        console.log('蓝牙设备连接成功:', device.id);
        setIsConnected(true); // 更新连接状态
        setConnectedPeripheral(device.id); // 设置连接的设备ID
        BleManager.retrieveServices(device.id)
          .then((peripheralInfo) => {
            console.log('设备信息:', peripheralInfo);
          })
          .catch(error => {
            console.log('获取设备信息失败:', error);
          });
      })
      .catch(error => {
        console.log('蓝牙设备连接失败:', error);
        setIsConnected(false);
        setConnectedPeripheral(null);
      });
  };

  // MARK:清除已发现的设备列表
  const clearList = () => {
    console.log('清除断开连接的设备:', deviceId);
    setDiscoveredDevices([]); // 清除已发现的设备列表
  };

  // MARK:清除设备ID和连接状态
  const clearData = () => {
    console.log('清除断开连接的设备:', deviceId);
    if (deviceId) {
      BleManager.disconnect(deviceId, true);
    }

    setDeviceId(null); // 清除设备ID
    setIsConnected(false); // 重置连接状态
    setConnectedPeripheral(null); // 清除连接的设备
    setDiscoveredDevices([]); // 清除已发现的设备列表
  };

  // 权限检查移到所有 hooks 之后
  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.reactLogo}
          />
        }>
        <View style={styles.container}>
          {showScan ?
            <CameraView
              style={styles.camera}
              facing={facing}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }} // 指定识别二维码
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                  <Text style={styles.text}>Flip Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => setShowScan(false)}>
                  <Text style={styles.text}>close</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
            :
            <View style={styles.buttonGroup}>
              <TouchableOpacity onPress={() => setShowScan(true)} style={styles.button}>
                <Text>开启扫码</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleScreenOrientation} style={styles.button}>
                <Text>{isLandscape ? '切换到竖屏' : '切换到横屏'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={bleScan} style={styles.button}>
                <Text>扫描蓝牙</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={bleStopScan} style={styles.button}>
                <Text>停止扫描</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={bleConnect} style={styles.button}>
                <Text>连接蓝牙</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={bleDisconnect} style={styles.button}>
                <Text>断开连接</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/child/target')} style={styles.button}>
                <Text>跳转页面</Text>
              </TouchableOpacity>
            </View>
          }

          {/* 显示发现的设备 */}
          {discoveredDevices.length > 0 && (
            <>
              <View style={styles.deviceList}>
                <Text style={styles.deviceListTitle}>发现的蓝牙设备 ({discoveredDevices.length})</Text>
                {discoveredDevices.map((device, index) => (
                  <TouchableOpacity
                    key={device.id}
                    style={styles.deviceItem}
                    onPress={clickItem(device)}
                  >
                    <Text style={styles.deviceName}>
                      {device.name || '未知设备'}
                    </Text>
                    <Text style={styles.deviceInfo}>
                      ID: {device.id} | 信号: {device.rssi}dBm
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={clearList} style={styles.button}>
                <Text>清除列表</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearData} style={styles.button}>
                <Text>清除数据</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ParallaxScrollView>
      {/* 显示连接状态 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          连接状态: {isConnected ? '已连接' : '未连接'}
        </Text>
        {deviceId && (
          <Text style={styles.statusText}>
            设备ID: {deviceId}
          </Text>
        )}
        <Text style={styles.statusText}>
          应用状态: {appState}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    marginTop: 64,
    marginBottom: 64
  },
  buttonGroup: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  button: {
    flex: 0.3,
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    minWidth: 150,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  deviceList: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  deviceListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  deviceItem: {
    backgroundColor: 'white',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    marginTop: 335,
    marginLeft: 15,
    padding: 10,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    position: 'absolute',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
    textAlign: 'center',
  },
});
