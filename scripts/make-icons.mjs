// Renders the app icon (clay tile + ivory map pin) to PNGs for the web manifest and iOS.
// No image libraries: geometry is sampled 4×4 per pixel and written with a minimal PNG encoder.
// Run: node scripts/make-icons.mjs   (outputs to public/icons/)
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const CLAY = [201, 100, 66], IVORY = [250, 249, 245];

// Pin in a 64-unit design space (matches public/icon.svg).
const C = [32, 26.6], R = 14.5, HOLE = 5.4, TIP = [32, 51.5];
const d = TIP[1] - C[1], sinA = R / d, cosA = Math.sqrt(1 - sinA * sinA);
const tanY = C[1] + R * sinA, tanX = R * cosA;
function inPin(x, y) {
  const dc = Math.hypot(x - C[0], y - C[1]);
  if (dc <= HOLE) return false;
  if (dc <= R) return true;
  if (y >= tanY && y <= TIP[1]) return Math.abs(x - 32) <= (tanX * (TIP[1] - y)) / (TIP[1] - tanY);
  return false;
}
function inRoundRect(x, y, r) {
  const cx = Math.min(Math.max(x, r), 64 - r), cy = Math.min(Math.max(y, r), 64 - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

function render(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const S = 4;
  // Maskable icons need the artwork inside the central 80% safe zone and a full-bleed background.
  const scale = maskable ? 0.72 : 1, off = (64 - 64 * scale) / 2;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let bg = 0, fg = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const x = ((i + (sx + 0.5) / S) / size) * 64, y = ((j + (sy + 0.5) / S) / size) * 64;
      const inBg = maskable || inRoundRect(x, y, 16);
      if (!inBg) continue;
      bg++;
      if (inPin((x - off) / scale, (y - off) / scale)) fg++;
    }
    const n = S * S, a = bg / n, t = bg ? fg / bg : 0, k = (j * size + i) * 4;
    for (let c = 0; c < 3; c++) px[k + c] = Math.round(CLAY[c] * (1 - t) + IVORY[c] * t);
    px[k + 3] = Math.round(a * 255);
  }
  return encode(size, size, px);
}

function encode(w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let r = 0xffffffff; for (const x of b) r = table[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const out = new URL("../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL("icon-192.png", out), render(192));
writeFileSync(new URL("icon-512.png", out), render(512));
writeFileSync(new URL("maskable-512.png", out), render(512, { maskable: true }));
writeFileSync(new URL("apple-touch-icon.png", out), render(180, { maskable: true })); // iOS rounds corners itself
console.log("✔ icons written to public/icons/");
