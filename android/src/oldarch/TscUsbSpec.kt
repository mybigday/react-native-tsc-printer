package com.tscprinter

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise

abstract class TscUsbSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  abstract fun scanDevices(timeout: Double, promise: Promise)
  abstract fun connect(target: String, promise: Promise)
  abstract fun disconnect(deviceId: Double, promise: Promise)
  abstract fun read(deviceId: Double, promise: Promise)
  abstract fun send(deviceId: Double, data: String, promise: Promise)
}
