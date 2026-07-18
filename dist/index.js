// src/protocol.ts
var SERVICE_UUID = "0000fdc2-0000-1000-8000-00805f9b34fb";
var COMMAND_UUID = "c2e758b9-0e78-4395-8854-1234567890ab";
var RESPONSE_UUID = "b84ac9c6-29c5-4089-8d69-3224719000ab";
var BATTERY_SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb";
var BATTERY_LEVEL_UUID = "00002a19-0000-1000-8000-00805f9b34fb";
var COMMANDS = Object.freeze({
  HANDSHAKE: Uint8Array.from([132, 5]),
  HANDSHAKE_ACK: Uint8Array.from([132, 0]),
  VOLUME_UP: Uint8Array.from([128, 2]),
  VOLUME_DOWN: Uint8Array.from([128, 3]),
  MUTE: Uint8Array.from([128, 4]),
  INPUT_BLUETOOTH: Uint8Array.from([129, 1]),
  INPUT_AUX: Uint8Array.from([129, 2]),
  INPUT_USB: Uint8Array.from([129, 3]),
  BLUETOOTH_PAIR: Uint8Array.from([130, 0]),
  FACTORY_RESET: Uint8Array.from([131, 0])
});
var HANDSHAKE_CHALLENGE = Uint8Array.from([212, 5, 1]);
var HANDSHAKE_OK = Uint8Array.from([212, 0, 1]);
function bytesEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(" ");
}
function parseResponse(bytes) {
  if (bytesEqual(bytes, HANDSHAKE_CHALLENGE)) {
    return {
      type: "handshake_challenge",
      connected: false,
      raw: bytes
    };
  }
  if (bytesEqual(bytes, HANDSHAKE_OK)) {
    return {
      type: "handshake_ok",
      connected: true,
      raw: bytes
    };
  }
  return {
    type: "notification",
    connected: null,
    raw: bytes
  };
}

// src/transports/web-transport.ts
var WebBluetoothTransport = class {
  device = null;
  server = null;
  commandChar = null;
  responseChar = null;
  batteryChar = null;
  disconnectCallback = null;
  get connected() {
    return this.device?.gatt?.connected ?? false;
  }
  async connect() {
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
      this.batteryChar = null;
    }
  }
  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }
  async send(bytes) {
    if (!this.commandChar) {
      throw new Error("Not connected to Z407.");
    }
    await this.commandChar.writeValueWithoutResponse(bytes);
  }
  async startNotifications(callback) {
    if (!this.responseChar) {
      throw new Error("Not connected to Z407.");
    }
    await this.responseChar.startNotifications();
    this.responseChar.addEventListener("characteristicvaluechanged", (event) => {
      const target = event.target;
      if (target.value) {
        const bytes = new Uint8Array(target.value.buffer);
        callback(bytes);
      }
    });
  }
  async getBattery() {
    if (!this.batteryChar) {
      return null;
    }
    const dataView = await this.batteryChar.readValue();
    return dataView.getUint8(0);
  }
  onDisconnected(callback) {
    this.disconnectCallback = callback;
  }
};

// src/z407.ts
var Z407 = class {
  transport;
  events = /* @__PURE__ */ new Map();
  constructor(transport) {
    if (transport) {
      this.transport = transport;
    } else {
      if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.bluetooth) {
        this.transport = new WebBluetoothTransport();
      } else {
        throw new Error(
          "No Bluetooth transport was provided, and Web Bluetooth is not available in this environment. Please instantiate Z407 with a specific transport (e.g. new Z407(new NodeBleTransport()))."
        );
      }
    }
  }
  /* ------------------------------------------------------------------ */
  /* Event System                                                        */
  /* ------------------------------------------------------------------ */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }
  emit(event, data) {
    const callbacks = this.events.get(event);
    if (!callbacks) return;
    for (const callback of callbacks) {
      callback(data);
    }
  }
  /* ------------------------------------------------------------------ */
  get connected() {
    return this.transport.connected;
  }
  async connect() {
    this.transport.onDisconnected(() => this.emit("disconnected"));
    await this.transport.connect();
    await this.transport.startNotifications((bytes) => this.handleNotification(bytes));
    await this.send(COMMANDS.HANDSHAKE);
  }
  async disconnect() {
    await this.transport.disconnect();
  }
  async send(bytes) {
    if (!this.connected) {
      throw new Error("Speaker not connected.");
    }
    await this.transport.send(bytes);
  }
  /* ------------------------------------------------------------------ */
  /* Commands                                                            */
  /* ------------------------------------------------------------------ */
  volumeUp() {
    return this.send(COMMANDS.VOLUME_UP);
  }
  volumeDown() {
    return this.send(COMMANDS.VOLUME_DOWN);
  }
  mute() {
    return this.send(COMMANDS.MUTE);
  }
  bluetooth() {
    return this.send(COMMANDS.INPUT_BLUETOOTH);
  }
  aux() {
    return this.send(COMMANDS.INPUT_AUX);
  }
  usb() {
    return this.send(COMMANDS.INPUT_USB);
  }
  bluetoothPair() {
    return this.send(COMMANDS.BLUETOOTH_PAIR);
  }
  factoryReset() {
    return this.send(COMMANDS.FACTORY_RESET);
  }
  /* ------------------------------------------------------------------ */
  async getBattery() {
    if (this.transport.getBattery) {
      return this.transport.getBattery();
    }
    return null;
  }
  /* ------------------------------------------------------------------ */
  async handleNotification(bytes) {
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
};

