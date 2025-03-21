#import "TscUsb.h"

#if defined(ENABLE_TSC_USB)

static const NSInteger TSC_VENDOR_ID = 0x1203;
static const NSInteger BUFFER_SIZE = 1024;

@interface TscUsb () <NSStreamDelegate>
@property (nonatomic, assign) NSInteger nextId;
@property (nonatomic, strong) NSMutableDictionary<NSNumber *, EASession *> *sessions;
@end

@implementation TscUsb
RCT_EXPORT_MODULE()

- (NSArray *)supportedEvents
{
  return @[ @"disconnected", @"data", @"error" ];
}

- (instancetype)init {
    if (self = [super init]) {
        _nextId = 0;
        _sessions = [NSMutableDictionary new];
    }
    return self;
}

- (void)stream:(NSStream *)stream handleEvent:(NSStreamEvent)eventCode {
    NSInteger deviceId = [self findDeviceId:stream];
    if (deviceId == -1) {
        return;
    }
    if (eventCode == NSStreamEventHasBytesAvailable) {
        NSInputStream *inputStream = (NSInputStream *)stream;
        uint8_t buffer[BUFFER_SIZE];
        NSInteger bytesRead = [inputStream read:buffer maxLength:sizeof(buffer)];
        NSData *data = [NSData dataWithBytes:buffer length:bytesRead];
        NSString *base64Data = [data base64EncodedStringWithOptions:0];
        [self sendEventWithName:@"data" body:@{@"id": @(deviceId), @"data": base64Data}];
    } else if (eventCode == NSStreamEventErrorOccurred) {
        [self sendEventWithName:@"error" body:@{@"id": @(deviceId), @"error": stream.streamError.localizedDescription}];
    } else if (eventCode == NSStreamEventEndEncountered) {
        [self sendEventWithName:@"disconnected" body:@{@"id": @(deviceId)}];
    }
}

- (NSInteger)findDeviceId:(NSStream *)stream {
    for (NSNumber *deviceId in _sessions) {
        EASession *session = _sessions[deviceId];
        if (session.inputStream == stream || session.outputStream == stream) {
            return deviceId.integerValue;
        }
    }
    return -1;
}

RCT_EXPORT_METHOD(scanDevices:(double)timeout
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    EAAccessoryManager *accessoryManager = [EAAccessoryManager sharedAccessoryManager];
    NSArray *accessories = [accessoryManager connectedAccessories];
    NSArray *filteredAccessories = [accessories filteredArrayUsingPredicate:[NSPredicate predicateWithFormat:@"vendorID == %@", @(0x1203)]];
    NSMutableArray *results = [NSMutableArray new];
    for (EAAccessory *accessory in filteredAccessories) {
        [results addObject:@{
            @"name": accessory.name,
            @"target": accessory.serialNumber,
            @"serialNumber": accessory.serialNumber,
        }];
    }
    resolve(results);
}

RCT_EXPORT_METHOD(connect:(NSString *)target
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    EAAccessoryManager *accessoryManager = [EAAccessoryManager sharedAccessoryManager];
    NSArray *accessories = [accessoryManager connectedAccessories];
    NSArray *filteredAccessories = [accessories filteredArrayUsingPredicate:[NSPredicate predicateWithFormat:@"serialNumber == %@", target]];
    EAAccessory *accessory = [filteredAccessories firstObject];
    if (!accessory) {
        reject(@"E_ACCESSORY_NOT_FOUND", @"Accessory not found", nil);
        return;
    }
    EASession *session = [[EASession alloc] initWithAccessory:accessory forProtocol:@"com.issc.datapath"];
    if (!session) {
        reject(@"E_SESSION_NOT_FOUND", @"Session not found", nil);
        return;
    }
    NSInteger deviceId = _nextId++;
    _sessions[@(deviceId)] = session;
    [session.inputStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
    [session.outputStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
    [session.inputStream open];
    [session.outputStream open];

    resolve(@(deviceId));
}

RCT_EXPORT_METHOD(disconnect:(double)deviceId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    EASession *session = _sessions[@(deviceId)];
    if (!session) {
        reject(@"E_SESSION_NOT_FOUND", @"Session not found", nil);
        return;
    }
    [session.inputStream close];
    [session.outputStream close];
    [session.inputStream removeFromRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
    [session.outputStream removeFromRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
    [_sessions removeObjectForKey:@(deviceId)];
    resolve(nil);
}

RCT_EXPORT_METHOD(send:(double)deviceId
                  command:(NSString *)command
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    EASession *session = _sessions[@(deviceId)];
    if (!session) {
        reject(@"E_SESSION_NOT_FOUND", @"Session not found", nil);
        return;
    }
    NSData *data = [[NSData alloc] initWithBase64EncodedString:command options:0];
    uint8_t *buffer = (uint8_t *)data.bytes;
    NSInteger bytesWritten = [session.outputStream write:buffer maxLength:data.length];
    if (bytesWritten < 0) {
        reject(@"E_WRITE_ERROR", @"Failed to write to device", nil);
        return;
    }
    resolve(nil);
}

RCT_EXPORT_METHOD(read:(double)deviceId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    EASession *session = _sessions[@(deviceId)];
    if (!session) {
        reject(@"E_SESSION_NOT_FOUND", @"Session not found", nil);
        return;
    }
    
    NSInputStream *inputStream = session.inputStream;
    uint8_t buffer[1024];
    NSInteger bytesRead = [inputStream read:buffer maxLength:sizeof(buffer)];
    
    if (bytesRead < 0) {
        reject(@"E_READ_ERROR", @"Failed to read from device", nil);
        return;
    }
    
    NSData *data = [NSData dataWithBytes:buffer length:bytesRead];
    NSString *base64Data = [data base64EncodedStringWithOptions:0];
    resolve(base64Data);
}

#pragma mark - TurboModule

#ifdef RCT_NEW_ARCH_ENABLED

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeTscUsbSpecJSI>(params);
}

#endif

@end

#endif