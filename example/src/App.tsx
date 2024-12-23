import { useCallback, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  PermissionsAndroid,
  Platform,
  FlatList,
} from 'react-native';
import type { Permission } from 'react-native';
import Printer, { ConnectionType } from 'react-native-tsc-printer';
import type { Device } from 'react-native-tsc-printer';

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);

  const scanDevices = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as Permission,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as Permission,
      ]);
      if (
        granted['android.permission.BLUETOOTH_SCAN'] !==
          PermissionsAndroid.RESULTS.GRANTED ||
        granted['android.permission.BLUETOOTH_CONNECT'] !==
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        return;
      }
    }
    setDevices(
      await Printer.discover([ConnectionType.BLUETOOTH, ConnectionType.USB])
    );
  }, []);

  const connect = useCallback(async (device: Device) => {
    const printer = await Printer.connect(device.type, device.target);
    try {
      await printer.setSize(100, 20);
      await printer.addText(0, 0, 'Hello, world!');
      await printer.print();
    } finally {
      await printer.disconnect();
    }
  }, []);

  return (
    <View style={styles.container}>
      <Pressable onPress={scanDevices}>
        <Text>Scan Devices</Text>
      </Pressable>
      <FlatList
        data={devices}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              connect(item);
            }}
          >
            <Text>
              {item.name} ({item.type})
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
