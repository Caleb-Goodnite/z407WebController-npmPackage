import { BluetoothTransport } from "./types.js";
import {
  COMMANDS,
  HANDSHAKE_CHALLENGE,
  HANDSHAKE_OK,
  bytesEqual,
  parseResponse
} from "./protocol.js";
import { WebBluetoothTransport } from "./transports/web-transport.js";

export class Z407 {
  private transport: BluetoothTransport;
  private events = new Map<string, Array<(data: any) => void>>();

  constructor(transport?: BluetoothTransport) {
    if (transport) {
      this.transport = transport;
    } else {
      if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.bluetooth) {
        this.transport = new WebBluetoothTransport();
      } else {
        throw new Error(
          "No Bluetooth transport was provided, and Web Bluetooth is not available in this environment. " +
          "Please instantiate Z407 with a specific transport (e.g. new Z407(new NodeBleTransport()))."
        );
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Event System                                                        */
  /* ------------------------------------------------------------------ */

  on(event: string, callback: (data: any) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    for (const callback of callbacks) {
      callback(data);
    }
  }

  /* ------------------------------------------------------------------ */

  get connected(): boolean {
    return this.transport.connected;
  }

  async connect(): Promise<void> {
    this.transport.onDisconnected(() => this.emit("disconnected"));
    
    await this.transport.connect();
    
    await this.transport.startNotifications((bytes) => this.handleNotification(bytes));

    await this.send(COMMANDS.HANDSHAKE);
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  async send(bytes: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new Error("Speaker not connected.");
    }
    await this.transport.send(bytes);
  }

  /* ------------------------------------------------------------------ */
  /* Commands                                                            */
  /* ------------------------------------------------------------------ */

  volumeUp(): Promise<void> {
    return this.send(COMMANDS.VOLUME_UP);
  }

  volumeDown(): Promise<void> {
    return this.send(COMMANDS.VOLUME_DOWN);
  }

  mute(): Promise<void> {
    return this.send(COMMANDS.MUTE);
  }

  bluetooth(): Promise<void> {
    return this.send(COMMANDS.INPUT_BLUETOOTH);
  }

  aux(): Promise<void> {
    return this.send(COMMANDS.INPUT_AUX);
  }

  usb(): Promise<void> {
    return this.send(COMMANDS.INPUT_USB);
  }

  bluetoothPair(): Promise<void> {
    return this.send(COMMANDS.BLUETOOTH_PAIR);
  }

  factoryReset(): Promise<void> {
    return this.send(COMMANDS.FACTORY_RESET);
  }

  /* ------------------------------------------------------------------ */

  async getBattery(): Promise<number | null> {
    if (this.transport.getBattery) {
      return this.transport.getBattery();
    }
    return null;
  }

  /* ------------------------------------------------------------------ */

  private async handleNotification(bytes: Uint8Array): Promise<void> {
    const parsed = parseResponse(bytes);
    this.emit("notification", parsed);

    if (bytesEqual(bytes, HANDSHAKE_CHALLENGE)) {
      await this.send(COMMANDS.HANDSHAKE_ACK);
      return;
    }

    if (bytesEqual(bytes, HANDSHAKE_OK)) {
      this.emit("connected");
      return;
    }
  }
}
