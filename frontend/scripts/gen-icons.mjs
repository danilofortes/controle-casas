import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");

const src = await readFile(join(publicDir, "icon.svg"));

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of targets) {
  const png = await sharp(src, { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer();
  await writeFile(join(publicDir, name), png);
  console.log(`gerado ${name} (${size}x${size})`);
}
