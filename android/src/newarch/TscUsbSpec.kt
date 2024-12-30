package com.tscprinter

import com.facebook.react.bridge.ReactApplicationContext

abstract class TscUsbSpec internal constructor(context: ReactApplicationContext) :
  NativeTscUsbSpec(context) {
}
