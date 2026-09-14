const fs = require('fs');
const zlib = require('zlib');

// PNG Specification parser & encoder
function removePngWhiteBackground(inputPath, outputPath) {
  const fileBuf = fs.readFileSync(inputPath);
  
  // Verify PNG signature
  if (fileBuf.readUInt32BE(0) !== 0x89504e47 || fileBuf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('Not a valid PNG file');
  }

  let offset = 8;
  let width, height, bitDepth, colorType;
  const idatChunks = [];

  while (offset < fileBuf.length) {
    const length = fileBuf.readUInt32BE(offset);
    const type = fileBuf.toString('ascii', offset + 4, offset + 8);
    const data = fileBuf.subarray(offset + 8, offset + 8 + length);
    
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      console.log(`PNG IHDR: ${width}x${height}, bitDepth=${bitDepth}, colorType=${colorType}`);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  const compressedData = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressedData);

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const scanlineLength = 1 + stride;

  // Unfilter PNG scanlines into raw RGBA image buffer
  const rawRGBA = Buffer.alloc(width * height * 4);

  function paethPredictor(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  const prevScanline = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * scanlineLength];
    const currentScanline = Buffer.alloc(stride);

    for (let i = 0; i < stride; i++) {
      const rawByte = decompressed[y * scanlineLength + 1 + i];
      const a = i >= bytesPerPixel ? currentScanline[i - bytesPerPixel] : 0;
      const b = prevScanline[i];
      const c = i >= bytesPerPixel ? prevScanline[i - bytesPerPixel] : 0;

      let val = 0;
      if (filterType === 0) val = rawByte;
      else if (filterType === 1) val = (rawByte + a) & 0xff;
      else if (filterType === 2) val = (rawByte + b) & 0xff;
      else if (filterType === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) val = (rawByte + paethPredictor(a, b, c)) & 0xff;

      currentScanline[i] = val;

      const pixelIdx = Math.floor(i / bytesPerPixel);
      const byteInPixel = i % bytesPerPixel;
      const outOffset = (y * width + pixelIdx) * 4;

      if (bytesPerPixel === 3) {
        if (byteInPixel < 3) rawRGBA[outOffset + byteInPixel] = val;
        rawRGBA[outOffset + 3] = 255;
      } else {
        rawRGBA[outOffset + byteInPixel] = val;
      }
    }

    currentScanline.copy(prevScanline);
  }

  // Flood fill from perimeter to identify background white pixels only
  const visited = new Uint8Array(width * height);
  const isBg = new Uint8Array(width * height);
  const queue = [];

  function isWhite(idx) {
    const off = idx * 4;
    const r = rawRGBA[off];
    const g = rawRGBA[off + 1];
    const b = rawRGBA[off + 2];
    const brightness = (r + g + b) / 3;
    return brightness > 235;
  }

  for (let y = 0; y < height; y++) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (isWhite(left)) { queue.push(left); visited[left] = 1; isBg[left] = 1; }
    if (isWhite(right)) { queue.push(right); visited[right] = 1; isBg[right] = 1; }
  }

  for (let x = 0; x < width; x++) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (!visited[top] && isWhite(top)) { queue.push(top); visited[top] = 1; isBg[top] = 1; }
    if (!visited[bottom] && isWhite(bottom)) { queue.push(bottom); visited[bottom] = 1; isBg[bottom] = 1; }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      cy > 0 ? curr - width : -1,
      cy < height - 1 ? curr + width : -1,
      cx > 0 ? curr - 1 : -1,
      cx < width - 1 ? curr + 1 : -1
    ];

    for (const n of neighbors) {
      if (n >= 0 && !visited[n]) {
        visited[n] = 1;
        if (isWhite(n)) {
          isBg[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // Apply alpha transparency to outer background
  for (let i = 0; i < isBg.length; i++) {
    if (isBg[i] === 1) {
      const off = i * 4;
      const brightness = (rawRGBA[off] + rawRGBA[off + 1] + rawRGBA[off + 2]) / 3;
      if (brightness >= 248) {
        rawRGBA[off + 3] = 0;
      } else {
        const alpha = Math.max(0, Math.min(255, (255 - brightness) * 18));
        rawRGBA[off + 3] = alpha;
      }
    }
  }

  // Encode unfiltered scanlines with filter type 0 (None)
  const outputScanlineLen = 1 + width * 4;
  const outputRawBuffer = Buffer.alloc(height * outputScanlineLen);

  for (let y = 0; y < height; y++) {
    outputRawBuffer[y * outputScanlineLen] = 0;
    rawRGBA.copy(outputRawBuffer, y * outputScanlineLen + 1, y * width * 4, (y + 1) * width * 4);
  }

  const outputDeflated = zlib.deflateSync(outputRawBuffer);

  function makeChunk(type, data) {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    
    const crc = crc32(chunk.subarray(4, 8 + data.length));
    chunk.writeUInt32BE(crc, 8 + data.length);
    return chunk;
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', outputDeflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const finalPng = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, finalPng);
  console.log(`Saved transparent PNG (${finalPng.length} bytes) to ${outputPath}`);
}

removePngWhiteBackground('Logo.png', 'public/Logo.png');
removePngWhiteBackground('Logo.png', 'src/assets/Logo.png');
removePngWhiteBackground('Logo.png', 'public/logo_pdf.png');
removePngWhiteBackground('Logo.png', 'src/assets/logo_pdf.png');
console.log('All transparent logos written successfully!');
