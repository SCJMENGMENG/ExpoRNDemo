//
//  CustomPickerManager.m
//  ExpoRNDemo
//
//  Created by lymowmac on 2025/8/30.
//

#import <React/RCTViewManager.h>
#import "CustomPickerView.h"

@interface CustomPickerManager : RCTViewManager
@end

@implementation CustomPickerManager

RCT_EXPORT_MODULE(CustomPicker)

// 导出属性
RCT_EXPORT_VIEW_PROPERTY(model, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock)

- (UIView *)view {
  return [[CustomPickerView alloc] init];
}

@end
