import type { Difficulty } from "./placement";
import type { ClassLearningProfile } from "./student-data";
import type { QuizQuestion } from "./learning-data";

/**
 * Ma trận chuẩn kiến thức GDPT 2018 môn Toán Tiểu học (Lớp 1 - 5).
 * Dùng làm khung tri thức chuẩn (Guardrails) để chống ảo giác khi AI sinh đề.
 */
export type GradeCurriculumStandard = {
  grade: number;
  gradeName: string;
  numberRange: string;
  allowedOperations: string[];
  forbiddenConcepts: string[];
  pedagogicalPrinciples: string[];
  commonTopics: string[];
  standardExamples: Array<{
    difficulty: Difficulty;
    skill: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
};

export const GDPT_MATH_STANDARDS: Record<number, GradeCurriculumStandard> = {
  1: {
    grade: 1,
    gradeName: "Toán Lớp 1 (GDPT 2018)",
    numberRange: "Phạm vi từ 0 đến 100 (Chủ yếu 0-20 ở HK1, số có hai chữ số không nhớ ở HK2).",
    allowedOperations: [
      "Đếm, đọc, viết, so sánh các số trong phạm vi 100",
      "Phép cộng, phép trừ không nhớ trong phạm vi 100 (đặc biệt trong phạm vi 10 và 20)",
      "Tìm thành phần chưa biết dạng trực quan: a + [?] = b hoặc [?] - a = b",
      "Bài toán có lời văn một bước tính với các sự vật gần gũi (quả cam, bông hoa, viên bi, bạn nhỏ)",
      "Độ dài đo bằng gang tay, que tính, cm",
    ],
    forbiddenConcepts: [
      "TUYỆT ĐỐI KHÔNG dùng phép nhân hoặc phép chia",
      "TUYỆT ĐỐI KHÔNG dùng số âm, phân số, số thập phân",
      "KHÔNG dùng phép cộng/trừ có nhớ trong phạm vi 100",
      "KHÔNG dùng từ ngữ trừu tượng hay câu hỏi triết lý/khoa học",
      "KHÔNG hỏi các câu đố mẹo gây rối tư duy trẻ 6 tuổi",
    ],
    pedagogicalPrinciples: [
      "Ngôn ngữ ngắn gọn, trong sáng, dễ đọc (học sinh lớp 1 đọc chữ còn chậm).",
      "Mỗi câu hỏi phải đi thẳng vào yêu cầu tính toán hoặc so sánh.",
      "Đáp án gây nhiễu phải hợp lý (ví dụ: cộng nhầm 1 đơn vị hoặc trừ thay vì cộng).",
    ],
    commonTopics: ["Phép cộng", "Phép trừ", "So sánh số", "Số liền trước - liền sau", "Bài toán có lời văn"],
    standardExamples: [
      {
        difficulty: "A",
        skill: "Tính nhẩm trong phạm vi 10",
        prompt: "Tính: 4 + 3 = ...",
        options: ["7", "6", "8", "5"],
        correctAnswer: "7",
        explanation: "Ta có 4 cộng thêm 3 bằng 7.",
      },
      {
        difficulty: "B",
        skill: "Phép trừ trong phạm vi 20",
        prompt: "Tính: 15 - 4 = ...",
        options: ["11", "10", "12", "19"],
        correctAnswer: "11",
        explanation: "Lấy 5 trừ 4 bằng 1, giữ nguyên 1 chục ta được 11.",
      },
      {
        difficulty: "C",
        skill: "So sánh giá trị biểu thức",
        prompt: "Điền dấu thích hợp vào chỗ chấm: 8 + 2 ... 9 - 1",
        options: [">", "<", "=", "+"],
        correctAnswer: ">",
        explanation: "Vì 8 + 2 = 10 và 9 - 1 = 8. Do 10 > 8 nên ta điền dấu >.",
      },
      {
        difficulty: "D",
        skill: "Tìm thành phần chưa biết",
        prompt: "Số thích hợp điền vào ô trống là: 6 + ... = 10",
        options: ["4", "3", "5", "16"],
        correctAnswer: "4",
        explanation: "Vì 10 - 6 = 4 nên số cần điền là 4.",
      },
      {
        difficulty: "E",
        skill: "Toán có lời văn một bước tính",
        prompt: "Tổ Một có 5 bông hoa sen, tổ Hai tặng thêm 4 bông hoa sen nữa. Hỏi cả hai tổ có tất cả bao nhiêu bông hoa sen?",
        options: ["9 bông", "8 bông", "1 bông", "10 bông"],
        correctAnswer: "9 bông",
        explanation: "Cả hai tổ có tất cả là: 5 + 4 = 9 (bông hoa).",
      },
    ],
  },
  2: {
    grade: 2,
    gradeName: "Toán Lớp 2 (GDPT 2018)",
    numberRange: "Số trong phạm vi 1000. Phép cộng, phép trừ có nhớ trong phạm vi 100.",
    allowedOperations: [
      "Phép cộng, phép trừ có nhớ trong phạm vi 100",
      "Đọc, viết, so sánh số có ba chữ số trong phạm vi 1000",
      "Bảng nhân 2, bảng nhân 5; Bảng chia 2, bảng chia 5",
      "Đơn vị đo độ dài: dm, m, km, mm; Khối lượng: kg; Dung tích: lít",
      "Hình học: Điểm, đoạn thẳng, đường gấp khúc, hình tứ giác, hình tam giác",
    ],
    forbiddenConcepts: [
      "KHÔNG dùng số âm, phân số, số thập phân",
      "KHÔNG dùng bảng nhân 3, 4, 6, 7, 8, 9 (chỉ dùng nhân/chia 2 và 5)",
      "KHÔNG dùng phép nhân/chia số có 2-3 chữ số",
    ],
    pedagogicalPrinciples: [
      "Khuyến khích rèn luyện kỹ năng tính toán có nhớ cẩn thận.",
      "Bài toán có lời văn gắn với thực tế đời sống hàng ngày.",
    ],
    commonTopics: ["Cộng có nhớ trong phạm vi 100", "Trừ có nhớ", "Bảng nhân 2 và 5", "Bảng chia 2 và 5", "Hình học và đo lường"],
    standardExamples: [
      {
        difficulty: "B",
        skill: "Cộng có nhớ phạm vi 100",
        prompt: "Tính: 38 + 25 = ...",
        options: ["63", "53", "62", "73"],
        correctAnswer: "63",
        explanation: "8 cộng 5 bằng 13, viết 3 nhớ 1. 3 cộng 2 bằng 5 thêm 1 bằng 6. Kết quả là 63.",
      },
      {
        difficulty: "C",
        skill: "Bảng nhân 5",
        prompt: "Mỗi bàn có 5 bạn học sinh. Hỏi 4 bàn như vậy có tất cả bao nhiêu bạn học sinh?",
        options: ["20 bạn", "25 bạn", "9 bạn", "15 bạn"],
        correctAnswer: "20 bạn",
        explanation: "Số bạn học sinh có tất cả là: 5 x 4 = 20 (bạn).",
      },
      {
        difficulty: "D",
        skill: "Đơn vị đo lường lít",
        prompt: "Thùng thứ nhất có 35 lít dầu, thùng thứ hai có nhiều hơn thùng thứ nhất 8 lít dầu. Hỏi thùng thứ hai có bao nhiêu lít dầu?",
        options: ["43 lít", "27 lít", "42 lít", "44 lít"],
        correctAnswer: "43 lít",
        explanation: "Thùng thứ hai có số lít dầu là: 35 + 8 = 43 (lít).",
      },
    ],
  },
  3: {
    grade: 3,
    gradeName: "Toán Lớp 3 (GDPT 2018)",
    numberRange: "Số trong phạm vi 100 000. Các phép tính nhân chia với số có 1 chữ số.",
    allowedOperations: [
      "Bảng nhân, bảng chia từ 1 đến 9",
      "Cộng trừ trong phạm vi 100 000; Nhân, chia số có nhiều chữ số cho số có một chữ số",
      "Tính chu vi hình tam giác, tứ giác, hình chữ nhật, hình vuông; Diện tích hình vuông, chữ nhật",
      "Giải bài toán bằng hai bước tính",
    ],
    forbiddenConcepts: ["KHÔNG dùng số âm, số thập phân", "KHÔNG chia cho số có hai chữ số trở lên"],
    pedagogicalPrinciples: ["Rèn luyện kỹ năng phân tích bài toán 2 bước tính logic."],
    commonTopics: ["Nhân chia số có nhiều chữ số", "Chu vi và diện tích", "Bài toán hai bước tính"],
    standardExamples: [
      {
        difficulty: "C",
        skill: "Chu vi hình chữ nhật",
        prompt: "Một mảnh vườn hình chữ nhật có chiều dài 12m, chiều rộng 8m. Chu vi của mảnh vườn đó là:",
        options: ["40m", "20m", "96m", "28m"],
        correctAnswer: "40m",
        explanation: "Chu vi hình chữ nhật là: (12 + 8) x 2 = 40 (m).",
      },
    ],
  },
  4: {
    grade: 4,
    gradeName: "Toán Lớp 4 (GDPT 2018)",
    numberRange: "Số tự nhiên đến lớp triệu. Khái niệm phân số và các phép tính phân số.",
    allowedOperations: [
      "Phép cộng, trừ, nhân, chia số tự nhiên",
      "Khái niệm phân số, rút gọn, quy đồng, 4 phép tính với phân số",
      "Dấu hiệu chia hết cho 2, 3, 5, 9",
      "Tìm số trung bình cộng; Tìm hai số khi biết tổng và hiệu",
    ],
    forbiddenConcepts: ["KHÔNG dùng số âm, số thập phân"],
    pedagogicalPrinciples: ["Bài toán có tư duy trừu tượng hơn, chú trọng phân số và tư duy chia hết."],
    commonTopics: ["Phân số", "Dấu hiệu chia hết", "Tìm hai số khi biết tổng và hiệu"],
    standardExamples: [
      {
        difficulty: "C",
        skill: "Cộng hai phân số cùng mẫu số",
        prompt: "Tính: 3/7 + 2/7 = ...",
        options: ["5/7", "5/14", "6/7", "1/7"],
        correctAnswer: "5/7",
        explanation: "Muốn cộng hai phân số cùng mẫu, ta cộng tử số với nhau và giữ nguyên mẫu: (3 + 2)/7 = 5/7.",
      },
    ],
  },
  5: {
    grade: 5,
    gradeName: "Toán Lớp 5 (GDPT 2018)",
    numberRange: "Số thập phân, tỉ số phần trăm, hỗn số.",
    allowedOperations: [
      "Cộng, trừ, nhân, chia số thập phân",
      "Tỉ số phần trăm, giải toán về tỉ số phần trăm",
      "Hình học: Hình thang, hình tròn, hình hộp chữ nhật, hình lập phương",
      "Chuyển động đều: Vận tốc, quãng đường, thời gian",
    ],
    forbiddenConcepts: ["KHÔNG dùng số âm, căn bậc hai, đại số cấp 2"],
    pedagogicalPrinciples: ["Bài toán ứng dụng thực tế cao (mua sắm, lãi suất, chuyển động đường phố)."],
    commonTopics: ["Số thập phân", "Tỉ số phần trăm", "Toán chuyển động đều", "Diện tích và thể tích hình"],
    standardExamples: [
      {
        difficulty: "C",
        skill: "Nhân số thập phân",
        prompt: "Tính: 4,25 x 10 = ...",
        options: ["42,5", "425", "0,425", "4,250"],
        correctAnswer: "42,5",
        explanation: "Khi nhân một số thập phân với 10, ta chỉ việc chuyển dấu phẩy sang bên phải một chữ số.",
      },
    ],
  },
};

/**
 * Cấu trúc tài liệu tham khảo tải lên hoặc dán từ giáo viên (Option 3)
 */
export type ReferenceDocument = {
  name?: string;
  content: string;
};

export type ProcessedDocument = {
  name: string;
  wordCount: number;
  detectedProblemCount: number;
  extractedExcerpts: string[];
  summaryNote: string;
};

/**
 * Tiền xử lý và phân tách tài liệu tham khảo của giáo viên (Document Chunking)
 */
export function processReferenceDocument(doc?: ReferenceDocument | null): ProcessedDocument | null {
  if (!doc || !doc.content || !doc.content.trim()) return null;

  const rawText = doc.content.trim();
  const words = rawText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 3) return null;

  // Tách dòng và tìm các câu hỏi hoặc dạng bài đặc trưng
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const detectedProblems: string[] = [];
  const genericExcerpts: string[] = [];

  const problemLineRegex = /^(bài|câu|ví dụ|\d+[\.\)\:\-]|\?|tính|tìm|hỏi|điền|cho)/i;

  for (const line of lines) {
    if (problemLineRegex.test(line) || line.includes("?") || line.includes("=")) {
      if (detectedProblems.length < 15) {
        detectedProblems.push(line);
      }
    } else if (genericExcerpts.length < 5 && line.length > 20) {
      genericExcerpts.push(line);
    }
  }

  // Kết hợp tối đa 12 đoạn tiêu biểu để làm ngữ cảnh
  const excerpts = [...detectedProblems, ...genericExcerpts].slice(0, 12);

  const docName = doc.name?.trim() || "Tài liệu đề cương tham khảo";
  const problemCount = detectedProblems.length;

  return {
    name: docName,
    wordCount,
    detectedProblemCount: problemCount,
    extractedExcerpts: excerpts,
    summaryNote: `Đã nạp ${docName} (~${wordCount} từ, trích xuất ${problemCount} mẫu câu/dạng toán tiêu biểu).`,
  };
}

