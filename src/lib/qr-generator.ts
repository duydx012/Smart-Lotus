// @ts-nocheck
import qrcode from "./qrcode-generator.js";

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type QrMatrixResult = {
  size: number;
  matrix: boolean[][];
  isDark: (r: number, c: number) => boolean;
  createSvgTag: (cellSize?: number, margin?: number) => string;
  createDataUrl: (cellSize?: number, margin?: number) => string;
};

export function generateQrMatrix(text: string, ecl: QrErrorCorrectionLevel = "M"): QrMatrixResult {
  const qr = qrcode(0, ecl);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];

  for (let r = 0; r < count; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < count; c++) {
      row.push(qr.isDark(r, c));
    }
    matrix.push(row);
  }

  return {
    size: count,
    matrix,
    isDark: (r: number, c: number) => qr.isDark(r, c),
    createSvgTag: (cellSize = 8, margin = 20) => qr.createSvgTag(cellSize, margin),
    createDataUrl: (cellSize = 8, margin = 20) => qr.createDataURL(cellSize, margin),
  };
}
