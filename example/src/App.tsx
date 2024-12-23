import { useRef, useEffect } from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import Printer, { ConnectionType } from 'react-native-tsc-printer';

export default function App() {
  const printer = useRef<Printer | null>(null);

  useEffect(() => {
    Printer.connect(ConnectionType.NET, '192.168.1.100:9100').then((p) => {
      printer.current = p;
    });
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          if (printer.current) {
            printer.current.addText(0, 0, 'Hello, world!');
            printer.current.print();
          }
        }}
      >
        <Text>Print</Text>
      </Pressable>
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
