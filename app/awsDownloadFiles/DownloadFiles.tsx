// DownloadFile.js
import { downloadData } from 'aws-amplify/storage';
import React, { useState } from 'react';
import { Button, Image, Text, View } from 'react-native';
import RNFS from 'react-native-fs';

export default function DownloadFiles() {
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [localImagePath, setLocalImagePath] = useState<string | null>(null);

    const downloadFile = async () => {
        try {
            setStatus('正在下载图片...');
            setProgress(0);
            setLocalImagePath(null);
            // 1. 通过Amplify下载图片内容
            // s3://lymow-user-data-ap-east-1/device_3dfca262bcec/map/map.pb
            const key = 'device_3dfca262bcec/map/map.pb';
            const downloadPromise = downloadData({ path: key });
            const { result } = await downloadPromise;
            const body = (result as any) .body;
            const arrayBuffer = await body.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            // 2. 保存到本地
            const localFilePath = RNFS.DocumentDirectoryPath + '/map.pb';
            await RNFS.writeFile(localFilePath, Buffer.from(buffer).toString('base64'), 'base64');
            setStatus(`下载完成: ${localFilePath}`);
            setProgress(1);
            setLocalImagePath('file://' + localFilePath);
        } catch (error) {
            console.error(error);
            setStatus('下载失败');
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Button title="下载AWS图片" onPress={downloadFile} />
            <Text style={{ marginTop: 10 }}>{status}</Text>
            {progress > 0 && progress < 1 && (
                <View style={{ marginTop: 20 }}>
                    <Text>{Math.round(progress * 100)}%</Text>
                </View>
            )}
            {localImagePath && (
                <Image
                    source={{ uri: localImagePath }}
                    style={{ width: 200, height: 200, marginTop: 20, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' }}
                    resizeMode="contain"
                />
            )}
        </View>
    );
}

/**
import React, { useState } from 'react';
import { View, Button, Text, ProgressBarAndroid, Platform, ProgressViewIOS } from 'react-native';
import { Storage } from 'aws-amplify';
import RNFS from 'react-native-fs';

export default function DownloadFile() {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const downloadFile = async () => {
    try {
      setStatus('正在获取下载链接...');

      // 1. 从 S3 获取签名URL
      const signedUrl = await Storage.get('example.pdf', { expires: 60 });

      setStatus('开始下载...');

      // 2. 本地保存路径
      const localFilePath = RNFS.DocumentDirectoryPath + '/example.pdf';

      // 3. 下载文件（带进度回调）
      const result = RNFS.downloadFile({
        fromUrl: signedUrl,
        toFile: localFilePath,
        progressDivider: 10, // 每10%回调一次
        progress: (res) => {
          let pct = res.bytesWritten / res.contentLength;
          setProgress(pct);
        },
      });

      const response = await result.promise;

      if (response.statusCode === 200) {
        setStatus(`下载完成: ${localFilePath}`);
      } else {
        setStatus(`下载失败，状态码: ${response.statusCode}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('下载失败: ' + error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="下载AWS文件" onPress={downloadFile} />
      <Text style={{ marginTop: 10 }}>{status}</Text>

      {progress > 0 && progress < 1 && (
        <View style={{ marginTop: 20 }}>
          {Platform.OS === 'android' ? (
            <ProgressBarAndroid styleAttr="Horizontal" indeterminate={false} progress={progress} />
          ) : (
            <ProgressViewIOS progress={progress} />
          )}
          <Text>{Math.round(progress * 100)}%</Text>
        </View>
      )}
    </View>
  );
}
 */