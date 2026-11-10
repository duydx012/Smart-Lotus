import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assignmentSubmissions, classroomMemberships, classrooms, quizAttempts, users } from "@/db/schema";
import { evaluatePathLocal, type AttemptSummary, type Difficulty } from "./placement";

import type { ClassLearningProfile } from "./student-data";
export type { ClassLearningProfile };

/**
 * Chuẩn hóa tên lớp hiển thị (tránh bị lặp chữ "Lớp LỚP 1B")
 */
function getDisplayClassName(label: string, name?: string): string {
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (/^lớp\s+/i.test(trimmed)) {
      return trimmed.replace(/^lớp\s+/i, "Lớp ");
    }
    return `Lớp ${trimmed}`;
  }
  const trimmed = (label || "Lớp").trim();
  if (/^lớp\s+/i.test(trimmed)) {
    return trimmed.replace(/^lớp\s+/i, "Lớp ");
  }
  return `Lớp ${trimmed}`;
}

/**
 * Tính toán hồ sơ năng lực học tập của một lớp dựa trên:
 * 1. Độ thông minh của học sinh (khảo sát năng lực / logic tư duy)
 * 2. Tốc độ học (thời gian làm bài / số giây trung bình trên mỗi câu)
 * 3. Điểm của học sinh lớp đấy
 */
