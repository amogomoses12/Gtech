import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { one, run, db } from "../server/db.mjs";
import { hashPassword } from "../server/security.mjs";
import { registration } from "../server/validation.mjs";

const input = createInterface({ input: stdin, output: stdout });
try {
  const name =
    process.env.ADMIN_NAME || (await input.question("Administrator name: "));
  const email =
    process.env.ADMIN_EMAIL || (await input.question("Administrator email: "));
  const password =
    process.env.ADMIN_PASSWORD ||
    (await input.question(
      "New password (at least 10 characters; input is visible): ",
    ));
  const value = registration.parse({ name, email, password });
  if (one("SELECT id FROM users WHERE email=?", value.email))
    throw new Error(
      "An account already uses this email. No existing account was changed.",
    );
  run(
    "INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,'admin')",
    value.name,
    value.email,
    await hashPassword(value.password),
  );
  console.log(
    `Administrator created for ${value.email}. Sign in at /login, then open /admin.`,
  );
} catch (error) {
  console.error(
    error.issues?.map((issue) => issue.message).join("\n") || error.message,
  );
  process.exitCode = 1;
} finally {
  input.close();
  db.close();
}
