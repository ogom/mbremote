import assert from "node:assert/strict";
import test from "node:test";

import {
  createProgressReporter,
  createWebUsbOptions,
  findWebUsbMicrobitSerialNumbers,
  flashHexDirectAll,
} from "../src/direct-flash.js";

test("reports flash stages without flooding progress output", () => {
  const messages = [];
  const progress = createProgressReporter((message) => messages.push(message));

  progress("Initializing");
  progress("PartialFlashing", 0);
  progress("PartialFlashing", 0.04);
  progress("PartialFlashing", 0.1);
  progress("PartialFlashing", 1);

  assert.deepEqual(messages, [
    "flash: initializing USB",
    "flash: partial flash 0%",
    "flash: partial flash 10%",
    "flash: partial flash 100%",
  ]);
});

test("restricts DAPLink USB selection to the serial number for --port", async () => {
  const options = createWebUsbOptions("device-a");
  const devices = [
    { serialNumber: "device-b" },
    { serialNumber: "device-a" },
  ];
  assert.deepEqual(options.allowedDevices, [
    {
      vendorId: 0x0d28,
      productId: 0x0204,
      serialNumber: "device-a",
    },
  ]);
  assert.equal(await options.devicesFound(devices), devices[1]);
  assert.equal(await options.devicesFound([devices[0]]), undefined);
});

test("finds all unique DAPLink USB micro:bit serial numbers", async () => {
  const webUsb = {
    getDevices: async () => [
      { vendorId: 0x0d28, productId: 0x0204, serialNumber: "device-a" },
      { vendorId: 0x0d28, productId: 0x0204, serialNumber: "device-b" },
      { vendorId: 0x0d28, productId: 0x0204, serialNumber: "device-a" },
      { vendorId: 0x1234, productId: 0x0204, serialNumber: "other" },
    ],
  };

  assert.deepEqual(await findWebUsbMicrobitSerialNumbers(webUsb), [
    "device-a",
    "device-b",
  ]);
});

test("flashes all DAPLink USB micro:bits sequentially", async () => {
  const calls = [];
  const flash = async (hexPath, options) => {
    calls.push({ hexPath, options });
    return { serialNumber: options.serialNumber };
  };

  await flashHexDirectAll("firmware.hex", {
    partial: false,
    serialNumbers: ["device-a", "device-b"],
    log: () => undefined,
    flash,
  });

  assert.deepEqual(
    calls.map(({ hexPath, options }) => ({
      hexPath,
      partial: options.partial,
      serialNumber: options.serialNumber,
    })),
    [
      { hexPath: "firmware.hex", partial: false, serialNumber: "device-a" },
      { hexPath: "firmware.hex", partial: false, serialNumber: "device-b" },
    ]
  );
});

test("requires at least two DAPLink USB micro:bits for --all", async () => {
  await assert.rejects(
    flashHexDirectAll("firmware.hex", { serialNumbers: ["device-a"] }),
    /two or more DAPLink USB micro:bits.*--all/
  );
});
