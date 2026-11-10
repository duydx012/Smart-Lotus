import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomInvitations, classroomMemberships, classrooms } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const student = await getOrCreateAppUser(authUser);
    if (student.role !== "student") {
      return Response.json({ message: "Chỉ học sinh mới có thể gửi yêu cầu tham gia lớp" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const classroomId = body && typeof body === "object" && "classroomId" in body ? Number((body as { classroomId: unknown }).classroomId) : null;

    if (!classroomId || !Number.isSafeInteger(classroomId) || classroomId < 1) {
      return Response.json({ message: "Mã lớp học không hợp lệ" }, { status: 400 });
    }

    // Kiểm tra lớp học có tồn tại không
    const [targetClass] = await db
      .select({ id: classrooms.id, name: classrooms.name })
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (!targetClass) {
      return Response.json({ message: "Không tìm thấy lớp học này" }, { status: 404 });
    }

    // Kiểm tra học sinh đã là thành viên lớp chưa
    const [existingMember] = await db
      .select({ id: classroomMemberships.id })
      .from(classroomMemberships)
      .where(and(eq(classroomMemberships.classroomId, classroomId), eq(classroomMemberships.studentId, student.id)))
      .limit(1);

    if (existingMember) {
      return Response.json({ message: `Bạn đã là thành viên của lớp ${targetClass.name}` }, { status: 400 });
    }

    // Kiểm tra và tạo/cập nhật yêu cầu trong classroomInvitations
    const [existingInvite] = await db
      .select({ id: classroomInvitations.id, status: classroomInvitations.status })
      .from(classroomInvitations)
      .where(and(eq(classroomInvitations.classroomId, classroomId), eq(classroomInvitations.studentId, student.id)))
      .limit(1);

    let invitationId: number;

    if (existingInvite) {
      if (existingInvite.status === "pending") {
        return Response.json({ message: "Bạn đã gửi yêu cầu xin vào lớp này rồi, vui lòng chờ thầy cô phê duyệt nhé!" }, { status: 400 });
      }

      // Nếu đã từng từ chối hoặc trạng thái khác, cập nhật lại thành pending
      const [updated] = await db
        .update(classroomInvitations)
        .set({
          status: "pending",
          respondedAt: null,
          createdAt: new Date(),
        })
        .where(eq(classroomInvitations.id, existingInvite.id))
        .returning({ id: classroomInvitations.id });

      invitationId = updated.id;
    } else {
      const [inserted] = await db
        .insert(classroomInvitations)
        .values({
          classroomId,
          studentId: student.id,
          status: "pending",
        })
        .returning({ id: classroomInvitations.id });

      invitationId = inserted.id;
    }

    return Response.json({
      ok: true,
      message: `Đã gửi yêu cầu xin vào lớp ${targetClass.name} thành công!`,
      invitationId: String(invitationId),
    });
  } catch (error) {
    console.error("Request to join class error", error);
    return Response.json({ message: "Không thể gửi yêu cầu xin vào lớp" }, { status: 500 });
  }
}

