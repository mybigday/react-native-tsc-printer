#import "TscCommon.h"
#import <UIKit/UIKit.h>

@implementation TscCommon
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(loadImage:(NSString *)uri
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

            // Resize image if height is specified
            CGFloat scale = height / image.size.height;
            CGSize newSize = CGSizeMake(image.size.width * scale, height);
            UIGraphicsBeginImageContextWithOptions(newSize, NO, 1.0);
            [image drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
            UIImage *resizedImage = UIGraphicsGetImageFromCurrentImageContext();
            UIGraphicsEndImageContext();

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
            // Get grayscale data
            char *grayscaleData = (char *)CGBitmapContextGetData(context);
            NSUInteger width = resizedImage.size.width;
            NSUInteger height = resizedImage.size.height;
            NSUInteger bytesPerRow = CGBitmapContextGetBytesPerRow(context);
            
            // Calculate binary data size (8 pixels per byte)
            NSUInteger binaryRowBytes = width / 8;
            if (width % 8 != 0) binaryRowBytes++;
            NSMutableArray *binaryArray = [NSMutableArray arrayWithCapacity:height * binaryRowBytes];
            
            // Convert to binary (8 pixels per byte)
            for (NSUInteger y = 0; y < height; y++) {
                for (NSUInteger byteX = 0; byteX < binaryRowBytes; byteX++) {
                    uint8_t binaryByte = 0;
                    
                    for (NSUInteger bit = 0; bit < 8; bit++) {
                        NSUInteger x = byteX * 8 + bit;
                        if (x < width) {
                            uint8_t gray = grayscaleData[y * bytesPerRow + x];
                            if (gray < 128) {
                                binaryByte |= (1 << (7 - bit));
                            }
                        }
                    }
                    [binaryArray addObject:@(binaryByte)];
                }
            }
            
            CGContextRelease(context);
            
            resolve(@{
                @"widthBytes": @(binaryRowBytes),
                @"data": binaryArray
            });
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