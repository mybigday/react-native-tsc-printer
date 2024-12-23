package com.tscprinter

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableArray

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.le.ScanCallback
import android.util.Base64
import android.bluetooth.BluetoothGatt
import android.content.Context

import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

@ReactModule(name = TscBlueModule.NAME)
class TscBlueModule(reactContext: ReactApplicationContext) :
  NativeTscBlueSpec(reactContext) {

  private val nextId = AtomicInteger(0)
  private val devices = mutableMapOf<Int, BluetoothSocket>()

  private val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()

  private var scanning = false

  override fun getName(): String {
    return NAME
  }

  override fun scanDevices(timeout: Double, promise: Promise) {
    if (!bluetoothAdapter.isEnabled) {
      promise.reject(Exception("Bluetooth is not enabled"))
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
            promise.reject(Exception("Scan failed, code: $errorCode"))
          }
        }

        bluetoothAdapter.bluetoothLeScanner.startScan(leScanCallback)
        Thread.sleep(timeout.toLong())
        bluetoothAdapter.bluetoothLeScanner.stopScan(leScanCallback)
        promise.resolve(results)
      } catch (e: Exception) {
        promise.reject(e)
      }
    }.start()
  }

  override fun connect(target: String, promise: Promise) {
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
        promise.reject(e)
      }
    }.start()
  }

  override fun disconnect(deviceId: Double, promise: Promise) {
    devices[deviceId.toInt()]?.close()
    devices.remove(deviceId.toInt())
    promise.resolve(null)
  }

  override fun send(deviceId: Double, command: String, promise: Promise) {
    Thread {
      try {
        val bytes = Base64.decode(command, Base64.DEFAULT)
        devices[deviceId.toInt()]?.outputStream?.write(bytes)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject(e)
      }
    }.start()
  }

  override fun read(deviceId: Double, promise: Promise) {
    Thread {
      try {
        val bluetoothSocket = devices[deviceId.toInt()]
        val buffer = ByteArray(1024)
        val bytesRead = bluetoothSocket?.inputStream?.read(buffer) ?: 0
        val data = buffer.sliceArray(0 until bytesRead)
        promise.resolve(Base64.encodeToString(data, Base64.DEFAULT))
      } catch (e: Exception) {
        promise.reject(e)
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
