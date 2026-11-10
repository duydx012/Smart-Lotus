import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomMemberships, classrooms, quizAttempts, users } from "@/db/schema";
import { deriveStatus, initialsOf, type Student } from "@/lib/student-data";
import { formatStudentCode, parseStudentCode } from "@/lib/student-code";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classId: string }> };

function parseClassId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const teacher = await getOrCreateAppUser(authUser);
    if (teacher.role !== "teacher" && teacher.role !== "admin") {
      return Response.json({ message: "Chỉ giáo viên mới được thêm học sinh vào lớp" }, { status: 403 });
    }

    const classId = parseClassId((await params).classId);
    if (!classId) return Response.json({ message: "Lớp học không hợp lệ" }, { status: 400 });

    const [classroom] = await db
      .select()
      .from(classrooms)
      .where(and(eq(classrooms.id, classId), eq(classrooms.teacherId, teacher.id)))
      .limit(1);

    if (!classroom) {
      return Response.json({ message: "Không tìm thấy lớp học" }, { status: 404 });
    }

    const body = (await request.json()) as {
      mode?: "create" | "byCode";
      studentCode?: string;
      fullName?: string;
      email?: string;
      birthDate?: string;
      gender?: "Nam" | "Nữ";
      parentName?: string;
      parentPhone?: string;
      score?: number;
    };

    let targetStudentId: number;

    // TH 1: Thêm học sinh có sẵn bằng Mã ID (HS-xxxxxxxx)
    if (body.mode === "byCode" || (body.studentCode && !body.fullName)) {
      const code = (body.studentCode || "").trim().toUpperCase();
      const parsedId = parseStudentCode(code);
      if (!parsedId) {
        return Response.json({ message: "Mã học sinh không đúng định dạng (VD: HS-00000001)" }, { status: 400 });
      }

      const [foundStudent] = await db
        .select()
        .from(users)
        .where(eq(users.id, parsedId))
        .limit(1);

      if (!foundStudent || foundStudent.role !== "student") {
        return Response.json({ message: "Không tìm thấy học sinh với mã ID này" }, { status: 404 });
      }

      targetStudentId = foundStudent.id;
    } else {
      // TH 2: Tạo học sinh mới trực tiếp và lưu vào CSDL
      const fullName = (body.fullName || "").trim();
      if (!fullName) {
        return Response.json({ message: "Vui lòng nhập họ và tên học sinh" }, { status: 400 });
      }

      const email = (body.email || "").trim().toLowerCase() || `hs.${Date.now()}@smartlotus.edu.vn`;
      const birthDate = (body.birthDate || "").trim();
      const phone = (body.parentPhone || "").trim();

      // Kiểm tra hoặc tạo user học sinh
      const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existing) {
        targetStudentId = existing.id;
        await db
          .update(users)
          .set({
            displayName: fullName,
            birthDate: birthDate || existing.birthDate,
            phone: phone || existing.phone,
            className: classroom.label,
          })
          .where(eq(users.id, existing.id));
      } else {
        const [created] = await db
          .insert(users)
          .values({
            email,
            displayName: fullName,
            role: "student",
            avatar: initialsOf(fullName),
            birthDate: birthDate || "15/05/2018",
            phone: phone || null,
            className: classroom.label,
            lotusPoints: 100,
          })
          .returning();
        targetStudentId = created.id;
      }
    }

    // Gắn vào bảng liên kết classroom_memberships
    await db
      .insert(classroomMemberships)
      .values({
        classroomId: classroom.id,
        studentId: targetStudentId,
        joinedAt: new Date(),
      })
      .onConflictDoNothing();

    // Tạo điểm khởi tạo nếu có
    const initialScore = Math.max(0, Math.min(100, Number(body.score) || 0));
    if (initialScore > 0) {
      await db.insert(quizAttempts).values({
        userId: targetStudentId,
        lessonSlug: "phep-cong-pham-vi-10",
        correctAnswers: Math.round(initialScore / 10),
        totalQuestions: 10,
        score: initialScore,
        durationSeconds: 200,
        highestDifficulty: "C",
        answers: [],
      });
    }

    // Lấy thông tin hoàn chỉnh để trả về giao diện
    const [savedUser] = await db.select().from(users).where(eq(users.id, targetStudentId)).limit(1);

    const studentResponse: Student = {
      id: String(savedUser.id),
      studentCode: formatStudentCode(savedUser.id),
      fullName: savedUser.displayName,
      email: savedUser.email,
      birthDate: savedUser.birthDate || "",
      gender: body.gender || "Chưa cập nhật",
      className: classroom.label,
      parentName: body.parentName || "Chưa cập nhật",
      parentPhone: savedUser.phone || body.parentPhone || "Chưa cập nhật",
      score: initialScore || 0,
      lessonsCompleted: initialScore > 0 ? 1 : 0,
      totalLessons: 100,
      lastActive: new Date().toISOString().slice(0, 10),
      status: deriveStatus(initialScore || 0),
    };

    return Response.json({
      ok: true,
      message: `Đã thêm học sinh ${savedUser.displayName} vào ${classroom.name}`,
      student: studentResponse,
    });
  } catch (error) {
    console.error("Add student to classroom error", error);
    return Response.json({ message: "Không thể thêm học sinh vào lớp" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const teacher = await getOrCreateAppUser(authUser);
    if (teacher.role !== "teacher" && teacher.role !== "admin") {
      return Response.json({ message: "Chỉ giáo viên mới được xóa học sinh khỏi lớp" }, { status: 403 });
    }

    const classId = parseClassId((await params).classId);
    if (!classId) return Response.json({ message: "Lớp học không hợp lệ" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");
    const studentId = Number(studentIdParam);

    if (!Number.isSafeInteger(studentId) || studentId < 1) {
      return Response.json({ message: "ID học sinh không hợp lệ" }, { status: 400 });
    }

    // Xóa liên kết trong classroom_memberships
    await db
      .delete(classroomMemberships)
      .where(
        and(
          eq(classroomMemberships.classroomId, classId),
          eq(classroomMemberships.studentId, studentId)
        )
      );

    return Response.json({ ok: true, message: "Đã xóa học sinh khỏi lớp" });
  } catch (error) {
    console.error("Remove student error", error);
    return Response.json({ message: "Không thể xóa học sinh khỏi lớp" }, { status: 500 });
  }
}

