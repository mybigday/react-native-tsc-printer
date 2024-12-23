#import "generated/RNTscUsbSpec/RNTscUsbSpec.h"
#import <Foundation/Foundation.h>
#import <ExternalAccessory/ExternalAccessory.h>
#import <React/RCTEventEmitter.h>

@interface TscUsb : RCTEventEmitter <NativeTscUsbSpec, NSStreamDelegate>

@end