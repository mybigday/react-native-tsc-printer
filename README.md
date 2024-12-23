# react-native-tsc-printer

TSC printer module for React Native

## Installation

```sh
npm install react-native-tsc-printer
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
