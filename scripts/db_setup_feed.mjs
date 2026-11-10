import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("No database URL provided.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  console.log("Checking and setting up Feed & Materials tables in database...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS classroom_posts (
      id SERIAL PRIMARY KEY,
      classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255),
      content TEXT NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'announcement',
      attachment_url TEXT,
      attachment_name VARCHAR(255),
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classroom_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES classroom_posts(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classroom_materials (
      id SERIAL PRIMARY KEY,
      classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL DEFAULT 'document',
      file_url TEXT,
      file_name VARCHAR(255),
      file_size VARCHAR(50),
      is_exclusive BOOLEAN NOT NULL DEFAULT TRUE,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classroom_notifications (
      id SERIAL PRIMARY KEY,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      link_id INTEGER,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS classroom_posts_classroom_id_idx ON classroom_posts(classroom_id);
    CREATE INDEX IF NOT EXISTS classroom_comments_post_id_idx ON classroom_comments(post_id);
    CREATE INDEX IF NOT EXISTS classroom_materials_classroom_id_idx ON classroom_materials(classroom_id);
    CREATE INDEX IF NOT EXISTS classroom_notifications_recipient_idx ON classroom_notifications(recipient_id, is_read);
  `);

  console.log("✓ Successfully created tables: classroom_posts, classroom_comments, classroom_materials, classroom_notifications");

  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log("Available tables now:", tables.rows.map(r => r.table_name));

  await pool.end();
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
