import { Platform } from 'react-native';
import net from 'react-native-tcp-socket';
import BluetoothClassic from 'react-native-bluetooth-classic';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';
import UsbConnection from './UsbConnection';
import Common from './NativeTscCommon';
import { BARCODE_DEFAULT_WIDE, STATUS_MAP } from './constants';
import {
  ConnectionType,
  SensorType,
  Font,
  TextAlignment,
  CodePage,
  BarcodeType,
  QRCodeMode,
  QRCodeModel,
  QRCodeMask,
} from './types';
import type { Device } from './types';
import { buildCommand, quote } from './utils';
import { Buffer } from 'buffer';
import type { EventEmitter } from 'events';

export * from './types';

class Printer {
  private _type: ConnectionType;
  private _connection: UsbConnection | net.Socket | BluetoothDevice;

  private constructor(
    type: ConnectionType,
    connection: UsbConnection | net.Socket | BluetoothDevice
  ) {
    this._type = type;
    this._connection = connection;
  }

  static async discover(
    types: ConnectionType[],
    timeout: number = 5000
  ): Promise<Device[]> {
    const devices: Device[] = [];
    for (const type of types) {
      switch (type) {
        case ConnectionType.USB:
          devices.push(...(await UsbConnection.discover(timeout)));
          break;
        case ConnectionType.BLUETOOTH:
          if (Platform.OS === 'android') {
            setTimeout(() => {
              BluetoothClassic.cancelDiscovery();
            }, timeout);
          } else {
            console.warn(
              'Bluetooth discovery is not supported on iOS. Only bonded devices will be listed.'
            );
          }
          const btDevices =
            Platform.OS === 'android'
              ? await BluetoothClassic.startDiscovery()
              : await BluetoothClassic.getBondedDevices();
          devices.push(
            ...btDevices
              .filter((device) => device.type === 'CLASSIC')
              .map((device) => ({
                name: device.name,
                address: device.address,
                target: device.address,
                type: ConnectionType.BLUETOOTH,
              }))
          );
          break;
        default:
          throw new Error('Unsupported connection type');
      }
    }
    return devices;
  }

  static async connect(type: ConnectionType, target: string): Promise<Printer> {
    switch (type) {
      case ConnectionType.USB:
        return new Printer(type, await UsbConnection.connect(target));
      case ConnectionType.NET: {
        return new Promise((resolve, reject) => {
          const [host, port] = target.split(':');
          const socket = net.connect(
            {
              host,
              port: Number(port),
            },
            () => {
              resolve(new Printer(type, socket));
            }
          );
          socket.on('error', reject);
        });
      }
      case ConnectionType.BLUETOOTH: {
        const available = await BluetoothClassic.isBluetoothAvailable();
        if (!available) throw new Error('Bluetooth is not available');
        const enabled = await BluetoothClassic.isBluetoothEnabled();
        if (!enabled) throw new Error('Bluetooth is not enabled');
        const pairedDevices = await BluetoothClassic.getBondedDevices();
        let device = pairedDevices.find((dev) => dev.address === target);
        if (!device && Platform.OS === 'ios')
          throw new Error('The device is not paired');
        if (!device) device = await BluetoothClassic.pairDevice(target);
        if (!(await device.isConnected()))
          await device.connect({ connectionType: 'rfcomm', delimiter: '\r\n' });
        return new Printer(type, device);
      }
      default:
        throw new Error('Unsupported connection type');
    }
  }

  async disconnect(): Promise<void> {
    switch (this._type) {
      case ConnectionType.USB:
        await (this._connection as UsbConnection).disconnect();
        break;
      case ConnectionType.NET:
        await (this._connection as net.Socket).destroy();
        break;
      case ConnectionType.BLUETOOTH:
        await (this._connection as BluetoothDevice).disconnect();
        break;
    }
  }

