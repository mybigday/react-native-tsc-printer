#import "TscCommon.h"
#import <UIKit/UIKit.h>

@implementation TscCommon
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(loadImage:(NSString *)uri
                  width:(double)width
                  height:(double)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            NSURL *url = [NSURL URLWithString:uri];
            NSData *data;
            if ([uri hasPrefix:@"data:"]) {
                NSString *base64String = [uri componentsSeparatedByString:@","][1];
                data = [[NSData alloc] initWithBase64EncodedString:base64String options:0];
            } else {
                data = [NSData dataWithContentsOfURL:url];
            }

            if (!data) {
                reject(@"E_LOAD_IMAGE", @"Failed to load image data", nil);
                return;
            }

            UIImage *image = [UIImage imageWithData:data];
            if (!image) {
                reject(@"E_LOAD_IMAGE", @"Failed to create image from data", nil);
                return;
            }

            // Resize image to target size
            UIImage *resizedImage;
            if (width == 0 || height == 0) {
                resizedImage = image;
            } else {
                UIGraphicsBeginImageContext(CGSizeMake(width, height));
                [image drawInRect:CGRectMake(0, 0, width, height)];
                resizedImage = UIGraphicsGetImageFromCurrentImageContext();
                UIGraphicsEndImageContext();
            }

            // Convert to grayscale bitmap
            CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceGray();
            CGContextRef context = CGBitmapContextCreate(nil,
                                                       resizedImage.size.width,
                                                       resizedImage.size.height,
                                                       8,
                                                       resizedImage.size.width,
                                                       colorSpace,
                                                       kCGImageAlphaNone);
            CGColorSpaceRelease(colorSpace);
            
            CGContextDrawImage(context,
                             CGRectMake(0, 0, resizedImage.size.width, resizedImage.size.height),
                             resizedImage.CGImage);
            
            NSData *bitmapData = [NSData dataWithBytes:CGBitmapContextGetData(context)
                                              length:CGBitmapContextGetHeight(context) * CGBitmapContextGetBytesPerRow(context)];
            CGContextRelease(context);

            resolve(@[
                @(resizedImage.size.width),
                @(resizedImage.size.height),
                bitmapData
            ]);
        } @catch (NSException *exception) {
            reject(@"E_LOAD_IMAGE", exception.reason, nil);
        }
    });
}

#pragma mark - TurboModule

#ifdef RCT_NEW_ARCH_ENABLED

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeTscBlueSpecJSI>(params);
}

#endif

@end 