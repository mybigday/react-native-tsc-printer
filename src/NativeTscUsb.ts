import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

type UsbDevice = {
  vendorId?: number;
  productId?: number;
  name: string;
  target: string;
  serialNumber: string;
};

export interface Spec extends TurboModule {
  scanDevices(timeout: number): Promise<UsbDevice[]>;
  connect(deviceId: string): Promise<number>;
  disconnect(deviceId: number): Promise<void>;
  send(deviceId: number, command: string): Promise<void>;
  read(deviceId: number): Promise<string>;
  // NativeEventEmitter
  addListener(event: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('TscUsb');
