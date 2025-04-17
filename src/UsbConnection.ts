import type { NativeEventSubscription } from 'react-native';
import type { Buffer } from 'buffer';
import { EventEmitter } from 'tseep';
import { usbEventEmitter } from './EventEmitters';
import UsbApi from './NativeTscUsb';
import type { Device } from './types';
import { ConnectionType } from './types';

export interface UsbDevice extends Device {
  vendorId?: number;
  productId?: number;
  serialNumber: string;
}

class UsbConnection extends EventEmitter {
  private _id: number;
  private _usbDeviceAttachedListener: NativeEventSubscription;
  private _usbDeviceDetachedListener: NativeEventSubscription;
  private _usbDeviceDataListener: NativeEventSubscription;

  static async discover(timeout: number): Promise<UsbDevice[]> {
    if (!UsbApi) throw new Error('The TSC USB is not enabled.');
    const devices = await UsbApi.scanDevices(timeout);
    return devices.map((device) => ({
      ...device,
      type: ConnectionType.USB,
    }));
  }

  private constructor(id: number) {
    super();
    this._id = id;
    if (!usbEventEmitter) throw new Error('The TSC USB is not enabled.');
    this._usbDeviceAttachedListener = usbEventEmitter.addListener(
      'connected',
      (event) => {
        if (event.id === this._id) {
          this.emit('connected');
        }
      }
    );
    this._usbDeviceDetachedListener = usbEventEmitter.addListener(
      'disconnected',
      (event) => {
        if (event.id === this._id) {
          this.emit('disconnected');
        }
      }
    );
    this._usbDeviceDataListener = usbEventEmitter.addListener(
      'data',
      (event) => {
        if (event.id === this._id) {
          this.emit('data', event.data);
        }
      }
    );
  }

  static async connect(target: string): Promise<UsbConnection> {
    if (!UsbApi) throw new Error('The TSC USB is not enabled.');
    return new UsbConnection(await UsbApi.connect(target));
  }

  async disconnect(): Promise<void> {
    await UsbApi!.disconnect(this._id);
    this._usbDeviceAttachedListener.remove();
    this._usbDeviceDetachedListener.remove();
    this._usbDeviceDataListener.remove();
  }

  async send(data: Buffer): Promise<void> {
    await UsbApi!.send(this._id, data.toString('ascii'));
  }
}

export default UsbConnection;
