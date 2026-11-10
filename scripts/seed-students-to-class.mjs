import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });
config({ path: '.env' });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ Không tìm thấy biến môi trường SUPABASE_DATABASE_URL hoặc DATABASE_URL trong .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString });

const sampleStudents = [
  {
    displayName: "Nguyễn An Nhiên",
    email: "annhien.lop1a@smartlotus.edu.vn",
    birthDate: "15/05/2018",
    avatar: "AN",
    score: 95,
    intelligence: 92,
    speed: 14, // giây/câu (nhanh)
  },
  {
    displayName: "Trần Đăng Khoa",
    email: "dangkhoa.lop1a@smartlotus.edu.vn",
    birthDate: "20/08/2018",
    avatar: "DK",
    score: 88,
    intelligence: 85,
    speed: 18,
  },
  {
    displayName: "Lê Bảo Nam",
    email: "baonam.lop1a@smartlotus.edu.vn",
    birthDate: "10/02/2018",
    avatar: "BN",
    score: 90,
    intelligence: 89,
    speed: 16,
  },
  {
    displayName: "Phạm Mai Chi",
    email: "maichi.lop1a@smartlotus.edu.vn",
    birthDate: "05/11/2018",
    avatar: "MC",
    score: 76,
    intelligence: 75,
    speed: 25,
  },
  {
    displayName: "Hoàng Gia Bảo",
    email: "giabao.lop1a@smartlotus.edu.vn",
    birthDate: "12/09/2018",
    avatar: "GB",
    score: 65,
    intelligence: 68,
    speed: 32,
  },
];

async function main() {
  console.log("🚀 Đang kết nối CSDL và tìm Lớp 1A...");

  try {
    // 1. Tìm lớp học có tên hoặc nhãn '1A'
    const classRes = await pool.query(
      "SELECT id, name, label, teacher_id FROM classrooms WHERE label ILIKE '1A' OR name ILIKE '%1A%' LIMIT 1"
    );

    let classroom;
    if (classRes.rows.length === 0) {
      console.log("⚠️ Chưa tìm thấy Lớp 1A, đang tìm lớp đầu tiên...");
      const fallback = await pool.query("SELECT id, name, label, teacher_id FROM classrooms ORDER BY id ASC LIMIT 1");
      if (fallback.rows.length === 0) {
        throw new Error("Không tìm thấy bất kỳ lớp học nào trong CSDL. Vui lòng tạo lớp học trước trên giao diện web.");
      }
      classroom = fallback.rows[0];
    } else {
      classroom = classRes.rows[0];
    }

    console.log(`✓ Đã chọn lớp đích: [ID: ${classroom.id}] ${classroom.name} (Nhãn: ${classroom.label})`);

    // 2. Tạo hoặc cập nhật học sinh trong bảng users
    const studentIds = [];
    for (const s of sampleStudents) {
      const userRes = await pool.query(
        `INSERT INTO users (email, display_name, role, avatar, birth_date, class_name, lotus_points)
         VALUES ($1, $2, 'student', $3, $4, $5, 120)
         ON CONFLICT (email) 
         DO UPDATE SET display_name = EXCLUDED.display_name, class_name = EXCLUDED.class_name
         RETURNING id, display_name, email`,
        [s.email, s.displayName, s.avatar, s.birthDate, classroom.label]
      );

      const studentId = userRes.rows[0].id;
      studentIds.push({ id: studentId, meta: s });

      // 3. Gắn học sinh vào classroom_memberships
      await pool.query(
        `INSERT INTO classroom_memberships (classroom_id, student_id, joined_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (classroom_id, student_id) DO NOTHING`,
        [classroom.id, studentId]
      );

      // 4. Tạo lịch sử làm bài thi (quiz_attempts) để có dữ liệu phân tích năng lực (RAG / AI)
      const attemptCheck = await pool.query(
        "SELECT id FROM quiz_attempts WHERE user_id = $1 LIMIT 1",
        [studentId]
      );

      if (attemptCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO quiz_attempts 
           (user_id, lesson_slug, correct_answers, total_questions, score, duration_seconds, highest_difficulty, answers, completed_at)
           VALUES ($1, 'phep-cong-pham-vi-10', $2, 10, $3, $4, 'C', '[]'::jsonb, NOW() - INTERVAL '1 day')`,
          [studentId, Math.round(s.score / 10), s.score, s.speed * 10]
        );
      }

      console.log(`  + Đã đưa học sinh: ${s.displayName} (Mã ID: HS-${String(studentId).padStart(8, '0')}) vào ${classroom.name}`);
    }

    console.log(`\n🎉 HOÀN TẤT! Đã đưa thành công ${studentIds.length} học sinh vào ${classroom.name}.`);
    console.log("👉 Giờ bạn mở lại giao diện web (hoặc F5), vào Lớp học -> Lớp 1A hoặc Bài tập -> Tạo đề bằng AI để thấy dữ liệu học sinh!");
  } catch (err) {
    console.error("❌ Lỗi khi thực hiện:", err.message);
  } finally {
    await pool.end();
  }
}

main();

