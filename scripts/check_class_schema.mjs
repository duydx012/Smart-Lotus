import { config } from "dotenv";
import { Pool } from "pg";
config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL });

async function check() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'classrooms'");
  console.log("Columns of classrooms:", cols.rows.map(c => c.column_name));

  const classes = await pool.query("SELECT id, name, label, teacher_id FROM classrooms");
  console.log("Classrooms in DB:", classes.rows);

  await pool.end();
}

check().catch(console.error);
