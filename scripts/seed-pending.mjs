// Insert a fake pending session to preview the WaitGame component without
// actually calling claude. Use only in dev.
import Database from "better-sqlite3";
import path from "node:path";
import { randomBytes } from "node:crypto";

const db = new Database(path.join(process.cwd(), "data", "self-teacher.sqlite"));
const profile = db.prepare("SELECT id FROM profiles LIMIT 1").get();
if (!profile) {
  console.error("no profiles, run npm run seed first");
  process.exit(1);
}
const sid = `s_pending_${randomBytes(4).toString("hex")}`;
db.prepare(
  `INSERT INTO sessions (id, profile_id, image_paths, subject, hint,
    lesson_status, quiz_status, created_at)
   VALUES (?, ?, '[]', 'free', '', 'pending', 'pending', ?)`,
).run(sid, profile.id, Date.now());
console.log(`${profile.id}/${sid}`);
