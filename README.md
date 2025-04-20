# react-native-tsc-printer

TSC printer module for React Native

## Installation

```sh
npm install react-native-tsc-printer
```

## Android

Add the following to your `AndroidManifest.xml`:

```xml
<!-- For Bluetooth connection -->

<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>

<!-- For USB connection -->

<uses-permission android:name="android.permission.USB_PERMISSION" />
<uses-feature android:name="android.hardware.usb.host" />

<intent-filter>
    <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
</intent-filter>
<meta-data android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
    android:resource="@xml/device_filter" />
```

Add `android/src/main/res/xml//device_filter.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <usb-device vendor-id="1203" />
</resources>
```

## iOS

Add the following to your `Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Need bluetooth access for printing</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Need bluetooth access for printing</string>
<key>UISupportedExternalAccessoryProtocols</key>
<array>
    <string>com.issc.datapath</string>
</array>
```

## Enabling TSC USB Functionality

The TSC USB functionality is conditionally compiled. You can enable it using one of the following methods:

### Method 1: Environment Variable

Set the `ENABLE_TSC_USB` environment variable to `1` before running pod install:

```sh
ENABLE_TSC_USB=1 pod install
```

### Method 2: Package.json Configuration

Add the `tscUsbEnabled` property to your project's root `package.json` file:

```json
{
  "name": "your-app",
  "version": "1.0.0",
  "tscUsbEnabled": true
}
```

## Usage

```js
import Printer, { ConnectionType } from 'react-native-tsc-printer';

// ...

const printer = await Printer.connect(ConnectionType.USB, '1234567890');

await printer.addText(0, 0, 'Hello, world!');
await printer.print();
```


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
