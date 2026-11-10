import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomInvitations, classroomMemberships, classrooms } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    if (user.role !== "teacher" && user.role !== "admin") {
      return Response.json({ message: "Chỉ giáo viên mới có thể duyệt yêu cầu vào lớp" }, { status: 403 });
    }

    const requestId = Number((await params).requestId);
    if (!Number.isSafeInteger(requestId) || requestId < 1) {
      return Response.json({ message: "Yêu cầu không hợp lệ" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const decision = body && typeof body === "object" && "decision" in body ? body.decision : null;

    if (decision !== "accepted" && decision !== "declined") {
      return Response.json({ message: "Hành động duyệt không hợp lệ" }, { status: 400 });
    }

    // Kiểm tra yêu cầu có thuộc lớp do giáo viên này quản lý không
    const [invitationRow] = await db
      .select({
        invitation: classroomInvitations,
        classroom: classrooms,
      })
      .from(classroomInvitations)
      .innerJoin(classrooms, eq(classroomInvitations.classroomId, classrooms.id))
      .where(and(
        eq(classroomInvitations.id, requestId),
        user.role === "admin" ? undefined : eq(classrooms.teacherId, user.id)
      ))
      .limit(1);

    if (!invitationRow) {
      return Response.json({ message: "Không tìm thấy yêu cầu này hoặc bạn không có quyền phê duyệt" }, { status: 404 });
    }

    const { invitation } = invitationRow;

    const result = await db.transaction(async (tx) => {
      if (decision === "accepted") {
        // Thêm học sinh vào lớp học
        await tx
          .insert(classroomMemberships)
          .values({
            classroomId: invitation.classroomId,
            studentId: invitation.studentId,
            joinedAt: new Date(),
          })
          .onConflictDoNothing();
      }

      // Cập nhật trạng thái yêu cầu
      const [updated] = await tx
        .update(classroomInvitations)
        .set({
          status: decision,
          respondedAt: new Date(),
        })
        .where(eq(classroomInvitations.id, requestId))
        .returning({ id: classroomInvitations.id, status: classroomInvitations.status });

      return updated;
    });

    return Response.json({
      ok: true,
      status: result.status,
      message: decision === "accepted" ? "Đã duyệt học sinh vào lớp thành công!" : "Đã từ chối yêu cầu tham gia lớp.",
    });
  } catch (error) {
    console.error("Respond to classroom request error", error);
    return Response.json({ message: "Không thể phê duyệt yêu cầu" }, { status: 500 });
  }
}

