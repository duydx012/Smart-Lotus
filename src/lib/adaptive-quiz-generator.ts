import type { QuizQuestion, Difficulty } from "./learning-data";
import { studentThemes, type StudentThemeId } from "./student-data";

export type PersonalizeRequest = {
  studentId: number | string;
  studentName: string;
  studentStatus: string; // "Xuất sắc" | "Đang tiến bộ" | "Ổn định" | "Cần hỗ trợ"
  interest?: string;
  topic?: string;
  curriculumLevel?: number;
};

type ThemeItem = {
  single: string;
  plural: string;
  emoji: string;
};

type ThemeConfig = {
  name: string;
  emoji: string;
  items: ThemeItem[];
  contextSetting: string;
  characterRoles: string[];
};

export const THEMES: Record<string, ThemeConfig> = {
  animals: {
    name: "Động vật dễ thương",
    emoji: "🐶",
    items: [
      { single: "chú thỏ trắng", plural: "chú thỏ", emoji: "🐰" },
      { single: "chú cún con", plural: "chú cún", emoji: "🐶" },
      { single: "mèo con tinh nghịch", plural: "mèo con", emoji: "🐱" },
      { single: "chú gà con", plural: "chú gà con", emoji: "🐥" },
      { single: "củ cà rốt ngon lành", plural: "củ cà rốt", emoji: "🥕" },
      { single: "chú cá vàng", plural: "chú cá vàng", emoji: "🐟" },
      { single: "chú gấu trúc", plural: "chú gấu trúc", emoji: "🐼" },
      { single: "chú chim sẻ", plural: "chú chim sẻ", emoji: "🐦" },
    ],
    contextSetting: "trong khu vườn muông thú vui vẻ",
    characterRoles: ["bác làm vườn", "bác sĩ thú y", "người bạn tốt bụng"],
  },
  dinosaurs: {
    name: "Khủng long phiêu lưu",
    emoji: "🦖",
    items: [
      { single: "khủng long T-Rex xanh", plural: "chú khủng long T-Rex", emoji: "🦖" },
      { single: "khủng long cổ dài", plural: "khủng long cổ dài", emoji: "🦕" },
      { single: "quả trứng khủng long", plural: "quả trứng khủng long", emoji: "🥚" },
      { single: "chiếc lá cổ đại khổng lồ", plural: "chiếc lá cổ đại", emoji: "🌿" },
      { single: "khủng long bay Pterodactyl", plural: "khủng long bay", emoji: "🦅" },
      { single: "dấu chân hóa thạch", plural: "dấu chân hóa thạch", emoji: "🐾" },
      { single: "khủng long bọc giáp", plural: "khủng long bọc giáp", emoji: "🦏" },
      { single: "ngọn núi lửa tiền sử", plural: "ngọn núi lửa", emoji: "🌋" },
    ],
    contextSetting: "trong thung lũng khủng long kỷ Jura kỳ thú",
    characterRoles: ["nhà thám hiểm tiền sử", "nhà khảo cổ học", "đội trưởng đội tuần tra thung lũng"],
  },
  space: {
    name: "Vũ trụ & Phi thuyền",
    emoji: "🚀",
    items: [
      { single: "phi thuyền thám hiểm", plural: "chiếc phi thuyền", emoji: "🚀" },
      { single: "ngôi sao lấp lánh", plural: "ngôi sao", emoji: "⭐" },
      { single: "hành tinh Sao Thổ", plural: "hành tinh", emoji: "🪐" },
      { single: "đĩa bay ngoài hành tinh", plural: "chiếc đĩa bay", emoji: "🛸" },
      { single: "phi hành gia vũ trụ", plural: "phi hành gia", emoji: "👨‍🚀" },
      { single: "vệ tinh quỹ đạo", plural: "chiếc vệ tinh", emoji: "🛰️" },
      { single: "thiên thạch lấp lánh", plural: "viên thiên thạch", emoji: "☄️" },
      { single: "kính viễn vọng không gian", plural: "kính viễn vọng", emoji: "🔭" },
    ],
    contextSetting: "trong chuyến hải trình ngân hà huyền bí",
    characterRoles: ["chỉ huy trưởng trạm không gian", "phi hành gia dũng cảm", "nhà thiên văn học tí hon"],
  },
  vehicles: {
    name: "Xe cộ & Giao thông",
    emoji: "🏎️",
    items: [
      { single: "chiếc xe hơi thể thao", plural: "chiếc xe hơi", emoji: "🚗" },
      { single: "xe đua công thức 1 đỏ", plural: "chiếc xe đua", emoji: "🏎️" },
      { single: "chiếc xe buýt hai tầng", plural: "chiếc xe buýt", emoji: "🚌" },
      { single: "chiếc máy bay phản lực", plural: "chiếc máy bay", emoji: "✈️" },
      { single: "toa tàu hỏa tốc hành", plural: "toa tàu hỏa", emoji: "🚂" },
      { single: "chiếc trực thăng cứu hộ", plural: "chiếc trực thăng", emoji: "🚁" },
      { single: "chiếc xe cảnh sát", plural: "chiếc xe cảnh sát", emoji: "🚓" },
      { single: "chiếc tàu thủy du lịch", plural: "chiếc tàu thủy", emoji: "🚢" },
    ],
    contextSetting: "tại thành phố giao thông thông minh và hiện đại",
    characterRoles: ["đội trưởng điều hành giao thông", "tay đua số 1", "kỹ sư chế tạo xe"],
  },
  fairytale: {
    name: "Công chúa & Phép thuật",
    emoji: "👑",
    items: [
      { single: "vương miện lấp lánh", plural: "chiếc vương miện", emoji: "👑" },
      { single: "cây đũa phép nhiệm màu", plural: "cây đũa phép", emoji: "🪄" },
      { single: "chiếc nơ hồng xinh xắn", plural: "chiếc nơ hồng", emoji: "🎀" },
      { single: "chú kỳ lân cầu vồng", plural: "chú kỳ lân", emoji: "🦄" },
      { single: "đóa hoa hồng thần tiên", plural: "bông hoa phép thuật", emoji: "🌸" },
      { single: "viên pha lê pha lê sáng ngời", plural: "viên pha lê", emoji: "💎" },
      { single: "lâu đài cổ tích nguy nga", plural: "tòa tháp lâu đài", emoji: "🏰" },
      { single: "ngựa bạch mã kéo cỗ xe", plural: "chú bạch mã", emoji: "🎠" },
    ],
    contextSetting: "trong vương quốc phép thuật diệu kỳ xứ sở thần tiên",
    characterRoles: ["công chúa thông minh", "phù thủy ánh sáng", "hiệp sĩ bảo vệ vương quốc"],
  },
  sweets: {
    name: "Kẹo ngọt & Trái cây",
    emoji: "🍭",
    items: [
      { single: "quả táo đỏ mọng", plural: "quả táo đỏ", emoji: "🍎" },
      { single: "quả dâu tây ngọt ngào", plural: "quả dâu tây", emoji: "🍓" },
      { single: "cây kẹo mút cầu vồng", plural: "cây kẹo mút", emoji: "🍭" },
      { single: "chiếc bánh kem sinh nhật", plural: "chiếc bánh kem", emoji: "🧁" },
      { single: "quả chuối tiêu vàng", plural: "quả chuối vàng", emoji: "🍌" },
      { single: "viên kẹo sô-cô-la", plural: "viên kẹo ngọt", emoji: "🍬" },
      { single: "chiếc bánh donut ngũ sắc", plural: "chiếc bánh donut", emoji: "🍩" },
      { single: "ly kem mát lạnh", plural: "ly kem mát lạnh", emoji: "🍨" },
    ],
    contextSetting: "tại tiệm bánh ngọt ngào Wonderland rực rỡ sắc màu",
    characterRoles: ["bếp trưởng tiệm bánh", "chuyên gia pha chế kẹo", "nhà thám hiểm xứ sở kẹo ngọt"],
  },
};

