import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomMemberships, classrooms, quizAttempts, users } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classId: string }> };

function parseClassId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const sampleStudents = [
  {
    displayName: "Nguyễn An Nhiên",
    email: "annhien.lop1a@smartlotus.edu.vn",
    birthDate: "15/05/2018",
    avatar: "AN",
    score: 95,
    speedSeconds: 14,
  },
  {
    displayName: "Trần Đăng Khoa",
    email: "dangkhoa.lop1a@smartlotus.edu.vn",
    birthDate: "20/08/2018",
    avatar: "DK",
    score: 88,
    speedSeconds: 18,
  },
  {
    displayName: "Lê Bảo Nam",
    email: "baonam.lop1a@smartlotus.edu.vn",
    birthDate: "10/02/2018",
    avatar: "BN",
    score: 90,
    speedSeconds: 16,
  },
  {
    displayName: "Phạm Mai Chi",
    email: "maichi.lop1a@smartlotus.edu.vn",
    birthDate: "05/11/2018",
    avatar: "MC",
    score: 76,
    speedSeconds: 26,
  },
  {
    displayName: "Hoàng Gia Bảo",
    email: "giabao.lop1a@smartlotus.edu.vn",
    birthDate: "12/09/2018",
    avatar: "GB",
    score: 65,
    speedSeconds: 34,
  },
];

export async function POST(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    if (user.role !== "teacher" && user.role !== "admin") {
      return Response.json({ message: "Chỉ giáo viên mới được thêm học sinh vào lớp" }, { status: 403 });
    }

    const classId = parseClassId((await params).classId);
    if (!classId) return Response.json({ message: "Lớp học không hợp lệ" }, { status: 400 });

    const [classroom] = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.id, classId), eq(classrooms.teacherId, user.id)))
      .limit(1);

    if (!classroom) {
      return Response.json({ message: "Không tìm thấy lớp học của bạn" }, { status: 404 });
    }

    // Nạp từng học sinh vào DB và gán vào lớp
    const inserted = [];
    for (const s of sampleStudents) {
      // 1. Tạo hoặc lấy học sinh từ bảng users
      let [existingUser] = await db.select().from(users).where(eq(users.email, s.email)).limit(1);

      if (!existingUser) {
        const [newUser] = await db
          .insert(users)
          .values({
            email: s.email,
            displayName: s.displayName,
            role: "student",
            avatar: s.avatar,
            birthDate: s.birthDate,
            className: classroom.label,
            lotusPoints: 120,
          })
          .returning();
        existingUser = newUser;
      }

      // 2. Gán vào bảng classroom_memberships
      await db
        .insert(classroomMemberships)
        .values({
          classroomId: classroom.id,
          studentId: existingUser.id,
        })
        .onConflictDoNothing();

      // 3. Tạo dữ liệu bài làm mẫu (quiz_attempts) nếu chưa có
      const [existingAttempt] = await db
        .select({ id: quizAttempts.id })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, existingUser.id))
        .limit(1);

      if (!existingAttempt) {
        await db.insert(quizAttempts).values({
          userId: existingUser.id,
          lessonSlug: "phep-cong-pham-vi-10",
          correctAnswers: Math.round(s.score / 10),
          totalQuestions: 10,
          score: s.score,
          durationSeconds: s.speedSeconds * 10,
          highestDifficulty: "C",
          answers: [],
        });
      }

      inserted.push(existingUser.id);
    }

    return Response.json({
      ok: true,
      message: `Đã nạp thành công ${inserted.length} học sinh mẫu vào ${classroom.name}`,
      count: inserted.length,
    });
  } catch (error) {
    console.error("Seed students error", error);
    return Response.json({ message: "Không thể nạp học sinh vào lớp" }, { status: 500 });
  }
}

