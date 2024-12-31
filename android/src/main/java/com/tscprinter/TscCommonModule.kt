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
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.util.Log
import android.graphics.Color

import java.nio.ByteBuffer
import java.net.URL

@ReactModule(name = TscCommonModule.NAME)
class TscCommonModule(reactContext: ReactApplicationContext) :
  TscCommonSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  override fun loadImage(uri: String, height: Double, promise: Promise) {
    try {
      val url = URL(uri)
      val bitmap = BitmapFactory.decodeStream(url.openStream())
      val aspectRatio = bitmap.width.toDouble() / bitmap.height.toDouble()
      val width = aspectRatio * height
      val resizedBitmap = if (height == 0.0 || height.toInt() == bitmap.height) {
        bitmap
      } else {
        Bitmap.createScaledBitmap(bitmap, width.toInt(), height.toInt(), true)
      }
      // bitmap to bytearray
      val rowBytes = (resizedBitmap.width + 7) / 8
      val pixels = IntArray(resizedBitmap.width * resizedBitmap.height)
      resizedBitmap.getPixels(pixels, 0, resizedBitmap.width, 0, 0, resizedBitmap.width, resizedBitmap.height)
      // result
      val binaryArray = IntArray(resizedBitmap.height * rowBytes)
      // convert grayscale to Binarization
      var byteIndex = 0
      var bitIndex = 0
      for (y in 0 until resizedBitmap.height) {
        for (x in 0 until resizedBitmap.width) {
          val pixel = pixels[y * resizedBitmap.width + x]
          val r = Color.red(pixel)
          val g = Color.green(pixel)
          val b = Color.blue(pixel)
          val a = Color.alpha(pixel)
          val gray = ((r * 76 + g * 150 + b * 29) shr 8) * a / 255

          if (bitIndex == 0) {
            binaryArray[byteIndex] = 0
          }

          if (gray < 128) {
            binaryArray[byteIndex] = binaryArray[byteIndex] or (1 shl (7 - bitIndex))
          }
          
          bitIndex++
          if (bitIndex == 8) {
            bitIndex = 0
            byteIndex++
          }
        }
        // Move to next byte at end of row if needed
        if (bitIndex != 0) {
          bitIndex = 0
          byteIndex++
        }
      }
      val result = Arguments.createMap()
      result.putInt("widthBytes", rowBytes)
      result.putArray("data", Arguments.fromArray(binaryArray))

      bitmap.recycle()
      resizedBitmap.recycle()

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("E_LOAD_IMAGE", e.message, e)
    }
  }

  companion object {
    const val NAME = "TscCommon"
  }
}
