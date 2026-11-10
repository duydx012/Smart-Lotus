import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

async function main() {
  console.log("Adding is_extra and schedule columns to classrooms...");

  await pool.query(`
    ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS is_extra BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS schedule VARCHAR(120);
  `);

  console.log("✓ Added is_extra and schedule columns to classrooms.");

  // Thêm 2 lớp học thêm mẫu cho giáo viên teacher_id = 12 (Nguyễn Duy)
  const teacherRes = await pool.query("SELECT id FROM users WHERE role = 'teacher' ORDER BY id ASC LIMIT 1");
  const teacherId = teacherRes.rows[0]?.id || 12;

  // Kiểm tra xem đã có lớp học thêm nào chưa
  const existingExtra = await pool.query("SELECT id FROM classrooms WHERE is_extra = true");
  if (existingExtra.rows.length === 0) {
    console.log("Seeding sample extra classes for teacher ID:", teacherId);
    await pool.query(`
      INSERT INTO classrooms (teacher_id, name, label, subject, description, schedule, color, join_code, is_extra)
      VALUES 
      (
        $1, 
        'CLB Toán Tư Duy & Logic Sáng Tạo', 
        'CLB-TOANTD', 
        'Toán Tư Duy', 
        'Dành cho các bạn nhỏ yêu thích giải đố, rèn luyện tư duy logic toán học và các bài toán thực tế vui nhộn!', 
        'Tối Thứ 4 & Thứ 7 (19:30 - 20:30)', 
        'purple', 
        'EXTRA-TD01', 
        true
      ),
      (
        $1, 
        'Lớp Bồi Dưỡng Toán Nâng Cao & Violympic', 
        'BD-OLYMPIC', 
        'Toán Nâng Cao', 
        'Lớp rèn luyện toán mở rộng, các dạng toán đố có lời văn nhiều bước tính và chuẩn bị cho các kỳ thi học sinh giỏi.', 
        'Sáng Chủ Nhật (08:30 - 10:00)', 
        'teal', 
        'EXTRA-NC02', 
        true
      )
      ON CONFLICT DO NOTHING;
    `, [teacherId]);
    console.log("✓ Created 2 sample extra classes successfully.");
  } else {
    console.log("Extra classes already exist:", existingExtra.rows.length);
  }

  const check = await pool.query("SELECT id, name, label, is_extra, schedule FROM classrooms");
  console.log("Current classrooms in DB:", check.rows);

  await pool.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
