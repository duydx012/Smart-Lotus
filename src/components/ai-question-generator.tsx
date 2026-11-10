"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { smartLotusApi, type ClassLearningProfile } from "@/lib/api";
import type { Classroom } from "@/lib/student-data";
import type { Difficulty } from "@/lib/placement";
import type { QuizQuestion } from "@/lib/learning-data";

const SAMPLE_TOPICS = [
  "Phép cộng, trừ trong phạm vi 10 (Toán 1)",
  "Phép cộng, trừ trong phạm vi 20 (Toán 1)",
  "Phép cộng, trừ có nhớ trong phạm vi 100 (Toán 2)",
  "Bảng nhân 2, 3, 4, 5 (Toán 2)",
  "Bảng nhân, chia 6, 7, 8, 9 (Toán 3)",
  "Hình học trực quan & Đo lường (Toán 3)",
  "Phân số và các phép tính với phân số (Toán 4)",
  "Giải bài toán tìm hai số khi biết tổng và hiệu (Toán 4)",
  "Số thập phân & Phép tính số thập phân (Toán 5)",
  "Toán chuyển động đều (Toán 5)",
];

const DIFFICULTY_MAP: Record<Difficulty, { label: string; color: string; bg: string }> = {
  A: { label: "Mức A - Nhận biết", color: "#16a34a", bg: "#f0fdf4" },
  B: { label: "Mức B - Thông hiểu", color: "#2563eb", bg: "#eff6ff" },
  C: { label: "Mức C - Vận dụng", color: "#d97706", bg: "#fffbeb" },
  D: { label: "Mức D - Vận dụng cao", color: "#dc2626", bg: "#fef2f2" },
  E: { label: "Mức E - Thử thách mở rộng", color: "#7c3aed", bg: "#faf5ff" },
};

