import { Z407Response } from "./types.js";

export const SERVICE_UUID = "0000fdc2-0000-1000-8000-00805f9b34fb";
export const COMMAND_UUID = "c2e758b9-0e78-4395-8854-1234567890ab";
export const RESPONSE_UUID = "b84ac9c6-29c5-4089-8d69-3224719000ab";
export const BATTERY_SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb";
export const BATTERY_LEVEL_UUID = "00002a19-0000-1000-8000-00805f9b34fb";

export const COMMANDS = Object.freeze({
    HANDSHAKE: Uint8Array.from([0x84, 0x05]),
    HANDSHAKE_ACK: Uint8Array.from([0x84, 0x00]),

    VOLUME_UP: Uint8Array.from([0x80, 0x02]),
    VOLUME_DOWN: Uint8Array.from([0x80, 0x03]),
    MUTE: Uint8Array.from([0x80, 0x04]),

    INPUT_BLUETOOTH: Uint8Array.from([0x81, 0x01]),
    INPUT_AUX: Uint8Array.from([0x81, 0x02]),
    INPUT_USB: Uint8Array.from([0x81, 0x03]),

    BLUETOOTH_PAIR: Uint8Array.from([0x82, 0x00]),
    FACTORY_RESET: Uint8Array.from([0x83, 0x00]),
});

export const HANDSHAKE_CHALLENGE = Uint8Array.from([0xd4, 0x05, 0x01]);
export const HANDSHAKE_OK = Uint8Array.from([0xd4, 0x00, 0x01]);

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
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

export function bytesToHex(bytes: Uint8Array): string {
    return [...bytes]
        .map(b => b.toString(16).padStart(2, "0"))
        .join(" ");
}

export function parseResponse(bytes: Uint8Array): Z407Response {
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
