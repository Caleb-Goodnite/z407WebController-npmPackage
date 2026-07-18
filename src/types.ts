export interface Z407Response {
  type: "handshake_challenge" | "handshake_ok" | "notification";
  connected: boolean | null;
  raw: Uint8Array;
}

export interface BluetoothTransport {
  readonly connected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(bytes: Uint8Array): Promise<void>;
  startNotifications(callback: (bytes: Uint8Array) => void): Promise<void>;
  getBattery?(): Promise<number | null>;
  onDisconnected(callback: () => void): void;
}