  async receive(timeout: number = 1000): Promise<string | Buffer> {
    switch (this._type) {
      case ConnectionType.USB:
        return await (this._connection as UsbConnection).read();
      case ConnectionType.BLUETOOTH:
        return (await (this._connection as BluetoothDevice).read()) as string;
      case ConnectionType.NET:
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(
            () => reject(new Error('Timeout')),
            timeout
          );
          (this._connection! as EventEmitter).once('data', (data) => {
            clearTimeout(timeoutId);
            resolve(data);
          });
        });
      default:
        throw new Error('Unsupported connection type');
    }
  }

  async sendCommand(command: string | Buffer): Promise<void> {
    if (!Buffer.isBuffer(command)) {
      command = Buffer.from(command);
    }
    switch (this._type) {
      case ConnectionType.USB:
        await (this._connection as UsbConnection).send(command);
        break;
      case ConnectionType.NET:
        return new Promise((resolve, reject) => {
          (this._connection as net.Socket).write(command, 'binary', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      case ConnectionType.BLUETOOTH:
        await (this._connection as BluetoothDevice).write(command, 'binary');
        break;
      default:
    }
  }

  async clearBuffer(): Promise<void> {
    return this.sendCommand(buildCommand('CLS'));
  }

  async setSize(width: number, height: number): Promise<void> {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new Error('Width and height must be integers');
    }
    return this.sendCommand(
      buildCommand('SIZE', `${width} mm`, `${height} mm`)
    );
  }

  async setSpeed(speed: number): Promise<void> {
    if (!Number.isInteger(speed)) {
      throw new Error('Speed must be an integer');
    }
    return this.sendCommand(buildCommand('SPEED', speed));
  }

  async setDensity(density: number): Promise<void> {
    if (!Number.isInteger(density)) {
      throw new Error('Density must be an integer');
    }
    return this.sendCommand(buildCommand('DENSITY', density));
  }

  async setSensor(
    sensor: SensorType,
    distance: number,
    offset: number
  ): Promise<void> {
    if (!Number.isInteger(distance) || !Number.isInteger(offset)) {
      throw new Error('Distance and offset must be integers');
    }
    switch (sensor) {
      case SensorType.Gap:
        return this.sendCommand(
          buildCommand('GAP', `${distance} mm`, `${offset} mm`)
        );
      case SensorType.BlackLine:
        return this.sendCommand(
          buildCommand('BLINE', `${distance} mm`, `${offset} mm`)
        );
      default:
        throw new Error('Unsupported sensor type');
    }
  }

  async setCodepage(codepage: CodePage): Promise<void> {
    return this.sendCommand(buildCommand('CODEPAGE', codepage));
  }

  async addBarcode(
    x: number,
    y: number,
    type: BarcodeType,
    content: string,
    size: number,
    {
      hri = false,
      rotation = 0,
      narrow,
      wide,
    }: {
      hri?: boolean;
      rotation?: number;
      narrow?: number;
      wide?: number;
    } = {}
  ): Promise<void> {
    wide ??= BARCODE_DEFAULT_WIDE[type as keyof typeof BARCODE_DEFAULT_WIDE];
    narrow ??= type === BarcodeType.CPOST ? 3 : 1;
    return this.sendCommand(
      buildCommand(
        'BARCODE',
        x,
        y,
        type,
        size,
        hri ? 1 : 0,
        rotation,
        narrow,
        wide,
        quote(content)
      )
    );
  }

  async addText(
    x: number,
    y: number,
    content: string | Buffer,
    {
      font = Font.MonotyeCG0,
      rotation = 0,
      magnification,
      alignment = TextAlignment.Default,
    }: {
      font?: Font | string;
      rotation?: number;
      magnification?: {
        x?: number;
        y?: number;
      };
      alignment?: TextAlignment;
    } = {}
  ): Promise<void> {
    return this.sendCommand(
      buildCommand(
        'TEXT',
        x,
        y,
        quote(font),
        rotation,
        magnification?.x ?? 1,
        magnification?.y ?? 1,
        alignment,
        quote(content)
      )
    );
  }

  async addQRCode(
    x: number,
    y: number,
    content: string,
    cell: number = 1,
    {
      level = 'L',
      mode = QRCodeMode.Auto,
      rotation = 0,
      model = QRCodeModel.Model1,
      mask = QRCodeMask.S7,
    }: {
      level?: 'L' | 'M' | 'Q' | 'H';
      mode?: QRCodeMode;
      rotation?: number;
      model?: QRCodeModel;
      mask?: QRCodeMask;
    } = {}
  ): Promise<void> {
    return this.sendCommand(
      buildCommand(
        'QRCODE',
        x,
        y,
        level,
        cell,
        mode,
        rotation,
        model,
        mask,
        quote(content)
      )
    );
  }

  async addBar(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    return this.sendCommand(buildCommand('BAR', x, y, width, height));
  }

  async print(quantity: number = 1, copies: number = 1): Promise<void> {
    return this.sendCommand(buildCommand('PRINT', quantity, copies));
  }

  async feed(dots: number = 1): Promise<void> {
    return this.sendCommand(buildCommand('FEED', dots));
  }

  async formfeed(): Promise<void> {
    return this.sendCommand(buildCommand('FORMFEED'));
  }

  async backfeed(dots: number = 1): Promise<void> {
    return this.sendCommand(buildCommand('BACKFEED', dots));
  }

  async cut(): Promise<void> {
    return this.sendCommand(buildCommand('CUT'));
  }

  async noBackfeed(): Promise<void> {
    return this.sendCommand(buildCommand('SET TEAR OFF'));
  }

  async addImage(
    x: number,
    y: number,
    uri: string,
    heightInDots: number = 0
  ): Promise<void> {
    const { data, widthBytes } = await Common.loadImage(uri, heightInDots);
    return this.addBitmap(x, y, widthBytes, heightInDots, new Uint8Array(data));
  }

  async addBitmap(
    x: number,
    y: number,
    widthBytes: number,
    heightInDots: number,
    bitmap: Uint8Array
  ): Promise<void> {
    const mode = 0;
    return this.sendCommand(
      buildCommand(
        'BITMAP',
        x,
        y,
        widthBytes,
        heightInDots,
        mode,
        Buffer.from(bitmap)
      )
    );
  }

  async restart(): Promise<void> {
    await this.sendCommand(Buffer.from([27, 33, 82]));
  }

  async getStatus(): Promise<string> {
    await this.sendCommand(Buffer.from([27, 33, 63]));
    const status = await this.receive();
    return STATUS_MAP[status.toString()] ?? 'Unknown';
  }

  async getPrinterName(): Promise<string> {
    await this.sendCommand('~!T');
    return (await this.receive()).toString();
  }

  async getPrinterMemory(): Promise<string> {
    await this.sendCommand('~!A');
    return (await this.receive()).toString();
  }

  async getPrinterMileage(): Promise<string> {
    await this.sendCommand('~!@');
    return (await this.receive()).toString();
  }

  async getPrinterCodepage(): Promise<string> {
    await this.sendCommand('~!I');
    return (await this.receive()).toString();
  }
}

export default Printer;
