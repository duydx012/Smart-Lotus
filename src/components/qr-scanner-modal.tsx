"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { decodeQrFromCanvas, decodeQrFromImageData } from "@/lib/qr-decoder";

export type QrScannerModalProps = {
  onClose: () => void;
  onCodeDetected: (code: string) => void;
  onToast?: (msg: string) => void;
};

// Helper: extract joinCode from raw QR string (could be URL, SMARTLOTUS:..., or raw code)
export function extractJoinCodeFromText(raw: string): string {
  const trimmed = raw.trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const code = url.searchParams.get("joinCode") || url.searchParams.get("code");
      if (code) return code.trim().toUpperCase();
    }
  } catch {
    // Not a URL
  }

  // Handle formats like "SMARTLOTUS:JOIN:ABCDEF" or "JOIN:ABCDEF"
  const colonParts = trimmed.split(":");
  if (colonParts.length > 1) {
    const last = colonParts[colonParts.length - 1];
    if (last && last.length >= 4) return last.trim().toUpperCase();
  }

  return trimmed.toUpperCase();
}

export default function QrScannerModal({ onClose, onCodeDetected, onToast }: QrScannerModalProps) {
  const [tab, setTab] = useState<"camera" | "upload">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop camera on unmount or tab change
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera when on "camera" tab
  useEffect(() => {
    if (tab === "camera") {
      void startCamera();
    } else {
      stopCamera();
    }
  }, [tab]);

  async function startCamera() {
    stopCamera();
    setCameraError("");
    setScannedResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Trình duyệt không hỗ trợ mở camera. Vui lòng chuyển sang tab 'Tải ảnh mã QR'.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        startRealtimeScanning();
      }
    } catch (err: unknown) {
      console.warn("Camera access denied or failed", err);
      setCameraError("Không thể mở camera. Hãy đảm bảo bạn đã bấm 'Cho phép' (Allow) quyền camera trên trình duyệt hoặc tải ảnh mã QR lên.");
    }
  }

  function handleDetected(code: string) {
    const finalCode = extractJoinCodeFromText(code);
    if (!finalCode || scannedResult) return;
    setScannedResult(finalCode);
    stopCamera();

    // Vibrate phone if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(100);
    }

    onToast?.(`✨ Quét thành công! Mã lớp: ${finalCode}`);
    setTimeout(() => {
      onCodeDetected(finalCode);
    }, 400);
  }

  function startRealtimeScanning() {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let lastScanTime = 0;

    const scanFrame = (timestamp: number) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !streamRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Scan every 120ms (~8 times per second for smooth performance and instant detection)
      if (timestamp - lastScanTime > 120) {
        lastScanTime = timestamp;

        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw > 0 && vh > 0) {
            // Resize canvas to video size
            if (canvas.width !== vw || canvas.height !== vh) {
              canvas.width = vw;
              canvas.height = vh;
            }

            ctx.drawImage(video, 0, 0, vw, vh);

            // 1. Try decoding with jsQR (100% works on all browsers and devices)
            const decoded = decodeQrFromCanvas(canvas);
            if (decoded) {
              handleDetected(decoded);
              return;
            }

            // 2. Also try center crop (zoom in on the viewfinder area for higher accuracy from afar)
            const cropSize = Math.min(vw, vh) * 0.75;
            const cropX = (vw - cropSize) / 2;
            const cropY = (vh - cropSize) / 2;
            const centerImageData = ctx.getImageData(cropX, cropY, cropSize, cropSize);
            const centerDecoded = decodeQrFromImageData(centerImageData);
            if (centerDecoded) {
              handleDetected(centerDecoded);
              return;
            }
          }
        } catch {
          // ignore scan frame exception
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setCameraError("");

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Không thể đọc file ảnh"));
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const decoded = decodeQrFromCanvas(canvas);
        URL.revokeObjectURL(objectUrl);

        if (decoded) {
          handleDetected(decoded);
          return;
        }
      }

      URL.revokeObjectURL(objectUrl);
      onToast?.("Không tìm thấy mã QR hợp lệ trong ảnh. Hãy thử ảnh rõ nét hơn.");
    } catch (err: unknown) {
      onToast?.(err instanceof Error ? err.message : "Lỗi khi phân tích ảnh");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="student-modal-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="student-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "460px",
          width: "92vw",
          padding: "24px",
          borderRadius: "24px",
          textAlign: "center",
          boxShadow: "0 25px 60px -15px rgba(124, 58, 237, 0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#f3e8ff",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="search" size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#1f2937", fontWeight: 800 }}>Quét mã QR vào lớp</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Dùng camera hoặc tải ảnh mã QR của giáo viên</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f3f4f6",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab switcher: Camera vs Upload */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            background: "#f3f4f6",
            padding: "4px",
            borderRadius: "12px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("camera")}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: 750,
              cursor: "pointer",
              background: tab === "camera" ? "#ffffff" : "transparent",
              color: tab === "camera" ? "#7c3aed" : "#6b7280",
              boxShadow: tab === "camera" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            }}
          >
            📷 Camera trực tiếp
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              border: "none",
              fontSize: "13px",
              fontWeight: 750,
              cursor: "pointer",
              background: tab === "upload" ? "#ffffff" : "transparent",
              color: tab === "upload" ? "#7c3aed" : "#6b7280",
              boxShadow: tab === "upload" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            }}
          >
            🖼️ Tải ảnh mã QR
          </button>
        </div>

        {/* Tab Content: Camera */}
        {tab === "camera" && (
          <div>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "270px",
                background: "#000000",
                borderRadius: "18px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: cameraActive ? "block" : "none",
                }}
              />

              {/* Viewfinder box (khung quét) */}
              {cameraActive && (
                <div
                  style={{
                    position: "absolute",
                    width: "190px",
                    height: "190px",
                    border: "2.5px solid #c084fc",
                    borderRadius: "18px",
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.42)",
                    pointerEvents: "none",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "6px",
                  }}
                >
                  {/* Tia laser quét lên xuống */}
                  <div
                    style={{
                      width: "100%",
                      height: "2.5px",
                      background: "linear-gradient(90deg, transparent, #e879f9, #c084fc, transparent)",
                      boxShadow: "0 0 10px #c084fc",
                      animation: "scanPulse 2s infinite ease-in-out",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#f5d0fe", fontWeight: 700, textAlign: "center" }}>
                    Đặt mã QR vào giữa khung
                  </span>
                </div>
              )}

              {!cameraActive && !cameraError && (
                <div style={{ color: "#ffffff", fontSize: "13px" }}>
                  <span>Đang khởi động camera...</span>
                </div>
              )}

              {cameraError && (
                <div style={{ padding: "20px", color: "#fca5a5", fontSize: "13px", lineHeight: 1.5 }}>
                  {cameraError}
                </div>
              )}
            </div>

            <p style={{ fontSize: "12px", color: "#6b7280", margin: "12px 0 0" }}>
              Hướng camera về phía mã QR của giáo viên. Hệ thống sẽ tự động quét và đưa bạn vào lớp!
            </p>
          </div>
        )}

        {/* Tab Content: Tải ảnh QR */}
        {tab === "upload" && (
          <div>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "36px 20px",
                border: "2px dashed #c084fc",
                borderRadius: "18px",
                background: "#faf5ff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "36px" }}>🖼️</span>
              <strong style={{ fontSize: "14px", color: "#581c87" }}>
                {uploading ? "Đang phân tích mã QR..." : "Bấm để chọn ảnh mã QR"}
              </strong>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                Hỗ trợ ảnh chụp màn hình, ảnh tải về từ Zalo/Messenger (PNG, JPG)
              </span>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload(file);
                }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
