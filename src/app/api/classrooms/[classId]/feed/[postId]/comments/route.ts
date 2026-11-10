import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomComments, classroomMemberships, classroomNotifications, classroomPosts, classrooms, users } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classId: string; postId: string }> };

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    const resolvedParams = await params;
    const classId = parseId(resolvedParams.classId);
    const postId = parseId(resolvedParams.postId);

    if (!classId || !postId) {
      return Response.json({ message: "Thông tin không hợp lệ" }, { status: 400 });
    }

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classId)).limit(1);
    if (!classroom) return Response.json({ message: "Không tìm thấy lớp học" }, { status: 404 });

    const [post] = await db.select().from(classroomPosts).where(and(eq(classroomPosts.id, postId), eq(classroomPosts.classroomId, classId))).limit(1);
    if (!post) return Response.json({ message: "Không tìm thấy bài viết" }, { status: 404 });

    // Kiểm tra quyền bình luận: giáo viên phụ trách, admin, hoặc học sinh đã vào lớp
    const isTeacher = user.role === "admin" || (user.role === "teacher" && classroom.teacherId === user.id);
    if (!isTeacher) {
      const [membership] = await db
        .select()
        .from(classroomMemberships)
        .where(and(eq(classroomMemberships.classroomId, classId), eq(classroomMemberships.studentId, user.id)))
        .limit(1);

      if (!membership) {
        return Response.json({ message: "Bạn cần gia nhập lớp để bình luận" }, { status: 403 });
      }
    }

    const body = (await request.json().catch(() => ({}))) as { content?: string };
    const content = (body.content || "").trim();
    if (!content) {
      return Response.json({ message: "Bình luận không được để trống" }, { status: 400 });
    }

    const [newComment] = await db
      .insert(classroomComments)
      .values({
        postId,
        authorId: user.id,
        content,
      })
      .returning();

    // NẾU HỌC SINH BÌNH LUẬN -> TỰ ĐỘNG GỬI THÔNG BÁO CHO GIÁO VIÊN
    if (user.role === "student") {
      await db.insert(classroomNotifications).values({
        recipientId: classroom.teacherId,
        senderId: user.id,
        classroomId: classId,
        type: "feed_comment",
        title: `Học sinh ${user.displayName} đã phản hồi bài viết`,
        content: `"${content.length > 80 ? content.slice(0, 77) + "..." : content}" tại bài: ${post.title || "Bảng tin lớp"} (Lớp ${classroom.name})`,
        linkId: postId,
        isRead: false,
      });
    } else if (isTeacher && post.authorId !== user.id) {
      // Nếu giáo viên trả lời câu hỏi của học sinh -> Gửi thông báo cho học sinh đặt câu hỏi
      await db.insert(classroomNotifications).values({
        recipientId: post.authorId,
        senderId: user.id,
        classroomId: classId,
        type: "feed_comment",
        title: `Thầy/Cô ${user.displayName} đã trả lời bạn`,
        content: `"${content.length > 80 ? content.slice(0, 77) + "..." : content}" tại bài: ${post.title || "Bảng tin lớp"}`,
        linkId: postId,
        isRead: false,
      });
    }

    return Response.json({
      ok: true,
      message: "Đã gửi bình luận!",
      comment: {
        id: newComment.id,
        postId: newComment.postId,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatar: user.avatar,
        authorAvatarUrl: user.avatarUrl,
        authorRole: user.role,
        content: newComment.content,
        createdAt: newComment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create comment error:", error);
    return Response.json({ message: "Không thể gửi bình luận" }, { status: 500 });
  }
}
