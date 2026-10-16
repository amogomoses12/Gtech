import { randomBytes } from "node:crypto";
import { z } from "zod";
import { all, db, one, run, activity, settings } from "./db.mjs";
import { HttpError, requireAdmin } from "./security.mjs";
import {
  courseSchema,
  lessonSchema,
  resourceSchema,
  quizSchema,
  projectSchema,
  siteSettingsSchema,
} from "./validation.mjs";
import { validateFile } from "./uploads.mjs";
import { paymentConfig } from "./payments.mjs";

const courseView = (row) => ({
  ...row,
  published: Boolean(row.published),
  lesson_count: one(
    "SELECT COUNT(*) AS count FROM lessons WHERE course_id=?",
    row.id,
  ).count,
  enrollment_count: one(
    "SELECT COUNT(*) AS count FROM enrollments WHERE course_id=?",
    row.id,
  ).count,
});
const projectView = (row) => ({
  ...row,
  dueDate: row.due_date,
  code: `GTC-${row.id + 100}`,
  color: ["purple", "green", "orange", "blue"][row.id % 4],
  icon: row.id % 4,
  members: JSON.parse(row.members),
});
function exists(table, id) {
  const row = one(`SELECT * FROM ${table} WHERE id=?`, id);
  if (!row) throw new HttpError(404, "This item was not found.");
  return row;
}
function insert(table, values) {
  const keys = Object.keys(values);
  return run(
    `INSERT INTO ${table}(${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    ...Object.values(values),
  ).lastInsertRowid;
}
function update(table, id, values) {
  const keys = Object.keys(values);
  run(
    `UPDATE ${table} SET ${keys.map((key) => `${key}=?`).join(",")} WHERE id=?`,
    ...Object.values(values),
    id,
  );
}

export function adminRoutes(app) {
  app.use("/api/admin", requireAdmin);
  app.get("/api/admin/overview", (req, res) => {
    const days = ["7", "30", "90"].includes(String(req.query.days))
      ? Number(req.query.days)
      : 30;
    const since = new Date(Date.now() - (days - 1) * 86400000)
      .toISOString()
      .slice(0, 10);
    const revenue = one(
      "SELECT COALESCE(SUM(amount_cents),0) AS value FROM orders WHERE status='paid' AND payment_mode='live' AND date(paid_at)>=?",
      since,
    ).value;
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000)
        .toISOString()
        .slice(0, 10);
      series.push({
        date,
        revenue: one(
          "SELECT COALESCE(SUM(amount_cents),0)/100.0 AS value FROM orders WHERE status='paid' AND payment_mode='live' AND date(paid_at)=?",
          date,
        ).value,
        enrollments: one(
          "SELECT COUNT(*) AS value FROM enrollments WHERE date(created_at)=?",
          date,
        ).value,
      });
    }
    res.json({
      revenue,
      learners: one("SELECT COUNT(*) AS count FROM users WHERE role='student'")
        .count,
      published_courses: one(
        "SELECT COUNT(*) AS count FROM courses WHERE published=1",
      ).count,
      total_courses: one("SELECT COUNT(*) AS count FROM courses").count,
      enrollments: one("SELECT COUNT(*) AS count FROM enrollments").count,
      materials: one("SELECT COUNT(*) AS count FROM resources").count,
      test_orders: one(
        "SELECT COUNT(*) AS count FROM orders WHERE status='test_paid'",
      ).count,
      series,
      subjects: all(
        "SELECT subject,COUNT(*) AS count FROM courses WHERE published=1 GROUP BY subject",
      ),
      courses: all(
        "SELECT * FROM courses ORDER BY updated_at DESC,id DESC LIMIT 4",
      ).map(courseView),
      activity: all(
        "SELECT a.*,u.name FROM activity a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 12",
      ),
      payment: paymentConfig(),
      new_messages: one(
        "SELECT COUNT(*) AS count FROM messages WHERE status='new'",
      ).count,
    });
  });
  app.get("/api/admin/courses", (_req, res) =>
    res.json(all("SELECT * FROM courses ORDER BY id DESC").map(courseView)),
  );
  app.post("/api/admin/courses", (req, res) => {
    const value = courseSchema.parse(req.body);
    const slug = `${
      value.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "course"
    }-${randomBytes(3).toString("hex")}`;
    const id = insert("courses", {
      ...value,
      published: Number(value.published),
      slug,
    });
    activity(req.user.id, "created a course", value.title);
    res.status(201).json(courseView(exists("courses", id)));
  });
  app.put("/api/admin/courses/:id", (req, res) => {
    exists("courses", req.params.id);
    const value = courseSchema.parse(req.body);
    update("courses", req.params.id, {
      ...value,
      published: Number(value.published),
      updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    });
    activity(req.user.id, "updated a course", value.title);
    res.json(courseView(exists("courses", req.params.id)));
  });
  app.delete("/api/admin/courses/:id", (req, res) => {
    const course = exists("courses", req.params.id);
    if (
      one("SELECT 1 FROM enrollments WHERE course_id=?", course.id) ||
      one("SELECT 1 FROM orders WHERE course_id=?", course.id) ||
      one("SELECT 1 FROM resources WHERE course_id=?", course.id)
    )
      throw new HttpError(
        409,
        "This course has learners, orders, or linked materials. Unpublish it instead to preserve access and records.",
      );
    run("DELETE FROM courses WHERE id=?", course.id);
    activity(req.user.id, "deleted a course", course.title);
    res.json({ success: true });
  });
  app.get("/api/admin/courses/:id/lessons", (req, res) => {
    exists("courses", req.params.id);
    res.json(
      all(
        "SELECT * FROM lessons WHERE course_id=? ORDER BY position,id",
        req.params.id,
      ).map((row) => ({ ...row, preview: Boolean(row.preview) })),
    );
  });
  app.post("/api/admin/courses/:id/lessons", (req, res) => {
    const course = exists("courses", req.params.id);
    const value = lessonSchema.parse(req.body);
    validateFile(value.video_file_id, "video");
    validateFile(value.document_file_id, "document");
    const id = insert("lessons", {
      ...value,
      preview: Number(value.preview),
      course_id: course.id,
    });
    activity(req.user.id, "added a lesson to", course.title);
    res.status(201).json(exists("lessons", id));
  });
  app.put("/api/admin/lessons/:id", (req, res) => {
    exists("lessons", req.params.id);
    const value = lessonSchema.parse(req.body);
    validateFile(value.video_file_id, "video");
    validateFile(value.document_file_id, "document");
    update("lessons", req.params.id, {
      ...value,
      preview: Number(value.preview),
    });
    activity(req.user.id, "updated a lesson", value.title);
    res.json(exists("lessons", req.params.id));
  });
  app.delete("/api/admin/lessons/:id", (req, res) => {
    const lesson = exists("lessons", req.params.id);
    run("DELETE FROM lessons WHERE id=?", lesson.id);
    activity(req.user.id, "deleted a lesson", lesson.title);
    res.json({ success: true });
  });
  app.get("/api/admin/resources", (_req, res) =>
    res.json(
      all(
        "SELECT r.*,f.original_name AS filename FROM resources r LEFT JOIN files f ON f.id=r.file_id ORDER BY r.id DESC",
      ).map((row) => ({ ...row, published: Boolean(row.published) })),
    ),
  );
  for (const method of ["post", "put"])
    app[method](
      `/api/admin/resources${method === "put" ? "/:id" : ""}`,
      (req, res) => {
        if (method === "put") exists("resources", req.params.id);
        const value = resourceSchema.parse(req.body);
        validateFile(value.file_id, "document");
        if (value.course_id) exists("courses", value.course_id);
        const record = { ...value, published: Number(value.published) };
        const id =
          method === "post" ? insert("resources", record) : req.params.id;
        if (method === "put")
          update("resources", id, {
            ...record,
            updated_at: new Date().toISOString(),
          });
        activity(
          req.user.id,
          method === "post" ? "published a new material" : "updated a material",
          value.title,
        );
        res.status(method === "post" ? 201 : 200).json(exists("resources", id));
      },
    );
  app.delete("/api/admin/resources/:id", (req, res) => {
    const resource = exists("resources", req.params.id);
    run("DELETE FROM resources WHERE id=?", resource.id);
    activity(req.user.id, "deleted a material", resource.title);
    res.json({ success: true });
  });
  app.get("/api/admin/quizzes", (_req, res) =>
    res.json(
      all("SELECT * FROM quizzes ORDER BY id DESC").map((quiz) => ({
        ...quiz,
        published: Boolean(quiz.published),
        questions: all(
          "SELECT * FROM questions WHERE quiz_id=? ORDER BY position,id",
          quiz.id,
        ).map((question) => ({
          ...question,
          options: JSON.parse(question.options),
        })),
      })),
    ),
  );
  for (const method of ["post", "put"])
    app[method](
      `/api/admin/quizzes${method === "put" ? "/:id" : ""}`,
      (req, res) => {
        if (method === "put") exists("quizzes", req.params.id);
        const { questions, ...value } = quizSchema.parse(req.body);
        const id = db.transaction(() => {
          const record = { ...value, published: Number(value.published) };
          const id =
            method === "post"
              ? insert("quizzes", record)
              : Number(req.params.id);
          if (method === "put") {
            update("quizzes", id, record);
            run("DELETE FROM questions WHERE quiz_id=?", id);
          }
          questions.forEach((question, position) =>
            insert("questions", {
              ...question,
              options: JSON.stringify(question.options),
              quiz_id: id,
              position,
            }),
          );
          return id;
        })();
        activity(req.user.id, "saved a practice session", value.title);
        res.status(method === "post" ? 201 : 200).json({ id });
      },
    );
  app.delete("/api/admin/quizzes/:id", (req, res) => {
    exists("quizzes", req.params.id);
    run("DELETE FROM quizzes WHERE id=?", req.params.id);
    res.json({ success: true });
  });
  app.get("/api/admin/learners", (_req, res) =>
    res.json(
      all(
        "SELECT u.id,u.name,u.email,u.role,u.status,u.created_at,(SELECT COUNT(*) FROM enrollments e WHERE e.user_id=u.id) AS enrollments,(SELECT COUNT(*) FROM attempts a WHERE a.user_id=u.id) AS attempts FROM users u ORDER BY u.created_at DESC,u.id DESC",
      ),
    ),
  );
  app.patch("/api/admin/learners/:id", (req, res) => {
    const user = exists("users", req.params.id);
    if (user.role === "admin")
      throw new HttpError(
        403,
        "Administrator accounts cannot be suspended here.",
      );
    const { status } = z
      .object({ status: z.enum(["active", "suspended"]) })
      .parse(req.body);
    db.transaction(() => {
      run("UPDATE users SET status=? WHERE id=?", status, user.id);
      if (status === "suspended")
        run("DELETE FROM sessions WHERE user_id=?", user.id);
    })();
    activity(
      req.user.id,
      status === "suspended" ? "suspended" : "reactivated",
      user.name,
    );
    res.json({ success: true });
  });
  app.get("/api/admin/orders", (_req, res) =>
    res.json(
      all(
        "SELECT o.*,u.name,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC,o.id DESC",
      ),
    ),
  );
  app.get("/api/admin/messages", (_req, res) =>
    res.json(all("SELECT * FROM messages ORDER BY id DESC")),
  );
  app.patch("/api/admin/messages/:id", (req, res) => {
    exists("messages", req.params.id);
    const { status } = z
      .object({ status: z.enum(["new", "read", "resolved"]) })
      .parse(req.body);
    run("UPDATE messages SET status=? WHERE id=?", status, req.params.id);
    res.json({ success: true });
  });
  app.get("/api/admin/settings", (_req, res) =>
    res.json({ ...settings(), payment: paymentConfig() }),
  );
  app.put("/api/admin/settings", (req, res) => {
    const values = siteSettingsSchema.parse(req.body);
    db.transaction(() => {
      for (const [key, value] of Object.entries(values))
        run(
          "INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          key,
          value,
        );
    })();
    activity(req.user.id, "updated", "website settings");
    res.json(values);
  });
  app.get("/api/admin/projects", (_req, res) =>
    res.json(all("SELECT * FROM projects ORDER BY id DESC").map(projectView)),
  );
  for (const method of ["post", "put"])
    app[method](
      `/api/admin/projects${method === "put" ? "/:id" : ""}`,
      (req, res) => {
        if (method === "put") exists("projects", req.params.id);
        const { dueDate, members, ...value } = projectSchema.parse(req.body);
        const record = {
          ...value,
          progress: value.status === "Completed" ? 100 : value.progress,
          due_date: dueDate,
          members: JSON.stringify(members),
        };
        const id =
          method === "post" ? insert("projects", record) : req.params.id;
        if (method === "put") update("projects", id, record);
        activity(req.user.id, "saved a project", value.name);
        res.json(projectView(exists("projects", id)));
      },
    );
  app.delete("/api/admin/projects/:id", (req, res) => {
    exists("projects", req.params.id);
    run("DELETE FROM projects WHERE id=?", req.params.id);
    res.json({ success: true });
  });
}
