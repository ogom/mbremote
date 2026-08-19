import fs from "node:fs/promises";
import path from "node:path";

import {
  createUSBConnection,
  DeviceSelectionMode,
} from "@microbit/microbit-connection/usb";
import { createUniversalHexFlashDataSource } from "@microbit/microbit-connection/universal-hex";
import { WebUSB } from "usb";

const STAGE_LABELS = {
  Initializing: "initializing USB",
  FindingDevice: "finding micro:bit",
  Connecting: "connecting",
  PartialFlashing: "partial flash",
  FullFlashing: "full flash",
};

export async function flashHexDirect(
  hexPath,
  { partial = true, port, serialNumber, log = console.log } = {}
) {
  const source = path.resolve(hexPath);
  const universalHex = await fs.readFile(source, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`HEX file does not exist: ${source}`);
    }
    throw error;
  });

  const restoreUsb = installNodeWebUsb(serialNumber);
  const connection = createUSBConnection({
    deviceSelectionMode: DeviceSelectionMode.UseAnyAllowed,
    pauseOnHidden: false,
    logging: {
      event: () => undefined,
      error: () => undefined,
      log: () => undefined,
    },
  });
  const progress = createProgressReporter(log);

  try {
    await connection.initialize();
    await connection.connect({ progress });
    const connectedDevice = connection.getDevice();
    if (
      serialNumber &&
      connectedDevice?.serialNumber?.toLowerCase() !== serialNumber.toLowerCase()
    ) {
      throw new Error(`connected DAPLink USB device does not match port: ${port}`);
    }
    const board = connection.getBoardVersion();
    const targetName = port || serialNumber;
    const target = targetName ? ` (${targetName})` : "";
    log(`flash: ${source} -> micro:bit ${board}${target}`);
    await connection.flash(createUniversalHexFlashDataSource(universalHex), {
      partial,
      progress,
      minimumProgressIncrement: 0.05,
    });
    log(
      `flashed: ${partial ? "partial/full automatic" : "full"} flash complete`
    );
    return { board, transport: "webusb" };
  } catch (error) {
    throw directFlashError(error, port);
  } finally {
    try {
      await connection.disconnect();
    } catch {
      // libusb releases claimed interfaces when the process exits. Do not
      // replace a useful flash error with a cleanup error.
    }
    connection.dispose();
    restoreUsb();
  }
}

export async function flashHexDirectAll(
  hexPath,
  {
    partial = true,
    log = console.log,
    serialNumbers,
    flash = flashHexDirect,
  } = {}
) {
  const targets = serialNumbers || (await findWebUsbMicrobitSerialNumbers());
  if (targets.length < 2) {
    throw new Error("two or more DAPLink USB micro:bits are required for --all");
  }

  const results = [];
  for (const serialNumber of targets) {
    results.push(await flash(hexPath, { partial, serialNumber, log }));
  }
  return results;
}

export async function findWebUsbMicrobitSerialNumbers(
  webUsb = new WebUSB({ allowAllDevices: true })
) {
  const devices = await webUsb.getDevices();
  return [
    ...new Set(
      devices
        .filter(
          (device) =>
            device.vendorId === 0x0d28 && device.productId === 0x0204
        )
        .map((device) => device.serialNumber)
        .filter(Boolean)
    ),
  ];
}

export function createProgressReporter(log) {
  let previousStage;
  let previousPercent = -1;

  return (stage, progress) => {
    const label = STAGE_LABELS[stage] || stage;
    if (typeof progress !== "number") {
      if (stage !== previousStage) {
        log(`flash: ${label}`);
      }
      previousStage = stage;
      previousPercent = -1;
      return;
    }

    const percent = Math.round(progress * 100);
    if (
      stage !== previousStage ||
      percent >= previousPercent + 10 ||
      percent === 100
    ) {
      log(`flash: ${label} ${percent}%`);
      previousStage = stage;
      previousPercent = percent;
    }
  };
}

function installNodeWebUsb(serialNumber) {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  );
  const createdNavigator = !globalThis.navigator;
  if (createdNavigator) {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
  }
  const usbDescriptor = Object.getOwnPropertyDescriptor(
    globalThis.navigator,
    "usb"
  );
  Object.defineProperty(globalThis.navigator, "usb", {
    configurable: true,
    value: new WebUSB(createWebUsbOptions(serialNumber)),
  });

  return () => {
    if (usbDescriptor) {
      Object.defineProperty(globalThis.navigator, "usb", usbDescriptor);
    } else {
      delete globalThis.navigator.usb;
    }
    if (createdNavigator) {
      if (navigatorDescriptor) {
        Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
      } else {
        delete globalThis.navigator;
      }
    }
  };
}

export function createWebUsbOptions(serialNumber) {
  if (!serialNumber) {
    return { allowAllDevices: true };
  }
  const matchesSerial = (device) =>
    device.serialNumber?.toLowerCase() === serialNumber.toLowerCase();
  return {
    allowedDevices: [
      {
        vendorId: 0x0d28,
        productId: 0x0204,
        serialNumber,
      },
    ],
    devicesFound: async (devices) => devices.find(matchesSerial),
  };
}

function directFlashError(error, port) {
  if (!(error instanceof Error)) {
    return new Error(`DAPLink USB flash failed: ${String(error)}`);
  }
  if (error.code === "no-device-selected") {
    if (port) {
      return new Error(`micro:bit DAPLink USB device not found for port: ${port}`);
    }
    return new Error(
      "micro:bit DAPLink USB device not found; connect it or use --mass-storage"
    );
  }
  if (error.code === "device-in-use") {
    return new Error(
      "micro:bit is in use by another application; close Python Editor or use --mass-storage"
    );
  }
  return new Error(`DAPLink USB flash failed: ${error.message}`, { cause: error });
}
