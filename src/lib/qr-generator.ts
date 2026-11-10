/**
 * Lightweight, zero-dependency QR Code Generator in pure TypeScript/JavaScript.
 * Based on the ISO/IEC 18004 specification and Project Nayuki's algorithm.
 */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export class QrCode {
  readonly size: number;
  private readonly modules: boolean[][];
  private readonly isFunction: boolean[][];

  constructor(
    readonly version: number,
    readonly errorCorrectionLevel: QrErrorCorrectionLevel,
    dataCodewords: number[],
    mask: number
  ) {
    if (version < 1 || version > 40) throw new RangeError("Version out of range");
    if (mask < 0 || mask > 7) throw new RangeError("Mask out of range");
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => Array(this.size).fill(false));

    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);
    this.applyMask(mask);
    this.drawFormatBits(mask);
  }

  getModule(x: number, y: number): boolean {
    if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
      return this.modules[y][x];
    }
    return false;
  }

  /**
   * Helper: encode text (alphanumeric or byte) with auto version selection
   */
  static encodeText(text: string, ecl: QrErrorCorrectionLevel = "M"): QrCode {
    const bytes = new TextEncoder().encode(text);
    return QrCode.encodeBinary(bytes, ecl);
  }

  static encodeBinary(data: Uint8Array, ecl: QrErrorCorrectionLevel = "M"): QrCode {
    // Find minimum version that fits data
    for (let version = 1; version <= 40; version++) {
      const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
      const headerBits = 4 + (version < 10 ? 8 : 16);
      const totalBits = headerBits + data.length * 8;
      if (totalBits <= dataCapacityBits) {
        return QrCode.encodeData(data, version, ecl);
      }
    }
    throw new Error("Data too large for QR Code");
  }

  private static encodeData(data: Uint8Array, version: number, ecl: QrErrorCorrectionLevel): QrCode {
    const numDataCodewords = QrCode.getNumDataCodewords(version, ecl);
    const bitBuffer: number[] = [];

    function appendBits(val: number, len: number) {
      for (let i = len - 1; i >= 0; i--) {
        bitBuffer.push((val >>> i) & 1);
      }
    }

    // Byte mode: 0100
    appendBits(0b0100, 4);
    appendBits(data.length, version < 10 ? 8 : 16);
    for (const b of data) {
      appendBits(b, 8);
    }

    // Terminator
    const padLen = Math.min(4, numDataCodewords * 8 - bitBuffer.length);
    appendBits(0, padLen);

    // Byte align
    while (bitBuffer.length % 8 !== 0) {
      bitBuffer.push(0);
    }

    // Pad bytes
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (bitBuffer.length < numDataCodewords * 8) {
      appendBits(padBytes[padIdx], 8);
      padIdx = (padIdx + 1) % 2;
    }

    const dataCodewords: number[] = [];
    for (let i = 0; i < bitBuffer.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bitBuffer[i + j];
      dataCodewords.push(b);
    }

    // Try masks 0..7 and pick best
    let minPenalty = Infinity;
    let bestMask = 0;
    for (let mask = 0; mask < 8; mask++) {
      const qr = new QrCode(version, ecl, dataCodewords, mask);
      const penalty = qr.getPenaltyScore();
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestMask = mask;
      }
    }

    return new QrCode(version, ecl, dataCodewords, bestMask);
  }

  private drawFunctionPatterns() {
    // Finder patterns
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    // Separators & Timing patterns
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    // Alignment patterns
    const alignPos = QrCode.getAlignmentPatternPositions(this.version);
    for (let i = 0; i < alignPos.length; i++) {
      for (let j = 0; j < alignPos.length; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === alignPos.length - 1) ||
          (i === alignPos.length - 1 && j === 0)
        ) {
          continue;
        }
        this.drawAlignmentPattern(alignPos[i], alignPos[j]);
      }
    }

    // Dark module
    this.setFunctionModule(8, this.size - 8, true);

    // Reserve format bits
    for (let i = 0; i <= 8; i++) {
      this.setFunctionModule(8, i, false);
      this.setFunctionModule(i, 8, false);
    }
    for (let i = 0; i < 8; i++) {
      this.setFunctionModule(this.size - 1 - i, 8, false);
      this.setFunctionModule(8, this.size - 1 - i, false);
    }
  }

  private drawFinderPattern(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
          this.setFunctionModule(x, y, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignmentPattern(cx: number, cy: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private setFunctionModule(x: number, y: number, isDark: boolean) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  }

  private addEccAndInterleave(data: number[]): number[] {
    const numBlocks = QrCode.getNumEccBlocks(this.version, this.errorCorrectionLevel);
    const blockEccLen = QrCode.getEccCodewordsPerBlock(this.version, this.errorCorrectionLevel);
    const rawCodewords = QrCode.getNumRawDataModules(this.version) / 8;
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks: number[][] = [];
    const rs = new ReedSolomonGenerator(blockEccLen);
    let k = 0;
    for (let i = 0; i < numBlocks; i++) {
      const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
      const dat = data.slice(k, k + dataLen);
      k += dataLen;
      const ecc = rs.getRemainder(dat);
      blocks.push([...dat, ...ecc]);
    }

    const result: number[] = [];
    const maxLen = blocks[blocks.length - 1].length;
    for (let i = 0; i < maxLen; i++) {
      for (let j = 0; j < blocks.length; j++) {
        if (i < blocks[j].length) {
          result.push(blocks[j][i]);
        }
      }
    }
    return result;
  }

  private drawCodewords(data: number[]) {
    let bitIndex = 0;
    let right = this.size - 1;
    let upward = true;

    while (right > 0) {
      if (right === 6) right--; // Skip vertical timing column
      for (let vert = 0; vert < this.size; vert++) {
        const y = upward ? this.size - 1 - vert : vert;
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          if (!this.isFunction[y][x]) {
            let isDark = false;
            if (bitIndex < data.length * 8) {
              isDark = ((data[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
              bitIndex++;
            }
            this.modules[y][x] = isDark;
          }
        }
      }
      right -= 2;
      upward = !upward;
    }
  }

  private applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.isFunction[y][x]) {
          let invert = false;
          switch (mask) {
            case 0: invert = (x + y) % 2 === 0; break;
            case 1: invert = y % 2 === 0; break;
            case 2: invert = x % 3 === 0; break;
            case 3: invert = (x + y) % 3 === 0; break;
            case 4: invert = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; break;
            case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          }
          if (invert) this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }

  private drawFormatBits(mask: number) {
    const format = (QrCode.getFormatBits(this.errorCorrectionLevel) << 3) | mask;
    let rem = format;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((format << 10) | rem) ^ 0x5412;

    for (let i = 0; i <= 5; i++) this.modules[8][i] = ((bits >>> i) & 1) !== 0;
    this.modules[8][7] = ((bits >>> 6) & 1) !== 0;
    this.modules[8][8] = ((bits >>> 7) & 1) !== 0;
    this.modules[7][8] = ((bits >>> 8) & 1) !== 0;
    for (let i = 9; i < 15; i++) this.modules[14 - i][8] = ((bits >>> i) & 1) !== 0;

    for (let i = 0; i < 8; i++) this.modules[this.size - 1 - i][8] = ((bits >>> i) & 1) !== 0;
    for (let i = 8; i < 15; i++) this.modules[8][this.size - 15 + i] = ((bits >>> i) & 1) !== 0;
  }

  private getPenaltyScore(): number {
    let result = 0;
    // Row & Col runs of same color
    for (let y = 0; y < this.size; y++) {
      let runColor = false;
      let runLen = 0;
      for (let x = 0; x < this.size; x++) {
        if (this.modules[y][x] === runColor) {
          runLen++;
          if (runLen === 5) result += 3;
          else if (runLen > 5) result++;
        } else {
          runColor = this.modules[y][x];
          runLen = 1;
        }
      }
    }
    for (let x = 0; x < this.size; x++) {
      let runColor = false;
      let runLen = 0;
      for (let y = 0; y < this.size; y++) {
        if (this.modules[y][x] === runColor) {
          runLen++;
          if (runLen === 5) result += 3;
          else if (runLen > 5) result++;
        } else {
          runColor = this.modules[y][x];
          runLen = 1;
        }
      }
    }
    // 2x2 blocks
    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const c = this.modules[y][x];
        if (c === this.modules[y][x + 1] && c === this.modules[y + 1][x] && c === this.modules[y + 1][x + 1]) {
          result += 3;
        }
      }
    }
    return result;
  }

  // Tables
  private static getFormatBits(ecl: QrErrorCorrectionLevel): number {
    switch (ecl) {
      case "L": return 1;
      case "M": return 0;
      case "Q": return 3;
      case "H": return 2;
    }
  }

  static getNumDataCodewords(ver: number, ecl: QrErrorCorrectionLevel): number {
    return Math.floor(QrCode.getNumRawDataModules(ver) / 8) -
      QrCode.getEccCodewordsPerBlock(ver, ecl) * QrCode.getNumEccBlocks(ver, ecl);
  }

  private static getNumRawDataModules(ver: number): number {
    let size = ver * 4 + 17;
    let total = size * size;
    total -= 8 * 8 * 3; // Finders + separators
    total -= (size - 16) * 2; // Timing lines
    total -= 1; // Dark module
    if (ver >= 2) {
      let numAlign = Math.floor(ver / 7) + 2;
      total -= (numAlign * numAlign - 3) * 25;
      total += (numAlign - 2) * 10;
    }
    if (ver >= 7) total -= 6 * 3 * 2; // Version info
    return total;
  }

  private static getEccCodewordsPerBlock(ver: number, ecl: QrErrorCorrectionLevel): number {
    const table: Record<QrErrorCorrectionLevel, number[]> = {
      L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
      Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 28, 28, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    };
    return table[ecl][ver - 1];
  }

  private static getNumEccBlocks(ver: number, ecl: QrErrorCorrectionLevel): number {
    const table: Record<QrErrorCorrectionLevel, number[]> = {
      L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
      M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
      Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
      H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    };
    return table[ecl][ver - 1];
  }

  private static getAlignmentPatternPositions(ver: number): number[] {
    if (ver === 1) return [];
    const num = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
    const result = [6];
    for (let pos = ver * 4 + 10; result.length < num; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }
}

class ReedSolomonGenerator {
  private readonly coefficients: number[] = [];

  constructor(degree: number) {
    this.coefficients = Array(degree).fill(0);
    this.coefficients[degree - 1] = 1;

    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        this.coefficients[j] = ReedSolomonGenerator.multiply(this.coefficients[j], root);
        if (j + 1 < degree) {
          this.coefficients[j] ^= this.coefficients[j + 1];
        }
      }
      root = ReedSolomonGenerator.multiply(root, 0x02);
    }
  }

  getRemainder(data: number[]): number[] {
    const result = Array(this.coefficients.length).fill(0);
    for (const b of data) {
      const factor = b ^ result.shift()!;
      result.push(0);
      for (let i = 0; i < this.coefficients.length; i++) {
        result[i] ^= ReedSolomonGenerator.multiply(this.coefficients[i], factor);
      }
    }
    return result;
  }

  private static multiply(x: number, y: number): number {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
}
