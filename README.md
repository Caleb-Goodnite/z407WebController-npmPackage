# z407-web

A cross-platform TypeScript library for controlling Logitech Z407 speakers over Bluetooth Low Energy (BLE).

Supports both Web Bluetooth in modern browsers and Node.js applications.

## Features

- Web Bluetooth support
- Node.js support
- Volume control
- Mute
- Input switching (Bluetooth, AUX, and USB)
- Battery level monitoring
- Automatic Logitech BLE handshake
- TypeScript support

## Overview

The Logitech Z407 speakers include a wireless control dial that communicates using a proprietary Bluetooth Low Energy (BLE) protocol. This library implements that protocol, allowing applications to control the speakers without using the physical control dial.

With `z407-web`, you can:

- Adjust volume
- Toggle mute
- Switch audio inputs
- Read the control dial's battery level
- Trigger Bluetooth pairing mode
- Perform a factory reset
- Build custom interfaces using JavaScript or TypeScript

## Use Cases

This library is intended for developers building applications around the Logitech Z407, including:

- Desktop applications (Electron, Tauri, etc.)
- Web-based remote controls
- Home Assistant integrations
- Node-RED flows
- Command-line utilities
- Automation scripts

## Compatibility

### Browsers

Uses the Web Bluetooth API.

Supported browsers include:

- Google Chrome
- Microsoft Edge
- Opera

Requirements:

- HTTPS or `localhost`
- A user gesture (such as clicking a button) before connecting

Firefox and Safari do not currently support Web Bluetooth.

### Node.js

Node.js support is provided through `@abandonware/noble`.

Platform-specific Bluetooth requirements apply:

- Linux: BlueZ
- macOS: Bluetooth permissions
- Windows: Compatible Bluetooth adapter and drivers

## Installation

Install the library:

```bash
npm install z407-web
```

or

```bash
pnpm add z407-web
```

or

```bash
yarn add z407-web
```

### Node.js

If you're using Node.js, install the peer dependency:

```bash
npm install @abandonware/noble
```

## Browser Example

```ts
import { Z407 } from "z407-web";

const speaker = new Z407();

speaker.on("connected", () => {
    console.log("Connected");
});

speaker.on("disconnected", () => {
    console.log("Disconnected");
});

document.getElementById("connect")!.addEventListener("click", async () => {
    await speaker.connect();
});

document.getElementById("volume-up")!.addEventListener("click", () => {
    speaker.volumeUp();
});

document.getElementById("volume-down")!.addEventListener("click", () => {
    speaker.volumeDown();
});
```

## Node.js Example

```ts
import { NodeBleTransport, Z407 } from "z407-web";

const transport = new NodeBleTransport({
    timeout: 10000
});

const speaker = new Z407(transport);

await speaker.connect();

await speaker.volumeUp();

await speaker.disconnect();
```

## API

### `Z407`

Creates a controller for a Logitech Z407 speaker.

```ts
new Z407(transport?)
```

If no transport is supplied, the library automatically attempts to use the browser's Web Bluetooth API.

### Properties

| Property | Description |
|----------|-------------|
| `connected` | Whether the speaker is connected and the handshake has completed. |

### Methods

| Method | Description |
|---------|-------------|
| `connect()` | Connect to the speaker. |
| `disconnect()` | Disconnect from the speaker. |
| `volumeUp()` | Increase volume. |
| `volumeDown()` | Decrease volume. |
| `mute()` | Toggle mute. |
| `bluetooth()` | Switch to Bluetooth input. |
| `aux()` | Switch to AUX input. |
| `usb()` | Switch to USB input. |
| `bluetoothPair()` | Enter Bluetooth pairing mode. |
| `factoryReset()` | Reset the speaker to factory defaults. |
| `getBattery()` | Read the remote control battery percentage. |

### Events

| Event | Description |
|-------|-------------|
| `connected` | Connection and handshake completed. |
| `disconnected` | Bluetooth connection closed. |
| `notification` | Raw BLE notification received. |

## Known Hardware Behavior

The Logitech Z407 may stop advertising its proprietary BLE control service while actively connected for Bluetooth audio (A2DP).

If your application cannot discover the required GATT services, disconnect any active Bluetooth audio connection before attempting to connect over BLE.

## Disclaimer

This project is an independent implementation of Logitech's proprietary BLE protocol developed through reverse engineering of the Logitech Z407 control dial.

This project is not affiliated with, endorsed by, or sponsored by Logitech.

## License

MIT