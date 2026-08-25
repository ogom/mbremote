import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  isLikelyMicrobit,
  microbitPortForPath,
  microbitPortPaths,
  microbitUsbSerialForPort,
  remoteLs,
  remoteReset,
  remoteWriteFile,
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

test("lists each detected micro:bit port on its own sorted line", () => {
  assert.deepEqual(
    microbitPortPaths([
      { path: "/dev/cu.usbmodem2101", vendorId: "0D28" },
      { path: "/dev/tty.Bluetooth-Incoming-Port" },
      { path: "/dev/cu.usbmodem1101", serialNumber: "9906-device-a" },
    ]),
    ["/dev/cu.usbmodem1101", "/dev/cu.usbmodem2101"]
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

test("validates an explicit serial port as a micro:bit", () => {
  assert.equal(
    microbitPortForPath("/dev/cu.usbmodem102", [
      { path: "/dev/tty.usbmodem102", vendorId: "0D28" },
    ]),
    "/dev/cu.usbmodem102"
  );
  assert.throws(
    () => microbitPortForPath("/dev/tty.other", [{ path: "/dev/tty.other" }]),
    /not a micro:bit/
  );
});

test("uses MicroPython-compatible filesystem protocol and soft-reset bytes", async () => {
  const port = new FakeReplPort();
  const open = async () => port;
  const files = await remoteLs({ path: "/dev/test", open });
  assert.deepEqual(files, ["main.py", "message.txt"]);
  assert.match(port.commands.join("\n"), /os\.listdir\(\)/);
  assert.doesNotMatch(port.commands.join("\n"), /ubinascii/);

  const upload = new FakeReplPort();
  await remoteWriteFile({
    path: "/dev/test",
    remotePath: "data.bin",
    data: Buffer.from([0, 255, 7]),
    open: async () => upload,
  });
  assert.match(upload.commands.join("\n"), /bytes\(\[0,255,7\]\)/);
  assert.doesNotMatch(upload.commands.join("\n"), /ubinascii/);

  const reset = new FakeReplPort();
  await remoteReset({ path: "/dev/test", open: async () => reset });
  assert.deepEqual(reset.writes[0], Buffer.from([0x03, 0x03, 0x0d]));
  assert.deepEqual(reset.writes[1], Buffer.from([0x04]));
});

class FakeReplPort extends EventEmitter {
  constructor() {
    super();
    this.isOpen = true;
    this.writes = [];
    this.commands = [];
  }

  write(data, callback) {
    const bytes = Buffer.from(data);
    this.writes.push(bytes);
    if (bytes.equals(Buffer.from([0x03, 0x03, 0x0d]))) {
      this.emit("data", Buffer.from(">>> "));
    } else if (!Buffer.isBuffer(data)) {
      this.commands.push(data);
      const [, start, encodedCode, end] = data.match(
        /print\("(_MB[^\"]+)"\);exec\((.+)\);print\("(_MB[^\"]+)"\)/
      );
      const code = JSON.parse(encodedCode);
      const output = code.includes("os.listdir") ? "main.py\nmessage.txt" : "";
      this.emit("data", Buffer.from(`${start}\r\n${output}\r\n${end}\r\n>>> `));
    }
    callback?.();
  }

  drain(callback) {
    callback?.();
  }

  close(callback) {
    this.isOpen = false;
    callback?.();
  }
}
