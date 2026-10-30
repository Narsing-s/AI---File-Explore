import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconDir = path.join(root, "src-tauri", "icons");
await mkdir(iconDir, { recursive: true });

const pngBase64 = await readFile(path.join(iconDir, "icon.png.base64"), "utf8");
const png = Buffer.from(pngBase64.trim(), "base64");
if (png.length < 24 || png.subarray(1, 4).toString() !== "PNG") {
  throw new Error("The bundled application PNG icon is invalid.");
}
await writeFile(path.join(iconDir, "icon.png"), png);

// Windows requires an ICO resource. ICO can contain a PNG-compressed image.
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);  // reserved
header.writeUInt16LE(1, 2);  // image type
header.writeUInt16LE(1, 4);  // image count
header.writeUInt8(0, 6);     // width 256+
header.writeUInt8(0, 7);     // height 256+
header.writeUInt8(0, 8);     // palette
header.writeUInt8(0, 9);     // reserved
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12);// bits per pixel
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(path.join(iconDir, "icon.ico"), Buffer.concat([header, png]));
console.log("Prepared PNG and Windows ICO application icons.");
