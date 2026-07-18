import { BluetoothTransport } from "../types.js";
import {
  SERVICE_UUID,
  COMMAND_UUID,
  RESPONSE_UUID,
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_UUID,
} from "../protocol.js";

export interface NodeBleTransportOptions {
  /** Optional peripheral ID or MAC address to connect to directly */
  deviceId?: string;
  /** Timeout in milliseconds for device discovery, default is 10000ms */
  timeout?: number;
}

export class NodeBleTransport implements BluetoothTransport {
  private options: NodeBleTransportOptions;
  private noble: any = null;
  private peripheral: any = null;
  private commandChar: any = null;
  private responseChar: any = null;
  private batteryChar: any = null;
  private disconnectCallback: (() => void) | null = null;
  private _connected = false;

  constructor(options: NodeBleTransportOptions = {}) {
    this.options = options;
  }

  get connected(): boolean {
    return this._connected;
  }

  private async loadNoble(): Promise<any> {
    if (this.noble) return this.noble;
    try {
      // Dynamic import to avoid breaking browser/bundler build environments
      const nobleModule = await import("@abandonware/noble");
      this.noble = nobleModule.default || nobleModule;
      return this.noble;
    } catch (err) {
      throw new Error(
        "To use Z407 in Node.js, you must install '@abandonware/noble' as a dependency.\n" +
        "Run: pnpm install @abandonware/noble"
      );
    }
  }

  async connect(): Promise<void> {
    const noble = await this.loadNoble();

    // Standard UUID formatting for noble: lowercase and without dashes
    const serviceUuidNoble = SERVICE_UUID.replace(/-/g, "").toLowerCase();
    const batteryServiceUuidNoble = BATTERY_SERVICE_UUID.replace(/-/g, "").toLowerCase();
    const commandUuidNoble = COMMAND_UUID.replace(/-/g, "").toLowerCase();
    const responseUuidNoble = RESPONSE_UUID.replace(/-/g, "").toLowerCase();
    const batteryLevelUuidNoble = BATTERY_LEVEL_UUID.replace(/-/g, "").toLowerCase();

    // Wait for BLE adapter to be ready
    if (noble.state !== "poweredOn") {
      await new Promise<void>((resolve, reject) => {
        const stateHandler = (state: string) => {
          if (state === "poweredOn") {
            noble.off("stateChange", stateHandler);
            resolve();
          }
        };
        noble.on("stateChange", stateHandler);
        // Timeout check if adapter never turns on
        setTimeout(() => {
          noble.off("stateChange", stateHandler);
          reject(new Error("Bluetooth adapter state check timed out (not poweredOn)"));
        }, 5000);
      });
    }

    // Start scanning
    this.peripheral = await new Promise<any>((resolve, reject) => {
      let found = false;
      const timeoutMs = this.options.timeout ?? 10000;

      const discoverHandler = (peripheral: any) => {
        const match = !this.options.deviceId || 
          peripheral.id === this.options.deviceId || 
          peripheral.address === this.options.deviceId;

        if (match) {
          found = true;
          cleanup();
          resolve(peripheral);
        }
      };

      const cleanup = () => {
        noble.off("discover", discoverHandler);
        noble.stopScanning(() => {});
      };

      noble.on("discover", discoverHandler);
      noble.startScanning([serviceUuidNoble], false, (error?: any) => {
        if (error) {
          cleanup();
          reject(error);
        }
      });

      setTimeout(() => {
        if (!found) {
          cleanup();
          reject(new Error(`Device discovery timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });

    // Handle disconnect
    this.peripheral.once("disconnect", () => {
      this._connected = false;
      if (this.disconnectCallback) {
        this.disconnectCallback();
      }
    });

    // Connect
    await this.peripheral.connectAsync();
    this._connected = true;

    // Discover characteristics
    const { characteristics } = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [serviceUuidNoble, batteryServiceUuidNoble],
      [commandUuidNoble, responseUuidNoble, batteryLevelUuidNoble]
    );

    for (const char of characteristics) {
      const uuid = char.uuid.toLowerCase();
      if (uuid === commandUuidNoble) {
        this.commandChar = char;
      } else if (uuid === responseUuidNoble) {
        this.responseChar = char;
      } else if (uuid === batteryLevelUuidNoble) {
        this.batteryChar = char;
      }
    }

    if (!this.commandChar || !this.responseChar) {
      throw new Error("Required GATT characteristics for Z407 were not found.");
    }
  }

  async disconnect(): Promise<void> {
    if (this.peripheral && this._connected) {
      await this.peripheral.disconnectAsync();
    }
  }

  async send(bytes: Uint8Array): Promise<void> {
    if (!this.commandChar) {
      throw new Error("Not connected to Z407.");
    }
    // noble expects a Buffer
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    await this.commandChar.writeAsync(buffer, true);
  }

  async startNotifications(callback: (bytes: Uint8Array) => void): Promise<void> {
    if (!this.responseChar) {
      throw new Error("Not connected to Z407.");
    }
    await this.responseChar.subscribeAsync();
    this.responseChar.on("data", (data: Buffer) => {
      callback(new Uint8Array(data.buffer, data.byteOffset, data.length));
    });
  }

  async getBattery(): Promise<number | null> {
    if (!this.batteryChar) {
      return null;
    }
    const data = await this.batteryChar.readAsync();
    if (data && data.length > 0) {
      return data[0];
    }
    return null;
  }

  onDisconnected(callback: () => void): void {
    this.disconnectCallback = callback;
  }
}
