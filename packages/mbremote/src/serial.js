import { SerialPort } from "serialport";

const MICROBIT_VENDOR_IDS = new Set(["0d28"]);

export async function listPorts() {
  return SerialPort.list();
}

export function microbitPortPaths(ports) {
  return ports
    .filter(isLikelyMicrobit)
    .map((port) => port.path)
    .sort((left, right) => left.localeCompare(right));
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

export function microbitPortForPath(explicitPort, ports) {
  const selected = ports.find((port) => sameSerialPort(port.path, explicitPort));
  if (!selected) {
    throw new Error(`serial port not found: ${explicitPort}`);
  }
  if (!isLikelyMicrobit(selected)) {
    throw new Error(`serial port is not a micro:bit: ${explicitPort}`);
  }
  return explicitPort;
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
  const ports = await listPorts();
  if (explicitPort) {
    return microbitPortForPath(explicitPort, ports);
  }
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
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await findMicrobitPort(port);
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
  const onData = (data) => output.write(data);
  port.on("data", onData);
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
    let failure;
    const cleanup = () => {
      input.off("data", onInput);
      port.off("data", onData);
      port.off("error", onError);
      port.off("close", onClose);
      if (input.isTTY && input.setRawMode) {
        input.setRawMode(wasRaw);
      }
      input.pause();
    };
    const finish = (error) => {
      if (closing) return;
      closing = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const close = () => {
      if (closing) return;
      closing = true;
      cleanup();
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
    const onError = (error) => {
      log(`serial error: ${error.message}`);
      failure = error;
      if (!closing) {
        closing = true;
        cleanup();
        port.close(() => reject(error));
      }
    };
    const onClose = () => {
      if (!closing) finish(failure);
    };
    input.on("data", onInput);
    port.on("error", onError);
    port.on("close", onClose);
  });
}

export async function remoteLs({
  path,
  baudRate = 115200,
  timeout = 10000,
  open = openPort,
}) {
  return withFriendlyRepl({ path, baudRate, timeout, open }, async (execute) => {
    const output = await execute('import os\nprint("\\n".join(os.listdir()))');
    return output.filter(Boolean);
  });
}

export async function remoteExec({
  path,
  code,
  baudRate = 115200,
  timeout = 10000,
  open = openPort,
}) {
  return withFriendlyRepl({ path, baudRate, timeout, open }, async (execute) =>
    (await execute(code)).join("\n")
  );
}

export async function remoteReset({
  path,
  baudRate = 115200,
  timeout = 10000,
  open = openPort,
}) {
  const port = await open(path, baudRate);
  try {
    await enterFriendlyReplPrompt(port, timeout);
    await writePort(port, Buffer.from([0x04]));
  } finally {
    await closePort(port);
  }
}

export async function remoteCat({
  path,
  remotePath,
  baudRate = 115200,
  timeout = 10000,
  open = openPort,
}) {
  return withFriendlyRepl({ path, baudRate, timeout, open }, async (execute) => {
    await execute(`_mb_f=open(${pythonString(remotePath)},"rb")`);
    const chunks = [];
    while (true) {
      const lines = await execute(`_mb_d=_mb_f.read(32)\nprint(list(_mb_d))`);
      let values;
      try {
        values = JSON.parse(lines.join(""));
      } catch {
        throw new Error("unexpected file data from the MicroPython REPL");
      }
      if (
        !Array.isArray(values) ||
        values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
      ) {
        throw new Error("unexpected file data from the MicroPython REPL");
      }
      if (values.length === 0) break;
      chunks.push(Buffer.from(values));
    }
    await execute("_mb_f.close()\ndel _mb_f");
    return Buffer.concat(chunks);
  });
}

export async function remoteWriteFile({
  path,
  remotePath,
  data,
  baudRate = 115200,
  timeout = 10000,
  open = openPort,
}) {
  return withFriendlyRepl({ path, baudRate, timeout, open }, async (execute) => {
    await execute(`_mb_f=open(${pythonString(remotePath)},"wb")`);
    for (let offset = 0; offset < data.length; offset += 32) {
      const values = [...data.subarray(offset, offset + 32)].join(",");
      await execute(`_mb_f.write(bytes([${values}]))`);
    }
    await execute("_mb_f.close()\ndel _mb_f");
  });
}

export async function remoteRm({
  path,
  remotePath,
  baudRate = 115200,
  timeout = 10000,
  open = openPort,
}) {
  return withFriendlyRepl({ path, baudRate, timeout, open }, (execute) =>
    execute(`__import__("os").remove(${pythonString(remotePath)})`)
  );
}

async function withFriendlyRepl(
  { path, baudRate = 115200, timeout = 10000, open = openPort },
  callback
) {
  const port = await open(path, baudRate);
  let replReady = false;
  try {
    await enterFriendlyReplPrompt(port, timeout);
    replReady = true;
    return await callback((code) => executeFriendly(port, code, timeout));
  } finally {
    if (replReady && port.isOpen) {
      await writePort(port, Buffer.from([0x04])).catch(() => undefined);
    }
    await closePort(port);
  }
}

async function executeFriendly(port, code, timeout) {
  const token = `_MB${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
  const endToken = `${token}E`;
  const command = `print(${pythonString(token)});exec(${pythonString(code)});print(${pythonString(endToken)})\r`;
  const output = await writeAndCollect(
    port,
    command,
    (response) =>
      hasMarkerLine(response, endToken) ||
      hasPromptAfterMarker(response, token),
    timeout,
    "command completion"
  );
  const lines = output.replaceAll("\r", "").split("\n");
  const start = lines.findIndex((line) => line.trim() === token);
  const end = lines.findIndex(
    (line, index) => index > start && line.trim() === endToken
  );
  if (start < 0 || end < 0) {
    const traceback = lines.findIndex((line) => line.startsWith("Traceback"));
    if (traceback >= 0) {
      const details = lines
        .slice(traceback)
        .filter((line) => line.trim() !== ">>>")
        .join("\n")
        .trim();
      throw new Error(`remote MicroPython command failed: ${details}`);
    }
    throw new Error("unexpected response from the MicroPython REPL");
  }
  return lines.slice(start + 1, end);
}

function pythonString(value) {
  return JSON.stringify(value);
}

function hasMarkerLine(output, marker) {
  return output
    .replaceAll("\r", "")
    .split("\n")
    .some((line) => line.trim() === marker);
}

function hasPromptAfterMarker(output, marker) {
  const lines = output.replaceAll("\r", "").split("\n");
  const markerIndex = lines.findIndex((line) => line.trim() === marker);
  return (
    markerIndex >= 0 &&
    lines.slice(markerIndex + 1).some((line) => line.trim() === ">>>")
  );
}

async function enterFriendlyReplPrompt(port, timeout) {
  await writeAndCollect(port, Buffer.from([0x03, 0x03, 0x0d]), ">>> ", timeout);
}

async function writeAndCollect(
  port,
  data,
  expected,
  timeout,
  expectedDescription = expected
) {
  let output = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `timed out waiting for the MicroPython REPL (${expectedDescription})`
        )
      );
    }, timeout);
    const onData = (chunk) => {
      output += chunk.toString("utf8");
      if (
        typeof expected === "function" ? expected(output) : output.includes(expected)
      ) {
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
