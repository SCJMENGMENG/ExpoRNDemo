//
//  CustomView.swift
//  ExpoRNDemo
//
//  Created by lymowmac on 2025/8/25.
//

import UIKit
import React

@objc(CustomViewManager)
class CustomViewManager: RCTViewManager {
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func view() -> UIView! {
    return CustomView()
  }
}

class CustomView: UIView {
  private let label = UILabel()

  @objc var text: NSString = "" {
    didSet {
      label.text = text as String
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    label.textColor = .white
    label.textAlignment = .center
    label.backgroundColor = .systemBlue
    addSubview(label)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func layoutSubviews() {
    super.layoutSubviews()
    label.frame = bounds
  }
}
