package com.tscprinter

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableArray

import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbConstants
import android.util.Base64
import android.content.Context
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.app.PendingIntent

import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = TscUsbModule.NAME)
class TscUsbModule(private val reactContext: ReactApplicationContext) :
  TscUsbSpec(reactContext) {

  private val nextId = AtomicInteger(0)
  private val devices = mutableMapOf<Int, UsbDevice>()
  private val connections = mutableMapOf<Int, UsbDeviceConnection>()
  private val ACTION_USB_PERMISSION = "com.tscprinter.USB_PERMISSION"

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  override fun scanDevices(timeout: Double, promise: Promise) {
    val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
    val deviceList = usbManager.deviceList
    val list = Arguments.createArray()
    
    deviceList.values.forEach { device ->
      if (device.vendorId == 0x1203) {
        val eventData = Arguments.createMap()
        eventData.putString("name", device.productName)
        eventData.putInt("id", device.deviceId)
        eventData.putString("target", device.serialNumber)
        list.pushMap(eventData)
      }
    }
    promise.resolve(list)
  }

  private fun getEndpoint(usbInterface: UsbInterface, direction: Int): UsbEndpoint? {
    for (i in 0 until usbInterface.endpointCount) {
      val endpoint = usbInterface.getEndpoint(i)
      if (endpoint.direction == direction) {
        return endpoint
      }
    }
    return null
  }

  @ReactMethod
  override fun connect(target: String, promise: Promise) {
    Thread {
      try {
        val context = reactContext
        val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
        val device = usbManager.deviceList.values.firstOrNull { it.deviceName == target }
          ?: throw Exception("Device not found")

        if (!usbManager.hasPermission(device)) {
          val permissionIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION_USB_PERMISSION),
            PendingIntent.FLAG_IMMUTABLE
          )

          val filter = IntentFilter(ACTION_USB_PERMISSION)
          val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
              if (ACTION_USB_PERMISSION == intent.action) {
                synchronized(this) {
                  val permittedDevice: UsbDevice? = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                  if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                    permittedDevice?.let {
                      val connection = usbManager.openDevice(it)
                      val usbInterface = it.getInterface(0)
                      connection.claimInterface(usbInterface, true)
                      val id = nextId.getAndIncrement()
                      devices[id] = it
                      connections[id] = connection
                      promise.resolve(id)
                    }
                  } else {
                    promise.reject("USB_PERMISSION_DENIED", "User denied USB permission")
                  }
                  reactContext.unregisterReceiver(this)
                }
              }
            }
          }
          reactContext.registerReceiver(receiver, filter)
          usbManager.requestPermission(device, permissionIntent)
        } else {
          val connection = usbManager.openDevice(device)
          val usbInterface = device.getInterface(0)
          connection.claimInterface(usbInterface, true)
          val id = nextId.getAndIncrement()
          devices[id] = device
          connections[id] = connection
          promise.resolve(id)
        }
      } catch (e: Exception) {
        promise.reject("E_CONNECT", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  override fun disconnect(deviceId: Double, promise: Promise) {
    Thread {
      try {
        connections[deviceId.toInt()]?.close()
        connections.remove(deviceId.toInt())
        devices.remove(deviceId.toInt())
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_DISCONNECT", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  override fun send(deviceId: Double, data: String, promise: Promise) {
    Thread {
      try {
        val device = devices[deviceId.toInt()] ?: throw Exception("Device not found")
        val connection = connections[deviceId.toInt()] ?: throw Exception("Device not found")
        val bytes = Base64.decode(data, Base64.DEFAULT)
        val usbInterface = device.getInterface(0)
        val endpoint = getEndpoint(usbInterface, UsbConstants.USB_DIR_OUT)
          ?: throw Exception("Output endpoint not found")

        val result = connection.bulkTransfer(endpoint, bytes, bytes.size, 1000)
        if (result < 0) {
          throw Exception("Bulk transfer failed")
        }
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_SEND", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  override fun read(deviceId: Double, promise: Promise) {
    Thread {
      try {
        val device = devices[deviceId.toInt()] ?: throw Exception("Device not found")
        val connection = connections[deviceId.toInt()] ?: throw Exception("Device not found")
        val usbInterface = device.getInterface(0)
        val endpoint = getEndpoint(usbInterface, UsbConstants.USB_DIR_IN)
          ?: throw Exception("Input endpoint not found")

        val buffer = ByteArray(1024)
        val result = connection.bulkTransfer(endpoint, buffer, buffer.size, 1000)
        if (result < 0) {
          throw Exception("Read failed")
        }
        promise.resolve(Base64.encodeToString(buffer.copyOf(result), Base64.DEFAULT))
      } catch (e: Exception) {
        promise.reject("E_READ", e.message, e)
      }
    }.start()
  }

  fun fireEvent(event: String, eventData: WritableMap) {
    val reactAppContext = reactApplicationContext
    if (reactAppContext.hasActiveReactInstance()) {
      reactAppContext.emitDeviceEvent(event, eventData)
    }
  }

  override fun addListener(eventName: String) {}

  override fun removeListeners(count: Double) {}

  companion object {
    const val NAME = "TscUsb"
  }
}
