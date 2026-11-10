import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomNotifications, classrooms, users } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);

    const rows = await db
      .select({
        id: classroomNotifications.id,
        recipientId: classroomNotifications.recipientId,
        senderId: classroomNotifications.senderId,
        senderName: users.displayName,
        senderAvatar: users.avatar,
        senderRole: users.role,
        classroomId: classroomNotifications.classroomId,
        classroomName: classrooms.name,
        type: classroomNotifications.type,
        title: classroomNotifications.title,
        content: classroomNotifications.content,
        linkId: classroomNotifications.linkId,
        isRead: classroomNotifications.isRead,
        createdAt: classroomNotifications.createdAt,
      })
      .from(classroomNotifications)
      .innerJoin(users, eq(classroomNotifications.senderId, users.id))
      .innerJoin(classrooms, eq(classroomNotifications.classroomId, classrooms.id))
      .where(eq(classroomNotifications.recipientId, user.id))
      .orderBy(desc(classroomNotifications.createdAt))
      .limit(50);

    return Response.json({
      notifications: rows.map((n) => ({
        ...n,
        id: String(n.id),
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount: rows.filter((r) => !r.isRead).length,
    });
  } catch (error) {
    console.error("Get classroom notifications error:", error);
    return Response.json({ message: "Không thể tải thông báo" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    const body = (await request.json().catch(() => ({}))) as { notificationId?: string | number; markAll?: boolean };

    if (body.markAll) {
      await db
        .update(classroomNotifications)
        .set({ isRead: true })
        .where(eq(classroomNotifications.recipientId, user.id));
      return Response.json({ ok: true, message: "Đã đánh dấu tất cả thông báo là đã đọc" });
    }

    const notifId = Number(body.notificationId);
    if (!notifId) return Response.json({ message: "ID thông báo không hợp lệ" }, { status: 400 });

    await db
      .update(classroomNotifications)
      .set({ isRead: true })
      .where(and(eq(classroomNotifications.id, notifId), eq(classroomNotifications.recipientId, user.id)));

    return Response.json({ ok: true, message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return Response.json({ message: "Không thể cập nhật thông báo" }, { status: 500 });
  }
}
