// CustomToast.tsx
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

export enum ToastType {
  success = 'success',
  error = 'error',
  info = 'info',
  middleSuccess = 'middleSuccess',
  middleError = 'middleError',
}

const CustomToast = ({ type, text1, text2 }: { type: ToastType, text1: string, text2: string }) => {
  return (
    <View style={[
      styles.base,
      type === ToastType.success
        ? styles.succesColor
        : type === ToastType.error
          ? styles.errorColor
          : styles.infoColor
    ]}>
      <View style={styles.container}>
        {text1 ? <Text style={[styles.text1, text2 && { marginBottom: 4 }]}>{text1}</Text> : null}
        {text2 ? <Text style={styles.text2}>{text2}</Text> : null}
      </View>
    </View>
  );
};


const SquareToast = ({
  type,
  text1,
  ...props
}: any) => {
  const { width: width, height: height } = useWindowDimensions();
  let iconName: React.ComponentProps<typeof MaterialIcons>['name'] = "info";
  let iconColor = "#7CC7F9";
  if (type === ToastType.middleSuccess) {
    iconName = "check-circle";
    iconColor = "#4CAF50";
  } else if (type === ToastType.middleError) {
    iconName = "error";
    iconColor = "#FE5801";
  }
  const close = props?.onClose || props?.closeToast || props?.hide || props?.onPress;

  return (
    <View style={{ width: width, height: height, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable onPress={() => close?.()} style={squareStyles.squareBox}>
        <MaterialIcons name={iconName} size={40} color={iconColor} style={{ marginBottom: 16 }} />
        <Text style={squareStyles.squareText}>{text1}</Text>
      </Pressable>
    </View>
  );
};

const ModalToast = ({
  type,
  text1,
  text2,
  ...props
}: any) => {
  const { width: width, height: height } = useWindowDimensions();
  const close = props?.onClose || props?.closeToast || props?.hide || props?.onPress;

  return (
    <Pressable onPress={() => close?.()} style={[{
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    }, { width: width, height: height }]}>
      <View style={[{
        width: 320,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
      }]}>
        {/* success or failed 提示框 */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          margin: 24,
        }}>
          <View style={[{
            width: 8,
            height: 8,
            borderRadius: 4,
            marginRight: 4,
            marginTop: 8,
          }, {
            backgroundColor: type === 'error' ? '#E7000B' : '#4CDAA2',
          }]} />
          <Text style={{
            maxHeight: 260,
            fontWeight: '400',
            fontSize: 16,
            color: '#4A5565',
            textAlign: 'center',
            alignSelf: 'center',
            lineHeight: 24,
          }}>
            {text1}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  succesColor: {
    backgroundColor: '#4CAF50',
  },
  errorColor: {
    backgroundColor: '#FE5801',
  },
  infoColor: {
    backgroundColor: '#7CC7F9',
  },
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginLeft: 6,
    minWidth: 300 - 6,
    minHeight: 40,
    justifyContent: 'center',
  },
  text1: {
    color: '#000',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  text2: {
    color: '#999',
    fontSize: 11,
    lineHeight: 16,
  },
});

const squareStyles = StyleSheet.create({
  squareBox: {
    width: 180,
    // height: 140,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 10
  },
  squareText: {
    marginTop: 4,
    fontSize: 15,
    color: '#222',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export {
  CustomToast, ModalToast, SquareToast
};

