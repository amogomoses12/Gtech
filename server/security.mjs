import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { one, run } from "./db.mjs";
import { config } from "./config.mjs";

const scrypt = promisify(scryptCallback);
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  const [salt, key] = (
    stored || "00000000000000000000000000000000:" + "00".repeat(64)
  ).split(":");
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return (
    expected.length === derived.length && timingSafeEqual(expected, derived)
  );
}
export const publicUser = (user) =>
  user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
      }
    : null;
export function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  const csrf = randomBytes(24).toString("hex");
  run("DELETE FROM sessions WHERE expires_at < ?", Date.now());
  run(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES (?,?,?,?)",
    hashToken(token),
    userId,
    csrf,
    Date.now() + 7 * 86400000,
  );
  res.cookie("gtech_session", token, {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: "lax",
    maxAge: 7 * 86400000,
    path: "/",
  });
  return csrf;
}
export function authenticate(req, _res, next) {
  const token = req.cookies?.gtech_session;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const session = one(
      "SELECT s.*,u.name,u.email,u.role,u.status,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=? AND expires_at>?",
      hashToken(token),
      Date.now(),
    );
    if (session?.status === "active") {
      req.user = { ...session, id: session.user_id };
      req.session = session;
    }
  }
  next();
}
export function requireUser(req, _res, next) {
  if (!req.user) return next(new HttpError(401, "Please sign in to continue."));
  next();
}
export function requireAdmin(req, _res, next) {
  if (req.user?.role !== "admin")
    return next(
      new HttpError(req.user ? 403 : 401, "Administrator access is required."),
    );
  next();
}
export function protectWrites(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.headers["x-gtech-request"] !== "1")
    return next(new HttpError(403, "Missing request verification header."));
  const origin = req.headers.origin;
  if (origin) {
    let allowed = false;
    try {
      allowed =
        new URL(origin).host === req.get("host") || origin === config.publicUrl;
    } catch {
      /* Invalid origins are rejected. */
    }
    if (!allowed)
      return next(new HttpError(403, "This request origin is not allowed."));
  }
  if (req.user && req.headers["x-csrf-token"] !== req.session.csrf_token)
    return next(
      new HttpError(403, "Session verification failed. Refresh and try again."),
    );
  next();
}
export function hasCourseAccess(user, courseId) {
  return Boolean(
    user &&
      (user.role === "admin" ||
        one(
          "SELECT 1 FROM enrollments WHERE user_id=? AND course_id=?",
          user.id,
          courseId,
        )),
  );
}