export type BuildRagContextInput = {
  topic: string;
  curriculumLevel: number;
  difficulties: Difficulty[];
  classProfile?: ClassLearningProfile;
  referenceDocument?: ReferenceDocument;
};

export type RagContextResult = {
  ragSystemPrompt: string;
  fewShotContext: string;
  customDocContext: string;
  curriculumStandard: GradeCurriculumStandard;
  processedDoc: ProcessedDocument | null;
  ragSummaryText: string;
};

/**
 * Xây dựng Ngữ cảnh RAG tích hợp cả PA 1 (Chuẩn GDPT 2018) + PA 3 (Tài liệu giáo viên) + Năng lực lớp
 */
export function buildRagContext(input: BuildRagContextInput): RagContextResult {
  const gradeKey = Math.min(5, Math.max(1, input.curriculumLevel || 1));
  const standard = GDPT_MATH_STANDARDS[gradeKey] ?? GDPT_MATH_STANDARDS[1];

  // 1. Phân tích tài liệu tham khảo của giáo viên (Option 3)
  const processedDoc = processReferenceDocument(input.referenceDocument);

  // 2. Lọc các câu hỏi mẫu chuẩn GDPT 2018 theo độ khó được yêu cầu
  const targetDiffs = new Set(input.difficulties);
  const relevantExamples = standard.standardExamples.filter(
    (ex) => targetDiffs.size === 0 || targetDiffs.has(ex.difficulty)
  );
  const examplesToUse = relevantExamples.length > 0 ? relevantExamples : standard.standardExamples;

  const fewShotContext = examplesToUse
    .map(
      (ex, idx) =>
        `[MẪU ${idx + 1} - Mức ${ex.difficulty}]:\n- Đề bài: ${ex.prompt}\n- Lựa chọn: ${JSON.stringify(ex.options)}\n- Đáp án đúng: "${ex.correctAnswer}"\n- Lời giải: ${ex.explanation}`
    )
    .join("\n\n");

  // 3. Khung tài liệu tham khảo giáo viên
  let customDocContext = "";
  if (processedDoc && processedDoc.extractedExcerpts.length > 0) {
    customDocContext = `
ĐÂY LÀ TÀI LIỆU/ĐỀ CƯƠNG THAM KHẢO DO GIÁO VIÊN TẢI LÊN ("${processedDoc.name}"):
${processedDoc.extractedExcerpts.map((line, i) => `${i + 1}. ${line}`).join("\n")}

CHỈ THỊ ƯU TIÊN VỀ TÀI LIỆU NÀY:
- Hãy mô phỏng lại các dạng toán, cấu trúc câu hỏi, hoặc chủ đề thực tế từ tài liệu trên.
- THAY ĐỔI CÁC CON SỐ để tạo câu hỏi mới hoàn toàn, không sao chép nguyên văn 100%.
- Tuyệt đối vẫn phải tuân thủ giới hạn kiến thức của ${standard.gradeName} và năng lực học sinh bên dưới.
`.trim();
  }

  // 4. Khung Prompt chuẩn RAG GDPT 2018
  const ragSystemPrompt = `
BẠN ĐANG HOẠT ĐỘNG VỚI HỆ THỐNG RAG (TRUY XUẤT TĂNG CƯỜNG) CHUẨN GDPT 2018:
1. KHUNG CHƯƠNG TRÌNH: ${standard.gradeName}
   - Phạm vi số hợp lệ: ${standard.numberRange}
   - Các phép tính được phép: ${standard.allowedOperations.join("; ")}
   - CÁC NỘI DUNG CẤM (BẮT BUỘC TUÂN THỦ): ${standard.forbiddenConcepts.join("; ")}
   - Nguyên tắc sư phạm: ${standard.pedagogicalPrinciples.join(" ")}

2. QUY TẮC BẤT DI BẤT DỊCH CHO HỌC SINH TIỂU HỌC:
   - 100% tiếng Việt có dấu, chuẩn mực, trong sáng.
   - Không ra đề mẹo, không ra đề vượt quá lứa tuổi tiểu học.
   - Mỗi câu hỏi trắc nghiệm có đúng 4 lựa chọn [A, B, C, D] ngắn gọn.
   - Đáp án đúng (correctAnswer) bắt buộc phải là một phần tử có trong options.
   - Lời giải (explanation) giải thích từng bước đơn giản, dễ hiểu cho phụ huynh và học sinh.
`.trim();

  // 5. Tóm tắt thông tin RAG phục vụ UI
  const ragSummaryParts = [
    `RAG Chuẩn ${standard.gradeName}`,
    `Phạm vi: ${standard.numberRange.slice(0, 45)}...`,
  ];
  if (processedDoc) {
    ragSummaryParts.push(`Kèm tài liệu: "${processedDoc.name}" (${processedDoc.detectedProblemCount} dạng bài trích xuất)`);
  }

  return {
    ragSystemPrompt,
    fewShotContext,
    customDocContext,
    curriculumStandard: standard,
    processedDoc,
    ragSummaryText: ragSummaryParts.join(" · "),
  };
}

