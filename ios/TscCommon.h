#ifdef RCT_NEW_ARCH_ENABLED
#import "RNTscPrinterSpec.h"

@interface TscCommon : NSObject <NativeTscCommonSpec>
#else
#import <React/RCTBridgeModule.h>

@interface TscCommon : NSObject <RCTBridgeModule>
#endif

@end
