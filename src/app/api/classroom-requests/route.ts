import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classroomInvitations, classrooms, quizAttempts, users } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";
import { formatStudentCode } from "@/lib/student-code";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    if (user.role !== "teacher" && user.role !== "admin") {
      return Response.json({ message: "Chỉ giáo viên mới có thể xem danh sách yêu cầu vào lớp" }, { status: 403 });
    }

    // Lấy các lớp của giáo viên (hoặc tất cả nếu là admin)
    const teacherClasses = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(user.role === "admin" ? undefined : eq(classrooms.teacherId, user.id));

    if (teacherClasses.length === 0) {
      return Response.json({ requests: [] });
    }

    const classIds = teacherClasses.map((c) => c.id);

    // Lấy tất cả yêu cầu tham gia lớp học
    const rows = await db
      .select({
        id: classroomInvitations.id,
        status: classroomInvitations.status,
        createdAt: classroomInvitations.createdAt,
        respondedAt: classroomInvitations.respondedAt,
        student: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          avatar: users.avatar,
          avatarUrl: users.avatarUrl,
          phone: users.phone,
          school: users.school,
          schoolLevel: users.schoolLevel,
          grade: users.grade,
          className: users.className,
          birthDate: users.birthDate,
          lotusPoints: users.lotusPoints,
        },
        classroom: {
          id: classrooms.id,
          name: classrooms.name,
          label: classrooms.label,
          subject: classrooms.subject,
          color: classrooms.color,
        },
      })
      .from(classroomInvitations)
      .innerJoin(classrooms, eq(classroomInvitations.classroomId, classrooms.id))
      .innerJoin(users, eq(classroomInvitations.studentId, users.id))
      .where(inArray(classroomInvitations.classroomId, classIds))
      .orderBy(desc(classroomInvitations.createdAt));

    // Lấy điểm số gần nhất của các học sinh này nếu có
    const studentIds = [...new Set(rows.map((r) => r.student.id))];
    const studentScores = new Map<number, number>();

    if (studentIds.length > 0) {
      const attempts = await db
        .select({
          userId: quizAttempts.userId,
          score: quizAttempts.score,
        })
        .from(quizAttempts)
        .where(inArray(quizAttempts.userId, studentIds))
        .orderBy(desc(quizAttempts.completedAt));

      for (const a of attempts) {
        if (!studentScores.has(a.userId)) {
          studentScores.set(a.userId, a.score);
        }
      }
    }

    const requests = rows.map((row) => ({
      id: String(row.id),
      status: row.status as "pending" | "accepted" | "declined",
      createdAt: row.createdAt.toISOString(),
      respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
      student: {
        id: String(row.student.id),
        studentCode: formatStudentCode(row.student.id),
        displayName: row.student.displayName,
        email: row.student.email,
        avatar: row.student.avatar,
        avatarUrl: row.student.avatarUrl,
        phone: row.student.phone,
        school: row.student.school,
        schoolLevel: row.student.schoolLevel,
        grade: row.student.grade,
        className: row.student.className,
        birthDate: row.student.birthDate,
        lotusPoints: row.student.lotusPoints,
        score: studentScores.get(row.student.id) ?? null,
      },
      classroom: {
        id: String(row.classroom.id),
        name: row.classroom.name,
        label: row.classroom.label,
        subject: row.classroom.subject,
        color: row.classroom.color,
      },
    }));

    return Response.json({ requests });
  } catch (error) {
    console.error("Load classroom requests error", error);
    return Response.json({ message: "Không thể tải danh sách yêu cầu vào lớp" }, { status: 500 });
  }
}

