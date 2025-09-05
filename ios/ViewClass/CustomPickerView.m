//
//  CustomPickerView.m
//  ExpoRNDemo
//
//  Created by lymowmac on 2025/8/30.
//

#import "CustomPickerView.h"

@implementation CustomPickerModel

@end

@interface CustomPickerView ()<UIPickerViewDelegate, UIPickerViewDataSource>

@property (nonatomic, strong) UIPickerView *pickerView;
@property(nonatomic, assign) NSInteger rollingComponent;
@property(nonatomic, assign) NSInteger rollingRow;

@property (nullable, nonatomic, copy) NSArray <NSArray <NSString *> *> *dataList;
@property (nullable, nonatomic, copy) NSArray <NSNumber *> *selectIndexs;
@property (nonatomic, assign) CGFloat columnWidth;
@property (nonatomic, assign) CGFloat columnSpacing;

@end

@implementation CustomPickerView

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    [self addSubview:self.pickerView];
  }
  return self;
}

- (void)layoutSubviews {
  [super layoutSubviews];
  self.pickerView.frame = self.bounds;
}

- (void)setModel:(NSDictionary *)modelDict {
    CustomPickerModel *model = [[CustomPickerModel alloc] init];
    model.dataList = modelDict[@"dataList"];
    model.selectIndexs = modelDict[@"selectIndexs"];
    model.columnWidth = [modelDict[@"columnWidth"] floatValue];
    model.columnSpacing = [modelDict[@"columnSpacing"] floatValue];
    _model = model;
    [self reloadDataWithModel:model];
}

- (void)reloadDataWithModel:(CustomPickerModel *)model {
  self.dataList = model.dataList;
  self.selectIndexs = model.selectIndexs;
  self.columnWidth = model.columnWidth;
  self.columnSpacing =  model.columnSpacing;
  [self reloadData];
}

- (void)reloadData {
    // 1.处理数据源
    [self handlerPickerData];
    // 2.刷新选择器
    [self.pickerView reloadAllComponents];
    // 3.滚动到选择的值
    for (NSInteger i = 0; i < self.selectIndexs.count; i++) {
      NSNumber *row = [self.selectIndexs objectAtIndex:i];
      NSInteger component = i;
      component = i * 2;
      [self.pickerView selectRow:[row integerValue] inComponent:component animated:NO];
    }
}

- (void)handlerPickerData {
  NSMutableArray *selectIndexs = [[NSMutableArray alloc] init];
  for (NSInteger component = 0; component < self.dataList.count; component++) {
      NSArray *itemArr = self.dataList[component];
      NSInteger row = 0;
      if (self.selectIndexs.count > 0 && component < self.selectIndexs.count) {
          NSInteger index = [self.selectIndexs[component] integerValue];
          row = ((index > 0 && index < itemArr.count) ? index : 0);
      }
      [selectIndexs addObject:@(row)];
  }
  self.selectIndexs = [selectIndexs copy];
}

#pragma mark - UIPickerViewDataSource

- (NSInteger)numberOfComponentsInPickerView:(UIPickerView *)pickerView {
  return self.dataList.count * 2 - 1;
}

- (NSInteger)pickerView:(UIPickerView *)pickerView numberOfRowsInComponent:(NSInteger)component {
  if (component % 2 == 1) {
      return 1;
  } else {
      component = component / 2;
  }
  NSArray *itemArr = self.dataList[component];
  return itemArr.count;
}

- (CGFloat)pickerView:(UIPickerView *)pickerView rowHeightForComponent:(NSInteger)component {
  return 35.0f;
}

- (CGFloat)pickerView:(UIPickerView *)pickerView widthForComponent:(NSInteger)component {
  if (component % 2 == 1) {
      return self.columnSpacing;
  }
  NSInteger columnCount = [self numberOfComponentsInPickerView:pickerView];
  CGFloat columnWidth = self.pickerView.bounds.size.width / columnCount - 5;
  if (self.columnWidth <= columnWidth) {
      return self.columnWidth;
  }
  return columnWidth;
}

#pragma mark - UIPickerViewDelegate
- (UIView *)pickerView:(UIPickerView *)pickerView viewForRow:(NSInteger)row forComponent:(NSInteger)component reusingView:(UIView *)view {
  UILabel *label = (UILabel *)view;
  if (!label) {
    label = [[UILabel alloc] init];
    label.backgroundColor = [UIColor clearColor];
    label.textAlignment = NSTextAlignmentCenter;
    label.font = [UIFont systemFontOfSize:16];
    label.numberOfLines = 1;
    label.adjustsFontSizeToFitWidth = YES;
    label.minimumScaleFactor = 0.5f;
  }
  
  [self setupPickerSelectRowStyle:pickerView titleForRow:row forComponent:component];
  [self handlePickerViewRollingStatus:pickerView component:component];
  
  if (component % 2 == 1) {
      label.text = @"";
      return label;
  } else {
      component = component / 2;
  }
  
  NSArray *itemArr = self.dataList[component];
  id item = [itemArr objectAtIndex:row];
  label.text = item;
  
  return label;
}

