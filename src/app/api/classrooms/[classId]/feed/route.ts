import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomComments, classroomMemberships, classroomPosts, classrooms, users } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ classId: string }> };

function parseClassId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    const classId = parseClassId((await params).classId);
    if (!classId) return Response.json({ message: "Lớp học không hợp lệ" }, { status: 400 });

    // Kiểm tra quyền xem: giáo viên phụ trách, admin, hoặc học sinh đã gia nhập lớp
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classId)).limit(1);
    if (!classroom) return Response.json({ message: "Không tìm thấy lớp học" }, { status: 404 });

    const isTeacher = user.role === "admin" || (user.role === "teacher" && classroom.teacherId === user.id);
    if (!isTeacher) {
      const [membership] = await db
        .select()
        .from(classroomMemberships)
        .where(and(eq(classroomMemberships.classroomId, classId), eq(classroomMemberships.studentId, user.id)))
        .limit(1);

      if (!membership) {
        return Response.json({ message: "Bạn cần gia nhập lớp học để xem bảng tin" }, { status: 403 });
      }
    }

    // Lấy danh sách posts kèm thông tin tác giả
    const postsRows = await db
      .select({
        id: classroomPosts.id,
        classroomId: classroomPosts.classroomId,
        authorId: classroomPosts.authorId,
        authorName: users.displayName,
        authorAvatar: users.avatar,
        authorAvatarUrl: users.avatarUrl,
        authorRole: users.role,
        title: classroomPosts.title,
        content: classroomPosts.content,
        category: classroomPosts.category,
        attachmentUrl: classroomPosts.attachmentUrl,
        attachmentName: classroomPosts.attachmentName,
        isPinned: classroomPosts.isPinned,
        likesCount: classroomPosts.likesCount,
        createdAt: classroomPosts.createdAt,
      })
      .from(classroomPosts)
      .innerJoin(users, eq(classroomPosts.authorId, users.id))
      .where(eq(classroomPosts.classroomId, classId))
      .orderBy(desc(classroomPosts.isPinned), desc(classroomPosts.createdAt));

    // Lấy comments cho các posts
    const postIds = postsRows.map((p) => p.id);
    let commentsByPost = new Map<number, Array<{
      id: number;
      postId: number;
      authorId: number;
      authorName: string;
      authorAvatar: string;
      authorAvatarUrl: string | null;
      authorRole: string;
      content: string;
      createdAt: string;
    }>>();

    if (postIds.length > 0) {
      const commentsRows = await db
        .select({
          id: classroomComments.id,
          postId: classroomComments.postId,
          authorId: classroomComments.authorId,
          authorName: users.displayName,
          authorAvatar: users.avatar,
          authorAvatarUrl: users.avatarUrl,
          authorRole: users.role,
          content: classroomComments.content,
          createdAt: classroomComments.createdAt,
        })
        .from(classroomComments)
        .innerJoin(users, eq(classroomComments.authorId, users.id))
        .orderBy(classroomComments.createdAt);

      for (const c of commentsRows) {
        if (!postIds.includes(c.postId)) continue;
        const list = commentsByPost.get(c.postId) ?? [];
        list.push({
          ...c,
          createdAt: c.createdAt.toISOString(),
        });
        commentsByPost.set(c.postId, list);
      }
    }

    const posts = postsRows.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      comments: commentsByPost.get(p.id) ?? [],
    }));

    return Response.json({
      classroom: {
        id: String(classroom.id),
        name: classroom.name,
        label: classroom.label,
        subject: classroom.subject,
        teacherId: classroom.teacherId,
      },
      posts,
    });
  } catch (error) {
    console.error("Get classroom feed error:", error);
    return Response.json({ message: "Không thể tải bảng tin lớp học" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    const classId = parseClassId((await params).classId);
    if (!classId) return Response.json({ message: "Lớp học không hợp lệ" }, { status: 400 });

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classId)).limit(1);
    if (!classroom) return Response.json({ message: "Không tìm thấy lớp học" }, { status: 404 });

    const isTeacher = user.role === "admin" || (user.role === "teacher" && classroom.teacherId === user.id);
    if (!isTeacher) {
      const [membership] = await db
        .select()
        .from(classroomMemberships)
        .where(and(eq(classroomMemberships.classroomId, classId), eq(classroomMemberships.studentId, user.id)))
        .limit(1);

      if (!membership) {
        return Response.json({ message: "Bạn cần gia nhập lớp học để đăng bài" }, { status: 403 });
      }
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      content?: string;
      category?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      isPinned?: boolean;
    };

    const content = (body.content || "").trim();
    if (!content) {
      return Response.json({ message: "Nội dung bài viết không được để trống" }, { status: 400 });
    }

    const title = (body.title || "").trim();
    const category = body.category || (isTeacher ? "announcement" : "qa");
    const isPinned = isTeacher ? Boolean(body.isPinned) : false;

    const [newPost] = await db
      .insert(classroomPosts)
      .values({
        classroomId: classId,
        authorId: user.id,
        title: title || (category === "qa" ? "Hỏi bài thầy cô" : "Thông báo lớp học"),
        content,
        category,
        attachmentUrl: body.attachmentUrl?.trim() || null,
        attachmentName: body.attachmentName?.trim() || null,
        isPinned,
        likesCount: 0,
      })
      .returning();

    return Response.json({
      ok: true,
      message: "Đã đăng bài viết thành công!",
      post: {
        ...newPost,
        createdAt: newPost.createdAt.toISOString(),
        authorName: user.displayName,
        authorAvatar: user.avatar,
        authorAvatarUrl: user.avatarUrl,
        authorRole: user.role,
        comments: [],
      },
    });
  } catch (error) {
    console.error("Create classroom post error:", error);
    return Response.json({ message: "Không thể đăng bài viết" }, { status: 500 });
  }
}
