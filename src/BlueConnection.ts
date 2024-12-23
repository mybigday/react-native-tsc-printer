import type { NativeEventSubscription } from 'react-native';
import type { Buffer } from 'buffer';
import { EventEmitter } from 'events';
import { getEventEmitter } from './EventEmitters';
import BlueApi from './NativeTscBlue';
import type { Device } from './types';
import { ConnectionType } from './types';

class BlueConnection extends EventEmitter {
  private _id: number;
  private _blueDeviceAttachedListener: NativeEventSubscription;
  private _blueDeviceDetachedListener: NativeEventSubscription;
  private _blueDeviceDataListener: NativeEventSubscription;

  static async discover(timeout: number): Promise<Device[]> {
    const devices = await BlueApi.scanDevices(timeout);
    return devices.map((device) => ({
      ...device,
      type: ConnectionType.BLUETOOTH,
    }));
  }

  private constructor(id: number) {
    super();
    this._id = id;
    const emitter = getEventEmitter('bluetooth');
    this._blueDeviceAttachedListener = emitter.addListener(
      'connected',
      (event) => {
        if (event.id === this._id) {
          this.emit('connected');
        }
      }
    );
    this._blueDeviceDetachedListener = emitter.addListener(
      'disconnected',
      (event) => {
        if (event.id === this._id) {
          this.emit('disconnected');
        }
      }
    );
    this._blueDeviceDataListener = emitter.addListener('data', (event) => {
      if (event.id === this._id) {
        this.emit('data', event.data);
      }
    });
  }

  static async connect(target: string): Promise<BlueConnection> {
    return new BlueConnection(await BlueApi.connect(target));
  }

  async disconnect(): Promise<void> {
    await BlueApi.disconnect(this._id);
    this._blueDeviceAttachedListener.remove();
    this._blueDeviceDetachedListener.remove();
    this._blueDeviceDataListener.remove();
  }

  async send(data: Buffer): Promise<void> {
    await BlueApi.send(this._id, data.toString('ascii'));
  }
}

export default BlueConnection;
