"use client";

import { useEffect, useState } from "react";
import type { Classroom, Student } from "@/lib/student-data";
import { studentThemes } from "@/lib/student-data";
import { isAnswerModeCompatible, type AnswerMode, type QuizQuestion } from "@/lib/learning-data";
import { MODE_LABELS } from "./quiz-answer-modes";
import AssignmentImageEditor, { type LibraryImage } from "./assignment-image-editor";
import { QuizIllustration } from "./quiz-illustrations";
import { smartLotusApi, type AssignmentProject, type ClassLearningProfile } from "@/lib/api";
import type { Difficulty } from "@/lib/placement";
import { generateAdaptiveQuizForStudent } from "@/lib/adaptive-quiz-generator";
import { Icon } from "./icons";

function defaultDueDate() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function createQuestion(id: number, topic: string): QuizQuestion {
  return {
    id,
    phase: "normal",
    difficulty: "A",
    skill: topic || "Kiến thức tổng hợp",
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
  };
}

export default function AssignmentBuilder({ onBack, onToast }: { onBack: () => void; onToast: (message: string) => void }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [classProfile, setClassProfile] = useState<ClassLearningProfile | null>(null);
  const [classroomStudents, setClassroomStudents] = useState<Student[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);
  const [refDocText, setRefDocText] = useState("");
  const [refDocName, setRefDocName] = useState("");
  const [refTab, setRefTab] = useState<"paste" | "upload">("paste");
  const [showRefSection, setShowRefSection] = useState(false);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("1");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [duration, setDuration] = useState("20");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [projects, setProjects] = useState<AssignmentProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [step, setStep] = useState<"questions" | "settings">("questions");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isAdaptive, setIsAdaptive] = useState(true);
  const [previewStudentId, setPreviewStudentId] = useState<string>("standard");

  function handleSelectClassroom(newId: string) {
    setClassroomId(newId);
    setClassProfile(null);
    setClassroomStudents([]);
    if (newId) {
      setLoadingProfile(true);
    }
  }

  useEffect(() => {
    void smartLotusApi.getClassrooms().then(({ classrooms: items }) => {
      setClassrooms(items);
      if (items[0]) setClassroomId(items[0].id);
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lớp học");
    });
  }, []);

  useEffect(() => {
    if (!classroomId) {
      setClassProfile(null);
      setClassroomStudents([]);
      setSelectedDifficulties(["A", "B", "C"]);
      setLoadingProfile(false);
      return;
    }
    setClassProfile(null);
    setClassroomStudents([]);
    setLoadingProfile(true);
    let cancelled = false;

    void smartLotusApi
      .getClassroom(classroomId)
      .then((data) => {
        if (cancelled) return;
        setClassroomStudents(data.students || []);
        if (data.classProfile) {
          setClassProfile(data.classProfile);
          setSelectedDifficulties(data.classProfile.recommendedDifficulties);
        } else {
          setClassProfile(null);
          setSelectedDifficulties(["A", "B", "C"]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setClassProfile(null);
        setClassroomStudents([]);
        setSelectedDifficulties(["A", "B", "C"]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  useEffect(() => {
    void smartLotusApi.getAssignmentProjects().then(({ projects: items }) => {
      setProjects(items);
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải bộ dự án");
    });
  }, []);

  useEffect(() => {
    void smartLotusApi.getLibraryImages().then(({ categories }) => {
      setLibraryImages(categories.flatMap(({ category, files }) => files.map((file) => ({ ...file, category }))));
    }).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thư viện hình ảnh");
    });
  }, []);

  async function generateQuestions() {
    const selectedClassroom = classrooms.find((item) => String(item.id) === String(classroomId));
    const selectedTopic = topic.trim() || selectedClassroom?.subject || "Toán học";
    const diffsToUse = selectedDifficulties.length > 0
      ? selectedDifficulties
      : classProfile?.recommendedDifficulties ?? ["A", "B", "C"];

    setLoading(true);
    setError("");
    const className = selectedClassroom?.name || selectedClassroom?.label || classProfile?.displayClassName || "lớp";
    setGenerationNotice(
      classProfile
        ? `Đang phân tích năng lực ${className} (Thông minh: ${classProfile.intelligenceScore}/100, Tốc độ: ${classProfile.speedLabel}, Điểm TB: ${classProfile.averageScore.toFixed(1)}/10) để tạo 10 câu hỏi bằng AI...`
        : "Đang tạo bộ câu hỏi bằng AI..."
    );

    try {
      const generated = await smartLotusApi.generateQuiz({
        topic: selectedTopic,
        curriculumLevel: Number(level),
        difficulties: diffsToUse,
        count: 10,
        classroomId: classroomId || undefined,
        classProfile: classProfile || undefined,
        intelligenceScore: classProfile?.intelligenceScore,
        referenceDocument: refDocText.trim()
          ? {
              name: refDocName.trim() || "Tài liệu đề cương tham khảo",
              content: refDocText.trim(),
            }
          : undefined,
      });

      let baseQuestions: QuizQuestion[] = generated.questions.map((question, index) => ({
        ...question,
        id: index + 1,
        isAdaptive,
      }));

      // Pre-generate individual student variants if isAdaptive is true
      if (isAdaptive && classroomStudents.length > 0) {
        const variants: Record<string, QuizQuestion[]> = {};
        classroomStudents.forEach((st, idx) => {
          const assignedTheme = studentThemes[idx % studentThemes.length];
          const interest = st.interest || assignedTheme.label;
          variants[st.id] = generateAdaptiveQuizForStudent({
            studentId: st.id,
            studentName: st.fullName,
            studentStatus: st.status,
            interest,
            topic: selectedTopic,
            curriculumLevel: Number(level),
          });
        });

        baseQuestions = baseQuestions.map((q, idx) => ({
          ...q,
          ...(idx === 0
            ? {
                _adaptiveMeta: { isAdaptive: true, classId: classroomId },
                _variants: variants,
              }
            : {}),
        }));
      }

      setQuestions(baseQuestions);
      setActiveQuestionIndex(0);
      setPreviewStudentId("standard");

      const ragBadgeText = generated.referenceDocName
        ? ` · Kèm đề cương "${generated.referenceDocName}"`
        : " · RAG Chuẩn GDPT 2018";

      const profileSummary = classProfile
        ? `phù hợp cho ${className} (Thông minh: ${classProfile.intelligenceScore}/100 · Tốc độ: ${classProfile.speedLabel} · Điểm TB: ${classProfile.averageScore.toFixed(1)}/10 · Mức độ: ${diffsToUse.join(", ")}${ragBadgeText})`
        : `cho ${className}${ragBadgeText}`;

      const noticeText = isAdaptive
        ? `✨ AI đã tạo xong 10 câu hỏi chuẩn GDPT 2018 và TỰ ĐỘNG PHÂN HÓA ĐỀ RIÊNG cho ${classroomStudents.length > 0 ? `${classroomStudents.length} học sinh` : "từng học sinh"} của ${className}!`
        : (generated.source === "ai"
            ? (generated.questions.length === 10
                ? `AI đã tạo đủ 10 câu hỏi ${profileSummary}.`
                : `AI đã tạo ${generated.questions.length}/10 câu hỏi ${profileSummary}.`)
            : `AI đã tạo 10 câu hỏi thông minh ${profileSummary}.`);

      setGenerationNotice(noticeText);
      onToast(`✓ Đã tạo đề thành công cho ${className}`);

      if (!title.trim()) setTitle(`Bài tập: ${selectedTopic} - ${className}`);
      setTopic(selectedTopic);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Không thể tạo câu hỏi");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(index: number, update: Partial<QuizQuestion>) {
    if (previewStudentId !== "standard") {
      setQuestions((current) => {
        if (!current.length) return current;
        const variants = { ...((current[0] as any)?._variants ?? {}) };
        const list = [...(variants[previewStudentId] ?? [])];
        if (list[index]) {
          list[index] = { ...list[index], ...update };
          variants[previewStudentId] = list;
          return current.map((q, qIdx) => qIdx === 0 ? { ...q, _variants: variants } : q);
        }
        return current;
      });
      return;
    }
    setQuestions((current) => current.map((question, questionIndex) => (
      questionIndex === index ? { ...question, ...update } : question
    )));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    if (previewStudentId !== "standard") {
      setQuestions((current) => {
        if (!current.length) return current;
        const variants = { ...((current[0] as any)?._variants ?? {}) };
        const list = [...(variants[previewStudentId] ?? [])];
        if (list[questionIndex]) {
          const q = list[questionIndex];
          const options = q.options.map((opt: string, aIdx: number) => aIdx === optionIndex ? value : opt);
          list[questionIndex] = {
            ...q,
            options,
            correctAnswer: q.correctAnswer === q.options[optionIndex] ? "" : q.correctAnswer,
          };
          variants[previewStudentId] = list;
          return current.map((item, qIdx) => qIdx === 0 ? { ...item, _variants: variants } : item);
        }
        return current;
      });
      return;
    }
    setQuestions((current) => current.map((question, index) => {
      if (index !== questionIndex) return question;
      const options = question.options.map((option, answerIndex) => answerIndex === optionIndex ? value : option);
      return {
        ...question,
        options,
        correctAnswer: question.correctAnswer === question.options[optionIndex] ? "" : question.correctAnswer,
      };
    }));
  }

  function updateAnswerMode(index: number, answerMode: AnswerMode) {
    updateQuestion(index, {
      answerMode,
      options: answerMode === "choice" ? ["", "", "", ""]
        : answerMode === "image-choice" || answerMode === "image-select" ? ["A", "B", "C", "D"] : [],
      correctAnswer: "",
      optionImageIds: answerMode === "image-choice" || answerMode === "image-select" ? [null, null, null, null] : undefined,
    });
  }

  function setImageChoiceCorrect(questionIndex: number, option: string, checked: boolean) {
    const question = questions[questionIndex];
    if (!question) return;
    if (question.answerMode === "image-select") {
      const selected = new Set(question.correctAnswer.split("|").filter(Boolean));
      if (checked) selected.add(option);
      else selected.delete(option);
      const correctAnswer = question.options.filter((item) => selected.has(item)).join("|");
      updateQuestion(questionIndex, { correctAnswer });
    } else {
      updateQuestion(questionIndex, { correctAnswer: checked ? option : "" });
    }
  }

  function setOptionImage(questionIndex: number, optionIndex: number, assetId: string) {
    const question = questions[questionIndex];
    if (!question) return;
    const optionImageIds = [...(question.optionImageIds ?? question.options.map(() => null))];
    optionImageIds[optionIndex] = assetId || null;
    updateQuestion(questionIndex, { optionImageIds });
  }

  function addQuestion() {
    if (questions.length >= 20) return;
    setQuestions((current) => [...current, createQuestion(current.length + 1, topic.trim())]);
    setActiveQuestionIndex(questions.length);
    setError("");
    setGenerationNotice("");
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current
      .filter((_, questionIndex) => questionIndex !== index)
      .map((question, questionIndex) => ({ ...question, id: questionIndex + 1 })));
    setActiveQuestionIndex((active) => active > index ? active - 1 : active === index ? Math.max(0, index - 1) : active);
    setError("");
    setGenerationNotice("");
  }

  function questionValidationError() {
    if (!questions.length) return "Hãy tạo bộ câu hỏi trước khi tiếp tục.";
    const incompleteIndex = questions.findIndex((question) => {
      if (!question.prompt.trim()) return true;
      const mode = question.answerMode ?? "choice";
      if (mode === "image-choice" || mode === "image-select") {
        return question.options.length !== 4 || !isAnswerModeCompatible(question, mode);
      }
      if (mode !== "choice") return !question.correctAnswer.trim();
      return question.options.length !== 4
        || question.options.some((option) => !option.trim())
        || new Set(question.options.map((option) => option.trim())).size !== 4
        || !question.options.includes(question.correctAnswer);
    });
    if (incompleteIndex !== -1) {
      const question = questions[incompleteIndex];
      const mode = question.answerMode ?? "choice";
      return mode === "image-choice" || mode === "image-select"
        ? `Câu ${incompleteIndex + 1} cần đủ 4 ảnh đáp án và chọn đáp án đúng.`
        : mode === "choice"
          ? `Câu ${incompleteIndex + 1} cần có đề bài, 4 đáp án khác nhau và một đáp án đúng.`
          : `Câu ${incompleteIndex + 1} cần có đề bài và đáp án số.`;
    }
    const incompatibleIndex = questions.findIndex((question) =>
      !isAnswerModeCompatible(question, question.answerMode ?? "choice"),
    );
    if (incompatibleIndex !== -1) {
      return `Kiểu trả lời của câu ${incompatibleIndex + 1} không phù hợp với nội dung đáp án.`;
    }
    return "";
  }

  function continueToSettings() {
    const validationError = questionValidationError();
    if (validationError) return setError(validationError);
    setError("");
    setStep("settings");
  }

  async function openProject() {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const { project } = await smartLotusApi.getAssignmentProject(projectId);
      if (!project.questions) throw new Error("Bộ dự án không có dữ liệu câu hỏi.");
      setQuestions(project.questions);
      setActiveQuestionIndex(0);
      setTopic(project.topic);
      setLevel(String(project.curriculumLevel));
      setTitle(project.name);
      setStep("questions");
      setGenerationNotice("Đã mở bộ dự án. Hãy cập nhật nội dung trước khi giao bài.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể mở bộ dự án");
    } finally {
      setLoading(false);
    }
  }

  async function saveProject() {
    const validationError = questionValidationError();
    if (validationError) return setError(validationError);
    const name = title.trim() || topic.trim();
    if (!name) return setError("Nhập tên bài tập trước khi lưu bộ dự án.");
    setLoading(true);
    setError("");
    try {
      const { project } = await smartLotusApi.saveAssignmentProject({
        ...(projectId ? { id: projectId } : {}),
        name,
        topic: topic.trim() || name,
        curriculumLevel: Number(level),
        questions,
      });
      setProjectId(project.id);
      const { projects: items } = await smartLotusApi.getAssignmentProjects();
      setProjects(items);
      onToast("Đã lưu bộ dự án vào tài khoản giáo viên.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu bộ dự án");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject() {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      await smartLotusApi.deleteAssignmentProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
      setProjectId("");
      onToast("Đã xóa bộ dự án.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa bộ dự án");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!classroomId) return setError("Hãy tạo lớp học trước khi giao bài.");
    if (!title.trim()) return setError("Vui lòng nhập tên bài tập.");
    if (!topic.trim()) return setError("Vui lòng nhập chủ đề bài tập.");
    const validationError = questionValidationError();
    if (validationError) return setError(validationError);
    const dueAt = new Date(dueDate);
    if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) return setError("Hạn nộp phải ở thời điểm trong tương lai.");
    setLoading(true);
    setError("");
    try {
      await smartLotusApi.createAssignment({
        classroomId,
        title: title.trim(),
        topic: topic.trim(),
        curriculumLevel: Number(level),
        dueAt: dueAt.toISOString(),
        durationMinutes: Number(duration),
        questions,
        isAdaptive,
      });
      onToast("Đã giao bài tập cho lớp.");
      onBack();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Không thể giao bài tập");
    } finally {
      setLoading(false);
    }
  }

  const selectedClass = classrooms.find((c) => String(c.id) === String(classroomId));
  const displayClassName = selectedClass?.name || selectedClass?.label || classProfile?.displayClassName || "lớp";
  const studentVariant = (previewStudentId !== "standard" && (questions[0] as any)?._variants?.[previewStudentId]) as QuizQuestion[] | undefined;
  const activeQuestionsList = studentVariant || questions;
  const previewStudent = classroomStudents.find((s) => s.id === previewStudentId);
  const previewStudentIndex = classroomStudents.findIndex((s) => s.id === previewStudentId);
  const previewStudentTheme = previewStudentIndex >= 0 ? studentThemes[previewStudentIndex % studentThemes.length] : null;

  return (
    <div className="assignment-shell">
      <header className="assignment-header">
        <div className="assignment-header-left">
          <button className="icon-button" onClick={onBack} aria-label="Quay lại"><Icon name="arrow" className="rotate-left" /></button>
          <div>
            <span className="section-kicker">BÀI TẬP · BƯỚC {step === "questions" ? "1/2" : "2/2"}</span>
            <h1>{step === "questions" ? "Soạn đề bài" : "Cài đặt bài tập"}</h1>
          </div>
        </div>
        <div className="assignment-project-picker">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} aria-label="Bộ dự án đã lưu">
            <option value="">Mở bộ dự án đã lưu...</option>
            {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
          </select>
          <button type="button" className="secondary-button" onClick={() => void openProject()} disabled={!projectId || loading}>
            Mở dự án
          </button>
        </div>
      </header>

      {step === "questions" ? (
        <div className="assignment-layout assignment-compose-layout">
          <section className="assignment-panel assignment-questions assignment-compose">
            
            {/* Header thanh công cụ soạn đề với nút mở Pop-up AI */}
            <div className="assignment-questions-heading">
              <div>
                <h2>Đề bài và đáp án</h2>
                <p>Tùy chỉnh nội dung câu hỏi, hình ảnh và đáp án chi tiết.</p>
              </div>
              <div className="assignment-heading-actions">
                {questions.length > 0 && (
                  <button
                    type="button"
                    className="assignment-open-ai-btn"
                    onClick={() => setShowAiModal(true)}
                    disabled={loading}
                  >
                    <Icon name="sparkles" size={15} /> Tạo lại bằng AI
                  </button>
                )}
                <span className="assignment-count">{questions.length}/20 câu</span>
              </div>
            </div>

            {/* Thông báo kết quả tạo đề nếu có */}
            {generationNotice && (
              <div className={`assignment-ai-notice-banner ${generationNotice.startsWith("AI chưa") || generationNotice.startsWith("Ollama chỉ") ? "fallback" : "success"}`}>
                <Icon name={generationNotice.startsWith("AI chưa") ? "flame" : "check"} size={16} />
                <span>{generationNotice}</span>
                <button
                  type="button"
                  className="close-notice-btn"
                  onClick={() => setGenerationNotice("")}
                  aria-label="Đóng thông báo"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Thanh chuyển đổi xem trước Đề cá nhân hóa theo từng học sinh */}
            {isAdaptive && questions.length > 0 && classroomStudents.length > 0 && (
              <div
                style={{
                  background: "#ffffff",
                  border: "1.5px solid #d8b4fe",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  marginBottom: "14px",
                  boxShadow: "0 2px 8px rgba(124, 58, 237, 0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <span style={{ background: "#f3e8ff", color: "#6d28d9", fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px" }}>
                      ✨ XEM TRƯỚC THEO HỌC SINH
                    </span>
                    <span style={{ fontSize: "12px", color: "#4b5563", fontWeight: 600 }}>
                      Xem trước đề thi biến thể mà AI sẽ phát cho từng em:
                    </span>
                  </div>
                  {previewStudentId !== "standard" && (
                    <button
                      type="button"
                      onClick={() => setPreviewStudentId("standard")}
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "7px",
                        padding: "3px 10px",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: "#374151",
                        cursor: "pointer",
                      }}
                    >
                      ↩ Về đề chuẩn giáo viên
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setPreviewStudentId("standard")}
                    style={{
                      border: previewStudentId === "standard" ? "1.5px solid #7c3aed" : "1px solid #e5e7eb",
                      background: previewStudentId === "standard" ? "#ede9fe" : "#ffffff",
                      color: previewStudentId === "standard" ? "#5b21b6" : "#4b5563",
                      fontWeight: 700,
                      fontSize: "11.5px",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    📚 Đề chuẩn giáo viên
                  </button>

                  {classroomStudents.map((st, i) => {
                    const theme = studentThemes[i % studentThemes.length];
                    const isSelected = previewStudentId === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setPreviewStudentId(st.id)}
                        style={{
                          border: isSelected ? "1.5px solid #7c3aed" : "1px solid #e5e7eb",
                          background: isSelected ? "#ede9fe" : "#ffffff",
                          color: isSelected ? "#5b21b6" : "#374151",
                          fontWeight: 700,
                          fontSize: "11.5px",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                          boxShadow: isSelected ? "0 2px 6px rgba(124, 58, 237, 0.15)" : "none",
                        }}
                      >
                        <span>{theme.emoji}</span>
                        <span>{st.fullName}</span>
                        <small style={{ fontSize: "10px", color: isSelected ? "#6d28d9" : "#9ca3af" }}>
                          ({theme.label.split(" ")[0]})
                        </small>
                      </button>
                    );
                  })}
                </div>

                {previewStudent && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#faf5ff",
                      border: "1px solid #e9d5ff",
                      fontSize: "11.5px",
                      color: "#6b21a8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>{previewStudentTheme?.emoji || "⭐"}</span>
                      <span>
                        Đang xem đề riêng cho <strong>{previewStudent.fullName}</strong> · Chủ đề: <strong>{previewStudentTheme?.label || previewStudent.interest}</strong> ({previewStudentTheme?.examples}) · Năng lực: <strong>{previewStudent.status}</strong>
                      </span>
                    </div>
                    {(studentVariant?.[0] as any)?.personalizedFor?.generatedBy === "ai" ? (
                      <span style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7", padding: "2px 8px", borderRadius: "6px", fontSize: "10.5px", fontWeight: 800 }}>
                        🤖 Sáng tác bởi AI Ollama
                      </span>
                    ) : (
                      <span style={{ background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd", padding: "2px 8px", borderRadius: "6px", fontSize: "10.5px", fontWeight: 800 }}>
                        🎯 Đề thích ứng 38+ dạng bài
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tabs danh sách các câu hỏi */}
            {activeQuestionsList.length > 0 && (
              <nav className="assignment-question-tabs" aria-label="Chọn câu hỏi để chỉnh sửa">
                {activeQuestionsList.map((question, index) => (
                  <button
                    type="button"
                    key={`${question.id}-tab`}
                    className={activeQuestionIndex === index ? "active" : ""}
                    onClick={() => setActiveQuestionIndex(index)}
                    aria-current={activeQuestionIndex === index ? "step" : undefined}
                  >
                    Câu {index + 1}
                    {!question.prompt.trim() && <i aria-label="Chưa nhập đề bài" />}
                  </button>
                ))}
              </nav>
            )}

            {/* Trình soạn thảo câu hỏi đang chọn hoặc trạng thái rỗng */}
            {activeQuestionsList.length ? (
              <ol className="assignment-question-list">
                {activeQuestionsList.map((question, index) => index === activeQuestionIndex ? (
                  <li key={`${question.id}-${index}`} className="assignment-question-editor">
                    <div className="assignment-question-editor-heading">
                      <strong>Câu {index + 1}</strong>
                      <button type="button" className="assignment-remove-question" onClick={() => removeQuestion(index)} aria-label={`Xóa câu ${index + 1}`}>
                        <Icon name="trash" size={15} /> Xóa câu
                      </button>
                    </div>
                    <label className="assignment-question-prompt">
                      Đề bài
                      <textarea
                        value={question.prompt}
                        onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                        placeholder="Nhập nội dung câu hỏi..."
                        rows={2}
                      />
                    </label>
                    <label className="assignment-question-mode">
                      Kiểu trả lời của học sinh
                      <select
                        value={question.answerMode ?? "choice"}
                        onChange={(event) => updateAnswerMode(index, event.target.value as AnswerMode)}
                      >
                        {Object.entries(MODE_LABELS).map(([value, label]) => (
                          <option value={value} key={value}>{label}</option>
                        ))}
                      </select>
                      <small>Mỗi câu có thể dùng kiểu làm bài riêng: chọn chữ, ảnh hoặc đáp án số.</small>
                    </label>
                    <AssignmentImageEditor
                      question={question}
                      libraryImages={libraryImages}
                      onChange={(updated) => updateQuestion(index, updated)}
                    />
                    {(question.answerMode ?? "choice") === "choice" && (
                      <fieldset className="assignment-answer-options">
                        <legend>Các lựa chọn trả lời<span>(chọn nút tròn để đánh dấu đáp án đúng)</span></legend>
                        {question.options.map((option, optionIndex) => (
                          <label key={optionIndex} className={`assignment-answer-option${question.correctAnswer === option && option ? " is-correct" : ""}`}>
                            <input
                              type="radio"
                              name={`correct-answer-${index}`}
                              checked={question.correctAnswer === option && option !== ""}
                              onChange={() => updateQuestion(index, { correctAnswer: option })}
                              disabled={!option.trim()}
                              aria-label={`Chọn đáp án ${String.fromCharCode(65 + optionIndex)} làm đáp án đúng`}
                            />
                            <span className="assignment-answer-letter">{String.fromCharCode(65 + optionIndex)}</span>
                            <input
                              type="text"
                              value={option}
                              onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                              placeholder={`Đáp án ${String.fromCharCode(65 + optionIndex)}`}
                            />
                            {question.correctAnswer === option && option && <Icon name="check" size={16} />}
                          </label>
                        ))}
                      </fieldset>
                    )}
                    {(question.answerMode === "image-choice" || question.answerMode === "image-select") && (
                      <div className="assignment-image-answer-options">
                        <p><strong>Gán ảnh vào từng đáp án:</strong></p>
                        {question.options.map((option, optionIndex) => {
                          const assetId = question.optionImageIds?.[optionIndex] ?? "";
                          const asset = question.imageAssets?.find((item) => item.id === assetId);
                          const isCorrect = question.answerMode === "image-select"
                            ? question.correctAnswer.split("|").includes(option)
                            : question.correctAnswer === option;
                          return (
                            <div key={option} className="assignment-image-answer-option">
                              <input
                                type={question.answerMode === "image-select" ? "checkbox" : "radio"}
                                name={`image-correct-${index}`}
                                checked={isCorrect}
                                onChange={(event) => setImageChoiceCorrect(index, option, event.target.checked)}
                              />
                              <strong>{option}</strong>
                              <select
                                value={assetId}
                                onChange={(event) => setOptionImage(index, optionIndex, event.target.value)}
                              >
                                <option value="">Chọn ảnh đã thêm ở trên</option>
                                {question.imageAssets?.map((item) => (
                                  <option value={item.id} key={item.id}>{item.name}</option>
                                ))}
                              </select>
                              {asset && <img src={asset.src} alt={asset.name} />}
                            </div>
                          );
                        })}
                        <small>Thêm ảnh vào câu hỏi trước, sau đó chọn ảnh tương ứng với các đáp án A, B, C, D.</small>
                      </div>
                    )}
                    {!["choice", "image-choice", "image-select"].includes(question.answerMode ?? "choice") && (
                      <label className="assignment-question-prompt assignment-question-correct-answer">
                        Đáp án đúng (số)
                        <input
                          type="text"
                          value={question.correctAnswer}
                          onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })}
                          placeholder="Nhập đáp án số"
                          aria-label={`Đáp án đúng bằng số cho câu ${index + 1}`}
                        />
                        <small>{MODE_LABELS[question.answerMode ?? "choice"]} dùng đáp án số; học sinh sẽ trả lời theo kiểu này.</small>
                      </label>
                    )}
                    <label className="assignment-question-prompt assignment-question-explanation">
                      Lời giải (không bắt buộc)
                      <textarea
                        value={question.explanation}
                        onChange={(event) => updateQuestion(index, { explanation: event.target.value })}
                        placeholder="Giải thích đáp án đúng..."
                        rows={2}
                      />
                    </label>
                    <aside className="assignment-live-preview" aria-label={`Xem trước câu hỏi ${index + 1}`}>
                      <div className="assignment-live-preview-heading">
                        <div><span className="assignment-preview-eyebrow">GIAO DIỆN HỌC SINH</span><strong>Xem trước câu {index + 1}</strong></div>
                        <span>{MODE_LABELS[question.answerMode ?? "choice"]}</span>
                      </div>
                      <p>{question.prompt || "Nội dung đề bài sẽ hiển thị ở đây."}</p>
                      <QuizIllustration question={question} />
                      {(question.answerMode ?? "choice") === "choice" && (
                        <div className="assignment-live-preview-options">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex}><b>{String.fromCharCode(65 + optionIndex)}</b><span>{option || `Đáp án ${String.fromCharCode(65 + optionIndex)}`}</span></div>
                          ))}
                        </div>
                      )}
                      {(question.answerMode === "image-choice" || question.answerMode === "image-select") && (
                        <div className="assignment-live-preview-options image">
                          {question.options.map((option, optionIndex) => {
                            const assetId = question.optionImageIds?.[optionIndex];
                            const asset = question.imageAssets?.find((item) => item.id === assetId);
                            return (
                              <div key={option}>
                                {asset && <img src={asset.src} alt={asset.name} />}
                                <span>{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {!["choice", "image-choice", "image-select"].includes(question.answerMode ?? "choice") && (
                        <div className="assignment-live-preview-answer">
                          {question.answerMode === "type" ? <><span>Nhập câu trả lời</span><i /></>
                            : question.answerMode === "line" ? <><span>Trục số để chọn đáp án</span><i /></>
                              : question.answerMode === "complete" ? <><span>Các ô ghép phép tính</span><i /></>
                                : question.answerMode === "match" ? <><span>Bảng nối cặp đáp án</span><i /></>
                                  : <><span>Các lựa chọn để chọn</span><i /></>}
                        </div>
                      )}
                    </aside>
                  </li>
                ) : null)}
              </ol>
            ) : (
              <div
                className="assignment-empty-hub"
                style={{
                  padding: "36px 20px",
                  borderRadius: "18px",
                  border: "1.5px dashed #d8b4fe",
                  background: "#fcfaff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "24px",
                  margin: "12px 0 20px",
                }}
              >
                <div style={{ maxWidth: "480px" }}>
                  <div
                    style={{
                      width: "54px",
                      height: "54px",
                      borderRadius: "16px",
                      background: "#f3e8ff",
                      color: "#7c3aed",
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 12px",
                      boxShadow: "0 4px 14px rgba(124, 58, 237, 0.12)",
                    }}
                  >
                    <Icon name="sparkles" size={26} />
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 800, color: "#241b36" }}>
                    Chưa có câu hỏi nào trong đề
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.6 }}>
                    Chọn một phương thức bên dưới để bắt đầu soạn đề kiểm tra:
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "16px",
                    width: "100%",
                    maxWidth: "580px",
                  }}
                >
                  {/* Lựa chọn 1: Tạo bằng AI RAG (Khuyên dùng) */}
                  <div
                    onClick={() => setShowAiModal(true)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "20px 18px",
                      borderRadius: "14px",
                      background: "#ffffff",
                      border: "2px solid #8b5cf6",
                      boxShadow: "0 4px 14px rgba(139, 92, 246, 0.1)",
                      cursor: "pointer",
                      textAlign: "left",
                      position: "relative",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "-10px",
                        right: "14px",
                        background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                        color: "#ffffff",
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "3px 9px",
                        borderRadius: "999px",
                        letterSpacing: "0.4px",
                        boxShadow: "0 2px 6px rgba(124, 58, 237, 0.3)",
                      }}
                    >
                      ★ KHUYÊN DÙNG
                    </span>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ color: "#7c3aed", display: "grid" }}>
                          <Icon name="sparkles" size={17} />
                        </span>
                        <strong style={{ fontSize: "14px", color: "#2e1065", fontWeight: 800 }}>
                          Tạo 10 câu bằng AI
                        </strong>
                      </div>
                      <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#6b7280", lineHeight: 1.5 }}>
                        Tự động phân tích năng lực học sinh & bám sát chuẩn kiến thức GDPT 2018.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        minHeight: "36px",
                        fontSize: "12px",
                        fontWeight: 750,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAiModal(true);
                      }}
                    >
                      <Icon name="sparkles" size={14} /> Mở trình tạo AI
                    </button>
                  </div>

                  {/* Lựa chọn 2: Soạn câu hỏi thủ công */}
                  <div
                    onClick={addQuestion}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "20px 18px",
                      borderRadius: "14px",
                      background: "#ffffff",
                      border: "1.5px solid #e5e7eb",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ color: "#16a34a", display: "grid" }}>
                          <Icon name="plus" size={17} />
                        </span>
                        <strong style={{ fontSize: "14px", color: "#1f2937", fontWeight: 800 }}>
                          Soạn câu hỏi thủ công
                        </strong>
                      </div>
                      <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#6b7280", lineHeight: 1.5 }}>
                        Tự nhập đề bài, 4 phương án trắc nghiệm và lời giải chi tiết theo ý bạn.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        minHeight: "36px",
                        fontSize: "12px",
                        fontWeight: 700,
                        border: "1.5px solid #d1d5db",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        addQuestion();
                      }}
                    >
                      <Icon name="plus" size={14} /> Tự tạo câu hỏi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Nút thêm câu hỏi ở cuối CHỈ hiển thị khi đã có ít nhất 1 câu hỏi */}
            {questions.length > 0 && (
              <div className="assignment-question-actions">
                <button
                  type="button"
                  className="assignment-add-manual"
                  onClick={addQuestion}
                  disabled={loading || questions.length >= 20}
                >
                  <Icon name="plus" /> Thêm câu hỏi thủ công
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="assignment-layout assignment-settings-layout">
          <section className="assignment-panel assignment-settings-panel">
            <h2>Cài đặt bài tập</h2>
            <div className="assignment-form">
              <label>Tên bài tập<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="VD: Ôn tập cộng trừ" /></label>
              <label>Chọn lớp
                <select value={classroomId} onChange={(event) => handleSelectClassroom(event.target.value)}>
                  <option value="">Chọn lớp học</option>
                  {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name} · {classroom.label}</option>)}
                </select>
              </label>
              <label>Chủ đề<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="VD: Cộng trừ trong phạm vi 10" /></label>
              <label>Khối lớp<select value={level} onChange={(event) => setLevel(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>Khối {item}</option>)}</select></label>
              <label>Hạn nộp bài<input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
              <label>Thời gian làm bài
                <span className="assignment-duration"><input type="number" min={1} max={240} value={duration} onChange={(event) => setDuration(event.target.value)} /><em>phút</em></span>
              </label>

              {/* Tùy chọn Cá nhân hóa thích ứng theo từng học sinh */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: "8px",
                  padding: "16px 18px",
                  borderRadius: "14px",
                  border: isAdaptive ? "1.5px solid #a855f7" : "1px solid #e2e8f0",
                  background: isAdaptive ? "linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)" : "#ffffff",
                  boxShadow: isAdaptive ? "0 4px 14px rgba(168, 85, 247, 0.08)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#ede9fe",
                        color: "#6d28d9",
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "4px 9px",
                        borderRadius: "7px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <Icon name="sparkles" size={13} /> AI RAG TỰ ĐỘNG
                    </span>
                    <strong style={{ fontSize: "14px", color: "#3b0764", fontWeight: 700 }}>
                      Phát đề cá nhân hóa theo từng học sinh
                    </strong>
                  </div>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      cursor: "pointer",
                      gap: "8px",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAdaptive}
                      onChange={(e) => setIsAdaptive(e.target.checked)}
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#7c3aed",
                        cursor: "pointer",
                      }}
                    />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: isAdaptive ? "#6d28d9" : "#64748b" }}>
                      {isAdaptive ? "Đang bật" : "Tắt"}
                    </span>
                  </label>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280", lineHeight: 1.55 }}>
                  Khi bật, mỗi học sinh khi bấm vào làm bài sẽ nhận được <strong>bộ đề được AI điều chỉnh riêng</strong>:
                  tự động thích ứng theo năng lực (Cần hỗ trợ / Ổn định / Xuất sắc) và kết hợp câu hỏi với hình ảnh Emoji trực quan theo sở thích của từng em.
                </p>
                {isAdaptive && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, background: "#ffffff", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "3px 10px", borderRadius: "999px" }}>
                      ✨ Đề riêng cho từng em
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, background: "#ffffff", color: "#059669", border: "1px solid #a7f3d0", padding: "3px 10px", borderRadius: "999px" }}>
                      🎯 Thích ứng năng lực
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, background: "#ffffff", color: "#d97706", border: "1px solid #fde68a", padding: "3px 10px", borderRadius: "999px" }}>
                      🦁 Emoji trực quan sinh động
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="assignment-panel assignment-project-panel">
            <span className="section-kicker">DÙNG LẠI LẦN SAU</span>
            <h2>Bộ dự án của tôi</h2>
            <p>Lưu câu hỏi, ảnh và cách sắp xếp vào tài khoản giáo viên để mở lại trên thiết bị khác.</p>
            <label>Tên bộ dự án<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên bộ dự án" /></label>
            <div className="assignment-project-actions">
              <button type="button" className="primary-button" onClick={() => void saveProject()} disabled={loading}>
                {loading ? "Đang lưu..." : projectId ? "Cập nhật bộ dự án" : "Lưu thành bộ dự án"}
              </button>
              {projectId && <button type="button" className="assignment-project-delete" onClick={() => void deleteProject()} disabled={loading}>Xóa bộ dự án</button>}
            </div>
            <div className="assignment-project-summary">
              <strong>Đề hiện tại</strong>
              <span>{questions.length} câu hỏi · Khối {level} · {topic || "Chưa đặt chủ đề"}</span>
              <button type="button" className="secondary-button" onClick={() => setStep("questions")}>Quay lại chỉnh sửa đề</button>
            </div>
          </section>
        </div>
      )}

      {/* POP-UP MODAL: TẠO ĐỀ THÍCH ỨNG BẰNG AI */}
      {showAiModal && (
        <div className="student-modal-backdrop" onClick={() => !loading && setShowAiModal(false)}>
          <section
            className="student-modal assignment-ai-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="student-modal-heading">
              <div className="ai-modal-title-group">
                <span className="assignment-ai-chip"><Icon name="sparkles" size={13} /> AI Thích Ứng Năng Lực</span>
                <h2 id="ai-modal-title">Tạo đề thích ứng theo lớp</h2>
                <p>AI tự động đọc độ thông minh, tốc độ học và điểm số của học sinh để sinh bộ 10 câu phù hợp.</p>
              </div>
              <button
                type="button"
                className="ai-modal-close"
                onClick={() => !loading && setShowAiModal(false)}
                disabled={loading}
                aria-label="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            <div className="ai-modal-body">
              {/* Chọn lớp, chủ đề, khối lớp */}
              <div className="ai-modal-controls-grid">
                <label className="ai-modal-field">
                  <span>Chọn lớp học</span>
                  <select
                    value={classroomId}
                    onChange={(event) => handleSelectClassroom(event.target.value)}
                    autoFocus
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} · {c.label}</option>
                    ))}
                  </select>
                </label>

                <label className="ai-modal-field">
                  <span>Chủ đề bài tập</span>
                  <input
                    type="text"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="VD: Cộng trừ trong phạm vi 10"
                  />
                </label>

                <label className="ai-modal-field">
                  <span>Khối lớp</span>
                  <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((lvl) => (
                      <option key={lvl} value={lvl}>Khối {lvl}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* RAG Banner: Chuẩn GDPT 2018 + Tùy chọn tài liệu giáo viên */}
              <div
                className="ai-rag-banner"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  border: "1.5px solid #86efac",
                  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.08)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <div
                    className="ai-rag-badge"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      color: "#15803d",
                      background: "#ffffff",
                      border: "1.5px solid #86efac",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      width: "fit-content",
                    }}
                  >
                    <span
                      className="ai-rag-dot"
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#22c55e",
                        display: "inline-block",
                        boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.3)",
                      }}
                    />
                    <span>RAG Chuẩn GDPT 2018 (Khối {level})</span>
                  </div>
                  <div
                    className="ai-rag-scope"
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#166534",
                      paddingLeft: "4px",
                    }}
                  >
                    {Number(level) === 1
                      ? "Phạm vi: 0-100 · Không nhớ · Số học & so sánh thuần túy"
                      : Number(level) === 2
                      ? "Phạm vi: 0-1000 · Cộng trừ có nhớ · Bảng nhân/chia 2, 5"
                      : `Chuẩn kiến thức & ma trận Toán Lớp ${level}`}
                  </div>
                </div>

                <button
                  type="button"
                  className="ai-rag-toggle-btn"
                  onClick={() => setShowRefSection((prev) => !prev)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11.5px",
                    fontWeight: 750,
                    color: "#7c3aed",
                    background: "#ffffff",
                    border: "1.5px solid #c084fc",
                    borderRadius: "10px",
                    padding: "7px 14px",
                    cursor: "pointer",
                    boxShadow: "0 1px 4px rgba(124, 58, 237, 0.1)",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name="book" size={14} />
                  <span>{showRefSection ? "Thu gọn tài liệu" : refDocText.trim() ? "Đã nạp đề cương" : "+ Thêm đề cương riêng"}</span>
                </button>
              </div>

              {/* RAG Option 3: Nạp tài liệu đề cương / bài tập mẫu riêng */}
              {showRefSection && (
                <div
                  className="ai-rag-ref-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    padding: "16px",
                    borderRadius: "14px",
                    background: "#faf5ff",
                    border: "1.5px solid #c084fc",
                    boxShadow: "0 4px 14px rgba(124, 58, 237, 0.08)",
                  }}
                >
                  <div
                    className="ai-rag-ref-header"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                      paddingBottom: "10px",
                      borderBottom: "1px dashed #d8b4fe",
                    }}
                  >
                    <div
                      className="ai-rag-ref-title"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#581c87",
                      }}
                    >
                      <Icon name="sparkles" size={14} />
                      <span>Tài liệu / Đề cương của giáo viên (RAG Tùy chọn)</span>
                    </div>

                    <div
                      className="ai-rag-tabs"
                      style={{
                        display: "flex",
                        gap: "4px",
                        background: "#ede9fe",
                        padding: "3px",
                        borderRadius: "10px",
                        border: "1.5px solid #ddd6fe",
                      }}
                    >
                      <button
                        type="button"
                        className={`ai-rag-tab-btn ${refTab === "paste" ? "active" : ""}`}
                        onClick={() => setRefTab("paste")}
                        style={{
                          border: refTab === "paste" ? "1.5px solid #c084fc" : "1.5px solid transparent",
                          background: refTab === "paste" ? "#ffffff" : "transparent",
                          color: refTab === "paste" ? "#6b21a8" : "#7e22ce",
                          fontWeight: 750,
                          fontSize: "10.5px",
                          padding: "4px 12px",
                          borderRadius: "7px",
                          cursor: "pointer",
                          boxShadow: refTab === "paste" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        }}
                      >
                        Dán văn bản
                      </button>
                      <button
                        type="button"
                        className={`ai-rag-tab-btn ${refTab === "upload" ? "active" : ""}`}
                        onClick={() => setRefTab("upload")}
                        style={{
                          border: refTab === "upload" ? "1.5px solid #c084fc" : "1.5px solid transparent",
                          background: refTab === "upload" ? "#ffffff" : "transparent",
                          color: refTab === "upload" ? "#6b21a8" : "#7e22ce",
                          fontWeight: 750,
                          fontSize: "10.5px",
                          padding: "4px 12px",
                          borderRadius: "7px",
                          cursor: "pointer",
                          boxShadow: refTab === "upload" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        }}
                      >
                        Tải tệp tin
                      </button>
                    </div>
                  </div>

                  {refDocText.trim() && (
                    <div
                      className="ai-rag-loaded-chip"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 14px",
                        borderRadius: "10px",
                        background: "#ffffff",
                        border: "1.5px solid #a855f7",
                        fontSize: "11.5px",
                        color: "#581c87",
                        boxShadow: "0 1px 4px rgba(168, 85, 247, 0.1)",
                      }}
                    >
                      <span>📄 <strong>{refDocName || "Đề cương tham khảo"}</strong> (~{refDocText.trim().split(/\s+/).length} từ)</span>
                      <button
                        type="button"
                        className="ai-rag-clear-btn"
                        onClick={() => {
                          setRefDocText("");
                          setRefDocName("");
                        }}
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          fontSize: "11px",
                          fontWeight: 750,
                          cursor: "pointer",
                          padding: "3px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        ✕ Xóa bỏ
                      </button>
                    </div>
                  )}

                  {refTab === "paste" ? (
                    <textarea
                      className="ai-rag-textarea"
                      placeholder="Dán các câu hỏi mẫu, đề cương ôn tập hoặc ghi chú kiến thức của trường vào đây... AI sẽ mô phỏng lại dạng bài này theo chuẩn GDPT 2018."
                      value={refDocText}
                      onChange={(e) => {
                        setRefDocText(e.target.value);
                        if (!refDocName) setRefDocName("Văn bản đề cương dán trực tiếp");
                      }}
                      style={{
                        width: "100%",
                        minHeight: "85px",
                        maxHeight: "150px",
                        padding: "10px 12px",
                        fontSize: "12px",
                        lineHeight: "1.5",
                        fontFamily: "inherit",
                        border: "1.5px solid #d8b4fe",
                        borderRadius: "10px",
                        background: "#ffffff",
                        color: "#271f35",
                        outline: "none",
                        boxSizing: "border-box",
                        resize: "vertical",
                      }}
                    />
                  ) : (
                    <label
                      className="ai-rag-dropzone"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px 16px",
                        border: "2px dashed #a855f7",
                        borderRadius: "12px",
                        background: "#ffffff",
                        cursor: "pointer",
                        textAlign: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="file"
                        accept=".txt,.md,.json,.csv,.doc,.docx"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setRefDocName(file.name);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setRefDocText((event.target?.result as string) || "");
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <span style={{ color: "#7c3aed" }}><Icon name="book" size={24} /></span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>
                        Bấm để chọn tệp hoặc kéo thả file đề cương (.txt, .md, .docx, .json)
                      </span>
                      <small style={{ fontSize: "10px", color: "#9ca3af" }}>
                        Hệ thống tự động trích xuất các dạng bài và công thức
                      </small>
                    </label>
                  )}
                </div>
              )}

              {/* Hồ sơ năng lực lớp được chọn */}
              {loadingProfile ? (
                <div className="assignment-ai-profile-loading">
                  <Icon name="sparkles" size={16} />
                  <span>Đang tổng hợp dữ liệu học tập của {displayClassName}...</span>
                </div>
              ) : classProfile ? (
                <div className="ai-modal-insights">
                  <div className="assignment-ai-stats-grid">
                    <div className="ai-stat-card purple">
                      <div className="ai-stat-icon"><Icon name="sparkles" size={16} /></div>
                      <div className="ai-stat-body">
                        <span className="ai-stat-name">Độ thông minh</span>
                        <div className="ai-stat-num">
                          <strong>{classProfile.intelligenceScore}</strong>
                          <small>/ 100</small>
                        </div>
                      </div>
                    </div>

                    <div className="ai-stat-card blue">
                      <div className="ai-stat-icon"><Icon name="target" size={16} /></div>
                      <div className="ai-stat-body">
                        <span className="ai-stat-name">Tốc độ làm bài</span>
                        <div className="ai-stat-num">
                          <strong>{classProfile.learningSpeed === "fast" ? "Nhanh" : classProfile.learningSpeed === "slow" ? "Cần thời gian" : "Tiêu chuẩn"}</strong>
                          <small>(~{classProfile.averageSecondsPerQuestion}s/câu)</small>
                        </div>
                      </div>
                    </div>

                    <div className="ai-stat-card green">
                      <div className="ai-stat-icon"><Icon name="check" size={16} /></div>
                      <div className="ai-stat-body">
                        <span className="ai-stat-name">Điểm trung bình</span>
                        <div className="ai-stat-num">
                          <strong>{classProfile.averageScore.toFixed(1)}</strong>
                          <small>/ 10 ({classProfile.accuracyRate}%)</small>
                        </div>
                      </div>
                    </div>

                    <div className="ai-stat-card amber">
                      <div className="ai-stat-icon"><Icon name="users" size={16} /></div>
                      <div className="ai-stat-body">
                        <span className="ai-stat-name">Sĩ số lớp</span>
                        <div className="ai-stat-num">
                          <strong>{classProfile.totalStudents}</strong>
                          <small>học sinh</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="assignment-ai-tuning">
                    <div className="ai-tuning-row">
                      <div className="ai-diff-selector">
                        <span className="ai-tuning-label">Độ khó đề xuất cho {displayClassName}:</span>
                        <div className="ai-diff-pills">
                          {(["A", "B", "C", "D", "E"] as Difficulty[]).map((diff) => {
                            const isRecommended = classProfile.recommendedDifficulties.includes(diff);
                            const isSelected = selectedDifficulties.includes(diff);
                            return (
                              <button
                                key={diff}
                                type="button"
                                className={`ai-diff-btn ${isSelected ? "active" : ""} ${isRecommended ? "recommended" : ""}`}
                                onClick={() => {
                                  setSelectedDifficulties((curr) =>
                                    curr.includes(diff) ? curr.filter((d) => d !== diff) : [...curr, diff]
                                  );
                                }}
                                title={isRecommended ? "Mức độ phù hợp theo năng lực lớp (bấm để bật/tắt)" : "Bấm để thêm mức độ này"}
                              >
                                <span>Mức {diff}</span>
                                {isRecommended && <span className="diff-star">★</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <p className="ai-tuning-advice">
                      💡 <strong>Đánh giá sư phạm:</strong> {classProfile.summary}
                    </p>
                  </div>
                </div>
              ) : classroomId ? (
                <div className="assignment-ai-placeholder">
                  <span>Chưa có dữ liệu bài làm của lớp này. Hệ thống sẽ áp dụng mức cơ bản (A, B, C) để kiểm tra năng lực đầu vào.</span>
                </div>
              ) : (
                <div className="assignment-ai-placeholder">
                  <span>👉 Vui lòng chọn một lớp học ở trên để hệ thống tự động đọc năng lực học sinh và tạo đề phù hợp.</span>
                </div>
              )}

              {/* TÙY CHỌN CÁ NHÂN HÓA THEO TỪNG HỌC SINH */}
              <div
                className="ai-personalize-toggle-card"
                style={{
                  marginTop: "16px",
                  padding: "16px 18px",
                  borderRadius: "14px",
                  background: isAdaptive ? "linear-gradient(135deg, #fbf8ff 0%, #f5f0fe 100%)" : "#fafafa",
                  border: isAdaptive ? "1.5px solid #c084fc" : "1.5px solid #e5e7eb",
                  boxShadow: isAdaptive ? "0 4px 14px rgba(124, 58, 237, 0.08)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          background: "#ede9fe",
                          color: "#6d28d9",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          textTransform: "uppercase",
                        }}
                      >
                        ✨ Đột phá AI
                      </span>
                      <strong style={{ fontSize: "14px", color: "#2e1065" }}>
                        Cá nhân hóa theo từng học sinh (Mỗi em 1 đề riêng)
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#6b7280", lineHeight: 1.4 }}>
                      AI tự động phân hóa độ khó (A-E) và lồng ghép chủ đề yêu thích (Động vật, Vũ trụ, Xe cộ...) riêng cho từng học sinh.
                    </p>
                  </div>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      userSelect: "none",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: isAdaptive ? "#6d28d9" : "#4b5563",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAdaptive}
                      onChange={(e) => setIsAdaptive(e.target.checked)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                        accentColor: "#7c3aed",
                      }}
                    />
                    <span>{isAdaptive ? "Đang bật" : "Tắt"}</span>
                  </label>
                </div>

                {isAdaptive && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #d8b4fe" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#6d28d9", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Icon name="users" size={13} />
                      <span>
                        Học sinh của {displayClassName} sẽ nhận đề riêng ({classroomStudents.length} học sinh):
                      </span>
                    </div>

                    {classroomStudents.length === 0 ? (
                      <div style={{ fontSize: "11px", color: "#6b7280", background: "#ffffff", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e9d5ff" }}>
                        Lớp học chưa có học sinh. Hệ thống sẽ áp dụng bộ đề mẫu và tự động cá nhân hóa ngay khi có học sinh tham gia làm bài!
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {classroomStudents.map((st, i) => {
                          const assignedTheme = studentThemes[i % studentThemes.length];
                          const themeLabel = st.interest || assignedTheme.label;
                          const themeEmoji = assignedTheme.emoji;
                          return (
                            <div
                              key={st.id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "#ffffff",
                                border: "1px solid #ddd6fe",
                                borderRadius: "8px",
                                padding: "4px 10px",
                                fontSize: "11px",
                              }}
                            >
                              <strong style={{ color: "#1f2937" }}>{st.fullName}</strong>
                              <span style={{ color: "#9ca3af" }}>·</span>
                              <span style={{ color: "#6d28d9", fontWeight: 600 }}>{st.status}</span>
                              <span style={{ color: "#9ca3af" }}>·</span>
                              <span style={{ background: "#ede9fe", color: "#5b21b6", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                {themeEmoji} {themeLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="student-modal-actions ai-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowAiModal(false)}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button ai-modal-submit-btn"
                onClick={async () => {
                  await generateQuestions();
                  setShowAiModal(false);
                }}
                disabled={loading || !classroomId}
              >
                <Icon name="sparkles" size={15} />
                {loading ? "Đang tạo đề bằng AI..." : "Tạo 10 câu hỏi ngay"}
              </button>
            </div>
          </section>
        </div>
      )}

      {error && <p className="student-form-error" role="alert">{error}</p>}
      <footer className="assignment-footer">
        {step === "questions" ? (
          <>
            <button className="secondary-button" onClick={onBack}>Hủy</button>
            <button className="primary-button" onClick={continueToSettings}>Xong đề · Cài đặt bài tập <Icon name="arrow" /></button>
          </>
        ) : (
          <>
            <button className="secondary-button" onClick={() => setStep("questions")}>Chỉnh sửa đề</button>
            <button className="primary-button" onClick={() => void publish()} disabled={loading}>{loading ? "Đang lưu..." : "Phát hành bài tập"}</button>
          </>
        )}
      </footer>
    </div>
  );
}
