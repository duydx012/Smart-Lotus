import { supabase } from "@/lib/supabase";
import type { Assignment } from "@/lib/assignment-data";
import type { Classroom, Student, ClassLearningProfile } from "@/lib/student-data";

export type Role = "student" | "teacher" | "admin";

export type LessonRecord = {
  id: number;
  slug: string;
  curriculumLevel: number;
  title: string;
  topic: string;
  competency: string;
  questionCount: number;
};

export type DashboardData = {
  user: {
    id: number;
    displayName: string;
    email: string;
    role: Role;
    avatar: string;
    avatarUrl?: string;
    lotusPoints: number;
    currentStreak: number;
  };
  stats: {
    completedLessons: number;
    totalLessons: number;
    averageScore: number;
    learningMinutes: number;
  };
  recentAttempts: Array<{
    id: number;
    lessonSlug: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    durationSeconds: number;
    completedAt: string;
  }>;
  todayActivity: {
    minutesLearned: number;
    lessonsCompleted: number;
    pointsEarned: number;
    correctAnswers: number;
    attempts: number;
    accuracySum: number;
  };
  weeklyLeaderboard: Array<{
    name: string;
    avatar: string;
    points: number;
    isCurrentUser: boolean;
  }>;
  lowScoreAttempts: number;
  placement: import("./placement").PlacementResult | null;
  attemptHistory: import("./placement").AttemptSummary[];
};

export type AttemptPayload = {
  lessonSlug: string;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  durationSeconds: number;
  highestDifficulty: "A" | "B" | "C" | "D" | "E";
  answers: Array<{ questionId: number; answer: string; correct: boolean }>;
};

export type { ClassLearningProfile };

export type ClassroomDetails = {
  classProfile?: ClassLearningProfile;
  classroom: Classroom;
  students: Student[];
};

export type ClassroomInvitation = {
  id: string;
  classroomId: string;
  classroomName: string;
  classroomLabel: string;
  subject: string;
  teacherName: string;
  createdAt: string;
};

export type ExtraClassroom = {
  id: string;
  name: string;
  label: string;
  subject: string;
  description: string;
  color: string;
  studentCount: number;
  membershipStatus: "joined" | "not_joined";
  requestStatus: "pending" | "accepted" | "declined" | "none";
  invitationId?: string;
};

export type ExtraClassTeacher = {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  avatarUrl?: string | null;
  school?: string | null;
  province?: string | null;
  district?: string | null;
  classrooms: ExtraClassroom[];
};

export type StudentClassroomRequest = {
  id: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt?: string | null;
  student: {
    id: string;
    studentCode: string;
    displayName: string;
    email: string;
    avatar: string;
    avatarUrl?: string | null;
    phone?: string | null;
    school?: string | null;
    schoolLevel?: string | null;
    grade?: string | null;
    className?: string | null;
    birthDate?: string | null;
    lotusPoints: number;
    score?: number | null;
  };
  classroom: {
    id: string;
    name: string;
    label: string;
    subject: string;
    color: string;
  };
};

export type ClassroomFeedComment = {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  authorAvatarUrl?: string | null;
  authorRole: string;
  content: string;
  createdAt: string;
};

export type ClassroomFeedPost = {
  id: number;
  classroomId: number;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  authorAvatarUrl?: string | null;
  authorRole: string;
  title?: string | null;
  content: string;
  category: "announcement" | "qa" | "challenge" | "material" | string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isPinned: boolean;
  likesCount: number;
  createdAt: string;
  comments: ClassroomFeedComment[];
};

export type ClassroomMaterialItem = {
  id: number;
  classroomId: number;
  teacherId: number;
  teacherName: string;
  teacherAvatar: string;
  title: string;
  description?: string | null;
  category: "document" | "exam_prep" | "tips" | "video" | string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  isExclusive: boolean;
  downloadCount: number;
  createdAt: string;
};

export type ClassroomActivityNotification = {
  id: string;
  recipientId: number;
  senderId: number;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  classroomId: number;
  classroomName: string;
  type: "feed_comment" | "join_request" | "new_post" | "new_material" | string;
  title: string;
  content: string;
  linkId?: number | null;
  isRead: boolean;
  createdAt: string;
};

export type AssignmentProject = {
  id: string;
  name: string;
  topic: string;
  curriculumLevel: number;
  updatedAt: string;
  questions?: import("./learning-data").QuizQuestion[];
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "Không thể kết nối tới máy chủ");
  }

  return response.json() as Promise<T>;
}

