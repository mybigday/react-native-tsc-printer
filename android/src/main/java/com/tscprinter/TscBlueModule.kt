package com.tscprinter

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableArray

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.util.Base64
import android.bluetooth.BluetoothGatt
import android.content.Context

import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = TscBlueModule.NAME)
class TscBlueModule(reactContext: ReactApplicationContext) :
  TscBlueSpec(reactContext) {

  private val nextId = AtomicInteger(0)
  private val devices = mutableMapOf<Int, BluetoothSocket>()

  private val bluetoothAdapter: BluetoothAdapter?

  private var scanning = false

  override fun getName(): String {
    return NAME
  }

  init {
    val bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    bluetoothAdapter = bluetoothManager.adapter
  }

  @ReactMethod
  override fun scanDevices(timeout: Double, promise: Promise) {
    if (bluetoothAdapter == null) {
      promise.reject("E_SCAN", "Bluetooth adapter not found")
      return
    }
    if (!bluetoothAdapter.isEnabled) {
      promise.reject("E_SCAN", "Bluetooth is not enabled")
      return
    }
    Thread {
      try {
        val results = Arguments.createArray()
        val leScanCallback = object : ScanCallback() {
          override fun onScanResult(callbackType: Int, result: android.bluetooth.le.ScanResult) {
            val device = result.device
            val name = device.name
            val address = device.address
            val eventData = Arguments.createMap()
            eventData.putString("name", name)
            eventData.putString("address", address)
            eventData.putString("target", address)
            results.pushMap(eventData)
            fireEvent("device", eventData)
          }

          override fun onScanFailed(errorCode: Int) {
            promise.reject("E_SCAN", "Scan failed, code: $errorCode")
          }
        }

        bluetoothAdapter.bluetoothLeScanner.startScan(leScanCallback)
        Thread.sleep(timeout.toLong())
        bluetoothAdapter.bluetoothLeScanner.stopScan(leScanCallback)
        promise.resolve(results)
      } catch (e: Exception) {
        promise.reject("E_SCAN", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  override fun connect(target: String, promise: Promise) {
    if (bluetoothAdapter == null) {
      promise.reject("E_CONNECT", "Bluetooth adapter not found")
      return
    }
    if (!bluetoothAdapter.isEnabled) {
      promise.reject("E_CONNECT", "Bluetooth is not enabled")
      return
    }
    Thread {
      try {
        val serviceUUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb")
        val bluetoothDevice = bluetoothAdapter.getRemoteDevice(target)
        val bluetoothSocket = bluetoothDevice.createRfcommSocketToServiceRecord(serviceUUID)
        bluetoothSocket.connect()
        val id = nextId.getAndIncrement()
        devices[id] = bluetoothSocket
        promise.resolve(id)
      } catch (e: Exception) {
        promise.reject("E_CONNECT", e.message, e)
      }
    }.start()
  }

  @ReactMethod
  override fun disconnect(deviceId: Double, promise: Promise) {
    devices[deviceId.toInt()]?.close()
    devices.remove(deviceId.toInt())
    promise.resolve(null)
  }

  @ReactMethod
  override fun send(deviceId: Double, command: String, promise: Promise) {
    Thread {
      try {
        val bytes = Base64.decode(command, Base64.DEFAULT)
        devices[deviceId.toInt()]?.outputStream?.write(bytes)
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
        val bluetoothSocket = devices[deviceId.toInt()]
        val buffer = ByteArray(1024)
        val bytesRead = bluetoothSocket?.inputStream?.read(buffer) ?: 0
        val data = buffer.sliceArray(0 until bytesRead)
        promise.resolve(Base64.encodeToString(data, Base64.DEFAULT))
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
    const val NAME = "TscBlue"
  }
}
