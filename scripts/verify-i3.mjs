#!/usr/bin/env node
// Verify rate + regenerate APIs (without waiting for actual claude regen).
import Database from "better-sqlite3";

const BASE = "http://localhost:3000";
const db = new Database(
  "/home/user/new_space/projects/self-teacher/data/self-teacher.sqlite",
);

// Authenticate so middleware lets us hit DELETE/PATCH if needed
async function auth() {
  // Either set a fresh PIN or verify existing
  const r = await fetch(`${BASE}/api/parent/auth`).then((r) => r.json());
  if (!r.has_pin) {
    const set = await fetch(`${BASE}/api/parent/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set", pin: "1234" }),
    });
    return set.headers.get("set-cookie") ?? "";
  }
  // PIN already set — verify with default test PIN if it matches, else can't auth
  const v = await fetch(`${BASE}/api/parent/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "verify", pin: "1234" }),
  });
  return v.headers.get("set-cookie") ?? "";
}
const cookie = await auth();

const target = db
  .prepare(
    `SELECT id, profile_id FROM sessions WHERE lesson_status = 'done' AND lesson_json IS NOT NULL LIMIT 1`,
  )
  .get();
if (!target) {
  console.error("no done session to test against — run npm run seed first");
  process.exit(1);
}
console.log(`target: ${target.id}`);

// 1. POST feedback up
let r = await fetch(`${BASE}/api/sessions/${target.id}/feedback`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ feedback: "up" }),
});
console.log(`feedback=up → ${r.status}`);

let row = db
  .prepare("SELECT feedback FROM sessions WHERE id = ?")
  .get(target.id);
console.log(`db.feedback after up: ${row.feedback}`);
if (row.feedback !== "up") {
  console.error("✗ feedback not persisted");
  process.exit(1);
}

// 2. POST regenerate
r = await fetch(`${BASE}/api/sessions/${target.id}/regenerate`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ mode: "simpler" }),
});
const j = await r.json();
console.log(`regenerate → status ${r.status} new sid: ${j.session_id}`);
if (r.status !== 200) {
  console.error("✗ regenerate failed");
  process.exit(1);
}

const newRow = db
  .prepare(
    "SELECT id, prev_lesson_id, hint, lesson_status FROM sessions WHERE id = ?",
  )
  .get(j.session_id);
console.log(JSON.stringify(newRow, null, 2));
if (newRow.prev_lesson_id !== target.id) {
  console.error("✗ prev_lesson_id mismatch");
  process.exit(1);
}
if (!newRow.hint.includes("[regenerate:simpler]")) {
  console.error("✗ regenerate tag missing in hint");
  process.exit(1);
}
if (newRow.lesson_status !== "pending") {
  console.error("✗ new session should be pending");
  process.exit(1);
}

// Cleanup the placeholder regen row
db.prepare("DELETE FROM sessions WHERE id = ?").run(j.session_id);

// 3. POST feedback null (clear)
r = await fetch(`${BASE}/api/sessions/${target.id}/feedback`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ feedback: null }),
});
row = db.prepare("SELECT feedback FROM sessions WHERE id = ?").get(target.id);
console.log(`feedback after clear: ${row.feedback === null ? "NULL ✓" : row.feedback}`);

console.log("\n✓ all good");
