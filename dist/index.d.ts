interface Z407Response {
    type: "handshake_challenge" | "handshake_ok" | "notification";
    connected: boolean | null;
    raw: Uint8Array;
}
interface BluetoothTransport {
    readonly connected: boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(bytes: Uint8Array): Promise<void>;
    startNotifications(callback: (bytes: Uint8Array) => void): Promise<void>;
    getBattery?(): Promise<number | null>;
    onDisconnected(callback: () => void): void;
}

declare class Z407 {
    private transport;
    private events;
    constructor(transport?: BluetoothTransport);
    on(event: string, callback: (data: any) => void): void;
    emit(event: string, data?: any): void;
    get connected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(bytes: Uint8Array): Promise<void>;
    volumeUp(): Promise<void>;
    volumeDown(): Promise<void>;
    mute(): Promise<void>;
    bluetooth(): Promise<void>;
    aux(): Promise<void>;
    usb(): Promise<void>;
    bluetoothPair(): Promise<void>;
    factoryReset(): Promise<void>;
    getBattery(): Promise<number | null>;
    private handleNotification;
}

declare const SERVICE_UUID = "0000fdc2-0000-1000-8000-00805f9b34fb";
declare const COMMAND_UUID = "c2e758b9-0e78-41e0-b0cb-98a593193fc5";
declare const RESPONSE_UUID = "b84ac9c6-29c5-46d4-bba1-9d534784330f";
declare const BATTERY_SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb";
declare const BATTERY_LEVEL_UUID = "00002a19-0000-1000-8000-00805f9b34fb";
declare const COMMANDS: Readonly<{
    HANDSHAKE: Uint8Array<ArrayBuffer>;
    HANDSHAKE_ACK: Uint8Array<ArrayBuffer>;
    VOLUME_UP: Uint8Array<ArrayBuffer>;
    VOLUME_DOWN: Uint8Array<ArrayBuffer>;
    MUTE: Uint8Array<ArrayBuffer>;
    INPUT_BLUETOOTH: Uint8Array<ArrayBuffer>;
    INPUT_AUX: Uint8Array<ArrayBuffer>;
    INPUT_USB: Uint8Array<ArrayBuffer>;
    BLUETOOTH_PAIR: Uint8Array<ArrayBuffer>;
    FACTORY_RESET: Uint8Array<ArrayBuffer>;
}>;
declare const HANDSHAKE_CHALLENGE: Uint8Array<ArrayBuffer>;
declare const HANDSHAKE_OK: Uint8Array<ArrayBuffer>;
declare function bytesEqual(a: Uint8Array, b: Uint8Array): boolean;
declare function bytesToHex(bytes: Uint8Array): string;
declare function parseResponse(bytes: Uint8Array): Z407Response;

declare class WebBluetoothTransport implements BluetoothTransport {
    private device;
    private server;
    private commandChar;
    private responseChar;
    private batteryChar;
    private disconnectCallback;
    get connected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(bytes: Uint8Array): Promise<void>;
    startNotifications(callback: (bytes: Uint8Array) => void): Promise<void>;
    getBattery(): Promise<number | null>;
    onDisconnected(callback: () => void): void;
}

interface NodeBleTransportOptions {
    /** Optional peripheral ID or MAC address to connect to directly */
    deviceId?: string;
    /** Timeout in milliseconds for device discovery, default is 10000ms */
    timeout?: number;
}
declare class NodeBleTransport implements BluetoothTransport {
    private options;
    private noble;
    private peripheral;
    private commandChar;
    private responseChar;
    private batteryChar;
    private disconnectCallback;
    private _connected;
    constructor(options?: NodeBleTransportOptions);
    get connected(): boolean;
    private loadNoble;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(bytes: Uint8Array): Promise<void>;
    startNotifications(callback: (bytes: Uint8Array) => void): Promise<void>;
    getBattery(): Promise<number | null>;
    onDisconnected(callback: () => void): void;
}

export { BATTERY_LEVEL_UUID, BATTERY_SERVICE_UUID, type BluetoothTransport, COMMANDS, COMMAND_UUID, HANDSHAKE_CHALLENGE, HANDSHAKE_OK, NodeBleTransport, RESPONSE_UUID, SERVICE_UUID, WebBluetoothTransport, Z407, type Z407Response, bytesEqual, bytesToHex, parseResponse };
