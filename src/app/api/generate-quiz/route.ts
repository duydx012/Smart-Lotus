import { generateQuiz, type GenerateQuizInput } from "@/lib/ai-api";
import { computeClassLearningProfile, type ClassLearningProfile } from "@/lib/class-analytics";

export const dynamic = "force-dynamic";

/** Cho phép app UI chạy ở cổng khác (Vite) gọi trực tiếp API sinh đề. */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<
      GenerateQuizInput & { classroomId?: number | string; classProfile?: ClassLearningProfile }
    >;
    if (typeof body.topic !== "string" || typeof body.curriculumLevel !== "number") {
      return Response.json({ message: "Yêu cầu sinh câu hỏi không hợp lệ" }, { status: 400, headers: corsHeaders });
    }

    let classProfile = body.classProfile;
    if (!classProfile && body.classroomId) {
      const cid = Number(body.classroomId);
      if (Number.isSafeInteger(cid) && cid > 0) {
        classProfile = (await computeClassLearningProfile(cid)) ?? undefined;
      }
    }

    const difficulties =
      Array.isArray(body.difficulties) && body.difficulties.length > 0
        ? body.difficulties
        : classProfile?.recommendedDifficulties ?? ["A", "B", "C"];

    const intelligenceScore =
      typeof body.intelligenceScore === "number"
        ? body.intelligenceScore
        : classProfile?.intelligenceScore;

    const quiz = await generateQuiz({
      topic: body.topic,
      curriculumLevel: Math.max(1, Math.min(6, body.curriculumLevel)),
      difficulties,
      count: body.count,
      intelligenceScore,
      variationSeed: typeof body.variationSeed === "string" ? body.variationSeed.slice(0, 100) : undefined,
      excludePrompts: Array.isArray(body.excludePrompts)
        ? body.excludePrompts
            .filter((prompt): prompt is string => typeof prompt === "string")
            .slice(-40)
            .map((prompt) => prompt.slice(0, 200))
        : undefined,
      classProfile,
      referenceDocument: body.referenceDocument,
    });

    return Response.json({ ...quiz, classProfile }, { headers: corsHeaders });
  } catch (error) {
    console.error("Generate quiz API error", error);
    return Response.json({ message: "Không thể tạo bộ câu hỏi" }, { status: 500, headers: corsHeaders });
  }
}
