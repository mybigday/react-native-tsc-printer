#import "TscBlue.h"
#import <CoreBluetooth/CoreBluetooth.h>

static NSString *const TSC_SERVICE_UUID = @"00001101-0000-1000-8000-00805F9B34FB";

@interface TscBlue () <CBCentralManagerDelegate, CBPeripheralDelegate>
@property (nonatomic, strong) CBCentralManager *centralManager;
@property (nonatomic, strong) NSMutableDictionary<NSNumber *, CBPeripheral *> *peripherals;
@property (nonatomic, strong) NSMutableDictionary<NSNumber *, CBCharacteristic *> *characteristics;
@property (nonatomic, assign) NSInteger nextId;
@end

@implementation TscBlue
RCT_EXPORT_MODULE()

- (NSArray *)supportedEvents
{
  return @[ @"bluetoothEnabled", @"bluetoothDisabled", @"deviceFound", @"connected", @"disconnected", @"data" ];
}

- (instancetype)init {
    if (self = [super init]) {
        _nextId = 0;
        _peripherals = [NSMutableDictionary new];
        _characteristics = [NSMutableDictionary new];
        _centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:nil];
    }
    return self;
}

- (void)scanDevices:(double)timeout resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    if (_centralManager.state != CBManagerStatePoweredOn) {
        reject(@"E_BLUETOOTH_OFF", @"Bluetooth is not powered on", nil);
        return;
    }
    
    [_centralManager scanForPeripheralsWithServices:@[[CBUUID UUIDWithString:TSC_SERVICE_UUID]]
                                          options:@{CBCentralManagerScanOptionAllowDuplicatesKey: @NO}];
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, timeout * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
        [self->_centralManager stopScan];
        NSMutableArray *devices = [NSMutableArray new];
        for (CBPeripheral *peripheral in self->_peripherals.allValues) {
            [devices addObject:@{
                @"name": peripheral.name ?: @"",
                @"target": peripheral.identifier.UUIDString,
            }];
        }
        resolve(devices);
    });
}

- (void)connect:(NSString *)target resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:target];
    CBPeripheral *peripheral = [_centralManager retrievePeripheralsWithIdentifiers:@[uuid]].firstObject;
    
    if (!peripheral) {
        reject(@"E_DEVICE_NOT_FOUND", @"Device not found", nil);
        return;
    }
    
    NSInteger deviceId = _nextId++;
    _peripherals[@(deviceId)] = peripheral;
    peripheral.delegate = self;
    [_centralManager connectPeripheral:peripheral options:nil];

    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 1 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
        if (peripheral.state != CBPeripheralStateConnected) {
            reject(@"E_CONNECT_TIMEOUT", @"Connect timeout", nil);
        } else {
            resolve(@(deviceId));
        }
    });
}

- (void)disconnect:(NSInteger)deviceId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    CBPeripheral *peripheral = _peripherals[@(deviceId)];
    if (!peripheral) {
        reject(@"E_DEVICE_NOT_FOUND", @"Device not found", nil);
        return;
    }
    
    [_centralManager cancelPeripheralConnection:peripheral];
    [_peripherals removeObjectForKey:@(deviceId)];
    [_characteristics removeObjectForKey:@(deviceId)];
    resolve(nil);
}

- (void)send:(NSInteger)deviceId command:(NSString *)command resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    CBPeripheral *peripheral = _peripherals[@(deviceId)];
    CBCharacteristic *characteristic = _characteristics[@(deviceId)];
    
    if (!peripheral || !characteristic) {
        reject(@"E_DEVICE_NOT_FOUND", @"Device not found", nil);
        return;
    }
    
    NSData *data = [[NSData alloc] initWithBase64EncodedString:command options:0];
    [peripheral writeValue:data forCharacteristic:characteristic type:CBCharacteristicWriteWithResponse];
    resolve(nil);
}

- (void)read:(NSInteger)deviceId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject {
    CBPeripheral *peripheral = _peripherals[@(deviceId)];
    CBCharacteristic *characteristic = _characteristics[@(deviceId)];
    
    if (!peripheral || !characteristic) {
        reject(@"E_DEVICE_NOT_FOUND", @"Device not found", nil);
        return;
    }
    
    [peripheral readValueForCharacteristic:characteristic];
    resolve(nil);
}

#pragma mark - CBCentralManagerDelegate

- (void)centralManagerDidUpdateState:(CBCentralManager *)central {
    if (central.state == CBManagerStatePoweredOn) {
        [self sendEventWithName:@"bluetoothEnabled" body:nil];
    } else {
        [self sendEventWithName:@"bluetoothDisabled" body:nil];
    }
}

- (void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral advertisementData:(NSDictionary *)advertisementData RSSI:(NSNumber *)RSSI {
    if (peripheral.name) {
        [self sendEventWithName:@"deviceFound" body:@{
            @"name": peripheral.name,
            @"target": peripheral.identifier.UUIDString,
        }];
    }
}

- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral {
    [peripheral discoverServices:@[[CBUUID UUIDWithString:TSC_SERVICE_UUID]]];
}

- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error {
    NSNumber *deviceId = [self findDeviceId:peripheral];
    if (deviceId) {
        [self sendEventWithName:@"disconnected" body:@{@"id": deviceId}];
    }
}

#pragma mark - CBPeripheralDelegate

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverServices:(NSError *)error {
    for (CBService *service in peripheral.services) {
        [peripheral discoverCharacteristics:nil forService:service];
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didDiscoverCharacteristicsForService:(CBService *)service error:(NSError *)error {
    NSNumber *deviceId = [self findDeviceId:peripheral];
    if (!deviceId) return;
    
    CBCharacteristic *characteristic = service.characteristics.firstObject;
    if (characteristic) {
        _characteristics[deviceId] = characteristic;
        [peripheral setNotifyValue:YES forCharacteristic:characteristic];
        [self sendEventWithName:@"connected" body:@{@"id": deviceId}];
    }
}

- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic error:(NSError *)error {
    NSNumber *deviceId = [self findDeviceId:peripheral];
    if (!deviceId) return;

    NSString *value = [characteristic.value base64EncodedStringWithOptions:0];
    [self sendEventWithName:@"data" body:@{
        @"id": deviceId,
        @"data": value ?: @"",
    }];
}

#pragma mark - Helpers

- (NSNumber *)findDeviceId:(CBPeripheral *)peripheral {
    for (NSNumber *deviceId in _peripherals) {
        if (_peripherals[deviceId] == peripheral) {
            return deviceId;
        }
    }
    return nil;
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeTscBlueSpecJSI>(params);
}

@end 