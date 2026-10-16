import { db } from "../server/db.mjs";
import { mkdir, cp } from "node:fs/promises";
import path from "node:path";
import { config } from "../server/config.mjs";

const destination = path.resolve(
  "backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(destination, { recursive: true });
await db.backup(path.join(destination, "gtech.sqlite"));
await cp(config.uploads, path.join(destination, "uploads"), {
  recursive: true,
});
db.close();
console.log(`Database and uploaded media backed up to ${destination}`);
