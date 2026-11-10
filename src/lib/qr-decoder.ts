// @ts-nocheck
import jsQR from "./jsqr.js";

/**
 * Giải mã chuỗi QR từ dữ liệu ImageData của canvas hoặc camera frame.
 * Hỗ trợ tự động đảo màu (inversionAttempts) để nhận diện cả QR nền tối lẫn nền sáng.
 */
export function decodeQrFromImageData(imageData: ImageData): string | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    return code ? code.data : null;
  } catch (e) {
    console.warn("QR decode error:", e);
    return null;
  }
}

/**
 * Giải mã QR từ thẻ HTML5 canvas.
 */
export function decodeQrFromCanvas(canvas: HTMLCanvasElement): string | null {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return decodeQrFromImageData(imageData);
  } catch (e) {
    console.warn("Canvas QR decode error:", e);
    return null;
  }
}

/**
 * Giải mã QR từ thẻ ảnh HTMLImageElement (ảnh tải lên, ảnh chụp màn hình).
 */
export function decodeQrFromImageElement(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return decodeQrFromCanvas(canvas);
  } catch (e) {
    console.warn("Image element QR decode error:", e);
    return null;
  }
}
