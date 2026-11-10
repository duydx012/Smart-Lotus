"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { smartLotusApi, type ExtraClassTeacher } from "@/lib/api";
import ClassroomFeedView from "./classroom-feed-view";

export default function StudentExtraClasses({ onToast }: { onToast: (msg: string) => void }) {
  const [teachers, setTeachers] = useState<ExtraClassTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [requestingClassId, setRequestingClassId] = useState<string | null>(null);
  const [selectedClassHub, setSelectedClassHub] = useState<{
    id: string;
    name: string;
    label: string;
    subject: string;
    teacherName: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void smartLotusApi
      .getExtraClasses()
      .then((data) => {
        if (!active) return;
        setTeachers(data.teachers);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải danh sách lớp học thêm");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleRequestJoin(teacherName: string, classroomId: string, classroomName: string) {
    setRequestingClassId(classroomId);
    try {
      const res = await smartLotusApi.requestToJoinExtraClass(classroomId);
      onToast(res.message || `Đã gửi yêu cầu vào lớp ${classroomName}!`);
      // Cập nhật trạng thái hiển thị trực tiếp trên UI
      setTeachers((curr) =>
        curr.map((t) => ({
          ...t,
          classrooms: t.classrooms.map((c) =>
            c.id === classroomId ? { ...c, requestStatus: "pending" as const } : c
          ),
        }))
      );
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Không thể gửi yêu cầu xin vào lớp");
    } finally {
      setRequestingClassId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const filteredTeachers = teachers.filter((t) => {
    if (!query) return true;
    const matchName = t.displayName.toLowerCase().includes(query);
    const matchEmail = t.email.toLowerCase().includes(query);
    const matchSchool = (t.school || "").toLowerCase().includes(query);
    const matchClass = t.classrooms.some(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.label.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query)
    );
    return matchName || matchEmail || matchSchool || matchClass;
  });

  if (selectedClassHub) {
    return (
      <ClassroomFeedView
        classroomId={selectedClassHub.id}
        classroomName={selectedClassHub.name}
        classroomLabel={selectedClassHub.label}
        subject={selectedClassHub.subject}
        teacherName={selectedClassHub.teacherName}
        currentRole="student"
        onBack={() => setSelectedClassHub(null)}
        onToast={onToast}
      />
    );
  }

  return (
    <div className="view-stack extra-classes-view">
      <section className="page-intro extra-classes-intro">
        <div>
          <span className="eyebrow purple">
            <Icon name="sparkles" size={15} /> KHÁM PHÁ LỚP HỌC THÊM
          </span>
          <h1>Lớp học thêm & Thầy cô giáo</h1>
          <p>
            Tìm kiếm giáo viên trong trường, xem danh sách các lớp học thêm và gửi yêu cầu xin tham gia lớp để nhận bài tập đặc biệt!
          </p>
        </div>

        <div className="extra-classes-search-bar" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: "260px" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên giáo viên, lớp, trường..."
              style={{
                width: "100%",
                padding: "10px 14px 10px 36px",
                borderRadius: "12px",
                border: "1.5px solid #d8b4fe",
                fontSize: "13px",
                outline: "none",
                background: "#ffffff",
                boxShadow: "0 2px 6px rgba(124, 58, 237, 0.05)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9333ea",
                pointerEvents: "none",
              }}
            >
              <Icon name="target" size={16} />
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {error && <p className="student-form-error" role="alert">{error}</p>}

      {loading ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
          <Icon name="sparkles" size={24} />
          <p style={{ marginTop: "10px", fontWeight: 600 }}>Đang tải danh sách giáo viên & lớp học thêm...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            background: "#faf5ff",
            borderRadius: "18px",
            border: "1.5px dashed #d8b4fe",
          }}
        >
          <span style={{ fontSize: "36px" }}>🎒</span>
          <h3 style={{ fontSize: "16px", color: "#581c87", margin: "12px 0 6px" }}>
            {search ? "Không tìm thấy giáo viên hoặc lớp phù hợp" : "Chưa có giáo viên nào mở lớp"}
          </h3>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            {search ? "Hãy thử nhập từ khóa khác để tìm kiếm." : "Danh sách giáo viên đăng ký tài khoản trên hệ thống sẽ xuất hiện tại đây."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              style={{
                background: "#ffffff",
                border: "1.5px solid #e9d5ff",
                borderRadius: "18px",
                padding: "20px",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Header Thầy Cô */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px dashed #e9d5ff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {teacher.avatarUrl ? (
                    <img
                      src={teacher.avatarUrl}
                      alt={teacher.displayName}
                      style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover", border: "2px solid #c084fc" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(124, 58, 237, 0.2)",
                      }}
                    >
                      {teacher.avatar || teacher.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "15px", color: "#1f2937" }}>{teacher.displayName}</strong>
                      <span
                        style={{
                          background: "#f3e8ff",
                          color: "#6d28d9",
                          fontSize: "10.5px",
                          fontWeight: 750,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          border: "1px solid #d8b4fe",
                        }}
                      >
                        Giáo viên Smart Lotus
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#6b7280", marginTop: "2px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <span>✉️ {teacher.email}</span>
                      {teacher.school && <span>🏫 {teacher.school}</span>}
                      {teacher.province && <span>📍 {teacher.province}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed" }}>
                  {teacher.classrooms.length} lớp đang mở
                </div>
              </div>

              {/* Danh sách các lớp học của thầy cô */}
              {teacher.classrooms.length === 0 ? (
                <div style={{ padding: "14px", background: "#faf5ff", borderRadius: "12px", fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
                  Thầy/Cô hiện tại chưa tạo lớp học nào.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {teacher.classrooms.map((cls) => {
                    const isJoined = cls.membershipStatus === "joined";
                    const isPending = cls.requestStatus === "pending";
                    const isDeclined = cls.requestStatus === "declined";
                    const isRequesting = requestingClassId === cls.id;

                    return (
                      <div
                        key={cls.id}
                        style={{
                          background: isJoined ? "#f0fdf4" : isPending ? "#fefce8" : "#ffffff",
                          border: `1.5px solid ${isJoined ? "#86efac" : isPending ? "#fde047" : "#e5e7eb"}`,
                          borderRadius: "14px",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "10px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                            <strong style={{ fontSize: "13.5px", color: "#111827" }}>{cls.name}</strong>
                            <span
                              style={{
                                background: "#ede9fe",
                                color: "#6d28d9",
                                fontSize: "10px",
                                fontWeight: 800,
                                padding: "2px 7px",
                                borderRadius: "6px",
                              }}
                            >
                              {cls.subject}
                            </span>
                          </div>

                          {cls.description && (
                            <p style={{ fontSize: "11.5px", color: "#4b5563", margin: "4px 0 8px", lineHeight: 1.4 }}>
                              {cls.description}
                            </p>
                          )}

                          {cls.schedule && (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 9px",
                                background: "#faf5ff",
                                border: "1px solid #e9d5ff",
                                color: "#7c3aed",
                                borderRadius: "8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                margin: "3px 0 8px",
                              }}
                            >
                              <Icon name="clock" size={13} />
                              <span>{cls.schedule}</span>
                            </div>
                          )}

                          <div style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "5px" }}>
                            <Icon name="users" size={13} />
                            <span>Sĩ số: {cls.studentCount} học sinh</span>
                          </div>
                        </div>

                        {/* Nút hành động hoặc trạng thái */}
                        <div style={{ paddingTop: "8px", borderTop: "1px dashed #e5e7eb" }}>
                          {isJoined ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedClassHub({
                                  id: cls.id,
                                  name: cls.name,
                                  label: cls.label,
                                  subject: cls.subject,
                                  teacherName: teacher.displayName,
                                })
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "12px",
                                fontWeight: 750,
                                color: "#ffffff",
                                background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                padding: "7px 12px",
                                borderRadius: "8px",
                                width: "100%",
                                justifyContent: "center",
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
                              }}
                            >
                              <Icon name="sparkles" size={14} />
                              <span>Vào Bảng Tin & Tài Liệu Lớp</span>
                            </button>
                          ) : isPending ? (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "11.5px",
                                fontWeight: 750,
                                color: "#854d0e",
                                background: "#fef9c3",
                                border: "1px solid #fde047",
                                padding: "5px 12px",
                                borderRadius: "8px",
                                width: "100%",
                                justifyContent: "center",
                              }}
                            >
                              <span>⏳ Đã gửi yêu cầu · Chờ duyệt</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isRequesting}
                              onClick={() => void handleRequestJoin(teacher.displayName, cls.id, cls.name)}
                              style={{
                                width: "100%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "7px 12px",
                                fontSize: "12px",
                                fontWeight: 750,
                                cursor: isRequesting ? "wait" : "pointer",
                                boxShadow: "0 2px 6px rgba(124, 58, 237, 0.2)",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <Icon name="plus" size={13} />
                              <span>{isRequesting ? "Đang gửi..." : isDeclined ? "Gửi lại yêu cầu xin vào" : "Xin vào lớp"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

