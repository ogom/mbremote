import assert from "node:assert/strict";
import test from "node:test";

import {
  isLikelyMicrobit,
  microbitUsbSerialForPort,
} from "../src/serial.js";

test("recognizes the micro:bit DAPLink vendor ID", () => {
  assert.equal(
    isLikelyMicrobit({ path: "/dev/ttyACM0", vendorId: "0D28" }),
    true
  );
});

test("recognizes DAPLink micro:bit serial numbers on macOS", () => {
  assert.equal(
    isLikelyMicrobit({
      path: "/dev/tty.usbmodem102",
      manufacturer: "Arm",
      serialNumber: "99063602000528206f8eb46bd7a8a42b000000006e052820",
    }),
    true
  );
});

test("does not identify unrelated serial ports", () => {
  assert.equal(
    isLikelyMicrobit({ path: "/dev/tty.Bluetooth-Incoming-Port" }),
    false
  );
});

test("resolves a micro:bit USB serial number from an explicit port", () => {
  const serialNumber = microbitUsbSerialForPort("/dev/tty.usbmodem102", [
    {
      path: "/dev/tty.usbmodem102",
      vendorId: "0D28",
      serialNumber: "9906-device-a",
    },
    {
      path: "/dev/tty.usbmodem11202",
      vendorId: "0D28",
      serialNumber: "9906-device-b",
    },
  ]);
  assert.equal(serialNumber, "9906-device-a");
});

test("matches macOS cu and tty paths for the same micro:bit", () => {
  const serialNumber = microbitUsbSerialForPort("/dev/cu.usbmodem102", [
    {
      path: "/dev/tty.usbmodem102",
      vendorId: "0D28",
      serialNumber: "9906-device-a",
    },
  ]);
  assert.equal(serialNumber, "9906-device-a");
});

test("rejects an unknown explicit port instead of selecting another board", () => {
  assert.throws(
    () =>
      microbitUsbSerialForPort("/dev/tty.usbmodem999", [
        {
          path: "/dev/tty.usbmodem102",
          vendorId: "0D28",
          serialNumber: "9906-device-a",
        },
      ]),
    /serial port not found/
  );
});
