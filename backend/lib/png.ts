// Minimal PNG encoder for the mock provider's placeholder images.
// No image dependency needed, and React Native can display PNG (it cannot display SVG out of the box).
import { crc32, deflateSync } from 'node:zlib';

export type Rgb = readonly [number, number, number];

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes a truecolour PNG where every pixel in a row shares `rowColour(y)`. */
export function encodeRowPng(width: number, height: number, rowColour: (y: number) => Rgb): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour RGB
  header[10] = 0; // compression
  header[11] = 0; // filter
  header[12] = 0; // no interlace

  const rowBytes = 1 + width * 3; // leading filter byte per row
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const [r, g, b] = rowColour(y);
    const offset = y * rowBytes; // filter byte stays 0 (none)
    for (let x = 0; x < width; x++) {
      const p = offset + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