// src/transports/node-transport.ts
var NodeBleTransport = class {
  options;
  noble = null;
  peripheral = null;
  commandChar = null;
  responseChar = null;
  batteryChar = null;
  disconnectCallback = null;
  _connected = false;
  constructor(options = {}) {
    this.options = options;
  }
  get connected() {
    return this._connected;
  }
  async loadNoble() {
    if (this.noble) return this.noble;
    try {
      const nobleModule = await import("@abandonware/noble");
      this.noble = nobleModule.default || nobleModule;
      return this.noble;
    } catch (err) {
      throw new Error(
        "To use Z407 in Node.js, you must install '@abandonware/noble' as a dependency.\nRun: pnpm install @abandonware/noble"
      );
    }
  }
  async connect() {
    const noble = await this.loadNoble();
    const serviceUuidNoble = SERVICE_UUID.replace(/-/g, "").toLowerCase();
    const batteryServiceUuidNoble = BATTERY_SERVICE_UUID.replace(/-/g, "").toLowerCase();
    const commandUuidNoble = COMMAND_UUID.replace(/-/g, "").toLowerCase();
    const responseUuidNoble = RESPONSE_UUID.replace(/-/g, "").toLowerCase();
    const batteryLevelUuidNoble = BATTERY_LEVEL_UUID.replace(/-/g, "").toLowerCase();
    if (noble.state !== "poweredOn") {
      await new Promise((resolve, reject) => {
        const stateHandler = (state) => {
          if (state === "poweredOn") {
            noble.off("stateChange", stateHandler);
            resolve();
          }
        };
        noble.on("stateChange", stateHandler);
        setTimeout(() => {
          noble.off("stateChange", stateHandler);
          reject(new Error("Bluetooth adapter state check timed out (not poweredOn)"));
        }, 5e3);
      });
    }
    this.peripheral = await new Promise((resolve, reject) => {
      let found = false;
      const timeoutMs = this.options.timeout ?? 1e4;
      const discoverHandler = (peripheral) => {
        const match = !this.options.deviceId || peripheral.id === this.options.deviceId || peripheral.address === this.options.deviceId;
        if (match) {
          found = true;
          cleanup();
          resolve(peripheral);
        }
      };
      const cleanup = () => {
        noble.off("discover", discoverHandler);
        noble.stopScanning(() => {
        });
      };
      noble.on("discover", discoverHandler);
      noble.startScanning([serviceUuidNoble], false, (error) => {
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
    this.peripheral.once("disconnect", () => {
      this._connected = false;
      if (this.disconnectCallback) {
        this.disconnectCallback();
      }
    });
    await this.peripheral.connectAsync();
    this._connected = true;
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
  async disconnect() {
    if (this.peripheral && this._connected) {
      await this.peripheral.disconnectAsync();
    }
  }
  async send(bytes) {
    if (!this.commandChar) {
      throw new Error("Not connected to Z407.");
    }
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    await this.commandChar.writeAsync(buffer, true);
  }
  async startNotifications(callback) {
    if (!this.responseChar) {
      throw new Error("Not connected to Z407.");
    }
    await this.responseChar.subscribeAsync();
    this.responseChar.on("data", (data) => {
      callback(new Uint8Array(data.buffer, data.byteOffset, data.length));
    });
  }
  async getBattery() {
    if (!this.batteryChar) {
      return null;
    }
    const data = await this.batteryChar.readAsync();
    if (data && data.length > 0) {
      return data[0];
    }
    return null;
  }
  onDisconnected(callback) {
    this.disconnectCallback = callback;
  }
};
export {
  BATTERY_LEVEL_UUID,
  BATTERY_SERVICE_UUID,
  COMMANDS,
  COMMAND_UUID,
  HANDSHAKE_CHALLENGE,
  HANDSHAKE_OK,
  NodeBleTransport,
  RESPONSE_UUID,
  SERVICE_UUID,
  WebBluetoothTransport,
  Z407,
  bytesEqual,
  bytesToHex,
  parseResponse
};
//# sourceMappingURL=index.js.map