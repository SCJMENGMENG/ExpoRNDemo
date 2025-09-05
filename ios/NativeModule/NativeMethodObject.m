//
//  NativeMethodObject.m
//  ExpoRNDemo
//
//  Created by lymowmac on 2025/8/25.
//

#import "NativeMethodObject.h"

@implementation NativeMethodObject

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(nativeMethodTest) {
//  exit(0); //退出
  
  NSLog(@"---测试---这是原生方法");
}

@end
