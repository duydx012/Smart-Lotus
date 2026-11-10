import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
console.log('Connecting to:', url ? url.replace(/:[^:@]+@/, ':****@') : 'NO_URL');

const pool = new Pool({ connectionString: url });

async function check() {
  try {
    const res = await pool.query('SELECT current_database(), count(*)::int as total_users from users');
    console.log('Connected to DB:', res.rows);

    const classes = await pool.query('SELECT id, name, label, teacher_id from classrooms');
    console.log('Classrooms in DB:', classes.rows);

    const students = await pool.query("SELECT id, display_name, email, role, class_name from users where role = 'student' limit 20");
    console.log('Students count:', students.rowCount, students.rows);

    const memberships = await pool.query('SELECT cm.id, cm.classroom_id, cm.student_id, u.display_name, c.name as class_name FROM classroom_memberships cm JOIN users u ON u.id = cm.student_id JOIN classrooms c ON c.id = cm.classroom_id');
    console.log('Memberships in DB:', memberships.rows);
  } catch (e) {
    console.error('DB connect error:', e);
  } finally {
    await pool.end();
  }
}

check();

