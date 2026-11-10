import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomAssignments, classroomMemberships, quizAttempts, users } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";
import { generateAdaptiveQuizForStudent } from "@/lib/adaptive-quiz-generator";
import { generatePersonalizedQuizWithAI } from "@/lib/ai-api";
import { deriveStatus } from "@/lib/student-data";
import type { QuizQuestion } from "@/lib/learning-data";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ assignmentId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const student = await getOrCreateAppUser(authUser);
    if (student.role !== "student") {
      return Response.json({ message: "Chỉ học sinh mới có thể cá nhân hóa đề thi" }, { status: 403 });
    }

    const assignmentId = Number((await params).assignmentId);
    if (!Number.isSafeInteger(assignmentId) || assignmentId < 1) {
      return Response.json({ message: "Bài tập không hợp lệ" }, { status: 400 });
    }

    // Kiểm tra học sinh có thuộc lớp được giao bài tập này không
    const [row] = await db
      .select({
        assignment: classroomAssignments,
      })
      .from(classroomAssignments)
      .innerJoin(classroomMemberships, eq(classroomMemberships.classroomId, classroomAssignments.classroomId))
      .where(and(eq(classroomAssignments.id, assignmentId), eq(classroomMemberships.studentId, student.id)))
      .limit(1);

    if (!row) {
      return Response.json({ message: "Bài tập này chưa được giao cho lớp của bạn" }, { status: 403 });
    }

    const assignment = row.assignment;
    const questionsRaw = (assignment.questions || []) as Array<QuizQuestion & { _variants?: Record<string | number, QuizQuestion[]> }>;

    // 1. Nhận thông số từ body
    let requestedInterest = "";
    let forceAI = false;
    try {
      const body = (await request.json()) as { interest?: string; forceAI?: boolean };
      if (body) {
        if (typeof body.interest === "string") requestedInterest = body.interest.trim();
        if (body.forceAI) forceAI = true;
      }
    } catch {
      // Body rỗng không sao, tự chọn theo thuật toán
    }

    // 2. Kiểm tra xem học sinh này đã được sinh đề trước đó chưa (trừ khi yêu cầu forceAI)
    const existingVariants = questionsRaw[0]?._variants;
    if (!forceAI && existingVariants && existingVariants[student.id] && Array.isArray(existingVariants[student.id])) {
      const existingQuestions = existingVariants[student.id];
      const studentProfile = (existingQuestions[0] as any)?.personalizedFor ?? {
        studentName: student.displayName,
        status: "Ổn định",
        interest: "Động vật dễ thương",
        generatedBy: "dynamic-multi-template",
      };
      return Response.json({
        ok: true,
        isExisting: true,
        questions: existingQuestions,
        studentProfile,
      });
    }

    // 3. Phân tích năng lực học sinh dựa vào điểm số và bài làm gần nhất
    const recentAttempts = await db
      .select({ score: quizAttempts.score })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, student.id))
      .limit(5);

    let averageScore = student.lotusPoints || 0;
    if (recentAttempts.length > 0) {
      const sum = recentAttempts.reduce((acc, curr) => acc + curr.score, 0);
      averageScore = Math.round(sum / recentAttempts.length) * 10;
    }
    const studentStatus = deriveStatus(averageScore);

    // 4. MÔ HÌNH KẾT HỢP HYBRID:
    // Cách 1: Thử gọi Ollama AI / LLM để sinh đề sáng tạo độc nhất cho học sinh này
    let personalizedQuestions: QuizQuestion[] | null = null;
    let sourceMode: "ai" | "dynamic-multi-template" = "dynamic-multi-template";

    try {
      personalizedQuestions = await generatePersonalizedQuizWithAI({
        studentId: student.id,
        studentName: student.displayName,
        studentStatus,
        interest: requestedInterest,
        topic: assignment.topic,
        curriculumLevel: assignment.curriculumLevel,
      });
      if (personalizedQuestions && personalizedQuestions.length > 0) {
        sourceMode = "ai";
      }
    } catch (aiError) {
      console.warn("Personalize AI error, falling back to dynamic multi-template", aiError);
    }

    // Cách 2: Nếu AI chưa bật hoặc timeout, tự động bốc ngẫu nhiên từ kho 38 dạng bài động
    if (!personalizedQuestions || personalizedQuestions.length === 0) {
      personalizedQuestions = generateAdaptiveQuizForStudent({
        studentId: student.id,
        studentName: student.displayName,
        studentStatus,
        interest: requestedInterest,
        topic: assignment.topic,
        curriculumLevel: assignment.curriculumLevel,
      });
      sourceMode = "dynamic-multi-template";
    }

    // 5. Lưu bộ đề này vào DB trong trường jsonb `questions[0]._variants[student.id]`
    const updatedQuestions = [...questionsRaw];
    if (updatedQuestions[0]) {
      const variants = updatedQuestions[0]._variants ?? {};
      variants[student.id] = personalizedQuestions;
      updatedQuestions[0] = {
        ...updatedQuestions[0],
        _variants: variants,
      };

      await db
        .update(classroomAssignments)
        .set({ questions: updatedQuestions as any })
        .where(eq(classroomAssignments.id, assignmentId));
    }

    const studentProfile = {
      studentName: student.displayName,
      status: studentStatus,
      interest: (personalizedQuestions[0] as any)?.personalizedFor?.interest || "Khám phá",
      sourceMode,
    };

    return Response.json({
      ok: true,
      isExisting: false,
      sourceMode,
      questions: personalizedQuestions,
      studentProfile,
    });
  } catch (error) {
    console.error("Personalize assignment error", error);
    return Response.json({ message: "Không thể tạo đề cá nhân hóa" }, { status: 500 });
  }
}

