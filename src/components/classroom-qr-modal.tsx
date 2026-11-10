"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, LotusLogo } from "./icons";
import { QrCode, type QrErrorCorrectionLevel } from "@/lib/qr-generator";

export type ClassroomQrModalProps = {
  classroom: {
    id: string | number;
    name: string;
    label: string;
    subject: string;
    joinCode?: string;
    teacherName?: string;
    isExtra?: boolean;
    schedule?: string;
  };
  onClose: () => void;
  onToast?: (msg: string) => void;
};

export default function ClassroomQrModal({ classroom, onClose, onToast }: ClassroomQrModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [origin, setOrigin] = useState("");

  const joinCode = classroom.joinCode || classroom.label;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const joinUrl = origin ? `${origin}/?joinCode=${encodeURIComponent(joinCode)}` : `https://smartlotus.edu.vn/?joinCode=${encodeURIComponent(joinCode)}`;

  // Generate QR Code with High error correction (Q level) so center logo doesn't obscure data
  const qr = QrCode.encodeText(joinUrl, "Q");
  const moduleCount = qr.size;
  const cellSize = 8;
  const margin = 20;
  const qrPixelSize = moduleCount * cellSize + margin * 2;

  // Build SVG path
  let pathData = "";
  for (let y = 0; y < moduleCount; y++) {
    for (let x = 0; x < moduleCount; x++) {
      if (qr.getModule(x, y)) {
        // Leave center 20% area clear for Lotus flower badge
        const centerStart = Math.floor(moduleCount * 0.38);
        const centerEnd = Math.floor(moduleCount * 0.62);
        if (x >= centerStart && x <= centerEnd && y >= centerStart && y <= centerEnd) {
          continue; // skip drawing under the logo
        }
        const px = margin + x * cellSize;
        const py = margin + y * cellSize;
        pathData += `M${px},${py}h${cellSize}v${cellSize}h-${cellSize}z `;
      }
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopiedCode(true);
      onToast?.(`Đã sao chép mã lớp: ${joinCode}`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      onToast?.("Không thể sao chép tự động");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      onToast?.("Đã sao chép liên kết tham gia lớp!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onToast?.("Không thể sao chép tự động");
    }
  }

  function handleDownloadPng() {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cardWidth = 600;
      const cardHeight = 780;
      canvas.width = cardWidth;
      canvas.height = cardHeight;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Draw top header band
      const gradient = ctx.createLinearGradient(0, 0, cardWidth, 140);
      gradient.addColorStop(0, "#7c3aed");
      gradient.addColorStop(1, "#9333ea");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cardWidth, 130);

      // Draw app name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Smart Lotus · Học vui mỗi ngày", cardWidth / 2, 55);

      ctx.fillStyle = "#f3e8ff";
      ctx.font = "16px sans-serif";
      ctx.fillText(classroom.isExtra ? "MÃ QR LỚP HỌC THÊM / CLB" : "MÃ QR THAM GIA LỚP HỌC", cardWidth / 2, 90);

      // Draw class title
      ctx.fillStyle = "#1e1b4b";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(classroom.name, cardWidth / 2, 185);

      // Subtitle info
      ctx.fillStyle = "#6b7280";
      ctx.font = "16px sans-serif";
      const infoText = `Môn: ${classroom.subject} · Mã: ${joinCode}` + (classroom.schedule ? ` · ${classroom.schedule}` : "");
      ctx.fillText(infoText, cardWidth / 2, 220);

      // Draw QR background box
      const qrBoxSize = 340;
      const qrBoxX = (cardWidth - qrBoxSize) / 2;
      const qrBoxY = 250;

      ctx.fillStyle = "#faf5ff";
      ctx.strokeStyle = "#e9d5ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
      ctx.fill();
      ctx.stroke();

      // Draw QR Code modules
      const qrScale = (qrBoxSize - 40) / moduleCount;
      const qrOffsetX = qrBoxX + 20;
      const qrOffsetY = qrBoxY + 20;

      ctx.fillStyle = "#581c87"; // Deep brand purple
      const centerStart = Math.floor(moduleCount * 0.38);
      const centerEnd = Math.floor(moduleCount * 0.62);

      for (let y = 0; y < moduleCount; y++) {
        for (let x = 0; x < moduleCount; x++) {
          if (qr.getModule(x, y)) {
            if (x >= centerStart && x <= centerEnd && y >= centerStart && y <= centerEnd) {
              continue;
            }
            ctx.fillRect(qrOffsetX + x * qrScale, qrOffsetY + y * qrScale, qrScale + 0.5, qrScale + 0.5);
          }
        }
      }

      // Draw center logo circle
      const centerPixelX = qrOffsetX + (moduleCount / 2) * qrScale;
      const centerPixelY = qrOffsetY + (moduleCount / 2) * qrScale;
      const centerRadius = qrScale * 3.5;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(centerPixelX, centerPixelY, centerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw Lotus flower emoji or icon in center
      ctx.font = "32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌸", centerPixelX, centerPixelY);

      // Draw bottom call to action
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#7c3aed";
      ctx.font = "bold 24px monospace";
      ctx.fillText(`MÃ LỚP: ${joinCode}`, cardWidth / 2, 635);

      ctx.fillStyle = "#4b5563";
      ctx.font = "14px sans-serif";
      ctx.fillText("Quét mã QR bằng camera điện thoại hoặc trong app Smart Lotus", cardWidth / 2, 675);
      ctx.fillText("để vào lớp học ngay mà không cần nhập mã thủ công.", cardWidth / 2, 700);

      // Trigger download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Ma_QR_${classroom.name.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onToast?.("Đã tải ảnh mã QR lớp học thành công!");
    } catch (e) {
      console.error("QR download error", e);
      onToast?.("Không thể tạo file ảnh QR");
    } finally {
      setDownloading(false);
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
          padding: "26px",
          borderRadius: "24px",
          textAlign: "center",
          boxShadow: "0 25px 60px -15px rgba(124, 58, 237, 0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ textAlign: "left" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#f3e8ff",
                color: "#7c3aed",
                fontSize: "11px",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: "999px",
                marginBottom: "6px",
              }}
            >
              <Icon name="school" size={13} />
              {classroom.isExtra ? "LỚP HỌC THÊM · CLB" : "LỚP HỌC CHÍNH"}
            </span>
            <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2937", fontWeight: 800 }}>
              {classroom.name}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#6b7280" }}>
              Môn: {classroom.subject} {classroom.schedule ? `· ⏰ ${classroom.schedule}` : ""}
            </p>
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

        {/* Khung mã QR nổi bật */}
        <div
          style={{
            position: "relative",
            display: "inline-block",
            padding: "16px",
            background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
            border: "2px solid #e9d5ff",
            borderRadius: "20px",
            boxShadow: "0 8px 24px rgba(124, 58, 237, 0.12)",
            margin: "8px auto 16px",
          }}
        >
          <svg
            width="240"
            height="240"
            viewBox={`0 0 ${qrPixelSize} ${qrPixelSize}`}
            style={{ display: "block", borderRadius: "12px" }}
          >
            {/* Background */}
            <rect width="100%" height="100%" fill="#ffffff" rx="12" />
            {/* QR Modules */}
            <path d={pathData} fill="#581c87" />
            {/* Center Lotus Flower Badge */}
            <circle
              cx={qrPixelSize / 2}
              cy={qrPixelSize / 2}
              r={cellSize * 3.8}
              fill="#ffffff"
              stroke="#c084fc"
              strokeWidth="2.5"
            />
            <text
              x={qrPixelSize / 2}
              y={qrPixelSize / 2 + 7}
              fontSize="24"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              🌸
            </text>
          </svg>

          {/* Tag hướng dẫn bên dưới mã QR */}
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <span>📷 Quét bằng camera để vào lớp ngay</span>
          </div>
        </div>

        {/* Ô hiển thị Mã lớp dạng số to */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fdf4ff",
            border: "1.5px dashed #d8b4fe",
            borderRadius: "14px",
            padding: "10px 16px",
            marginBottom: "14px",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#86198f", textTransform: "uppercase" }}>
              Mã tham gia lớp
            </span>
            <div style={{ fontSize: "19px", fontWeight: 850, color: "#701a75", letterSpacing: "1px", fontFamily: "monospace" }}>
              {joinCode}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #d8b4fe",
              background: "#ffffff",
              color: "#701a75",
              fontSize: "12px",
              fontWeight: 750,
              cursor: "pointer",
            }}
          >
            <Icon name="copy" size={13} />
            <span>{copiedCode ? "Đã chép!" : "Sao chép"}</span>
          </button>
        </div>

        {/* Nút thao tác chính */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1.5px solid #d8b4fe",
              background: "#faf5ff",
              color: "#7c3aed",
              fontSize: "13px",
              fontWeight: 750,
              cursor: "pointer",
            }}
          >
            <span>🔗</span>
            <span>{copiedLink ? "Đã chép link!" : "Chép link mời"}</span>
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPng}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 750,
              cursor: downloading ? "wait" : "pointer",
              boxShadow: "0 3px 10px rgba(124, 58, 237, 0.3)",
            }}
          >
            <span>📥</span>
            <span>{downloading ? "Đang tạo..." : "Tải ảnh QR (PNG)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
