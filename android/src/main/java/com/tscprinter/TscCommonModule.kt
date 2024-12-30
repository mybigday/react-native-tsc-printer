package com.tscprinter

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableArray

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64

import java.net.URL

@ReactModule(name = TscCommonModule.NAME)
class TscCommonModule(reactContext: ReactApplicationContext) :
  TscCommonSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  override fun loadImage(uri: String, width: Double, height: Double, promise: Promise) {
    try {
      val url = URL(uri)
      val bitmap = BitmapFactory.decodeStream(url.openStream())
      val resizedBitmap = if (width == 0.0 || height == 0.0) {
        bitmap
      } else {
        Bitmap.createScaledBitmap(bitmap, width.toInt(), height.toInt(), true)
      }
      val rawData = IntArray(resizedBitmap.width * resizedBitmap.height)
      resizedBitmap.getPixels(rawData, 0, resizedBitmap.width, 0, 0, resizedBitmap.width, resizedBitmap.height)
      val data = IntArray(rawData.size)
      for (i in rawData.indices) {
        val color = rawData[i]
        val r = (color shr 16) and 0xFF
        val g = (color shr 8) and 0xFF
        val b = color and 0xFF
        data[i] = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
      }
      promise.resolve(Arguments.fromArray(data))
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  companion object {
    const val NAME = "TscCommon"
  }
}