function repeatEmoji(emoji: string, count: number): string {
  return Array(Math.max(1, count)).fill(emoji).join(" ");
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateOptions(correctAnswer: number, min = 0, max = 20): string[] {
  const seen = new Set<number>([correctAnswer]);
  const candidates: number[] = [correctAnswer];

  const deltas = shuffle([-1, 1, -2, 2, -3, 3, 10, -10]);
  for (const delta of deltas) {
    const candidate = correctAnswer + delta;
    if (candidate >= min && candidate <= max && !seen.has(candidate)) {
      seen.add(candidate);
      candidates.push(candidate);
      if (candidates.length === 4) break;
    }
  }

  while (candidates.length < 4) {
    const randomVal = randInt(min, max);
    if (!seen.has(randomVal)) {
      seen.add(randomVal);
      candidates.push(randomVal);
    }
  }

  return shuffle(candidates).map(String);
}

function makeTextOptions(correctAnswer: string, distractors: string[]): string[] {
  const seen = new Set<string>([correctAnswer]);
  const options = [correctAnswer];
  for (const d of distractors) {
    if (!seen.has(d)) {
      seen.add(d);
      options.push(d);
      if (options.length === 4) break;
    }
  }
  return shuffle(options);
}

// =========================================================================
// CÁCH 2: KHO 38 DẠNG BÀI TOÁN TƯ DUY ĐA DẠNG (DYNAMIC MULTI-TEMPLATE ENGINE)
// =========================================================================

type GeneratorContext = {
  theme: ThemeConfig;
  studentName: string;
  studentStatus: string;
  isSupport: boolean;
  isAdvanced: boolean;
  role: string;
};

type ArchetypeDef = {
  id: string;
  name: string;
  difficulty: Difficulty;
  tier: "A" | "B" | "C" | "D" | "E";
  generate: (ctx: GeneratorContext) => QuizQuestion;
};

export const QUESTION_ARCHETYPES: ArchetypeDef[] = [
  // --- LEVEL A (6 dạng) ---
  {
    id: "A1_COUNT_SINGLE",
    name: "Đếm số lượng trực quan đơn lẻ",
    difficulty: "A",
    tier: "A",
    generate: (ctx) => {
      const item = pickRandom(ctx.theme.items);
      const count = ctx.isSupport ? randInt(3, 6) : randInt(5, 9);
      return {
        id: 1,
        phase: "normal",
        difficulty: "A",
        skill: "Đếm số lượng trong phạm vi 10",
        prompt: `Bé ${ctx.studentName} ơi! Hãy đếm xem ${ctx.theme.contextSetting} có tất cả bao nhiêu ${item.plural} nhé:\n\n${repeatEmoji(item.emoji, count)}`,
        illustration: repeatEmoji(item.emoji, count),
        options: generateOptions(count, 1, 10),
        correctAnswer: String(count),
        explanation: `Đếm lần lượt từ trái sang phải: 1, 2, ..., có tất cả đúng ${count} ${item.plural} ${item.emoji}!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "A2_COUNT_TWO_GROUPS",
    name: "Đếm gộp hai nhóm đối tượng khác nhau",
    difficulty: "A",
    tier: "A",
    generate: (ctx) => {
      const item1 = ctx.theme.items[0];
      const item2 = ctx.theme.items[1];
      const count1 = randInt(2, 4);
      const count2 = randInt(2, 4);
      const total = count1 + count2;
      return {
        id: 1,
        phase: "normal",
        difficulty: "A",
        skill: "Đếm gộp hai nhóm đồ vật",
        prompt: `Trong bức tranh có:\n- Nhóm 1: ${repeatEmoji(item1.emoji, count1)} (${count1} ${item1.plural})\n- Nhóm 2: ${repeatEmoji(item2.emoji, count2)} (${count2} ${item2.plural})\nHỏi cả hai nhóm có tất cả bao nhiêu hình?`,
        illustration: `${repeatEmoji(item1.emoji, count1)}   ${repeatEmoji(item2.emoji, count2)}`,
        options: generateOptions(total, 2, 10),
        correctAnswer: String(total),
        explanation: `Gộp ${count1} ${item1.plural} và ${count2} ${item2.plural} ta được: ${count1} + ${count2} = ${total} hình.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "A3_COUNT_MISSING_TEN",
    name: "Tìm số đối tượng còn thiếu để đủ 10",
    difficulty: "A",
    tier: "A",
    generate: (ctx) => {
      const item = ctx.theme.items[2] ?? ctx.theme.items[0];
      const existing = randInt(6, 9);
      const needed = 10 - existing;
      return {
        id: 1,
        phase: "normal",
        difficulty: "A",
        skill: "Bổ sung cho đủ 10",
        prompt: `Bé ${ctx.studentName} muốn gom đủ 10 ${item.plural}. Hiện tại bé đã có:\n${repeatEmoji(item.emoji, existing)} (${existing} ${item.plural})\nHỏi bé cần thêm mấy ${item.single} nữa để vừa đủ 10?`,
        options: generateOptions(needed, 1, 5),
        correctAnswer: String(needed),
        explanation: `Ta lấy 10 trừ đi số đã có: 10 - ${existing} = ${needed}. Bé cần thêm ${needed} ${item.single} nữa nhé!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "A4_READ_NUMBER_WORD",
    name: "Đọc và nhận biết chữ số bằng chữ",
    difficulty: "A",
    tier: "A",
    generate: (ctx) => {
      const numberWords = [
        { word: "năm", val: 5 },
        { word: "sáu", val: 6 },
        { word: "bảy", val: 7 },
        { word: "tám", val: 8 },
        { word: "chín", val: 9 },
        { word: "mười", val: 10 },
      ];
      const chosen = pickRandom(numberWords);
      const item = ctx.theme.items[0];
      return {
        id: 1,
        phase: "normal",
        difficulty: "A",
        skill: "Nhận biết cách đọc và viết số",
        prompt: `Bác ${ctx.role} nói: "Có tất cả ${chosen.word} ${item.plural} đang chờ bé ${ctx.studentName}."\nChữ "${chosen.word}" viết thành chữ số là:`,
        options: generateOptions(chosen.val, 1, 10),
        correctAnswer: String(chosen.val),
        explanation: `Chữ "${chosen.word}" tương ứng với chữ số ${chosen.val}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "A5_ORDINAL_POSITION",
    name: "Vị trí thứ tự trước sau trong hàng",
    difficulty: "A",
    tier: "A",
    generate: (ctx) => {
      const item = ctx.theme.items[1] ?? ctx.theme.items[0];
      const totalInLine = 5;
      const targetPos = randInt(2, 4);
      return {
        id: 1,
        phase: "normal",
        difficulty: "A",
        skill: "Nhận biết thứ tự trước sau",
        prompt: `Có 5 ${item.plural} xếp thành một hàng dọc:\n${repeatEmoji(item.emoji, totalInLine)}\nTính từ trái sang phải, chú ${item.single} mang nơ vàng đứng ở vị trí thứ ${targetPos}. Hỏi có mấy chú đứng PHÍA TRƯỚC chú ấy?`,
        options: generateOptions(targetPos - 1, 0, 5),
        correctAnswer: String(targetPos - 1),
        explanation: `Đứng ở vị trí thứ ${targetPos} thì phía trước chú ấy có đúng ${targetPos - 1} bạn.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "A6_COUNT_PAIRS",
    name: "Đếm số lượng theo cặp 2",
    difficulty: "A",
    tier: "A",
    generate: (ctx) => {
      const item = ctx.theme.items[3] ?? ctx.theme.items[0];
      const pairs = randInt(2, 4);
      const total = pairs * 2;
      return {
        id: 1,
        phase: "normal",
        difficulty: "A",
        skill: "Đếm theo nhóm đôi",
        prompt: `Trong khu vui chơi, ${item.plural} đi chơi theo từng đôi (mỗi đôi gồm 2 bạn):\nCó tất cả ${pairs} đôi ${item.plural}. Hỏi có tất cả bao nhiêu bạn?`,
        options: generateOptions(total, 2, 10),
        correctAnswer: String(total),
        explanation: `Mỗi đôi có 2 bạn. ${pairs} đôi là: ${Array(pairs).fill(2).join(" + ")} = ${total} bạn ${item.emoji}.`,
        answerMode: "choice",
      };
    },
  },

  // --- LEVEL B (8 dạng) ---
  {
    id: "B1_ADD_JOIN",
    name: "Phép cộng gộp thêm vào",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const item = ctx.theme.items[1];
      const a = ctx.isSupport ? randInt(2, 4) : randInt(3, 5);
      const b = ctx.isSupport ? randInt(1, 3) : randInt(2, 4);
      const sum = a + b;
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "Phép cộng gộp thêm",
        prompt: `Ban đầu có ${a} ${item.plural} ${repeatEmoji(item.emoji, a)}. Lát sau có thêm ${b} ${item.single} chạy đến ${repeatEmoji(item.emoji, b)}. Hỏi có tất cả bao nhiêu ${item.plural}?`,
        illustration: `${repeatEmoji(item.emoji, a)} + ${repeatEmoji(item.emoji, b)}`,
        options: generateOptions(sum, 1, 12),
        correctAnswer: String(sum),
        explanation: `Phép tính: ${a} + ${b} = ${sum} ${item.plural} ${item.emoji}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "B2_SUB_GIVE_AWAY",
    name: "Phép trừ bớt đi / tặng bạn",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const item = ctx.theme.items[2];
      const total = ctx.isSupport ? randInt(5, 7) : randInt(6, 10);
      const sub = ctx.isSupport ? randInt(1, 2) : randInt(2, 4);
      const remain = total - sub;
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "Phép trừ bớt đi",
        prompt: `Bé ${ctx.studentName} có ${total} ${item.plural} ${repeatEmoji(item.emoji, total)}. Bé tặng cho bạn ${sub} ${item.single}. Hỏi bé ${ctx.studentName} còn lại bao nhiêu ${item.plural}?`,
        options: generateOptions(remain, 1, 10),
        correctAnswer: String(remain),
        explanation: `Phép tính: ${total} - ${sub} = ${remain} ${item.plural}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "B3_COMPARE_DIRECT",
    name: "So sánh trực tiếp hai nhóm đối tượng",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const itemA = ctx.theme.items[0];
      const itemB = ctx.theme.items[4] ?? ctx.theme.items[1];
      const countA = randInt(4, 7);
      let countB = randInt(3, 8);
      if (countB === countA) countB += 1;
      const isMoreA = countA > countB;
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "So sánh số lượng nhiều hơn - ít hơn",
        prompt: `Hàng trên có: ${repeatEmoji(itemA.emoji, countA)} (${countA} ${itemA.plural})\nHàng dưới có: ${repeatEmoji(itemB.emoji, countB)} (${countB} ${itemB.plural})\nHàng nào có số lượng NHIỀU HƠN?`,
        options: makeTextOptions(`Hàng trên (${itemA.emoji})`, [
          `Hàng dưới (${itemB.emoji})`,
          "Hai hàng bằng nhau",
          "Không xác định được",
        ]),
        correctAnswer: isMoreA ? `Hàng trên (${itemA.emoji})` : `Hàng dưới (${itemB.emoji})`,
        explanation: `Vì ${countA} ${isMoreA ? ">" : "<"} ${countB} nên ${isMoreA ? itemA.plural : itemB.plural} nhiều hơn!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "B4_COMPARE_NUMBERS_SIGN",
    name: "Điền dấu so sánh lớn hơn, bé hơn, bằng nhau",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const a = randInt(3, 10);
      let b = randInt(3, 10);
      if (Math.random() < 0.25) b = a;
      const sign = a > b ? ">" : a < b ? "<" : "=";
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "Điền dấu >, <, =",
        prompt: `Bé hãy chọn dấu thích hợp điền vào chỗ chấm:\n\n${a}  ...  ${b}`,
        options: makeTextOptions(sign, [">", "<", "=", "+"]),
        correctAnswer: sign,
        explanation: `So sánh hai số: ${a} ${sign} ${b}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "B5_SEQUENCE_FORWARD_1",
    name: "Tìm số tiếp theo trong dãy số tiến cách 1",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const start = randInt(1, 5);
      const seq = [start, start + 1, start + 2, start + 3];
      const missingIdx = randInt(1, 3);
      const missingVal = seq[missingIdx];
      const promptSeq = seq.map((v, i) => (i === missingIdx ? "[ ? ]" : String(v))).join(" , ");
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "Dãy số tiến liên tiếp",
        prompt: `Bé hãy tìm số thích hợp thay thế cho dấu [ ? ] trong dãy số sau:\n\n${promptSeq}`,
        options: generateOptions(missingVal, 1, 10),
        correctAnswer: String(missingVal),
        explanation: `Dãy số tăng dần từng 1 đơn vị, nên số còn thiếu là ${missingVal}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "B6_NUMBER_BONDS",
    name: "Cấu tạo số / Tách số cơ bản",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const target = ctx.isSupport ? randInt(5, 7) : randInt(6, 10);
      const part = randInt(1, target - 1);
      const remain = target - part;
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "Tách gộp số trong phạm vi 10",
        prompt: `Số ${target} gồm ${part} và mấy?`,
        options: generateOptions(remain, 1, 10),
        correctAnswer: String(remain),
        explanation: `Vì ${part} + ${remain} = ${target}, nên số ${target} gồm ${part} và ${remain}!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "B7_SUB_FLIES_AWAY",
    name: "Phép trừ tình huống bay đi / mất đi",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const item = ctx.theme.items[4] ?? ctx.theme.items[0];
      const start = randInt(5, 9);
      const leave = randInt(1, 3);
      const remain = start - leave;
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "Phép trừ tình huống thực tế",
        prompt: `Trên cành cây có ${start} ${item.plural}. Bỗng một tiếng động vang lên làm ${leave} ${item.single} bay mất. Hỏi trên cành còn lại bao nhiêu ${item.plural}?`,
        options: generateOptions(remain, 1, 10),
        correctAnswer: String(remain),
        explanation: `Lấy số ban đầu trừ đi số bay mất: ${start} - ${leave} = ${remain} ${item.plural}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "B8_ADD_MENTAL_QUICK",
    name: "Tính nhẩm phép cộng trong phạm vi 10",
    difficulty: "B",
    tier: "B",
    generate: (ctx) => {
      const item = ctx.theme.items[0];
      const a = randInt(3, 6);
      const b = randInt(2, 4);
      const sum = a + b;
      return {
        id: 2,
        phase: "normal",
        difficulty: "B",
        skill: "Tính nhẩm phép cộng",
        prompt: `Bé ${ctx.studentName} hãy tính nhẩm phép tính sau để giúp ${item.single} vượt qua chướng ngại vật nhé:\n\n${a} + ${b} = ?`,
        options: generateOptions(sum, 1, 12),
        correctAnswer: String(sum),
        explanation: `${a} + ${b} = ${sum}. Bé tính nhẩm rất chính xác! ${ctx.theme.emoji}`,
        answerMode: "choice",
      };
    },
  },

  // --- LEVEL C (10 dạng) ---
  {
    id: "C1_WORD_PROBLEM_TOTAL",
    name: "Toán có lời văn thực tế tính tổng",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const item = ctx.theme.items[2] ?? ctx.theme.items[0];
      const a = ctx.isSupport ? randInt(3, 5) : randInt(4, 7);
      const b = ctx.isSupport ? randInt(2, 4) : randInt(3, 6);
      const sum = a + b;
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Toán có lời văn một bước tính",
        prompt: `Buổi sáng bé ${ctx.studentName} cùng bác ${ctx.role} thu thập được ${a} ${item.plural}. Buổi chiều hai bác cháu thu thập thêm ${b} ${item.single} nữa. Hỏi cả ngày đã thu thập được bao nhiêu ${item.plural}?`,
        options: generateOptions(sum, 1, 15),
        correctAnswer: String(sum),
        explanation: `Phép tính: ${a} + ${b} = ${sum} ${item.plural}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C2_MISSING_OPERAND_ADD",
    name: "Tìm số hạng chưa biết: a + [ ? ] = c",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const total = ctx.isSupport ? randInt(6, 10) : randInt(8, 14);
      const a = randInt(2, total - 2);
      const missing = total - a;
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Tìm số chưa biết trong phép cộng",
        prompt: `Bé hãy tìm số thích hợp điền vào ô trống:\n\n${a} + [ ? ] = ${total}`,
        options: generateOptions(missing, 1, 12),
        correctAnswer: String(missing),
        explanation: `Muốn tìm số hạng chưa biết, ta lấy ${total} - ${a} = ${missing}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C3_MISSING_OPERAND_SUB",
    name: "Tìm số chưa biết trong phép trừ: a - [ ? ] = c",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const a = randInt(7, 12);
      const remain = randInt(2, a - 2);
      const missing = a - remain;
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Tìm số trừ còn thiếu",
        prompt: `Điền số thích hợp vào dấu hỏi chấm:\n\n${a} - [ ? ] = ${remain}`,
        options: generateOptions(missing, 1, 10),
        correctAnswer: String(missing),
        explanation: `Lấy ${a} trừ ${remain}: ${a} - ${remain} = ${missing}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C4_COMPARE_EXPRESSION_NUM",
    name: "So sánh một biểu thức với một số",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const a = randInt(2, 5);
      const b = randInt(3, 5);
      const sum = a + b;
      let target = sum + (Math.random() < 0.5 ? -1 : 1);
      if (Math.random() < 0.25) target = sum;
      const sign = sum > target ? ">" : sum < target ? "<" : "=";
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "So sánh biểu thức với số",
        prompt: `Bé hãy chọn dấu thích hợp ( >, <, = ) điền vào chỗ chấm:\n\n${a} + ${b}  ...  ${target}`,
        options: makeTextOptions(sign, [">", "<", "=", "+"]),
        correctAnswer: sign,
        explanation: `Ta tính ${a} + ${b} = ${sum}. So sánh ${sum} và ${target} thì ${sum} ${sign} ${target}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C5_SEQUENCE_SKIP_2",
    name: "Dãy số cách 2 đơn vị (2, 4, 6, 8...)",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const start = randInt(0, 3) * 2;
      const seq = [start, start + 2, start + 4, start + 6];
      const missingIdx = randInt(1, 3);
      const missingVal = seq[missingIdx];
      const promptSeq = seq.map((v, i) => (i === missingIdx ? "[ ? ]" : String(v))).join(" , ");
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Quy luật dãy số cách đều 2",
        prompt: `Tìm số thích hợp điền vào dấu [ ? ] trong dãy số quy luật sau:\n\n${promptSeq}`,
        options: generateOptions(missingVal, 0, 16),
        correctAnswer: String(missingVal),
        explanation: `Dãy số này cứ mỗi bước cộng thêm 2, vậy số còn thiếu là ${missingVal}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C6_BALANCE_SCALE",
    name: "Cân thăng bằng hai đĩa cân",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const item = ctx.theme.items[0];
      const left = randInt(6, 9);
      const rightNow = randInt(2, left - 2);
      const addNeeded = left - rightNow;
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Cân bằng hai vế",
        prompt: `⚖️ Chiếc cân thần kỳ đang lệch:\n- Đĩa cân bên trái có: ${left} ${item.plural}\n- Đĩa cân bên phải mới có: ${rightNow} ${item.plural}\nHỏi cần đặt thêm mấy ${item.single} vào đĩa bên phải để chiếc cân THĂNG BẰNG?`,
        options: generateOptions(addNeeded, 1, 8),
        correctAnswer: String(addNeeded),
        explanation: `Để cân bằng, hai đĩa phải có số lượng bằng nhau. Cần thêm: ${left} - ${rightNow} = ${addNeeded} ${item.single}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C7_THREE_OPERANDS_MIX",
    name: "Phép tính kết hợp ba số: a + b - c",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const item = ctx.theme.items[1];
      const a = randInt(3, 6);
      const b = randInt(2, 4);
      const c = randInt(1, 3);
      const res = a + b - c;
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Tính giá trị biểu thức hai phép tính",
        prompt: `Trong giỏ ban đầu có ${a} ${item.plural}. Bé nhặt thêm ${b} ${item.single}, rồi lại tặng bạn ${c} ${item.single}. Hỏi trong giỏ lúc này có mấy ${item.plural}?\n\nPhép tính: ${a} + ${b} - ${c} = ?`,
        options: generateOptions(res, 1, 12),
        correctAnswer: String(res),
        explanation: `Thực hiện từ trái sang phải: ${a} + ${b} = ${a + b}, sau đó ${a + b} - ${c} = ${res}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C8_GEOMETRY_COUNT_SHAPES",
    name: "Đếm và nhận biết hình học phẳng",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const shapes = ["hình tròn", "hình tam giác", "hình vuông", "hình chữ nhật"];
      const chosenShape = pickRandom(shapes);
      const count = randInt(3, 6);
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Nhận biết và đếm hình học phẳng",
        prompt: `Bé ${ctx.studentName} hãy quan sát mô hình lâu đài: Có 4 hình vuông, 2 hình chữ nhật và ${count} ${chosenShape}. Hỏi có tất cả bao nhiêu ${chosenShape}?`,
        options: generateOptions(count, 1, 8),
        correctAnswer: String(count),
        explanation: `Đọc kỹ đề bài: Đề bài đã cho biết có đúng ${count} ${chosenShape}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C9_COMPARE_TWO_EXPRESSIONS",
    name: "So sánh hai biểu thức cộng trừ",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const a = randInt(2, 5);
      const b = randInt(3, 5);
      const c = randInt(2, 6);
      const d = randInt(1, 5);
      const sum1 = a + b;
      const sum2 = c + d;
      const sign = sum1 > sum2 ? ">" : sum1 < sum2 ? "<" : "=";
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "So sánh giá trị hai biểu thức",
        prompt: `So sánh kết quả hai phép tính sau:\n\n${a} + ${b}   ...   ${c} + ${d}`,
        options: makeTextOptions(sign, [">", "<", "=", "+"]),
        correctAnswer: sign,
        explanation: `Vế trái: ${a} + ${b} = ${sum1}. Vế phải: ${c} + ${d} = ${sum2}. Vì ${sum1} ${sign} ${sum2} nên điền dấu "${sign}".`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "C10_SUB_FIND_REMAIN",
    name: "Tìm số lượng còn lại sau khi dùng",
    difficulty: "C",
    tier: "C",
    generate: (ctx) => {
      const item = ctx.theme.items[3] ?? ctx.theme.items[0];
      const start = randInt(7, 12);
      const used = randInt(3, 6);
      const remain = start - used;
      return {
        id: 3,
        phase: "normal",
        difficulty: "C",
        skill: "Bài toán thực tế tìm phần còn lại",
        prompt: `Bác ${ctx.role} chuẩn bị ${start} ${item.plural} cho cuộc thi. Sau phần thi thứ nhất, các bạn đã dùng hết ${used} ${item.single}. Hỏi bác còn lại bao nhiêu ${item.plural}?`,
        options: generateOptions(remain, 1, 10),
        correctAnswer: String(remain),
        explanation: `Lấy tổng số trừ đi số đã dùng: ${start} - ${used} = ${remain} ${item.plural}.`,
        answerMode: "choice",
      };
    },
  },

  // --- LEVEL D (8 dạng) ---
  {
    id: "D1_MULTI_STEP_STORY",
    name: "Toán có lời văn hai bước tính",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const item = ctx.theme.items[0];
      const a = randInt(4, 7);
      const b = randInt(3, 5);
      const c = randInt(2, 4);
      const total = a + b - c;
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Giải toán bằng hai bước tính",
        prompt: `🚀 NHIỆM VỤ ĐẶC BIỆT:\nBan đầu trạm có ${a} ${item.plural}. Đội tàu tiếp viện mang đến thêm ${b} ${item.single}. Sau đó có ${c} ${item.single} được cử đi làm nhiệm vụ khẩn cấp. Hỏi trạm lúc này còn lại bao nhiêu ${item.plural}?`,
        options: generateOptions(total, 1, 15),
        correctAnswer: String(total),
        explanation: `Bước 1 (Tổng có): ${a} + ${b} = ${a + b}. Bước 2 (Sau khi cử đi): ${a + b} - ${c} = ${total} ${item.plural}!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "D2_REVERSE_WORD_PROBLEM",
    name: "Bài toán ngược: Tìm số ban đầu",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const item = ctx.theme.items[1];
      const given = randInt(2, 5);
      const remain = randInt(4, 8);
      const initial = given + remain;
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Bài toán ngược tìm số lúc đầu",
        prompt: `Bé ${ctx.studentName} mang một hộp ${item.plural} đến lớp. Sau khi chia cho các bạn ${given} ${item.single}, trong hộp của bé VẪN CÒN ${remain} ${item.single}. Hỏi lúc đầu trong hộp có tất cả bao nhiêu ${item.plural}?`,
        options: generateOptions(initial, 3, 16),
        correctAnswer: String(initial),
        explanation: `Lúc đầu có số kẹo bằng số đã cho cộng với số còn lại: ${given} + ${remain} = ${initial} ${item.plural}!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "D3_MEASUREMENT_LENGTH",
    name: "Độ dài xăng-ti-mét",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const a = randInt(3, 8);
      const b = randInt(2, 7);
      const sum = a + b;
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Đo độ dài và cộng số đo xăng-ti-mét",
        prompt: `Đoạn dây đỏ dài ${a} cm, đoạn dây xanh dài ${b} cm. Hỏi khi nối hai đoạn dây lại với nhau thì đoạn dây mới dài bao nhiêu xăng-ti-mét?\n\n${a} cm + ${b} cm = ?`,
        options: makeTextOptions(`${sum} cm`, [`${sum + 1} cm`, `${Math.max(1, sum - 1)} cm`, `${sum + 2} cm`]),
        correctAnswer: `${sum} cm`,
        explanation: `Lấy ${a} + ${b} = ${sum}, kèm theo đơn vị đo: ${sum} cm.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "D4_CLOCK_READING",
    name: "Xem đồng hồ giờ đúng",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const hour = randInt(2, 10);
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Xem giờ đúng trên đồng hồ",
        prompt: `🕐 Đồng hồ treo tường có kim ngắn chỉ vào số ${hour}, kim dài chỉ thẳng vào số 12. Hỏi lúc này đồng hồ đang chỉ mấy giờ?`,
        options: makeTextOptions(`${hour} giờ`, [
          `${hour + 1} giờ`,
          `${Math.max(1, hour - 1)} giờ`,
          "12 giờ",
        ]),
        correctAnswer: `${hour} giờ`,
        explanation: `Khi kim dài chỉ số 12 và kim ngắn chỉ số ${hour}, tức là đúng ${hour} giờ.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "D5_CALENDAR_DAYS",
    name: "Thứ và ngày trong tuần",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const days = ["thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy"];
      const idx = randInt(0, 4);
      const today = days[idx];
      const tomorrow = days[idx + 1];
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Các ngày trong tuần",
        prompt: `Hôm nay lớp của bé ${ctx.studentName} học toán là ${today}. Hỏi NGÀY MAI sẽ là thứ mấy?`,
        options: makeTextOptions(tomorrow, [days[(idx + 2) % 6], days[Math.max(0, idx - 1)], "Chủ nhật"]),
        correctAnswer: tomorrow,
        explanation: `Theo thứ tự các ngày trong tuần: sau ${today} liền kề sẽ là ${tomorrow}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "D6_FILL_OPERATOR",
    name: "Điền dấu phép tính cộng hoặc trừ",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const a = randInt(5, 9);
      const b = randInt(2, 4);
      const isAdd = Math.random() < 0.5;
      const res = isAdd ? a + b : a - b;
      const sign = isAdd ? "+" : "-";
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Chọn dấu phép tính phù hợp",
        prompt: `Dấu phép tính nào thích hợp điền vào dấu [ ? ] để có phép tính đúng?\n\n${a} [ ? ] ${b} = ${res}`,
        options: makeTextOptions(sign, ["+", "-", ">", "="]),
        correctAnswer: sign,
        explanation: `Vì ${a} ${sign} ${b} = ${res} nên dấu cần điền là dấu "${sign}".`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "D7_TENS_ADD_SUB",
    name: "Cộng trừ các số tròn chục",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const aTens = randInt(2, 5) * 10;
      const bTens = randInt(1, 3) * 10;
      const sum = aTens + bTens;
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Cộng các số tròn chục",
        prompt: `Bác ${ctx.role} có hai thùng hàng: thùng thứ nhất có ${aTens} gói, thùng thứ hai có ${bTens} gói. Cả hai thùng có bao nhiêu gói hàng?\n\n${aTens} + ${bTens} = ?`,
        options: generateOptions(sum, 10, 100),
        correctAnswer: String(sum),
        explanation: `${aTens / 10} chục cộng ${bTens / 10} chục bằng ${sum / 10} chục, tức là ${sum}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "D8_SHARE_EQUALLY",
    name: "Chia đều cho 2 bạn (Số chẵn - lẻ)",
    difficulty: "D",
    tier: "D",
    generate: (ctx) => {
      const item = ctx.theme.items[0];
      const each = randInt(3, 6);
      const total = each * 2;
      return {
        id: 4,
        phase: "challenge",
        difficulty: "D",
        skill: "Chia đều thành hai phần bằng nhau",
        prompt: `Bé ${ctx.studentName} có ${total} ${item.plural}. Bé muốn chia đều cho mình và một người bạn sao cho hai bạn có số lượng BẰNG NHAU. Hỏi mỗi bạn nhận được bao nhiêu ${item.single}?`,
        options: generateOptions(each, 1, 10),
        correctAnswer: String(each),
        explanation: `Vì ${each} + ${each} = ${total}, nên mỗi bạn nhận được đúng ${each} ${item.single}.`,
        answerMode: "choice",
      };
    },
  },

  // --- LEVEL E (6 dạng thử thách đỉnh cao) ---
  {
    id: "E1_MYSTERY_HOUSE",
    name: "Ngôi nhà số bí ẩn: Hai số có tổng và hiệu",
    difficulty: "E",
    tier: "E",
    generate: (ctx) => {
      const item = ctx.theme.items[0];
      const a = randInt(4, 7);
      const b = randInt(2, a - 1);
      const sum = a + b;
      return {
        id: 5,
        phase: "challenge",
        difficulty: "E",
        skill: "Tư duy giải toán logic",
        prompt: `⭐ CÂU ĐỐ BÍ ẨN CỦA ${ctx.theme.name.toUpperCase()}:\nBé ${ctx.studentName} hãy tìm hai số biết rằng:\n- Tổng của hai số đó bằng ${sum}\n- Một số là ${a}\nHỏi số còn lại là bao nhiêu?`,
        options: generateOptions(b, 1, 10),
        correctAnswer: String(b),
        explanation: `Lấy tổng trừ đi số đã biết: ${sum} - ${a} = ${b}. Số còn lại là ${b}!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "E2_LOGIC_HEIGHT",
    name: "Đố vui logic suy luận so sánh",
    difficulty: "E",
    tier: "E",
    generate: (ctx) => {
      return {
        id: 5,
        phase: "challenge",
        difficulty: "E",
        skill: "Suy luận logic bắc cầu",
        prompt: `💡 THỬ THÁCH SUY LUẬN:\n- Bạn Thỏ cao hơn bạn Rùa.\n- Bạn Hươu lại cao hơn bạn Thỏ.\nHỏi trong 3 bạn, bạn nào CAO NHẤT?`,
        options: makeTextOptions("Bạn Hươu", ["Bạn Thỏ", "Bạn Rùa", "Ba bạn cao bằng nhau"]),
        correctAnswer: "Bạn Hươu",
        explanation: `Rùa < Thỏ < Hươu, do đó bạn Hươu là người cao nhất!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "E3_PATTERN_PUZZLE",
    name: "Quy luật chuỗi biểu tượng lặp lại",
    difficulty: "E",
    tier: "E",
    generate: (ctx) => {
      const item1 = ctx.theme.items[0];
      const item2 = ctx.theme.items[1];
      const pattern = `${item1.emoji}  ${item2.emoji}  ${item1.emoji}  ${item2.emoji}  ${item1.emoji}  [ ? ]`;
      return {
        id: 5,
        phase: "challenge",
        difficulty: "E",
        skill: "Quy luật chuỗi hình ảnh lặp lại",
        prompt: `Quan sát chuỗi biểu tượng lặp lại sau:\n\n${pattern}\n\nHình nào sẽ thay thế cho dấu [ ? ] tiếp theo?`,
        options: makeTextOptions(`${item2.emoji} (${item2.single})`, [
          `${item1.emoji} (${item1.single})`,
          "⭐ (ngôi sao)",
          "❌ (không có hình)",
        ]),
        correctAnswer: `${item2.emoji} (${item2.single})`,
        explanation: `Quy luật xen kẽ: ${item1.emoji} rồi đến ${item2.emoji}. Sau ${item1.emoji} sẽ là ${item2.emoji}.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "E4_TARGET_SUM_CARDS",
    name: "Chọn hai thẻ số có tổng bằng mục tiêu",
    difficulty: "E",
    tier: "E",
    generate: (ctx) => {
      const target = randInt(10, 15);
      const cardA = randInt(4, 8);
      const cardB = target - cardA;
      return {
        id: 5,
        phase: "challenge",
        difficulty: "E",
        skill: "Lựa chọn cặp số có tổng định trước",
        prompt: `Bé ${ctx.studentName} có các thẻ số: 2, ${cardA}, 1, ${cardB}. Hãy chọn ra 2 thẻ số có tổng cộng lại bằng ĐÚNG ${target}:`,
        options: makeTextOptions(`Thẻ ${cardA} và Thẻ ${cardB}`, [
          `Thẻ 2 và Thẻ ${cardA}`,
          `Thẻ 1 và Thẻ ${cardB}`,
          "Thẻ 2 và Thẻ 1",
        ]),
        correctAnswer: `Thẻ ${cardA} và Thẻ ${cardB}`,
        explanation: `Vì ${cardA} + ${cardB} = ${target}. Đây là cặp số chính xác!`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "E5_INTERVAL_SPACING",
    name: "Toán tư duy khoảng cách / Đặt đồ vật",
    difficulty: "E",
    tier: "E",
    generate: (ctx) => {
      const item = ctx.theme.items[3] ?? ctx.theme.items[0];
      const count = randInt(3, 5);
      const intervals = count - 1;
      return {
        id: 5,
        phase: "challenge",
        difficulty: "E",
        skill: "Toán tư duy khoảng cách",
        prompt: `Trên một lối đi thẳng có ${count} ${item.plural} đặt cách đều nhau thành một hàng. Hỏi giữa các ${item.plural} đó có bao nhiêu KHOẢNG TRỐNG ở giữa?`,
        options: generateOptions(intervals, 1, 6),
        correctAnswer: String(intervals),
        explanation: `Cứ ${count} vật thẳng hàng thì có đúng ${count} - 1 = ${intervals} khoảng trống ở giữa.`,
        answerMode: "choice",
      };
    },
  },
  {
    id: "E6_TRUE_FALSE_REASONING",
    name: "Khẳng định nào sau đây là ĐÚNG?",
    difficulty: "E",
    tier: "E",
    generate: (ctx) => {
      const a = randInt(3, 6);
      const b = randInt(2, 4);
      const correctSum = a + b;
      const trueStatement = `${a} + ${b} = ${correctSum}`;
      const falseStatements = [
        `${a} + ${b} = ${correctSum + 1}`,
        `${a} + ${b} = ${Math.max(1, correctSum - 1)}`,
        `${a} - ${b} = ${correctSum}`,
      ];
      return {
        id: 5,
        phase: "challenge",
        difficulty: "E",
        skill: "Phân biệt khẳng định đúng - sai",
        prompt: `Trong các phép tính sau đây, phép tính nào ĐÚNG HOÀN TOÀN?`,
        options: makeTextOptions(trueStatement, falseStatements),
        correctAnswer: trueStatement,
        explanation: `Vì ${a} + ${b} = ${correctSum} là phép tính chính xác. Các phương án còn lại đều sai kết quả.`,
        answerMode: "choice",
      };
    },
  },
];

// =========================================================================
// HÀM SINH ĐỀ CHÍNH THEO CÁCH 2: MULTI-TEMPLATE TỰ ĐỘNG BỐC ĐA DẠNG BÀI
// =========================================================================

export function generateAdaptiveQuizForStudent(req: PersonalizeRequest): QuizQuestion[] {
  // 1. Phân giải theme phù hợp
  let themeKey = "animals";
  if (req.interest) {
    const normalized = req.interest.toLowerCase();
    for (const key of Object.keys(THEMES)) {
      if (normalized.includes(key) || normalized.includes(THEMES[key].name.toLowerCase()) || normalized.includes(THEMES[key].emoji)) {
        themeKey = key;
        break;
      }
    }
    if (normalized.includes("khủng long") || normalized.includes("dino")) themeKey = "dinosaurs";
    else if (normalized.includes("vũ trụ") || normalized.includes("sao") || normalized.includes("phi thuyền")) themeKey = "space";
    else if (normalized.includes("xe") || normalized.includes("ô tô") || normalized.includes("tàu")) themeKey = "vehicles";
    else if (normalized.includes("công chúa") || normalized.includes("hoa") || normalized.includes("phép")) themeKey = "fairytale";
    else if (normalized.includes("kẹo") || normalized.includes("bánh") || normalized.includes("trái cây")) themeKey = "sweets";
  } else {
    const keys = Object.keys(THEMES);
    const num = typeof req.studentId === "number" ? req.studentId : (Number(String(req.studentId).replace(/\D/g, "")) || 0);
    themeKey = keys[num % keys.length];
  }

  const theme = THEMES[themeKey] ?? THEMES.animals;
  const status = req.studentStatus || "Ổn định";

  const isSupport = status === "Cần hỗ trợ";
  const isAdvanced = status === "Xuất sắc";
  const role = pickRandom(theme.characterRoles);

  const ctx: GeneratorContext = {
    theme,
    studentName: req.studentName,
    studentStatus: status,
    isSupport,
    isAdvanced,
    role,
  };

  // Phân nhóm archetypes theo Tier
  const tierA = shuffle(QUESTION_ARCHETYPES.filter((a) => a.tier === "A"));
  const tierB = shuffle(QUESTION_ARCHETYPES.filter((a) => a.tier === "B"));
  const tierC = shuffle(QUESTION_ARCHETYPES.filter((a) => a.tier === "C"));
  const tierD = shuffle(QUESTION_ARCHETYPES.filter((a) => a.tier === "D"));
  const tierE = shuffle(QUESTION_ARCHETYPES.filter((a) => a.tier === "E"));

  // Lựa chọn 10 archetypes khác nhau theo phân phối độ khó phù hợp với học sinh:
  // - "Cần hỗ trợ": 3 câu A, 4 câu B, 2 câu C, 1 câu D (nhẹ nhàng, trực quan)
  // - "Ổn định": 2 câu A, 3 câu B, 3 câu C, 2 câu D (cân bằng chuẩn GDPT)
  // - "Xuất sắc": 1 câu A, 2 câu B, 3 câu C, 2 câu D, 2 câu E (phân hóa sâu)
  const selectedArchetypes: ArchetypeDef[] = [];

  if (isSupport) {
    selectedArchetypes.push(tierA[0], tierA[1], tierA[2]);
    selectedArchetypes.push(tierB[0], tierB[1], tierB[2], tierB[3]);
    selectedArchetypes.push(tierC[0], tierC[1]);
    selectedArchetypes.push(tierD[0]);
  } else if (isAdvanced) {
    selectedArchetypes.push(tierA[0]);
    selectedArchetypes.push(tierB[0], tierB[1]);
    selectedArchetypes.push(tierC[0], tierC[1], tierC[2]);
    selectedArchetypes.push(tierD[0], tierD[1]);
    selectedArchetypes.push(tierE[0], tierE[1]);
  } else {
    selectedArchetypes.push(tierA[0], tierA[1]);
    selectedArchetypes.push(tierB[0], tierB[1], tierB[2]);
    selectedArchetypes.push(tierC[0], tierC[1], tierC[2]);
    selectedArchetypes.push(tierD[0], tierD[1]);
  }

  // Sinh 10 câu hỏi độc nhất
  const generatedQuestions: QuizQuestion[] = selectedArchetypes.map((archetype, index) => {
    const q = archetype.generate(ctx);
    return {
      ...q,
      id: index + 1,
      phase: index < 7 ? "normal" : "challenge",
      personalizedFor: {
        studentId: req.studentId,
        studentName: req.studentName,
        interest: theme.name,
        status: req.studentStatus,
        generatedBy: "dynamic-multi-template",
        archetypeId: archetype.id,
      },
    };
  });

  return generatedQuestions;
}
