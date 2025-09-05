//
//  CustomPickerView.h
//  ExpoRNDemo
//
//  Created by lymowmac on 2025/8/30.
//

#import <UIKit/UIKit.h>
#import <React/RCTComponent.h>

NS_ASSUME_NONNULL_BEGIN

@interface CustomPickerModel : NSObject

@property (nullable, nonatomic, copy) NSArray <NSArray <NSString *> *> *dataList;
@property (nullable, nonatomic, copy) NSArray <NSNumber *> *selectIndexs;
@property (nonatomic, assign) CGFloat columnWidth;
@property (nonatomic, assign) CGFloat columnSpacing;

@end

@interface CustomPickerView : UIView

@property (nonatomic, strong) CustomPickerModel *model;

// RN 回调事件
@property (nonatomic, copy) RCTBubblingEventBlock onChange;

@end

NS_ASSUME_NONNULL_END
