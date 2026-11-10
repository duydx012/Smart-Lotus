import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classroomInvitations, classroomMemberships, classrooms, users } from "@/db/schema";
import { getAuthenticatedSupabaseUser, getOrCreateAppUser } from "@/lib/server-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser(request);
  if (!authUser) return Response.json({ message: "Vui lòng đăng nhập" }, { status: 401 });

  try {
    const currentUser = await getOrCreateAppUser(authUser);

    // 1. Lấy danh sách tất cả giáo viên đăng ký trong hệ thống
    const teacherRows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatar: users.avatar,
        avatarUrl: users.avatarUrl,
        school: users.school,
        province: users.province,
        district: users.district,
      })
      .from(users)
      .where(eq(users.role, "teacher"))
      .orderBy(asc(users.displayName));

    if (teacherRows.length === 0) {
      return Response.json({ teachers: [] });
    }

    const teacherIds = teacherRows.map((t) => t.id);

    // 2. Lấy tất cả lớp học thêm (is_extra = true) thuộc về các giáo viên này
    const classRows = await db
      .select({
        id: classrooms.id,
        teacherId: classrooms.teacherId,
        name: classrooms.name,
        label: classrooms.label,
        subject: classrooms.subject,
        description: classrooms.description,
        color: classrooms.color,
        schedule: classrooms.schedule,
      })
      .from(classrooms)
      .where(and(inArray(classrooms.teacherId, teacherIds), eq(classrooms.isExtra, true)))
      .orderBy(asc(classrooms.createdAt));

    const classIds = classRows.map((c) => c.id);

    // 3. Đếm sĩ số cho từng lớp học
    const memberCounts = new Map<number, number>();
    if (classIds.length > 0) {
      const allMembers = await db
        .select({
          classroomId: classroomMemberships.classroomId,
        })
        .from(classroomMemberships)
        .where(inArray(classroomMemberships.classroomId, classIds));

      for (const m of allMembers) {
        memberCounts.set(m.classroomId, (memberCounts.get(m.classroomId) ?? 0) + 1);
      }
    }

    // 4. Nếu người dùng là học sinh, lấy trạng thái tham gia & trạng thái yêu cầu (request)
    const joinedClassIds = new Set<number>();
    const requestStatusByClassId = new Map<number, { status: "pending" | "accepted" | "declined"; invitationId: number }>();

    if (currentUser.role === "student" && classIds.length > 0) {
      const [myMemberships, myRequests] = await Promise.all([
        db
          .select({ classroomId: classroomMemberships.classroomId })
          .from(classroomMemberships)
          .where(and(eq(classroomMemberships.studentId, currentUser.id), inArray(classroomMemberships.classroomId, classIds))),
        db
          .select({
            id: classroomInvitations.id,
            classroomId: classroomInvitations.classroomId,
            status: classroomInvitations.status,
          })
          .from(classroomInvitations)
          .where(and(eq(classroomInvitations.studentId, currentUser.id), inArray(classroomInvitations.classroomId, classIds)))
          .orderBy(desc(classroomInvitations.createdAt)),
      ]);

      for (const m of myMemberships) {
        joinedClassIds.add(m.classroomId);
      }

      for (const r of myRequests) {
        if (!requestStatusByClassId.has(r.classroomId)) {
          requestStatusByClassId.set(r.classroomId, {
            status: r.status as "pending" | "accepted" | "declined",
            invitationId: r.id,
          });
        }
      }
    }

    // 5. Gom lớp học theo từng giáo viên
    const classesByTeacher = new Map<number, typeof classRows>();
    for (const c of classRows) {
      const list = classesByTeacher.get(c.teacherId) ?? [];
      list.push(c);
      classesByTeacher.set(c.teacherId, list);
    }

    const teachers = teacherRows.map((teacher) => {
      const myClasses = classesByTeacher.get(teacher.id) ?? [];
      return {
        id: String(teacher.id),
        displayName: teacher.displayName,
        email: teacher.email,
        avatar: teacher.avatar,
        avatarUrl: teacher.avatarUrl,
        school: teacher.school,
        province: teacher.province,
        district: teacher.district,
        classrooms: myClasses.map((cls) => {
          const reqInfo = requestStatusByClassId.get(cls.id);
          return {
            id: String(cls.id),
            name: cls.name,
            label: cls.label,
            subject: cls.subject,
            description: cls.description,
            color: cls.color,
            schedule: cls.schedule ?? undefined,
            studentCount: memberCounts.get(cls.id) ?? 0,
            membershipStatus: joinedClassIds.has(cls.id) ? "joined" : "not_joined",
            requestStatus: reqInfo ? reqInfo.status : "none",
            invitationId: reqInfo ? String(reqInfo.invitationId) : undefined,
          };
        }),
      };
    });

    return Response.json({ teachers });
  } catch (error) {
    console.error("Load extra classes error", error);
    return Response.json({ message: "Không thể tải danh sách lớp học thêm" }, { status: 500 });
  }
}

