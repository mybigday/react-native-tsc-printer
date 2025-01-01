#import <Foundation/Foundation.h>
#import <ExternalAccessory/ExternalAccessory.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNTscPrinterSpec.h"
#import <React/RCTEventEmitter.h>

@interface TscUsb : RCTEventEmitter <NativeTscUsbSpec, NSStreamDelegate>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface TscUsb : RCTEventEmitter <RCTBridgeModule, NSStreamDelegate>
#endif

@end