export const smartLotusApi = {
  getLessons() {
    return request<{ lessons: LessonRecord[] }>("/api/lessons");
  },
  getDashboard(role: Role = "student") {
    return request<DashboardData>(`/api/dashboard?role=${role}`);
  },
  submitAttempt(payload: AttemptPayload) {
    return request<{ ok: true; attemptId: number; totalPoints: number }>("/api/attempts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getClassrooms() {
    return request<{ classrooms: Classroom[] }>("/api/classrooms");
  },
  getClassroom(classroomId: string) {
    return request<ClassroomDetails>(`/api/classrooms/${encodeURIComponent(classroomId)}`);
  },
  createClassroom(classroom: Omit<Classroom, "id" | "joinCode" | "teacherName" | "studentCount">) {
    return request<{ classroom: Classroom }>("/api/classrooms", {
      method: "POST",
      body: JSON.stringify(classroom),
    });
  },
  updateClassroom(classroom: Classroom) {
    return request<{ classroom: Classroom }>("/api/classrooms", {
      method: "PATCH",
      body: JSON.stringify(classroom),
    });
  },
  deleteClassroom(classroomId: string) {
    return request<{ ok: true }>(`/api/classrooms/${encodeURIComponent(classroomId)}`, { method: "DELETE" });
  },
  joinClassroom(code: string) {
    return request<{ classroom: Classroom }>("/api/classrooms/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
  getStudentCode() {
    return request<{ studentCode: string }>("/api/student-code");
  },
  inviteStudent(classroomId: string, studentCode: string) {
    return request<{ invitation: { id: string; status: string } }>(`/api/classrooms/${encodeURIComponent(classroomId)}/invite`, {
      method: "POST",
      body: JSON.stringify({ studentCode }),
    });
  },
  seedClassroomStudents(classroomId: string | number) {
    return request<{ ok: true; message: string; count: number }>(`/api/classrooms/${encodeURIComponent(String(classroomId))}/seed-students`, {
      method: "POST",
    });
  },
  addStudentToClassroom(
    classroomId: string | number,
    data: {
      mode?: "create" | "byCode";
      studentCode?: string;
      fullName?: string;
      email?: string;
      birthDate?: string;
      gender?: "Nam" | "Nữ";
      parentName?: string;
      parentPhone?: string;
      score?: number;
    }
  ) {
    return request<{ ok: true; message: string; student: Student }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/students`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },
  removeStudentFromClassroom(classroomId: string | number, studentId: string | number) {
    return request<{ ok: true; message: string }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/students?studentId=${encodeURIComponent(String(studentId))}`,
      {
        method: "DELETE",
      }
    );
  },
  getClassroomInvitations() {
    return request<{ invitations: ClassroomInvitation[] }>("/api/classroom-invitations");
  },
  respondToClassroomInvitation(invitationId: string, decision: "accepted" | "declined") {
    return request<{ invitation: { id: string; status: string } }>(`/api/classroom-invitations/${encodeURIComponent(invitationId)}`, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    });
  },
  getExtraClasses() {
    return request<{ teachers: ExtraClassTeacher[] }>("/api/extra-classes");
  },
  requestToJoinExtraClass(classroomId: string | number) {
    return request<{ ok: true; message: string; invitationId: string }>("/api/extra-classes/request", {
      method: "POST",
      body: JSON.stringify({ classroomId: Number(classroomId) }),
    });
  },
  getClassroomRequests() {
    return request<{ requests: StudentClassroomRequest[] }>("/api/classroom-requests");
  },
  respondToClassroomRequest(requestId: string | number, decision: "accepted" | "declined") {
    return request<{ ok: true; status: string; message: string }>(`/api/classroom-requests/${encodeURIComponent(String(requestId))}`, {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    });
  },
  getClassroomFeed(classroomId: string | number) {
    return request<{ classroom: { id: string; name: string; label: string; subject: string; teacherId: number }; posts: ClassroomFeedPost[] }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/feed`
    );
  },
  createClassroomPost(classroomId: string | number, payload: { title?: string; content: string; category?: string; attachmentUrl?: string; attachmentName?: string; isPinned?: boolean }) {
    return request<{ ok: true; message: string; post: ClassroomFeedPost }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/feed`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },
  createClassroomComment(classroomId: string | number, postId: number | string, content: string) {
    return request<{ ok: true; message: string; comment: ClassroomFeedComment }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/feed/${encodeURIComponent(String(postId))}/comments`,
      { method: "POST", body: JSON.stringify({ content }) }
    );
  },
  likeClassroomPost(classroomId: string | number, postId: number | string) {
    return request<{ ok: true; likesCount: number }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/feed/${encodeURIComponent(String(postId))}/like`,
      { method: "POST" }
    );
  },
  getClassroomMaterials(classroomId: string | number) {
    return request<{ classroom: { id: string; name: string; label: string; subject: string }; materials: ClassroomMaterialItem[] }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/materials`
    );
  },
  createClassroomMaterial(classroomId: string | number, payload: { title: string; description?: string; category?: string; fileUrl?: string; fileName?: string; fileSize?: string; isExclusive?: boolean }) {
    return request<{ ok: true; message: string; material: ClassroomMaterialItem }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/materials`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },
  deleteClassroomMaterial(classroomId: string | number, materialId: number | string) {
    return request<{ ok: true; message: string }>(
      `/api/classrooms/${encodeURIComponent(String(classroomId))}/materials?materialId=${encodeURIComponent(String(materialId))}`,
      { method: "DELETE" }
    );
  },
  getClassroomNotifications() {
    return request<{ notifications: ClassroomActivityNotification[]; unreadCount: number }>("/api/classroom-notifications");
  },
  markClassroomNotificationRead(notificationId?: string | number, markAll?: boolean) {
    return request<{ ok: true; message?: string }>("/api/classroom-notifications", {
      method: "PATCH",
      body: JSON.stringify({ notificationId, markAll }),
    });
  },
  getAssignments() {
    return request<{ assignments: Assignment[] }>("/api/assignments");
  },
  getAssignmentProjects() {
    return request<{ projects: AssignmentProject[] }>("/api/assignment-projects");
  },
  getAssignmentProject(projectId: string) {
    return request<{ project: AssignmentProject }>(`/api/assignment-projects?id=${encodeURIComponent(projectId)}`);
  },
  saveAssignmentProject(project: Omit<AssignmentProject, "id" | "updatedAt"> & { id?: string }) {
    return request<{ project: AssignmentProject }>("/api/assignment-projects", {
      method: project.id ? "PATCH" : "POST",
      body: JSON.stringify(project),
    });
  },
  deleteAssignmentProject(projectId: string) {
    return request<{ ok: true }>(`/api/assignment-projects?id=${encodeURIComponent(projectId)}`, { method: "DELETE" });
  },
  getLibraryImages() {
    return request<{ categories: Array<{ category: "canh_vat" | "do_vat"; files: Array<{ name: string; src: string }> }> }>("/api/library-assets");
  },
  async removeImageBackground(file: File) {
    const { data: { session } } = await supabase.auth.getSession();
    const form = new FormData();
    form.append("file", file, file.name);
    const response = await fetch("/api/remove-image-background", {
      method: "POST",
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? "Không thể tách nền ảnh");
    }
    return response.blob();
  },
  createAssignment(input: {
    classroomId: string;
    title: string;
    topic: string;
    curriculumLevel: number;
    dueAt: string;
    durationMinutes: number;
    questions: import("./learning-data").QuizQuestion[];
    isAdaptive?: boolean;
  }) {
    return request<{ assignment: Assignment }>("/api/assignments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  personalizeAssignment(assignmentId: string, input?: { interest?: string; forceAI?: boolean }) {
    return request<{
      ok: true;
      isExisting: boolean;
      sourceMode?: "ai" | "dynamic-multi-template";
      questions: import("./learning-data").QuizQuestion[];
      studentProfile: {
        studentName: string;
        status: string;
        interest: string;
        sourceMode?: "ai" | "dynamic-multi-template";
      };
    }>(`/api/assignments/${encodeURIComponent(assignmentId)}/personalize`, {
      method: "POST",
      body: JSON.stringify(input || {}),
    });
  },
  submitAssignment(assignmentId: string, input: {
    durationSeconds: number;
    challengeDurationSeconds: number;
    answers: Array<{ questionId: number; answer: string }>;
  }) {
    return request<{ submission: NonNullable<Assignment["submission"]> & { score: number } }>(
      `/api/assignments/${encodeURIComponent(assignmentId)}/submit`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  savePlacement(placement: import("./placement").PlacementResult) {
    return request<{ ok: true }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify({ placement }),
    });
  },
  updateProfile(profile: { displayName: string; avatarUrl: string }) {
    return request<{ ok: true }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(profile),
    });
  },
  generateQuiz(input: {
    topic: string;
    curriculumLevel: number;
    difficulties?: Array<"A" | "B" | "C" | "D" | "E">;
    count?: number;
    intelligenceScore?: number;
    variationSeed?: string;
    excludePrompts?: string[];
    classroomId?: string | number;
    classProfile?: ClassLearningProfile;
    referenceDocument?: { name?: string; content: string };
  }) {
    return request<{
      source: "ai" | "question-bank";
      questions: import("./learning-data").QuizQuestion[];
      classProfile?: ClassLearningProfile;
      ragSummary?: string;
      referenceDocName?: string;
    }>("/api/generate-quiz", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  evaluatePath(input: { placement: import("./placement").PlacementResult; attempts: import("./placement").AttemptSummary[] }) {
    return request<{ source: "ai" | "local"; evaluation: import("./placement").PathEvaluation }>("/api/evaluate-path", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  generateSurvey(count = 30) {
    return request<{ source: "ai" | "question-bank"; questions: import("./learning-data").SurveyQuestion[] }>("/api/generate-survey", {
      method: "POST",
      body: JSON.stringify({ count }),
    });
  },
  generateSurveyVariant(question: import("./learning-data").SurveyQuestion) {
    return request<{ source: "ai" | "local"; question: import("./learning-data").SurveyQuestion }>("/api/generate-survey-variant", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },
};
