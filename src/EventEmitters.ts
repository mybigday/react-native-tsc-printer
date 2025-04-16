import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { TscUsb } = NativeModules;

export const usbEventEmitter =
  Platform.OS === 'android'
    ? new NativeEventEmitter()
    : !TscUsb
      ? null
      : new NativeEventEmitter(TscUsb);
