import { BluetoothTransport } from "../types.js";
import {
  SERVICE_UUID,
  COMMAND_UUID,
  RESPONSE_UUID,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_UUID,
} from "../protocol.js";

export class WebBluetoothTransport implements BluetoothTransport {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private commandChar: BluetoothRemoteGATTCharacteristic | null = null;
  private responseChar: BluetoothRemoteGATTCharacteristic | null = null;
  private batteryChar: BluetoothRemoteGATTCharacteristic | null = null;
  private disconnectCallback: (() => void) | null = null;

  get connected(): boolean {
    return this.device?.gatt?.connected ?? false;
  }

  async connect(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      throw new Error("Web Bluetooth API is not supported in this environment.");
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [BATTERY_SERVICE_UUID]
    });

    this.device.addEventListener("gattserverdisconnected", () => {
      if (this.disconnectCallback) {
        this.disconnectCallback();
      }
    });

    if (!this.device.gatt) {
      throw new Error("GATT server is not available on this device.");
    }

    this.server = await this.device.gatt.connect();

    const service = await this.server.getPrimaryService(SERVICE_UUID);
    this.commandChar = await service.getCharacteristic(COMMAND_UUID);
    this.responseChar = await service.getCharacteristic(RESPONSE_UUID);

    try {
      const batteryService = await this.server.getPrimaryService(BATTERY_SERVICE_UUID);
      this.batteryChar = await batteryService.getCharacteristic(BATTERY_LEVEL_UUID);
    } catch {
      // Battery service optional
      this.batteryChar = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }

  async send(bytes: Uint8Array): Promise<void> {
    if (!this.commandChar) {
      throw new Error("Not connected to Z407.");
    }
    await this.commandChar.writeValueWithoutResponse(bytes);
  }

  async startNotifications(callback: (bytes: Uint8Array) => void): Promise<void> {
    if (!this.responseChar) {
      throw new Error("Not connected to Z407.");
    }
    await this.responseChar.startNotifications();
    this.responseChar.addEventListener("characteristicvaluechanged", (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (target.value) {
        const bytes = new Uint8Array(target.value.buffer);
        callback(bytes);
      }
    });
  }

  async getBattery(): Promise<number | null> {
    if (!this.batteryChar) {
      return null;
    }
    const dataView = await this.batteryChar.readValue();
    return dataView.getUint8(0);
  }

  onDisconnected(callback: () => void): void {
    this.disconnectCallback = callback;
  }
}
