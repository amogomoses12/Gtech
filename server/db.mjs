import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "./config.mjs";

mkdirSync(path.dirname(config.database), { recursive: true });
mkdirSync(config.uploads, { recursive: true });
export const db = new Database(config.database);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.transaction(() =>
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8")),
)();
export const one = (sql, ...args) => db.prepare(sql).get(...args);
export const all = (sql, ...args) => db.prepare(sql).all(...args);
export const run = (sql, ...args) => db.prepare(sql).run(...args);
export function activity(userId, action, subject) {
  run(
    "INSERT INTO activity(user_id,action,subject) VALUES (?,?,?)",
    userId || null,
    action,
    subject,
  );
}
export function settings() {
  return Object.fromEntries(
    all("SELECT * FROM settings").map((row) => [row.key, row.value]),
  );
}