export default function AiQuestionGenerator({
  onToast,
  onGoToAssignments,
}: {
  onToast: (msg: string) => void;
  onGoToAssignments?: () => void;
}) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classProfile, setClassProfile] = useState<ClassLearningProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Form states
  const [topic, setTopic] = useState("Phép cộng, trừ trong phạm vi 20 (Toán 1)");
  const [customTopic, setCustomTopic] = useState("");
  const [count, setCount] = useState<number>(10);
  const [selectedDiffs, setSelectedDiffs] = useState<Difficulty[]>(["A", "B", "C"]);
  const [refDoc, setRefDoc] = useState("");
  const [showRefBox, setShowRefBox] = useState(false);

  // Generation states
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [lastGenSource, setLastGenSource] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    let active = true;
    void smartLotusApi.getClassrooms("all").then(({ classrooms: items }) => {
      if (!active) return;
      setClassrooms(items);
      if (items.length > 0) {
        setSelectedClassId(String(items[0].id));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setClassProfile(null);
      return;
    }
    const cid = Number(selectedClassId);
    if (!Number.isSafeInteger(cid) || cid <= 0) return;

    let active = true;
    setLoadingProfile(true);
    void smartLotusApi
      .getClassroom(String(cid))
      .then((details) => {
        if (!active) return;
        const profile = details.classProfile ?? null;
        setClassProfile(profile);
        if (profile?.recommendedDifficulties && profile.recommendedDifficulties.length > 0) {
          setSelectedDiffs(profile.recommendedDifficulties);
        }
      })
      .catch(() => {
        if (active) setClassProfile(null);
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [selectedClassId]);

  function toggleDiff(d: Difficulty) {
    if (selectedDiffs.includes(d)) {
      if (selectedDiffs.length > 1) {
        setSelectedDiffs(selectedDiffs.filter((item) => item !== d));
      } else {
        onToast("Cần giữ ít nhất 1 mức độ khó");
      }
    } else {
      setSelectedDiffs([...selectedDiffs, d]);
    }
  }

  async function handleGenerate(isVariation = false) {
    const finalTopic = customTopic.trim() || topic;
    if (!finalTopic) {
      onToast("Vui lòng chọn hoặc nhập chủ đề bài học");
      return;
    }

    setGenerating(true);
    try {
      const seed = isVariation ? `seed-${Date.now()}` : undefined;
      const res = await smartLotusApi.generateQuiz({
        topic: finalTopic,
        curriculumLevel: 1,
        difficulties: selectedDiffs,
        count,
        classroomId: selectedClassId ? Number(selectedClassId) : undefined,
        referenceDocument: refDoc.trim() ? { name: "Tai-lieu-tham-khao.txt", content: refDoc.trim() } : undefined,
        variationSeed: seed,
      });

      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        setLastGenSource(res.source);
        onToast(`✨ AI đã tạo xong ${res.questions.length} câu hỏi theo chuẩn GDPT 2018!`);
      } else {
        onToast("Không thể sinh câu hỏi. Vui lòng thử lại với chủ đề khác.");
      }
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Lỗi khi sinh câu hỏi AI");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopyAll() {
    if (questions.length === 0) return;
    const text = questions
      .map((q, idx) => {
        const diff = DIFFICULTY_MAP[q.difficulty]?.label ?? q.difficulty;
        const optionsText = q.options.map((opt, oIdx) => `  ${String.fromCharCode(65 + oIdx)}. ${opt}`).join("\n");
        return `Câu ${idx + 1} [${diff}]:\n${q.prompt}\n${optionsText}\n=> Đáp án đúng: ${q.correctAnswer}\n=> Giải thích: ${q.explanation || "Không có"}\n`;
      })
      .join("\n-------------------------\n\n");

    void navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      onToast("Đã sao chép toàn bộ bộ câu hỏi vào bộ nhớ tạm!");
      setTimeout(() => setCopySuccess(false), 2500);
    });
  }

  return (
    <div className="view-stack ai-question-generator-page" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* ================= HEADER TÍNH NĂNG ================= */}
      <section
        style={{
          background: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 50%, #f3e8ff 100%)",
          border: "1.5px solid #d8b4fe",
          borderRadius: "20px",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 4px 16px rgba(168, 85, 247, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
              flexShrink: 0,
            }}
          >
            <Icon name="wand" size={30} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  background: "#7c3aed",
                  color: "#ffffff",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  letterSpacing: "0.5px",
                }}
              >
                TÍNH NĂNG MỚI · SỚM
              </span>
              <span style={{ fontSize: "12px", color: "#6b21a8", fontWeight: 700 }}>AI GDPT 2018 & RAG Engine</span>
            </div>
            <h1 style={{ margin: 0, fontSize: "22px", color: "#581c87", fontWeight: 800 }}>
              Tạo câu hỏi AI thích ứng & phân hóa
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#7e22ce" }}>
              Tự động đọc hồ sơ năng lực lớp học và tài liệu tham khảo để sinh đề trắc nghiệm chuẩn sư phạm.
            </p>
          </div>
        </div>

        {onGoToAssignments && (
          <button
            type="button"
            onClick={onGoToAssignments}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "12px",
              border: "1.5px solid #c084fc",
              background: "#ffffff",
              color: "#6b21a8",
              fontSize: "13px",
              fontWeight: 750,
              cursor: "pointer",
            }}
          >
            <Icon name="book" size={16} />
            <span>Chuyển sang Quản lý bài tập</span>
          </button>
        )}
      </section>

      {/* ================= BẢNG ĐIỀU KHIỂN SINH ĐỀ ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: questions.length > 0 ? "1fr 1.35fr" : "1fr",
          gap: "22px",
          alignItems: "start",
        }}
      >
        {/* CỘT CẤU HÌNH */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e9d5ff",
            borderRadius: "18px",
            padding: "22px",
            boxShadow: "0 4px 14px rgba(124, 58, 237, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Bước 1: Chọn lớp */}
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
              1. Lớp học mục tiêu (Tự động thích ứng năng lực)
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid #d8b4fe",
                fontSize: "13.5px",
                fontWeight: 700,
                color: "#4c1d95",
                background: "#faf5ff",
                outline: "none",
              }}
            >
              <option value="">-- Không chọn (Tạo đề độc lập) --</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.isExtra ? "⭐ [Lớp thêm] " : "🏫 [Lớp chính] "}
                  {c.name} · {c.label} ({c.studentCount ?? 0} HS)
                </option>
              ))}
            </select>

            {/* Profile badge nếu có */}
            {selectedClassId && classProfile && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  fontSize: "11.5px",
                  color: "#166534",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                  <span>📊 Năng lực {classProfile.className}:</span>
                  <span>Điểm TB: {classProfile.averageScore.toFixed(1)}/10</span>
                </div>
                <div>
                  Tốc độ: <strong>{classProfile.speedLabel}</strong> · Thông minh: <strong>{classProfile.intelligenceScore}/100</strong>
                </div>
                <div style={{ fontSize: "11px", color: "#15803d" }}>
                  💡 Khuyến nghị mức độ: {classProfile.recommendedDifficulties.join(", ")}
                </div>
              </div>
            )}
          </div>

          {/* Bước 2: Chọn hoặc nhập chủ đề */}
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
              2. Chủ đề bài học chuẩn GDPT 2018
            </label>
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setCustomTopic("");
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid #d1d5db",
                fontSize: "13px",
                outline: "none",
                marginBottom: "8px",
              }}
            >
              {SAMPLE_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Hoặc gõ chủ đề riêng (ví dụ: Ôn tập hình tam giác, Bảng cửu chương 7...)"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "10px",
                border: "1.5px dashed #c084fc",
                fontSize: "12.5px",
                outline: "none",
              }}
            />
          </div>

          {/* Bước 3: Số lượng câu & Mức độ khó */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
                3. Số lượng câu
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: "8px",
                      border: count === num ? "2px solid #7c3aed" : "1px solid #d1d5db",
                      background: count === num ? "#f3e8ff" : "#ffffff",
                      color: count === num ? "#7c3aed" : "#374151",
                      fontSize: "13px",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: 800, color: "#374151", marginBottom: "6px" }}>
                Độ khó (Chọn mức)
              </label>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["A", "B", "C", "D", "E"] as Difficulty[]).map((d) => {
                  const active = selectedDiffs.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDiff(d)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: "8px",
                        border: active ? "2px solid #7c3aed" : "1px solid #d1d5db",
                        background: active ? "#7c3aed" : "#ffffff",
                        color: active ? "#ffffff" : "#6b7280",
                        fontSize: "12.5px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                      title={DIFFICULTY_MAP[d].label}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bước 4: Tài liệu tham khảo RAG */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: 800, color: "#374151" }}>
                4. Tài liệu tham khảo / Bài tập mẫu (RAG)
              </label>
              <button
                type="button"
                onClick={() => setShowRefBox(!showRefBox)}
                style={{
                  border: "none",
                  background: "none",
                  color: "#7c3aed",
                  fontSize: "11.5px",
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                {showRefBox ? "Thu gọn ▲" : "+ Mở ô dán tài liệu ▼"}
              </button>
            </div>
            {showRefBox && (
              <textarea
                rows={4}
                placeholder="Dán nội dung bài học, đề bài mẫu, hoặc ghi chú phương pháp sư phạm vào đây. AI sẽ phân tích và bám sát chính xác tài liệu này..."
                value={refDoc}
                onChange={(e) => setRefDoc(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #d8b4fe",
                  fontSize: "12.5px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            )}
          </div>

          {/* NÚT SUBMIT TẠO CÂU HỎI */}
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate(false)}
            style={{
              padding: "13px 20px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 800,
              cursor: generating ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <Icon name="wand" size={18} />
            <span>{generating ? "AI đang phân tích và sinh câu hỏi..." : "✨ Tạo bộ câu hỏi ngay bằng AI"}</span>
          </button>
        </div>

        {/* CỘT HIỂN THỊ KẾT QUẢ CÂU HỎI */}
        {questions.length > 0 && (
          <div
            style={{
              background: "#ffffff",
              border: "1.5px solid #e9d5ff",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Header kết quả */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                paddingBottom: "14px",
                borderBottom: "1px dashed #e9d5ff",
              }}
            >
              <div>
                <strong style={{ fontSize: "16px", color: "#1f2937" }}>
                  Đã tạo {questions.length} câu hỏi thành công!
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                  Chủ đề: <strong>{customTopic.trim() || topic}</strong> · Nguồn: {lastGenSource || "AI RAG"}
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 750,
                    color: copySuccess ? "#16a34a" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="copy" size={14} />
                  <span>{copySuccess ? "Đã chép!" : "Sao chép đề"}</span>
                </button>

                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void handleGenerate(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #c084fc",
                    background: "#faf5ff",
                    fontSize: "12px",
                    fontWeight: 750,
                    color: "#7c3aed",
                    cursor: generating ? "wait" : "pointer",
                  }}
                  title="Tự động đổi biến thể số đếm và tạo lại bộ câu hỏi khác"
                >
                  <Icon name="sparkles" size={14} />
                  <span>Đổi biến thể</span>
                </button>
              </div>
            </div>

            {/* Danh sách câu hỏi */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "650px", overflowY: "auto", paddingRight: "4px" }}>
              {questions.map((q, qIdx) => {
                const diffInfo = DIFFICULTY_MAP[q.difficulty] ?? DIFFICULTY_MAP["A"];
                return (
                  <div
                    key={q.id || qIdx}
                    style={{
                      border: "1.5px solid #f3e8ff",
                      borderRadius: "14px",
                      padding: "16px",
                      background: "#fdfcfe",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <strong style={{ fontSize: "14px", color: "#111827", lineHeight: 1.4 }}>
                        Câu {qIdx + 1}: {q.prompt}
                      </strong>
                      <span
                        style={{
                          background: diffInfo.bg,
                          color: diffInfo.color,
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {diffInfo.label}
                      </span>
                    </div>

                    {/* Lưới đáp án */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = opt === q.correctAnswer;
                        const char = String.fromCharCode(65 + oIdx);
                        return (
                          <div
                            key={oIdx}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: `1.5px solid ${isCorrect ? "#86efac" : "#e5e7eb"}`,
                              background: isCorrect ? "#f0fdf4" : "#ffffff",
                              color: isCorrect ? "#15803d" : "#374151",
                              fontSize: "12.5px",
                              fontWeight: isCorrect ? 800 : 500,
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: isCorrect ? "#22c55e" : "#f3f4f6",
                                color: isCorrect ? "#ffffff" : "#4b5563",
                                fontSize: "11px",
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {char}
                            </span>
                            <span>{opt}</span>
                            {isCorrect && <span style={{ marginLeft: "auto", fontSize: "13px" }}>✓</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Giải thích */}
                    {q.explanation && (
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "#f9fafb",
                          border: "1px solid #f3f4f6",
                          fontSize: "12px",
                          color: "#4b5563",
                        }}
                      >
                        💡 <strong>Giải thích:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
