import { useCallback, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  PermissionsAndroid,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import type { Permission } from 'react-native';
import Printer, { ConnectionType } from 'react-native-tsc-printer';
import type { Device } from 'react-native-tsc-printer';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    padding: 10,
    margin: 10,
    backgroundColor: 'blue',
    color: 'white',
  },
  buttonText: {
    color: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    width: '100%',
  },
  form: {
    width: '100%',
  },
  section: {
    width: '100%',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);

  const scanDevices = useCallback(async () => {
    try {
      console.log('scanning devices');
      if (Platform.OS === 'android') {
        console.log('requesting permissions');
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as Permission,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as Permission,
        ]);
        console.log('permissions granted', granted);
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
      console.log('scan success');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const connect = useCallback(async (device: Device) => {
    console.log('connecting to device', device);
    try {
      const printer = await Printer.connect(device.type, device.target);
      try {
        const status = await printer.getStatus();
        console.log('status', status);
        await printer.setSize(100, 20);
        await printer.addText(0, 0, 'Hello, world!');
        await printer.print();
        console.log('print success');
      } catch (e) {
        console.error(e);
      } finally {
        await printer.disconnect();
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [netAddress, setNetAddress] = useState('');

  const addNetDevice = useCallback(() => {
    if (
      netAddress.length === 0 ||
      devices.find((device) => device.target === netAddress)
    ) {
      return;
    }
    setDevices([
      ...devices,
      { type: ConnectionType.NET, target: netAddress, name: netAddress },
    ]);
  }, [netAddress, devices]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TSC Printer Test</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scan Devices</Text>
        <Pressable style={styles.button} onPress={scanDevices}>
          <Text style={styles.buttonText}>Scan Devices</Text>
        </Pressable>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manually Add Net Device</Text>
        <TextInput
          style={styles.input}
          value={netAddress}
          onChangeText={setNetAddress}
        />
        <Pressable style={styles.button} onPress={addNetDevice}>
          <Text style={styles.buttonText}>Add Net Device</Text>
        </Pressable>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Device To Test</Text>
        <FlatList
          data={devices}
          renderItem={({ item }) => (
            <Pressable
              style={styles.button}
              onPress={() => {
                connect(item);
              }}
            >
              <Text style={styles.buttonText}>
                {item.name} ({item.type})
              </Text>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}
