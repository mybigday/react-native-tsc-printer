import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { TscUsb, TscBlue } = NativeModules;

const modules = {
  usb: TscUsb,
  bluetooth: TscBlue,
};

let emitters: { [key: string]: NativeEventEmitter | null } = {};

export const getEventEmitter = (type: 'usb' | 'bluetooth') => {
  if (!modules[type]) {
    throw new Error(`Native module for ${type} is not available`);
  }
  if (!emitters[type]) {
    emitters[type] = new NativeEventEmitter(
      Platform.OS === 'ios' ? modules[type] : null
    );
  }
  return emitters[type];
};
