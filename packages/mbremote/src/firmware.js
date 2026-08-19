import fs from "node:fs/promises";
import path from "node:path";

const FIRMWARE_FILES = [
  {
    name: "microbit-micropython-v2.hex",
    url: "https://raw.githubusercontent.com/microbit-foundation/python-editor-v3/main/src/micropython/main/microbit-micropython-v2.hex",
  },
  {
    name: "microbit-micropython-v1.hex",
    url: "https://raw.githubusercontent.com/microbit-foundation/python-editor-v3/main/src/micropython/microbit-micropython-v1.hex",
  },
];

export async function setupFirmware({
  cwd = process.cwd(),
  fetchImpl = globalThis.fetch,
  log = console.log,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("firmware setup requires fetch support from Node.js 20 or newer");
  }

  const directory = path.resolve(cwd, "firmware");
  await fs.mkdir(directory, { recursive: true });
  const installed = [];

  for (const firmware of FIRMWARE_FILES) {
    const destination = path.join(directory, firmware.name);
    const temporary = `${destination}.download`;
    log(`download: ${firmware.url}`);
    try {
      const response = await fetchImpl(firmware.url);
      if (!response.ok) {
        throw new Error(
          `firmware download failed (${response.status} ${response.statusText})`
        );
      }
      const hex = await response.text();
      if (!hex.startsWith(":")) {
        throw new Error(`downloaded firmware is not Intel HEX: ${firmware.url}`);
      }
      await fs.writeFile(temporary, hex, "utf8");
      await fs.rename(temporary, destination);
      installed.push(destination);
      log(`installed: ${destination}`);
    } catch (error) {
      await fs.rm(temporary, { force: true });
      throw error;
    }
  }

  return installed;
}
