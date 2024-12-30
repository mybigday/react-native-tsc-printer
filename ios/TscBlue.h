#ifdef RCT_NEW_ARCH_ENABLED
#import "generated/RNTscPrinterSpec/RNTscPrinterSpec.h"
#import <React/RCTEventEmitter.h>

@interface TscBlue : RCTEventEmitter <NativeTscBlueSpec>

@end
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface TscBlue : RCTEventEmitter <RCTBridgeModule>
#endif

@end