- (void)pickerView:(UIPickerView *)pickerView didSelectRow:(NSInteger)row inComponent:(NSInteger)component {
  if (component % 2 == 1) {
      return;
  } else {
      component = component / 2;
  }
  
  if (component < self.selectIndexs.count) {
      NSMutableArray *mutableArr = [self.selectIndexs mutableCopy];
      [mutableArr replaceObjectAtIndex:component withObject:@(row)];
      self.selectIndexs = [mutableArr copy];
  }
  
  // 滚动选择时执行 multiChangeBlock
//  self.multiChangeBlock ? self.multiChangeBlock([self getMultiSelectModels], self.selectIndexs): nil;
//  NSLog(@"--- picker 选中:%@", [self getMultiSelectModels]);
  if (self.onChange) {
    self.onChange(@{
      @"selectedValues": self.selectIndexs
    });
  }
}

- (BOOL)getRollingStatus:(UIView *)view {
    if ([view isKindOfClass:[UIScrollView class]]) {
        UIScrollView *scrollView = (UIScrollView *)view;
        if (scrollView.dragging || scrollView.decelerating) {
            // 如果 UIPickerView 正在拖拽或正在减速，返回YES
            return YES;
        }
    }
    
    for (UIView *subView in view.subviews) {
        if ([self getRollingStatus:subView]) {
            return YES;
        }
    }
    
    return NO;
}

- (BOOL)isRolling {
    return [self getRollingStatus:self.pickerView];
}

- (NSArray *)getMultiSelectModels {
    NSMutableArray *modelArr = [[NSMutableArray alloc]init];
    for (NSInteger i = 0; i < self.dataList.count; i++) {
        NSInteger index = [self.selectIndexs[i] integerValue];
        NSArray *dataArr = self.dataList[i];
        
        id item = index < dataArr.count ? dataArr[index] : nil;
        [modelArr addObject:item];
    }
    return [modelArr copy];
}

- (void)setupPickerSelectRowStyle:(UIPickerView *)pickerView titleForRow:(NSInteger)row forComponent:(NSInteger)component {
    // 1.设置分割线的颜色
    NSString *systemVersion = [UIDevice currentDevice].systemVersion;
    if (systemVersion.doubleValue < 14.0) {
        for (UIView *subView in pickerView.subviews) {
            if (subView && [subView isKindOfClass:[UIView class]] && subView.frame.size.height <= 1) {
                subView.backgroundColor = [UIColor separatorColor];
            }
        }
    }
    
    // 2.设置选择器中间选中行的背景颜色
    UIView *contentView = nil;
    NSArray *subviews = pickerView.subviews;
    if (subviews.count > 0) {
        id firstView = subviews.firstObject;
        if (firstView && [firstView isKindOfClass:[UIView class]]) {
            contentView = (UIView *)firstView;
        }
    }
  
    // 3.设置选择器中间选中行的字体颜色/字体大小
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        // 当前选中的 label
        UILabel *selectLabel = (UILabel *)[pickerView viewForRow:row forComponent:component];
        if (selectLabel) {
//          selectLabel.textColor = self.selectRowTextColor;
          selectLabel.font = [UIFont boldSystemFontOfSize:20.0f];
        }
    });
}

- (void)handlePickerViewRollingStatus:(UIPickerView *)pickerView component:(NSInteger)component {
    // 获取选择器组件滚动中选中的行
    NSInteger selectRow = [pickerView selectedRowInComponent:component];
    if (selectRow >= 0) {
        self.rollingComponent = component;
        // 根据滚动方向动态计算 rollingRow
        NSInteger lastRow = self.rollingRow;
        // 调整偏移量：当用户快速滚动并点击确定按钮时，可能导致选择不准确。这里简单的实现向前/向后多滚动一行（也可以根据滚动速度来调整偏移量）
        NSInteger offset = 1;
        if (lastRow >= 0) {
            // 向上滚动
            if (selectRow > lastRow) {
                self.rollingRow = selectRow + offset;
            } else if (selectRow < lastRow) {
                // 向下滚动
                self.rollingRow = selectRow - offset;
            } else {
                // 保持当前位置
                self.rollingRow = selectRow;
            }
        } else {
            // 首次滚动，默认向上滚动
            self.rollingRow = selectRow + offset;
        }
    }
}

- (UIPickerView *)pickerView {
  if (!_pickerView) {
    _pickerView = [[UIPickerView alloc] init];
    _pickerView.autoresizingMask = UIViewAutoresizingFlexibleBottomMargin | UIViewAutoresizingFlexibleRightMargin | UIViewAutoresizingFlexibleWidth;
    _pickerView.dataSource = self;
    _pickerView.delegate = self;
  }
  return _pickerView;
}

@end
