"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { smartLotusApi, type StudentClassroomRequest } from "@/lib/api";

export default function StudentRequestModal({
  request,
  onClose,
  onProcessed,
  onToast,
}: {
  request: StudentClassroomRequest;
  onClose: () => void;
  onProcessed: () => void;
  onToast: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleDecision(decision: "accepted" | "declined") {
    setSubmitting(true);
    try {
      const res = await smartLotusApi.respondToClassroomRequest(request.id, decision);
      onToast(
        res.message ||
          (decision === "accepted"
            ? `Đã duyệt học sinh ${request.student.displayName} vào lớp ${request.classroom.name}!`
            : `Đã từ chối yêu cầu của học sinh ${request.student.displayName}.`)
      );
      onProcessed();
      onClose();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  const { student, classroom } = request;
  const isPending = request.status === "pending";

  return (
    <div className="student-modal-backdrop" onClick={() => !submitting && onClose()}>
      <section
        className="student-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="req-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", borderRadius: "20px", overflow: "hidden" }}
      >
        <div className="student-modal-heading" style={{ paddingBottom: "14px" }}>
          <div>
            <span className="section-kicker" style={{ color: "#7c3aed" }}>
              YÊU CẦU XIN VÀO LỚP HỌC THÊM
            </span>
            <h2 id="req-modal-title" style={{ fontSize: "18px", margin: "4px 0 0" }}>
              Chi tiết học sinh
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
          {/* Header học sinh */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "16px",
              background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
              borderRadius: "14px",
              border: "1.5px solid #d8b4fe",
            }}
          >
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.displayName}
                style={{ width: "54px", height: "54px", borderRadius: "50%", objectFit: "cover", border: "2px solid #a855f7" }}
              />
            ) : (
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(124, 58, 237, 0.2)",
                }}
              >
                {student.avatar || student.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ fontSize: "16px", color: "#1f2937" }}>{student.displayName}</strong>
                <span
                  style={{
                    background: isPending ? "#fef3c7" : request.status === "accepted" ? "#dcfce7" : "#fee2e2",
                    color: isPending ? "#b45309" : request.status === "accepted" ? "#15803d" : "#b91c1c",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {isPending ? "Chờ duyệt" : request.status === "accepted" ? "Đã đồng ý" : "Đã từ chối"}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#6d28d9", fontWeight: 700, marginTop: "2px" }}>
                Mã học sinh: {student.studentCode}
              </div>
            </div>
          </div>

          {/* Chi tiết thông tin */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "12.5px",
            }}
          >
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px" }}>
              <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Email liên hệ</span>
              <strong style={{ color: "#111827", wordBreak: "break-all" }}>{student.email}</strong>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px" }}>
              <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Số điện thoại</span>
              <strong style={{ color: "#111827" }}>{student.phone || "Chưa cập nhật"}</strong>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px" }}>
              <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Trường học</span>
              <strong style={{ color: "#111827" }}>{student.school || "Chưa cập nhật"}</strong>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px" }}>
              <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Lớp / Khối</span>
              <strong style={{ color: "#111827" }}>
                {student.className ? `Lớp ${student.className}` : student.grade ? `Khối ${student.grade}` : "Khối 1"}
              </strong>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px" }}>
              <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Điểm Sen tích lũy</span>
              <strong style={{ color: "#ec4899" }}>🌸 {student.lotusPoints.toLocaleString("vi-VN")} điểm</strong>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px" }}>
              <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Điểm kiểm tra gần nhất</span>
              <strong style={{ color: student.score !== null ? "#15803d" : "#6b7280" }}>
                {student.score !== null ? `${student.score} điểm` : "Chưa có bài nộp"}
              </strong>
            </div>
          </div>

          {/* Lớp học đăng ký */}
          <div
            style={{
              padding: "12px 14px",
              background: "#faf5ff",
              borderRadius: "12px",
              border: "1.5px solid #c084fc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "#6d28d9", fontWeight: 700, display: "block" }}>
                LỚP HỌC THÊM ĐĂNG KÝ XIN VÀO
              </span>
              <strong style={{ fontSize: "15px", color: "#581c87" }}>
                {classroom.name} · {classroom.label}
              </strong>
              <span style={{ fontSize: "12px", color: "#7c3aed", marginLeft: "6px" }}>({classroom.subject})</span>
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>
              Gửi yêu cầu: {new Date(request.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="student-modal-actions" style={{ paddingTop: "14px", borderTop: "1px solid #f3f4f6" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={submitting}
          >
            Đóng
          </button>

          {isPending && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleDecision("declined")}
                style={{
                  background: "#fef2f2",
                  border: "1.5px solid #fca5a5",
                  color: "#dc2626",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                ❌ Từ chối
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={submitting}
                onClick={() => void handleDecision("accepted")}
                style={{
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  border: "none",
                  fontWeight: 750,
                  fontSize: "12.5px",
                  padding: "8px 18px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? "Đang duyệt..." : "✅ Đồng ý vào lớp"}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