export async function computeClassLearningProfile(classroomId: number): Promise<ClassLearningProfile | null> {
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, classroomId))
    .limit(1);

  if (!classroom) return null;

  const displayClassName = getDisplayClassName(classroom.label, classroom.name);

  // Lấy danh sách học sinh thuộc lớp
  const memberships = await db
    .select({
      student: users,
    })
    .from(classroomMemberships)
    .innerJoin(users, eq(classroomMemberships.studentId, users.id))
    .where(eq(classroomMemberships.classroomId, classroomId));

  const totalStudents = memberships.length;

  // Trường hợp lớp chưa có học sinh (lớp mới thành lập)
  if (totalStudents === 0) {
    return {
      classroomId: classroom.id,
      className: classroom.name,
      classLabel: classroom.label,
      displayClassName,
      subject: classroom.subject || "Toán",
      totalStudents: 0,
      intelligenceScore: 60,
      learningSpeed: "moderate",
      speedLabel: "Tiêu chuẩn (Lớp mới)",
      averageSecondsPerQuestion: 25,
      averageScore: 7.0,
      accuracyRate: 70,
      isNewClass: true,
      recommendedDifficulties: ["A", "B", "C"],
      summary: `${displayClassName} hiện chưa có học sinh gia nhập. Đề xuất bộ câu hỏi cơ bản và chuẩn hóa (A, B, C) để kiểm tra năng lực đầu vào.`,
      pedagogicalAdvice: "Phù hợp để khảo sát năng lực ban đầu khi học sinh mới vào lớp.",
    };
  }

  const studentIds = memberships.map((m) => m.student.id);

  // Lấy lịch sử làm bài kiểm tra và bài tập nộp của các học sinh trong lớp
  const [attempts, submissions] = await Promise.all([
    db
      .select({
        userId: quizAttempts.userId,
        lessonSlug: quizAttempts.lessonSlug,
        correctAnswers: quizAttempts.correctAnswers,
        totalQuestions: quizAttempts.totalQuestions,
        score: quizAttempts.score,
        durationSeconds: quizAttempts.durationSeconds,
        completedAt: quizAttempts.completedAt,
      })
      .from(quizAttempts)
      .where(inArray(quizAttempts.userId, studentIds))
      .orderBy(desc(quizAttempts.completedAt))
      .limit(300),
    db
      .select({
        studentId: assignmentSubmissions.studentId,
        score: assignmentSubmissions.score,
        correctAnswers: assignmentSubmissions.correctAnswers,
        totalQuestions: assignmentSubmissions.totalQuestions,
        durationSeconds: assignmentSubmissions.durationSeconds,
        submittedAt: assignmentSubmissions.submittedAt,
      })
      .from(assignmentSubmissions)
      .where(inArray(assignmentSubmissions.studentId, studentIds))
      .orderBy(desc(assignmentSubmissions.submittedAt))
      .limit(300),
  ]);

  // Nhóm lịch sử theo từng học sinh để đánh giá năng lực cá nhân
  const attemptsByStudent = new Map<number, AttemptSummary[]>();
  for (const row of attempts) {
    const list = attemptsByStudent.get(row.userId) ?? [];
    list.push({
      lessonSlug: row.lessonSlug,
      correctAnswers: row.correctAnswers,
      totalQuestions: row.totalQuestions,
      score: row.score,
      durationSeconds: row.durationSeconds,
      completedAt: row.completedAt.toISOString(),
    });
    attemptsByStudent.set(row.userId, list);
  }

  // 1. Tính toán Độ thông minh (Intelligence Score) trung bình
  const studentScores: number[] = [];
  for (const member of memberships) {
    const student = member.student;
    const studentAttempts = attemptsByStudent.get(student.id) ?? [];

    if (student.placement) {
      const evaluation = evaluatePathLocal(student.placement, studentAttempts);
      studentScores.push(evaluation.intelligenceScore);
    } else if (studentAttempts.length > 0) {
      const totalCorrect = studentAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
      const totalQ = studentAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
      const accuracy = totalQ > 0 ? totalCorrect / totalQ : 0.6;
      const lotusBonus = student.lotusPoints > 50 ? 15 : student.lotusPoints > 0 ? 8 : 0;
      const scoreEst = Math.max(25, Math.min(95, Math.round(accuracy * 75 + lotusBonus)));
      studentScores.push(scoreEst);
    } else {
      studentScores.push(55);
    }
  }

  const rawIntelligence = studentScores.length
    ? studentScores.reduce((sum, s) => sum + s, 0) / studentScores.length
    : 55;
  const intelligenceScore = Math.max(10, Math.min(100, Math.round(rawIntelligence)));

  // 2. Tính toán Tốc độ học (Learning Speed)
  let totalDurationSeconds = 0;
  let totalQuestionsCount = 0;

  for (const a of attempts) {
    totalDurationSeconds += Math.max(0, a.durationSeconds);
    totalQuestionsCount += Math.max(1, a.totalQuestions);
  }
  for (const s of submissions) {
    totalDurationSeconds += Math.max(0, s.durationSeconds);
    totalQuestionsCount += Math.max(1, s.totalQuestions);
  }

  const hasActivityData = totalQuestionsCount >= 3;
  const avgSecondsPerQuestion = hasActivityData
    ? Math.max(4, Math.min(120, Math.round(totalDurationSeconds / totalQuestionsCount)))
    : 24;

  let learningSpeed: "fast" | "moderate" | "slow" = "moderate";
  let speedLabel = "Tiêu chuẩn";

  if (hasActivityData) {
    if (avgSecondsPerQuestion <= 18) {
      learningSpeed = "fast";
      speedLabel = `Nhanh (~${avgSecondsPerQuestion}s/câu)`;
    } else if (avgSecondsPerQuestion <= 38) {
      learningSpeed = "moderate";
      speedLabel = `Tiêu chuẩn (~${avgSecondsPerQuestion}s/câu)`;
    } else {
      learningSpeed = "slow";
      speedLabel = `Cần thêm thời gian (~${avgSecondsPerQuestion}s/câu)`;
    }
  } else {
    speedLabel = `Tiêu chuẩn (Mới: ~${avgSecondsPerQuestion}s/câu)`;
  }

  // 3. Tính toán Điểm trung bình và tỷ lệ đúng
  let totalScoresSum = 0;
  let totalScoreItems = 0;
  let correctSum = 0;
  let questionSum = 0;

  for (const a of attempts) {
    totalScoresSum += a.score;
    totalScoreItems += 1;
    correctSum += a.correctAnswers;
    questionSum += a.totalQuestions;
  }
  for (const s of submissions) {
    totalScoresSum += s.score;
    totalScoreItems += 1;
    correctSum += s.correctAnswers;
    questionSum += s.totalQuestions;
  }

  const isNewClass = totalScoreItems === 0;
  let averageScore = 7.0;
  let accuracyRate = 70;

  if (!isNewClass && totalScoreItems > 0) {
    const rawAvg = totalScoresSum / totalScoreItems;
    // Chuẩn hóa điểm số luôn luôn ở thang 10 (ví dụ nếu điểm gốc là 930 hoặc 93 -> 9.3)
    let normalized = rawAvg;
    if (normalized > 100) normalized = normalized / 100;
    else if (normalized > 10) normalized = normalized / 10;
    averageScore = Math.max(0, Math.min(10, Math.round(normalized * 10) / 10));
    accuracyRate = questionSum > 0 ? Math.round((correctSum / questionSum) * 100) : Math.round(averageScore * 10);
  }

  // 4. Quyết định dải độ khó phù hợp (Adaptive Difficulties)
  let compositeScore = Math.round(intelligenceScore * 0.5 + averageScore * 10 * 0.5);
  if (learningSpeed === "fast") compositeScore += 4;
  if (learningSpeed === "slow") compositeScore -= 4;

  let recommendedDifficulties: Difficulty[] = ["A", "B", "C"];
  let summary = "";
  let pedagogicalAdvice = "";

  if (isNewClass) {
    recommendedDifficulties = ["A", "B", "C"];
    summary = `${displayClassName} chưa có dữ liệu bài làm. Hệ thống đề xuất bộ câu hỏi chuẩn hóa (A, B, C) giúp khảo sát và phân loại học sinh ban đầu.`;
    pedagogicalAdvice = "Dùng đề kiểm tra cơ bản để phát hiện điểm mạnh và điểm yếu của các em.";
  } else if (compositeScore >= 75) {
    recommendedDifficulties = ["B", "C", "D", "E"];
    summary = `${displayClassName} có năng lực rất tốt (Thông minh: ${intelligenceScore}/100, Điểm TB: ${averageScore}/10, Tốc độ: ${speedLabel}). Đề xuất bộ câu hỏi phân hóa nâng cao (B, C, D, E) để kích thích tư duy giải toán.`;
    pedagogicalAdvice = "Tăng cường câu hỏi logic, bài toán đố nhiều bước và so sánh biểu thức.";
  } else if (compositeScore >= 60) {
    recommendedDifficulties = ["B", "C", "D"];
    summary = `${displayClassName} có học lực khá (Thông minh: ${intelligenceScore}/100, Điểm TB: ${averageScore}/10, Tốc độ: ${speedLabel}). Đề xuất bộ câu hỏi cân bằng thông hiểu và vận dụng (B, C, D).`;
    pedagogicalAdvice = "Tập trung các câu tính toán kết hợp so sánh và điền số còn thiếu.";
  } else if (compositeScore >= 45) {
    recommendedDifficulties = ["A", "B", "C"];
    summary = `${displayClassName} có học lực ở mức tiêu chuẩn (Thông minh: ${intelligenceScore}/100, Điểm TB: ${averageScore}/10, Tốc độ: ${speedLabel}). Đề xuất bộ câu hỏi cơ bản và thông hiểu (A, B, C).`;
    pedagogicalAdvice = "Đề bài rõ ràng, rèn luyện kỹ năng tính toán trong phạm vi quen thuộc.";
  } else {
    recommendedDifficulties = ["A", "B"];
    summary = `${displayClassName} cần củng cố nền tảng (Thông minh: ${intelligenceScore}/100, Điểm TB: ${averageScore}/10, Tốc độ: ${speedLabel}). Đề xuất tập trung câu hỏi dễ và trực quan (A, B) để học sinh tự tin hơn.`;
    pedagogicalAdvice = "Tập trung vào nhận biết số, so sánh cơ bản và phép cộng trừ đơn giản.";
  }

  return {
    classroomId: classroom.id,
    className: classroom.name,
    classLabel: classroom.label,
    displayClassName,
    subject: classroom.subject || "Toán",
    totalStudents,
    intelligenceScore,
    learningSpeed,
    speedLabel,
    averageSecondsPerQuestion: avgSecondsPerQuestion,
    averageScore,
    accuracyRate,
    isNewClass,
    recommendedDifficulties,
    summary,
    pedagogicalAdvice,
  };
}
