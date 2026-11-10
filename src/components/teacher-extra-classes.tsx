"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { smartLotusApi, type StudentClassroomRequest } from "@/lib/api";

export default function TeacherExtraClasses({
  requests,
  onRefresh,
  onOpenDetail,
  onToast,
}: {
  requests: StudentClassroomRequest[];
  onRefresh: () => void;
  onOpenDetail: (request: StudentClassroomRequest) => void;
  onToast: (msg: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "declined">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted").length;
  const declinedCount = requests.filter((r) => r.status === "declined").length;

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

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
    <div className="view-stack teacher-extra-classes-view">
      <section className="page-intro">
        <div>
          <span className="eyebrow purple">
            <Icon name="school" size={15} /> QUẢN LÝ LỚP HỌC THÊM & DUYỆT HỌC SINH
          </span>
          <h1>Yêu cầu tham gia lớp học</h1>
          <p>
            Xem và phê duyệt các học sinh gửi yêu cầu xin vào lớp học thêm của bạn. Khi được duyệt, học sinh sẽ nhận được toàn bộ bài tập của lớp.
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

      {/* Bộ lọc tab */}
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
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "999px",
                fontWeight: 800,
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
            color: filter === "accepted" ? "#15803d" : "#7c3aed",
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
            color: filter === "declined" ? "#b91c1c" : "#7c3aed",
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
            color: filter === "all" ? "#374151" : "#7c3aed",
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

      {/* Danh sách yêu cầu */}
      {filteredRequests.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "18px",
            border: "1.5px dashed #d8b4fe",
          }}
        >
          <span style={{ fontSize: "32px" }}>🎉</span>
          <h3 style={{ fontSize: "15px", color: "#581c87", margin: "10px 0 4px" }}>
            {filter === "pending"
              ? "Hiện không có yêu cầu nào đang chờ duyệt"
              : filter === "accepted"
              ? "Chưa có yêu cầu nào đã đồng ý"
              : filter === "declined"
              ? "Chưa có yêu cầu nào bị từ chối"
              : "Chưa có học sinh nào gửi yêu cầu xin vào lớp"}
          </h3>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
            Khi học sinh bấm "Xin vào lớp", thông báo và yêu cầu sẽ xuất hiện ngay tại đây.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
          {filteredRequests.map((req) => {
            const isPending = req.status === "pending";
            const isAccepted = req.status === "accepted";
            const isDeclined = req.status === "declined";
            const isBusy = processingId === req.id;

            return (
              <div
                key={req.id}
                style={{
                  background: "#ffffff",
                  border: `1.5px solid ${isPending ? "#c084fc" : isAccepted ? "#86efac" : "#fca5a5"}`,
                  borderRadius: "16px",
                  padding: "16px",
                  boxShadow: isPending ? "0 4px 14px rgba(168, 85, 247, 0.1)" : "0 2px 6px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                          color: "#ffffff",
                          fontWeight: 800,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {req.student.avatar || req.student.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: "14px", color: "#111827", display: "block" }}>
                          {req.student.displayName}
                        </strong>
                        <span style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700 }}>
                          {req.student.studentCode}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        background: isPending ? "#fef3c7" : isAccepted ? "#dcfce7" : "#fee2e2",
                        color: isPending ? "#b45309" : isAccepted ? "#15803d" : "#b91c1c",
                        border: `1px solid ${isPending ? "#fde68a" : isAccepted ? "#86efac" : "#fca5a5"}`,
                      }}
                    >
                      {isPending ? "Chờ duyệt" : isAccepted ? "Đã duyệt" : "Đã từ chối"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      padding: "8px 10px",
                      background: "#faf5ff",
                      borderRadius: "10px",
                      border: "1px solid #ede9fe",
                      fontSize: "11.5px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#6b7280" }}>Lớp xin vào: </span>
                      <strong style={{ color: "#581c87" }}>{req.classroom.name}</strong> ({req.classroom.subject})
                    </div>
                    {req.student.school && (
                      <div style={{ color: "#4b5563" }}>
                        <span>Trường: </span>
                        <strong>{req.student.school}</strong> {req.student.className ? `· Lớp ${req.student.className}` : ""}
                      </div>
                    )}
                    <div style={{ color: "#9ca3af", fontSize: "10.5px" }}>
                      Gửi lúc: {new Date(req.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>

                {/* Hành động */}
                <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px dashed #ede9fe" }}>
                  <button
                    type="button"
                    onClick={() => onOpenDetail(req)}
                    style={{
                      flex: 1,
                      background: "#ffffff",
                      border: "1.5px solid #d8b4fe",
                      color: "#6d28d9",
                      padding: "7px 10px",
                      borderRadius: "8px",
                      fontSize: "11.5px",
                      fontWeight: 750,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <Icon name="book" size={13} />
                    <span>Xem chi tiết</span>
                  </button>

                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleQuickRespond(req.id, "declined", req.student.displayName, req.classroom.name)}
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          padding: "7px 10px",
                          borderRadius: "8px",
                          fontSize: "11.5px",
                          fontWeight: 750,
                          cursor: isBusy ? "wait" : "pointer",
                        }}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleQuickRespond(req.id, "accepted", req.student.displayName, req.classroom.name)}
                        style={{
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          border: "none",
                          color: "#ffffff",
                          padding: "7px 12px",
                          borderRadius: "8px",
                          fontSize: "11.5px",
                          fontWeight: 750,
                          cursor: isBusy ? "wait" : "pointer",
                          boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
                        }}
                      >
                        Đồng ý
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

