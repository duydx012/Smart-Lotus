import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classroomMaterials, classroomMemberships, classrooms, users } from "@/db/schema";
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
        return Response.json({ message: "Bạn cần gia nhập lớp học để xem kho tài liệu độc quyền" }, { status: 403 });
      }
    }

    const rows = await db
      .select({
        id: classroomMaterials.id,
        classroomId: classroomMaterials.classroomId,
        teacherId: classroomMaterials.teacherId,
        teacherName: users.displayName,
        teacherAvatar: users.avatar,
        title: classroomMaterials.title,
        description: classroomMaterials.description,
        category: classroomMaterials.category,
        fileUrl: classroomMaterials.fileUrl,
        fileName: classroomMaterials.fileName,
        fileSize: classroomMaterials.fileSize,
        isExclusive: classroomMaterials.isExclusive,
        downloadCount: classroomMaterials.downloadCount,
        createdAt: classroomMaterials.createdAt,
      })
      .from(classroomMaterials)
      .innerJoin(users, eq(classroomMaterials.teacherId, users.id))
      .where(eq(classroomMaterials.classroomId, classId))
      .orderBy(desc(classroomMaterials.createdAt));

    return Response.json({
      classroom: {
        id: String(classroom.id),
        name: classroom.name,
        label: classroom.label,
        subject: classroom.subject,
      },
      materials: rows.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get classroom materials error:", error);
    return Response.json({ message: "Không thể tải kho tài liệu" }, { status: 500 });
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

    if (user.role !== "admin" && (user.role !== "teacher" || classroom.teacherId !== user.id)) {
      return Response.json({ message: "Chỉ giáo viên phụ trách lớp mới có quyền đăng tài liệu độc quyền" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      category?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: string;
      isExclusive?: boolean;
    };

    const title = (body.title || "").trim();
    if (!title) return Response.json({ message: "Tiêu đề tài liệu không được để trống" }, { status: 400 });

    const [newMaterial] = await db
      .insert(classroomMaterials)
      .values({
        classroomId: classId,
        teacherId: user.id,
        title,
        description: body.description?.trim() || null,
        category: body.category || "document",
        fileUrl: body.fileUrl?.trim() || null,
        fileName: body.fileName?.trim() || null,
        fileSize: body.fileSize?.trim() || "1.2 MB",
        isExclusive: body.isExclusive !== false,
        downloadCount: 0,
      })
      .returning();

    return Response.json({
      ok: true,
      message: "Đã thêm tài liệu độc quyền mới thành công!",
      material: {
        ...newMaterial,
        teacherName: user.displayName,
        teacherAvatar: user.avatar,
        createdAt: newMaterial.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create classroom material error:", error);
    return Response.json({ message: "Không thể thêm tài liệu" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const user = await getOrCreateAppUser(authUser);
    const classId = parseClassId((await params).classId);
    if (!classId) return Response.json({ message: "Lớp học không hợp lệ" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const materialId = parseClassId(searchParams.get("materialId") || "");
    if (!materialId) return Response.json({ message: "ID tài liệu không hợp lệ" }, { status: 400 });

    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, classId)).limit(1);
    if (!classroom) return Response.json({ message: "Không tìm thấy lớp học" }, { status: 404 });

    if (user.role !== "admin" && (user.role !== "teacher" || classroom.teacherId !== user.id)) {
      return Response.json({ message: "Chỉ giáo viên phụ trách mới có quyền xóa tài liệu" }, { status: 403 });
    }

    await db
      .delete(classroomMaterials)
      .where(and(eq(classroomMaterials.id, materialId), eq(classroomMaterials.classroomId, classId)));

    return Response.json({ ok: true, message: "Đã xóa tài liệu" });
  } catch (error) {
    console.error("Delete material error:", error);
    return Response.json({ message: "Không thể xóa tài liệu" }, { status: 500 });
  }
}
