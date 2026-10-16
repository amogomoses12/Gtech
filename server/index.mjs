import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z, ZodError } from "zod";
import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { config, production } from "./config.mjs";
import { all, one, run, db, activity, settings } from "./db.mjs";
import { seed } from "./seed.mjs";
import {
  authenticate,
  createSession,
  hashPassword,
  verifyPassword,
  publicUser,
  requireUser,
  protectWrites,
  hasCourseAccess,
  hashToken,
  HttpError,
} from "./security.mjs";
import { registration, credentials, messageSchema } from "./validation.mjs";
import { paymentRoutes, webhook, paymentConfig } from "./payments.mjs";
import { uploadRoutes } from "./uploads.mjs";
import { adminRoutes } from "./admin.mjs";

seed();
const courseView = (course, user) => ({
  ...course,
  published: Boolean(course.published),
  lesson_count: one(
    "SELECT COUNT(*) AS count FROM lessons WHERE course_id=?",
    course.id,
  ).count,
  enrolled: Boolean(
    user &&
      one(
        "SELECT 1 FROM enrollments WHERE user_id=? AND course_id=?",
        user.id,
        course.id,
      ),
  ),
  completed_lessons: user
    ? one(
        "SELECT COUNT(*) AS count FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=? AND l.course_id=?",
        user.id,
        course.id,
      ).count
    : 0,
});
const lessonView = (lesson, user) => {
  const course = one("SELECT * FROM courses WHERE id=?", lesson.course_id);
  const unlocked =
    (Boolean(course.published) && Boolean(lesson.preview)) ||
    hasCourseAccess(user, lesson.course_id);
  return {
    id: lesson.id,
    course_id: lesson.course_id,
    title: lesson.title,
    kind: lesson.kind,
    duration: lesson.duration,
    position: lesson.position,
    preview: Boolean(lesson.preview),
    locked: !unlocked,
    completed: Boolean(
      user &&
        one(
          "SELECT 1 FROM lesson_progress WHERE user_id=? AND lesson_id=?",
          user.id,
          lesson.id,
        ),
    ),
    ...(unlocked
      ? {
          content: lesson.content,
          video_url: lesson.video_url,
          video_file_id: lesson.video_file_id,
          document_file_id: lesson.document_file_id,
        }
      : {}),
  };
};
const resourceView = (resource, user, detail = false) => {
  const unlocked =
    !resource.course_id || hasCourseAccess(user, resource.course_id);
  const { content, file_id, external_url, ...rest } = resource;
  return {
    ...rest,
    published: Boolean(resource.published),
    locked: !unlocked,
    has_file: Boolean(file_id),
    ...(detail && unlocked ? { content, file_id, external_url } : {}),
  };
};

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:"],
              mediaSrc: ["'self'", "blob:"],
              frameSrc: [
                "https://www.youtube-nocookie.com",
                "https://player.vimeo.com",
              ],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginResourcePolicy: { policy: "same-origin" },
    }),
  );
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json", limit: "1mb" }),
    webhook,
  );
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60000,
      limit: process.env.NODE_ENV === "test" ? 10000 : 1500,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Please wait and try again." },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api", authenticate, protectWrites);
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in 15 minutes." },
  });
  app.get("/api/health", (_req, res) => {
    one("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  });
  app.get("/api/config", (_req, res) => {
    const site = settings();
    res.json({
      site_name: site.site_name,
      support_email: site.support_email,
      tagline: site.tagline,
      payment: paymentConfig(),
      max_upload_mb: config.maxUpload / 1024 / 1024,
    });
  });
  app.get("/api/auth/me", (req, res) =>
    res.json({
      user: publicUser(req.user),
      csrfToken: req.session?.csrf_token || null,
    }),
  );
  app.post("/api/auth/register", authLimit, async (req, res) => {
    if (req.user) throw new HttpError(409, "You are already signed in.");
    const value = registration.parse(req.body);
    if (one("SELECT id FROM users WHERE email=?", value.email))
      throw new HttpError(
        409,
        "An account with this email already exists. Please sign in.",
      );
    const hashed = await hashPassword(value.password);
    const result = run(
      "INSERT INTO users(name,email,password_hash) VALUES (?,?,?)",
      value.name,
      value.email,
      hashed,
    );
    const user = one("SELECT * FROM users WHERE id=?", result.lastInsertRowid);
    const csrfToken = createSession(res, user.id);
    activity(user.id, "joined", "Gtech Learning");
    res.status(201).json({ user: publicUser(user), csrfToken });
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const value = credentials.parse(req.body);
    const user = one("SELECT * FROM users WHERE email=?", value.email);
    const valid = await verifyPassword(value.password, user?.password_hash);
    if (!user || !valid || user.status !== "active")
      throw new HttpError(
        401,
        "The email or password is incorrect, or the account is unavailable.",
      );
    if (req.session)
      run("DELETE FROM sessions WHERE token_hash=?", req.session.token_hash);
    const csrfToken = createSession(res, user.id);
    res.json({ user: publicUser(user), csrfToken });
  });
  app.post("/api/auth/logout", (req, res) => {
    if (req.cookies.gtech_session)
      run(
        "DELETE FROM sessions WHERE token_hash=?",
        hashToken(req.cookies.gtech_session),
      );
    res.clearCookie("gtech_session", {
      path: "/",
      httpOnly: true,
      secure: config.secureCookie,
      sameSite: "lax",
    });
    res.json({ success: true });
  });
  app.patch("/api/account", requireUser, (req, res) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(80) })
      .parse(req.body);
    run("UPDATE users SET name=? WHERE id=?", name, req.user.id);
    res.json({
      user: publicUser(one("SELECT * FROM users WHERE id=?", req.user.id)),
      csrfToken: req.session.csrf_token,
    });
  });
  app.post(
    "/api/account/password",
    authLimit,
    requireUser,
    async (req, res) => {
      const value = z
        .object({
          current_password: z.string().min(1).max(128),
          password: z.string().min(10).max(128),
        })
        .parse(req.body);
      const user = one("SELECT * FROM users WHERE id=?", req.user.id);
      if (!(await verifyPassword(value.current_password, user.password_hash)))
        throw new HttpError(400, "Your current password is incorrect.");
      run(
        "UPDATE users SET password_hash=? WHERE id=?",
        await hashPassword(value.password),
        user.id,
      );
      run("DELETE FROM sessions WHERE user_id=?", user.id);
      const csrfToken = createSession(res, user.id);
      res.json({ user: publicUser(user), csrfToken });
    },
  );
  app.get("/api/courses", (req, res) => {
    let courses = all(
      "SELECT * FROM courses WHERE published=1 ORDER BY id ASC",
    );
    if (req.query.subject)
      courses = courses.filter(
        (course) => course.subject === req.query.subject,
      );
    if (req.query.q) {
      const query = String(req.query.q).toLowerCase().slice(0, 200);
      courses = courses.filter((course) =>
        `${course.title} ${course.summary} ${course.subject}`
          .toLowerCase()
          .includes(query),
      );
    }
    if (req.query.price === "free")
      courses = courses.filter((course) => !course.price_cents);
    if (req.query.price === "paid")
      courses = courses.filter((course) => course.price_cents > 0);
    res.json(courses.map((course) => courseView(course, req.user)));
  });
  app.get("/api/courses/:slug", (req, res) => {
    const course = one(
      "SELECT * FROM courses WHERE slug=? OR id=?",
      req.params.slug,
      req.params.slug,
    );
    if (!course || (!course.published && !hasCourseAccess(req.user, course.id)))
      throw new HttpError(404, "Course not found.");
    res.json({
      ...courseView(course, req.user),
      lessons: all(
        "SELECT * FROM lessons WHERE course_id=? ORDER BY position,id",
        course.id,
      ).map((lesson) => lessonView(lesson, req.user)),
      resources: all(
        "SELECT r.*,f.original_name AS filename FROM resources r LEFT JOIN files f ON f.id=r.file_id WHERE r.course_id=? AND r.published=1",
        course.id,
      ).map((resource) => resourceView(resource, req.user)),
    });
  });
  app.post("/api/courses/:id/enroll", requireUser, (req, res) => {
    const course = one(
      "SELECT * FROM courses WHERE id=? AND published=1",
      req.params.id,
    );
    if (!course) throw new HttpError(404, "Course not found.");
    if (course.price_cents > 0 && req.user.role !== "admin")
      throw new HttpError(402, "Complete checkout to enroll in this course.");
    const result = run(
      "INSERT OR IGNORE INTO enrollments(user_id,course_id,source) VALUES (?,?,?)",
      req.user.id,
      course.id,
      req.user.role === "admin" ? "admin" : "free",
    );
    if (result.changes) activity(req.user.id, "enrolled in", course.title);
    res.json({ success: true, course_id: course.id });
  });
  app.get("/api/lessons/:id", (req, res) => {
    const lesson = one("SELECT * FROM lessons WHERE id=?", req.params.id);
    if (!lesson) throw new HttpError(404, "Lesson not found.");
    const course = one("SELECT * FROM courses WHERE id=?", lesson.course_id);
    if (!course.published && !hasCourseAccess(req.user, course.id))
      throw new HttpError(404, "Lesson not found.");
    const result = lessonView(lesson, req.user);
    if (result.locked)
      throw new HttpError(
        req.user ? 403 : 401,
        "Enroll in this course to unlock this lesson.",
      );
    res.json({
      ...result,
      course: courseView(course, req.user),
      lessons: all(
        "SELECT * FROM lessons WHERE course_id=? ORDER BY position,id",
        course.id,
      ).map((row) => lessonView(row, req.user)),
    });
  });
  app.post("/api/lessons/:id/progress", requireUser, (req, res) => {
    const lesson = one("SELECT * FROM lessons WHERE id=?", req.params.id);
    if (!lesson) throw new HttpError(404, "Lesson not found.");
    if (!hasCourseAccess(req.user, lesson.course_id))
      throw new HttpError(403, "Enroll in this course before saving progress.");
    const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
    if (completed)
      run(
        "INSERT OR IGNORE INTO lesson_progress(user_id,lesson_id) VALUES (?,?)",
        req.user.id,
        lesson.id,
      );
    else
      run(
        "DELETE FROM lesson_progress WHERE user_id=? AND lesson_id=?",
        req.user.id,
        lesson.id,
      );
    res.json({ completed });
  });
  app.get("/api/resources", (req, res) => {
    let rows = all(
      "SELECT r.*,f.original_name AS filename,c.title AS course_title FROM resources r LEFT JOIN files f ON f.id=r.file_id LEFT JOIN courses c ON c.id=r.course_id WHERE r.published=1 AND (r.course_id IS NULL OR c.published=1) ORDER BY r.id ASC",
    );
    if (req.query.subject)
      rows = rows.filter((row) => row.subject === req.query.subject);
    if (req.query.q)
      rows = rows.filter((row) =>
        `${row.title} ${row.description}`
          .toLowerCase()
          .includes(String(req.query.q).toLowerCase().slice(0, 200)),
      );
    res.json(rows.map((row) => resourceView(row, req.user)));
  });
  app.get("/api/resources/:id", (req, res) => {
    const resource = one(
      "SELECT r.*,f.original_name AS filename,c.title AS course_title,c.slug AS course_slug,c.published AS course_published FROM resources r LEFT JOIN files f ON f.id=r.file_id LEFT JOIN courses c ON c.id=r.course_id WHERE r.id=? AND r.published=1",
      req.params.id,
    );
    if (
      !resource ||
      (resource.course_id &&
        !resource.course_published &&
        !hasCourseAccess(req.user, resource.course_id))
    )
      throw new HttpError(404, "Material not found.");
    res.json(resourceView(resource, req.user, true));
  });
  app.get("/api/quizzes", (req, res) => {
    const rows = all(
      "SELECT q.*,(SELECT COUNT(*) FROM questions WHERE quiz_id=q.id) AS question_count FROM quizzes q WHERE published=1 ORDER BY id",
    );
    res.json(
      rows.filter(
        (row) => !req.query.subject || row.subject === req.query.subject,
      ),
    );
  });
  app.get("/api/quizzes/:id", (req, res) => {
    const quiz = one(
      "SELECT * FROM quizzes WHERE id=? AND published=1",
      req.params.id,
    );
    if (!quiz) throw new HttpError(404, "Practice session not found.");
    res.json({
      ...quiz,
      questions: all(
        "SELECT id,prompt,options FROM questions WHERE quiz_id=? ORDER BY position,id",
        quiz.id,
      ).map((question) => ({
        ...question,
        options: JSON.parse(question.options),
      })),
    });
  });
  app.post("/api/quizzes/:id/attempts", requireUser, (req, res) => {
    const quiz = one(
      "SELECT * FROM quizzes WHERE id=? AND published=1",
      req.params.id,
    );
    if (!quiz) throw new HttpError(404, "Practice session not found.");
    const { answers } = z
      .object({
        answers: z
          .array(
            z.object({
              question_id: z.number().int(),
              choice: z.number().int().min(0).max(5),
            }),
          )
          .min(1)
          .max(50),
      })
      .parse(req.body);
    const questions = all(
      "SELECT * FROM questions WHERE quiz_id=? ORDER BY position,id",
      quiz.id,
    );
    if (
      answers.length !== questions.length ||
      new Set(answers.map((answer) => answer.question_id)).size !==
        questions.length
    )
      throw new HttpError(400, "Answer each question once before submitting.");
    const review = questions.map((question) => {
      const selected = answers.find(
        (answer) => answer.question_id === question.id,
      )?.choice;
      const options = JSON.parse(question.options);
      if (selected === undefined || selected >= options.length)
        throw new HttpError(
          400,
          "The questions have changed. Reload this practice session and try again.",
        );
      return {
        id: question.id,
        prompt: question.prompt,
        options,
        selected,
        correct_index: question.correct_index,
        correct: selected === question.correct_index,
        explanation: question.explanation,
      };
    });
    const score = review.filter((answer) => answer.correct).length;
    const result = run(
      "INSERT INTO attempts(user_id,quiz_id,quiz_title,score,total,review) VALUES (?,?,?,?,?,?)",
      req.user.id,
      quiz.id,
      quiz.title,
      score,
      questions.length,
      JSON.stringify(review),
    );
    activity(req.user.id, "practiced", quiz.title);
    res.status(201).json({
      id: result.lastInsertRowid,
      quiz_title: quiz.title,
      score,
      total: questions.length,
      review,
    });
  });
  app.get("/api/attempts/:id", requireUser, (req, res) => {
    const attempt = one(
      "SELECT * FROM attempts WHERE id=? AND user_id=?",
      req.params.id,
      req.user.id,
    );
    if (!attempt) throw new HttpError(404, "Practice result not found.");
    res.json({ ...attempt, review: JSON.parse(attempt.review) });
  });
  app.get("/api/my-learning", requireUser, (req, res) =>
    res.json({
      courses: all(
        "SELECT c.* FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.created_at DESC",
        req.user.id,
      ).map((course) => ({
        ...courseView(course, req.user),
        next_lesson_id:
          one(
            "SELECT l.id FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.user_id=? WHERE l.course_id=? AND p.lesson_id IS NULL ORDER BY l.position,l.id LIMIT 1",
            req.user.id,
            course.id,
          )?.id ||
          one(
            "SELECT id FROM lessons WHERE course_id=? ORDER BY position,id LIMIT 1",
            course.id,
          )?.id,
      })),
      attempts: all(
        "SELECT id,quiz_id,quiz_title,score,total,created_at FROM attempts WHERE user_id=? ORDER BY id DESC LIMIT 50",
        req.user.id,
      ),
      orders: all(
        "SELECT o.*,c.slug FROM orders o JOIN courses c ON c.id=o.course_id WHERE o.user_id=? ORDER BY o.created_at DESC",
        req.user.id,
      ),
    }),
  );
  app.post(
    "/api/contact",
    rateLimit({
      windowMs: 60 * 60000,
      limit: 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Please wait before sending another message." },
    }),
    (req, res) => {
      const value = messageSchema.parse(req.body);
      const result = run(
        "INSERT INTO messages(name,email,subject,message) VALUES (?,?,?,?)",
        value.name,
        value.email,
        value.subject,
        value.message,
      );
      res.status(201).json({
        id: result.lastInsertRowid,
        message: "Your message is saved in the Gtech support inbox.",
      });
    },
  );
  paymentRoutes(app);
  adminRoutes(app);
  uploadRoutes(app);
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "API endpoint not found.")),
  );
  const dist = path.resolve("dist");
  if (existsSync(path.join(dist, "index.html"))) {
    app.use(
      express.static(dist, { index: false, maxAge: production ? "1h" : 0 }),
    );
    app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON request body." });
    if (error instanceof ZodError)
      return res.status(400).json({
        error: error.issues
          .map(
            (issue) =>
              `${issue.path.join(".") ? `${issue.path.join(".")}: ` : ""}${issue.message}`,
          )
          .slice(0, 3)
          .join(" "),
      });
    if (error.code === "LIMIT_FILE_SIZE")
      return res.status(413).json({
        error: `File too large. The maximum is ${config.maxUpload / 1024 / 1024} MB.`,
      });
    if (error.name === "MulterError")
      return res
        .status(400)
        .json({ error: "Upload one supported file at a time." });
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "This record already exists." });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "This request is too large." });
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    if (!res.headersSent)
      res.status(status).json({
        error:
          status >= 500
            ? "Something went wrong on the server. Please try again."
            : error.message,
      });
  });
  return app;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createApp().listen(config.port, "0.0.0.0", () =>
    console.log(
      `Gtech API and production website: http://localhost:${config.port}`,
    ),
  );
  const close = () =>
    server.close(() => {
      db.close();
      process.exit(0);
    });
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
