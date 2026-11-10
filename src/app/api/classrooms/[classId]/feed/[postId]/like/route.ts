import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classroomPosts, classrooms } from "@/db/schema";
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
    await getOrCreateAppUser(authUser);
    const resolvedParams = await params;
    const classId = parseId(resolvedParams.classId);
    const postId = parseId(resolvedParams.postId);

    if (!classId || !postId) return Response.json({ message: "Thông tin không hợp lệ" }, { status: 400 });

    const [updated] = await db
      .update(classroomPosts)
      .set({
        likesCount: sql`${classroomPosts.likesCount} + 1`,
      })
      .where(and(eq(classroomPosts.id, postId), eq(classroomPosts.classroomId, classId)))
      .returning({ id: classroomPosts.id, likesCount: classroomPosts.likesCount });

    if (!updated) return Response.json({ message: "Không tìm thấy bài viết" }, { status: 404 });

    return Response.json({ ok: true, likesCount: updated.likesCount });
  } catch (error) {
    console.error("Like post error:", error);
    return Response.json({ message: "Không thể thả tim" }, { status: 500 });
  }
}
