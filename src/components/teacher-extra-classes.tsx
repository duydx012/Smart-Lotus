"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { smartLotusApi, type StudentClassroomRequest } from "@/lib/api";
import type { Classroom } from "@/lib/student-data";
import ClassroomFeedView from "./classroom-feed-view";
import ClassroomQrModal from "./classroom-qr-modal";

export default function TeacherExtraClasses({
  requests,
  onRefresh,
  onOpenDetail,
  onToast,
  targetClassId,
  targetPostId,
}: {
  requests: StudentClassroomRequest[];
  onRefresh: () => void;
  onOpenDetail: (request: StudentClassroomRequest) => void;
  onToast: (msg: string) => void;
  targetClassId?: string | number | null;
  targetPostId?: number | null;
}) {
  const [mainTab, setMainTab] = useState<"feed" | "requests">(targetPostId ? "feed" : "feed");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "declined">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [qrClassroom, setQrClassroom] = useState<Classroom | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassLabel, setNewClassLabel] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("Toán");
  const [newClassSchedule, setNewClassSchedule] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newClassColor, setNewClassColor] = useState("purple");

  async function loadClasses() {
    try {
      const { classrooms: items } = await smartLotusApi.getClassrooms("extra");
      setClassrooms(items);
      if (targetClassId) {
        setSelectedClassId(String(targetClassId));
      } else if (items.length > 0 && (!selectedClassId || !items.some((c) => String(c.id) === String(selectedClassId)))) {
        setSelectedClassId(String(items[0].id));
      }
      return items;
    } catch (e) {
      console.error("Load extra classrooms error", e);
      return [];
    }
  }

  useEffect(() => {
    void loadClasses();
  }, [targetClassId]);

  async function handleCreateExtraClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newClassName.trim()) {
      onToast("Vui lòng nhập tên lớp học thêm");
      return;
    }
    const label = (newClassLabel.trim() || newClassName.trim().slice(0, 10)).toUpperCase();
    setCreating(true);
    try {
      const res = await smartLotusApi.createClassroom({
        name: newClassName.trim(),
        label,
        subject: newClassSubject.trim() || "Toán",
        description: newClassDescription.trim(),
        color: newClassColor,
        isExtra: true,
        schedule: newClassSchedule.trim(),
      });
      onToast(`Đã mở lớp học thêm thành công: ${res.classroom.name}!`);
      setShowCreateModal(false);
      setNewClassName("");
      setNewClassLabel("");
      setNewClassSchedule("");
      setNewClassDescription("");
      const updated = await loadClasses();
      setSelectedClassId(String(res.classroom.id));
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Không thể tạo lớp học thêm");
    } finally {
      setCreating(false);
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;
  const declinedCount = requests.filter((r) => r.status === "declined").length;

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const activeClassroom = classrooms.find((c) => String(c.id) === String(selectedClassId));

  async function handleQuickRespond(requestId: string, decision: "accepted" | "declined", studentName: string, className: string) {
    setProcessingId(requestId);
    try {
      const res = await smartLotusApi.respondToClassroomRequest(requestId, decision);
      onToast(res.message || (decision === "accepted" ? `Đã thêm ${studentName} vào lớp ${className}!` : `Đã từ chối yêu cầu của ${studentName}.`));
      onRefresh();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="view-stack teacher-extra-classes-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Thanh chuyển tab lớn: Bảng tin & Tài liệu vs Duyệt học sinh */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "#ffffff",
          padding: "12px 18px",
          borderRadius: "16px",
          border: "1.5px solid #e9d5ff",
          boxShadow: "0 4px 14px rgba(124, 58, 237, 0.05)",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setMainTab("feed")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              border: mainTab === "feed" ? "1.5px solid #8b5cf6" : "1.5px solid transparent",
              background: mainTab === "feed" ? "#8b5cf6" : "#f5f3ff",
              color: mainTab === "feed" ? "#ffffff" : "#6b21a8",
              boxShadow: mainTab === "feed" ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none",
            }}
          >
            <Icon name="sparkles" size={15} />
            <span>Bảng tin & Kho tài liệu độc quyền</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab("requests")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              border: mainTab === "requests" ? "1.5px solid #8b5cf6" : "1.5px solid transparent",
              background: mainTab === "requests" ? "#8b5cf6" : "#f5f3ff",
              color: mainTab === "requests" ? "#ffffff" : "#6b21a8",
              boxShadow: mainTab === "requests" ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none",
            }}
          >
            <Icon name="users" size={15} />
            <span>Yêu cầu xin vào lớp</span>
            {pendingCount > 0 && (
              <span
                style={{
                  background: mainTab === "requests" ? "#ffffff" : "#ef4444",
                  color: mainTab === "requests" ? "#ef4444" : "#ffffff",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "1px 7px",
                  borderRadius: "999px",
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Actions bên phải header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {mainTab === "feed" && classrooms.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280" }}>Lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "1.5px solid #c084fc",
                  fontSize: "13px",
                  fontWeight: 750,
                  color: "#581c87",
                  background: "#faf5ff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.label} ({c.studentCount} học sinh)
                  </option>
                ))}
              </select>

              {activeClassroom && (
                <button
                  type="button"
                  onClick={() => setQrClassroom(activeClassroom)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #d8b4fe",
                    background: "#faf5ff",
                    color: "#7c3aed",
                    fontSize: "12.5px",
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                  title="Xem và tải mã QR lớp học thêm"
                >
                  <span>📷</span>
                  <span>Mã QR</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: 750,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
            }}
          >
            <Icon name="plus" size={15} />
            <span>Mở lớp học thêm mới</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB BẢNG TIN & TÀI LIỆU ===================== */}
      {mainTab === "feed" ? (
        activeClassroom ? (
          <ClassroomFeedView
            classroomId={activeClassroom.id}
            classroomName={activeClassroom.name}
            classroomLabel={activeClassroom.label}
            subject={activeClassroom.subject}
            teacherName="Bạn (Giáo viên phụ trách)"
            currentRole="teacher"
            onToast={onToast}
            initialPostId={targetPostId}
          />
        ) : (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#faf5ff",
              borderRadius: "18px",
              border: "1.5px dashed #d8b4fe",
              color: "#6b7280",
            }}
          >
            <span style={{ fontSize: "40px" }}>🏫</span>
            <h3 style={{ color: "#581c87", margin: "14px 0 6px", fontSize: "18px" }}>Thầy/Cô chưa có lớp học thêm nào</h3>
            <p style={{ margin: "0 0 20px", fontSize: "13.5px", color: "#6b7280" }}>
              Lớp học thêm là không gian tự nguyện dành cho học sinh yêu thích môn học. Mở lớp ngay để các em gửi yêu cầu tham gia!
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 750,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
              }}
            >
              <Icon name="plus" size={16} />
              <span>Mở lớp học thêm đầu tiên</span>
            </button>
          </div>
        )
      ) : (
        /* ===================== TAB DUYỆT HỌC SINH XIN VÀO LỚP ===================== */
        <>
          <section className="page-intro">
            <div>
              <span className="eyebrow purple">
                <Icon name="school" size={15} /> PHÊ DUYỆT HỌC SINH THAM GIA LỚP
              </span>
              <h1>Yêu cầu tham gia lớp học</h1>
              <p>
                Xem và phê duyệt các học sinh gửi yêu cầu xin vào lớp học thêm của bạn. Khi được duyệt, học sinh sẽ nhận được toàn bộ bài tập và bảng tin của lớp.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={onRefresh}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Icon name="check" size={14} /> Làm mới danh sách
            </button>
          </section>

          {/* Bộ lọc tab trạng thái */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              background: "#f3e8ff",
              padding: "4px",
              borderRadius: "12px",
              width: "fit-content",
            }}
          >
            <button
              type="button"
              onClick={() => setFilter("pending")}
              style={{
                border: "none",
                background: filter === "pending" ? "#ffffff" : "transparent",
                color: filter === "pending" ? "#6d28d9" : "#7c3aed",
                fontWeight: 750,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "9px",
                cursor: "pointer",
                boxShadow: filter === "pending" ? "0 2px 6px rgba(124, 58, 237, 0.1)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Chờ phê duyệt</span>
              {pendingCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "999px",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter("accepted")}
              style={{
                border: "none",
                background: filter === "accepted" ? "#ffffff" : "transparent",
                color: filter === "accepted" ? "#6d28d9" : "#7c3aed",
                fontWeight: 750,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "9px",
                cursor: "pointer",
                boxShadow: filter === "accepted" ? "0 2px 6px rgba(124, 58, 237, 0.1)" : "none",
              }}
            >
              Đã đồng ý ({acceptedCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter("declined")}
              style={{
                border: "none",
                background: filter === "declined" ? "#ffffff" : "transparent",
                color: filter === "declined" ? "#6d28d9" : "#7c3aed",
                fontWeight: 750,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "9px",
                cursor: "pointer",
                boxShadow: filter === "declined" ? "0 2px 6px rgba(124, 58, 237, 0.1)" : "none",
              }}
            >
              Đã từ chối ({declinedCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              style={{
                border: "none",
                background: filter === "all" ? "#ffffff" : "transparent",
                color: filter === "all" ? "#6d28d9" : "#7c3aed",
                fontWeight: 750,
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "9px",
                cursor: "pointer",
                boxShadow: filter === "all" ? "0 2px 6px rgba(124, 58, 237, 0.1)" : "none",
              }}
            >
              Tất cả ({requests.length})
            </button>
          </div>

          {/* Danh sách yêu cầu học sinh */}
          {filteredRequests.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                background: "#faf5ff",
                borderRadius: "18px",
                border: "1.5px dashed #d8b4fe",
                color: "#6b7280",
              }}
            >
              <span style={{ fontSize: "32px" }}>📬</span>
              <h3 style={{ color: "#581c87", margin: "10px 0 4px" }}>
                {filter === "pending"
                  ? "Không có yêu cầu nào đang chờ duyệt"
                  : filter === "accepted"
                  ? "Chưa có học sinh nào được đồng ý"
                  : "Không có yêu cầu nào"}
              </h3>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Khi học sinh bấm "Xin vào lớp", thông báo và danh sách sẽ hiển thị ngay tại đây.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {filteredRequests.map((req) => {
                const isPending = req.status === "pending";
                const isAccepted = req.status === "accepted";
                const isProcessing = processingId === req.id;

                return (
                  <div
                    key={req.id}
                    style={{
                      background: "#ffffff",
                      border: isPending ? "1.5px solid #c084fc" : "1px solid #e5e7eb",
                      borderRadius: "16px",
                      padding: "18px",
                      boxShadow: isPending ? "0 4px 14px rgba(124, 58, 237, 0.08)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      {/* Header học sinh */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {req.student.avatarUrl ? (
                            <img
                              src={req.student.avatarUrl}
                              alt={req.student.displayName}
                              style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "50%",
                                background: "#8b5cf6",
                                color: "#ffffff",
                                fontWeight: 800,
                                fontSize: "15px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {req.student.avatar || req.student.displayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <strong style={{ fontSize: "14px", color: "#1f2937", display: "block" }}>
                              {req.student.displayName}
                            </strong>
                            <span style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700 }}>
                              Mã HS: {req.student.studentCode}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: isPending ? "#fef9c3" : isAccepted ? "#dcfce7" : "#fee2e2",
                            color: isPending ? "#854d0e" : isAccepted ? "#15803d" : "#991b1b",
                          }}
                        >
                          {isPending ? "Chờ duyệt" : isAccepted ? "Đã đồng ý" : "Đã từ chối"}
                        </span>
                      </div>

                      {/* Thông tin lớp xin vào & học lực */}
                      <div style={{ background: "#faf5ff", padding: "10px 12px", borderRadius: "10px", fontSize: "12px", color: "#4b5563", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>🎯 Xin vào: <strong style={{ color: "#6d28d9" }}>{req.classroom.name}</strong> ({req.classroom.subject})</div>
                        {req.student.school && <div>🏫 Trường: {req.student.school}</div>}
                        <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                          <span>🌸 Điểm sen: <strong>{req.student.lotusPoints}</strong></span>
                          {req.student.score !== null && req.student.score !== undefined && (
                            <span>📊 Điểm kiểm tra: <strong>{req.student.score}/10</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px dashed #e5e7eb" }}>
                      <button
                        type="button"
                        onClick={() => onOpenDetail(req)}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          borderRadius: "8px",
                          border: "1px solid #d8b4fe",
                          background: "#ffffff",
                          color: "#7c3aed",
                          cursor: "pointer",
                        }}
                      >
                        Xem chi tiết
                      </button>

                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleQuickRespond(req.id, "accepted", req.student.displayName, req.classroom.name)}
                            style={{
                              flex: 1,
                              padding: "7px 10px",
                              fontSize: "12px",
                              fontWeight: 750,
                              borderRadius: "8px",
                              border: "none",
                              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                              color: "#ffffff",
                              cursor: isProcessing ? "wait" : "pointer",
                            }}
                          >
                            Đồng ý
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleQuickRespond(req.id, "declined", req.student.displayName, req.classroom.name)}
                            style={{
                              padding: "7px 10px",
                              fontSize: "12px",
                              fontWeight: 700,
                              borderRadius: "8px",
                              border: "1px solid #fecaca",
                              background: "#fef2f2",
                              color: "#dc2626",
                              cursor: isProcessing ? "wait" : "pointer",
                            }}
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {/* ===================== MODAL MỞ LỚP HỌC THÊM ===================== */}
      {showCreateModal && (
        <div className="student-modal-backdrop" onClick={() => !creating && setShowCreateModal(false)}>
          <div
            className="student-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px", padding: "26px", borderRadius: "20px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                  <Icon name="school" size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#1f2937", fontWeight: 800 }}>Mở lớp học thêm mới</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Lớp học ngoại khóa, bồi dưỡng hoặc CLB tự nguyện</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !creating && setShowCreateModal(false)}
                style={{ border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: "#9ca3af" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExtraClass} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 750, color: "#374151", marginBottom: "5px" }}>
                  Tên lớp học thêm <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: CLB Toán Tư Duy & Khám Phá Lớp 1"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "13.5px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 750, color: "#374151", marginBottom: "5px" }}>
                    Mã hiển thị (Ký hiệu)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CLB-TOAN"
                    value={newClassLabel}
                    onChange={(e) => setNewClassLabel(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #d1d5db",
                      fontSize: "13px",
                      outline: "none",
                      textTransform: "uppercase",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 750, color: "#374151", marginBottom: "5px" }}>
                    Môn học
                  </label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #d1d5db",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 750, color: "#374151", marginBottom: "5px" }}>
                  Lịch học cố định (Hiện trên thẻ lớp cho học sinh)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tối Thứ 3 & Thứ 6 (19:30 - 20:30)"
                  value={newClassSchedule}
                  onChange={(e) => setNewClassSchedule(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 750, color: "#374151", marginBottom: "5px" }}>
                  Mô tả / Giới thiệu về lớp
                </label>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu bồi dưỡng, phương pháp học, đối tượng học sinh có thể tham gia..."
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #d1d5db",
                    fontSize: "13px",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 750, color: "#374151", marginBottom: "6px" }}>
                  Màu sắc nhận diện
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { id: "purple", bg: "#7c3aed" },
                    { id: "teal", bg: "#0d9488" },
                    { id: "pink", bg: "#db2777" },
                    { id: "amber", bg: "#d97706" },
                    { id: "blue", bg: "#2563eb" },
                    { id: "green", bg: "#16a34a" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewClassColor(c.id)}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: c.bg,
                        border: newClassColor === c.id ? "3px solid #111827" : "2px solid transparent",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 750,
                    cursor: creating ? "wait" : "pointer",
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
                  }}
                >
                  {creating ? "Đang tạo..." : "Mở lớp ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrClassroom && (
        <ClassroomQrModal
          classroom={qrClassroom}
          onClose={() => setQrClassroom(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
}
