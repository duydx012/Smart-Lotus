import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    INSERT INTO classrooms (teacher_id, name, label, subject, description, schedule, color, join_code, is_extra)
    VALUES 
    (
      12, 
      'CLB Toán Tư Duy & Logic Sáng Tạo', 
      'CLB-TOANTD-T12', 
      'Toán Tư Duy', 
      'Dành cho các bạn nhỏ yêu thích giải đố, rèn luyện tư duy logic toán học và các bài toán thực tế vui nhộn!', 
      'Tối Thứ 4 & Thứ 7 (19:30 - 20:30)', 
      'purple', 
      'EXT-TD12', 
      true
    ),
    (
      12, 
      'Lớp Bồi Dưỡng Toán Nâng Cao & Violympic', 
      'BD-OLYMPIC-T12', 
      'Toán Nâng Cao', 
      'Lớp rèn luyện toán mở rộng, các dạng toán đố có lời văn nhiều bước tính và chuẩn bị cho các kỳ thi học sinh giỏi.', 
      'Sáng Chủ Nhật (08:30 - 10:00)', 
      'teal', 
      'EXT-NC12', 
      true
    )
    ON CONFLICT DO NOTHING;
  `);
  console.log("✓ Added sample extra classes for Teacher 12.");
  await pool.end();
}
run();
