import { SerialPort } from "serialport";

const MICROBIT_VENDOR_IDS = new Set(["0d28"]);

export async function listPorts() {
  return SerialPort.list();
}

export async function findMicrobitUsbSerial(explicitPort) {
  if (!explicitPort) return undefined;
  return microbitUsbSerialForPort(explicitPort, await listPorts());
}

export function microbitUsbSerialForPort(explicitPort, ports) {
  const selected = ports.find((port) => sameSerialPort(port.path, explicitPort));
  if (!selected) {
    throw new Error(`serial port not found: ${explicitPort}`);
  }
  if (!isLikelyMicrobit(selected)) {
    throw new Error(`serial port is not a micro:bit: ${explicitPort}`);
  }
  if (!selected.serialNumber) {
    throw new Error(
      `micro:bit serial number is unavailable for port: ${explicitPort}`
    );
  }
  return selected.serialNumber;
}

export function isLikelyMicrobit(port) {
  const haystack = [
    port.path,
    port.manufacturer,
    port.pnpId,
    port.friendlyName,
    port.serialNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    MICROBIT_VENDOR_IDS.has((port.vendorId || "").toLowerCase()) ||
    /^990[0-9a-f]/i.test(port.serialNumber || "") ||
    haystack.includes("micro:bit") ||
    haystack.includes("microbit") ||
    haystack.includes("daplink")
  );
}

function sameSerialPort(detected, explicit) {
  if (detected === explicit) return true;
  return normalizeSerialPort(detected) === normalizeSerialPort(explicit);
}

function normalizeSerialPort(port) {
  return port.replace(/^\/dev\/(?:cu|tty)\./, "/dev/serial.");
}

export async function findMicrobitPort(explicitPort) {
  if (explicitPort) {
    return explicitPort;
  }
  const ports = await listPorts();
  const matches = ports.filter(isLikelyMicrobit);
  if (matches.length === 1) {
    return matches[0].path;
  }
  if (matches.length > 1) {
    throw new Error(
      `multiple micro:bits found; use --port (${matches
        .map((p) => p.path)
        .join(", ")})`
    );
  }
  throw new Error(
    "micro:bit serial port not found; connect the board or use --port PORT"
  );
}

export async function waitForMicrobitPort({ port, timeout = 10000 } = {}) {
  if (port) {
    return port;
  }
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await findMicrobitPort();
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw (
    lastError || new Error("timed out waiting for the micro:bit serial port")
  );
}

export async function openPort(path, baudRate = 115200) {
  const port = new SerialPort({ path, baudRate, autoOpen: false });
  await new Promise((resolve, reject) =>
    port.open((error) => (error ? reject(error) : resolve()))
  );
  return port;
}

export async function interactiveSerial({
  path,
  baudRate = 115200,
  interrupt = false,
  input = process.stdin,
  output = process.stdout,
  log = console.error,
}) {
  const port = await openPort(path, baudRate);
  log(`connected: ${path} at ${baudRate} baud (Ctrl-] to exit)`);
  port.on("data", (data) => output.write(data));
  port.on("error", (error) => log(`serial error: ${error.message}`));
  if (interrupt) {
    port.write(Buffer.from([0x03]));
  }

  const wasRaw = Boolean(input.isRaw);
  if (input.isTTY && input.setRawMode) {
    input.setRawMode(true);
  }
  input.resume();

  return new Promise((resolve, reject) => {
    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      input.off("data", onInput);
      if (input.isTTY && input.setRawMode) {
        input.setRawMode(wasRaw);
      }
      input.pause();
      port.close((error) => (error ? reject(error) : resolve()));
    };
    const onInput = (data) => {
      const bytes = Buffer.from(data);
      const exitAt = bytes.indexOf(0x1d);
      if (exitAt >= 0) {
        if (exitAt > 0) port.write(bytes.subarray(0, exitAt));
        close();
      } else {
        port.write(bytes);
      }
    };
    input.on("data", onInput);
    port.on("close", () => {
      if (!closing) {
        closing = true;
        input.off("data", onInput);
        if (input.isTTY && input.setRawMode) input.setRawMode(wasRaw);
        input.pause();
        resolve();
      }
    });
  });
}

export async function remoteLs({ path, baudRate = 115200, timeout = 10000 }) {
  const port = await openPort(path, baudRate);
  let replReady = false;
  try {
    await enterFriendlyReplPrompt(port, timeout);
    replReady = true;
    const token = `MBREMOTE_${Date.now().toString(36).toUpperCase()}`;
    const endToken = `${token}_END`;
    const command = `print("${token}");print("\\n".join(__import__("os").listdir()));print("${endToken}")\r`;
    const output = await writeAndCollect(
      port,
      command,
      `\r\n${endToken}\r\n`,
      timeout
    );
    const lines = output.replaceAll("\r", "").split("\n");
    const start = lines.findIndex((line) => line.trim() === token);
    const end = lines.findIndex(
      (line, index) => index > start && line.trim() === endToken
    );
    if (start < 0 || end < 0) {
      throw new Error("unexpected response from the MicroPython REPL");
    }
    return lines.slice(start + 1, end).filter(Boolean);
  } finally {
    if (replReady && port.isOpen) {
      await writePort(port, Buffer.from([0x04])).catch(() => undefined);
    }
    await closePort(port);
  }
}

async function enterFriendlyReplPrompt(port, timeout) {
  await writeAndCollect(port, Buffer.from([0x03, 0x03, 0x0d]), ">>> ", timeout);
}

async function writeAndCollect(port, data, expected, timeout) {
  let output = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(`timed out waiting for the MicroPython REPL (${expected})`)
      );
    }, timeout);
    const onData = (chunk) => {
      output += chunk.toString("utf8");
      if (output.includes(expected)) {
        cleanup();
        resolve(output);
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      port.off("data", onData);
    };
    port.on("data", onData);
    port.write(data, (error) => {
      if (error) {
        cleanup();
        reject(error);
      }
    });
  });
}

async function closePort(port) {
  if (!port.isOpen) return;
  await new Promise((resolve) => port.close(() => resolve()));
}

async function writePort(port, data) {
  await new Promise((resolve, reject) =>
    port.write(data, (error) => (error ? reject(error) : resolve()))
  );
  await new Promise((resolve, reject) =>
    port.drain((error) => (error ? reject(error) : resolve()))
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
