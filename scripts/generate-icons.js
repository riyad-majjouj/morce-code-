import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth 8
  ihdrData[9] = 2; // Color type 2 (Truecolor / RGB)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = writeChunk('IHDR', ihdrData);

  // Raw Image Data (Filter 0 for each scanline)
  const bytesPerPixel = 3;
  const stride = 1 + width * bytesPerPixel;
  const rawData = Buffer.alloc(stride * height);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(width, height) * (isMaskable ? 0.35 : 0.42);
  const rInner = Math.min(width, height) * 0.12;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    rawData[rowOffset] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Black background
      let r = 0x05, g = 0x0D, b = 0x05;

      // Outer ring
      if (Math.abs(dist - rOuter) < Math.max(3, width * 0.02)) {
        r = 0x00; g = 0xFF; b = 0x66;
      }
      // Inner circle
      else if (dist < rInner) {
        r = 0x00; g = 0xFF; b = 0x66;
      }
      // Center dot
      else if (dist < rInner * 0.5) {
        r = 0x00; g = 0x00; b = 0x00;
      }
      // Morse dots at bottom
      const dotY = cy + rOuter * 0.7;
      if (Math.abs(y - dotY) < height * 0.035) {
        if (Math.abs(x - (cx - width * 0.2)) < width * 0.035) {
          r = 0x00; g = 0xFF; b = 0x66;
        } else if (Math.abs(x - cx) < width * 0.08) {
          r = 0x00; g = 0xFF; b = 0x66;
        } else if (Math.abs(x - (cx + width * 0.2)) < width * 0.035) {
          r = 0x00; g = 0xFF; b = 0x66;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressedData);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

console.log('Successfully generated PWA PNG icons in /public');
