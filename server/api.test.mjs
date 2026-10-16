import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const temp = await mkdtemp(path.join(tmpdir(), "gtech-api-"));
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = path.join(temp, "test.sqlite");
process.env.UPLOAD_DIR = path.join(temp, "uploads");
process.env.STRIPE_SECRET_KEY = "";
process.env.STRIPE_WEBHOOK_SECRET = "";
process.env.ENABLE_DEV_CHECKOUT = "true";
const { createApp } = await import("./index.mjs");
const { db, one, run } = await import("./db.mjs");
const { hashPassword } = await import("./security.mjs");
const { fulfillSession } = await import("./payments.mjs");
run(
  "INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,'admin')",
  "Test Administrator",
  "admin@test.example",
  await hashPassword("Secure-Admin-Test-194!"),
);
const server = await new Promise((resolve) => {
  const instance = createApp().listen(0, "127.0.0.1", () => resolve(instance));
});
const base = `http://127.0.0.1:${server.address().port}/api`;
const sessions = {};
async function request(
  route,
  { method = "GET", body, user, headers = {}, raw = false } = {},
) {
  const session = sessions[user];
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      "X-Gtech-Request": "1",
      ...(session
        ? { Cookie: session.cookie, "X-CSRF-Token": session.csrf }
        : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const data = raw ? await response.text() : await response.json();
  if (data?.csrfToken)
    sessions[user || data.user.email] = {
      cookie:
        response.headers.get("set-cookie")?.split(";")[0] || session?.cookie,
      csrf: data.csrfToken,
    };
  return { response, data };
}
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  await rm(temp, { recursive: true, force: true });
});

let studentId, courseId, lessonId, materialId, fileId, orderId;

test("persistent SQLite schema and starter content are ready", async () => {
  const { response, data } = await request("/health");
  assert.equal(response.status, 200);
  assert.equal(data.database, "connected");
  const courses = (await request("/courses")).data;
  assert.equal(courses.length, 6);
  assert.ok(courses.some((course) => course.price_cents === 0));
  assert.ok(courses.some((course) => course.price_cents > 0));
  assert.equal(one("SELECT COUNT(*) AS n FROM schema_migrations").n, 1);
});
test("registration hashes passwords and cannot assign administrator privileges", async () => {
  const result = await request("/auth/register", {
    method: "POST",
    user: "student",
    body: {
      name: "Test Learner",
      email: "learner@test.example",
      password: "Secure-Learner-Test-123!",
      role: "admin",
    },
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.data.user.role, "student");
  assert.ok(!result.data.user.password_hash);
  assert.match(result.response.headers.get("set-cookie"), /HttpOnly/);
  studentId = result.data.user.id;
  assert.notEqual(
    one("SELECT password_hash FROM users WHERE id=?", studentId).password_hash,
    "Secure-Learner-Test-123!",
  );
  assert.equal(
    (await request("/admin/courses", { user: "student" })).response.status,
    403,
  );
  assert.equal((await request("/admin/courses")).response.status, 401);
});
test("session cookies, CSRF verification, and origin protections work", async () => {
  assert.equal(
    (await request("/auth/me", { user: "student" })).data.user.name,
    "Test Learner",
  );
  assert.equal(
    (
      await request("/account", {
        method: "PATCH",
        user: "student",
        body: { name: "Changed" },
        headers: { "X-CSRF-Token": "wrong" },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await request("/account", {
        method: "PATCH",
        user: "student",
        body: { name: "Changed" },
        headers: { Origin: "https://attacker.invalid" },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await request("/account", {
        method: "PATCH",
        user: "student",
        body: { name: "Changed" },
        headers: { "X-Gtech-Request": "" },
      })
    ).response.status,
    403,
  );
});
test("free courses enroll and progress is stored without duplicate records", async () => {
  const course = (
    await request("/courses/algebra-foundations", { user: "student" })
  ).data;
  assert.ok(course.lessons[1].locked);
  assert.ok(!course.lessons[1].content);
  assert.equal(
    (await request(`/lessons/${course.lessons[1].id}`)).response.status,
    401,
  );
  assert.equal(
    (
      await request(`/courses/${course.id}/enroll`, {
        method: "POST",
        user: "student",
      })
    ).response.status,
    200,
  );
  assert.equal(
    (await request(`/lessons/${course.lessons[1].id}`, { user: "student" }))
      .response.status,
    200,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request(`/lessons/${course.lessons[0].id}/progress`, {
          method: "POST",
          user: "student",
          body: { completed: true },
        })
      ).response.status,
      200,
    );
  const learning = (await request("/my-learning", { user: "student" })).data;
  assert.equal(learning.courses[0].completed_lessons, 1);
});
test("practice answers are hidden until server-side grading and results are owned", async () => {
  const quiz = (await request("/quizzes/1")).data;
  assert.ok(!("correct_index" in quiz.questions[0]));
  assert.ok(!("explanation" in quiz.questions[0]));
  const answers = quiz.questions.map((question) => ({
    question_id: question.id,
    choice: 0,
  }));
  const result = await request("/quizzes/1/attempts", {
    method: "POST",
    user: "student",
    body: { answers },
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.data.total, 5);
  assert.equal(result.data.score, 0);
  assert.ok(result.data.review[0].explanation);
  assert.equal(
    (
      await request("/quizzes/1/attempts", {
        method: "POST",
        user: "student",
        body: { answers: answers.slice(1) },
      })
    ).response.status,
    400,
  );
  assert.equal(
    (await request(`/attempts/${result.data.id}`)).response.status,
    401,
  );
});
test("administrator signs in with a real password and creates a published paid course", async () => {
  assert.equal(
    (
      await request("/auth/login", {
        method: "POST",
        user: "bad",
        body: { email: "admin@test.example", password: "incorrect-password" },
      })
    ).response.status,
    401,
  );
  const login = await request("/auth/login", {
    method: "POST",
    user: "admin",
    body: { email: "admin@test.example", password: "Secure-Admin-Test-194!" },
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.user.role, "admin");
  const course = await request("/admin/courses", {
    method: "POST",
    user: "admin",
    body: {
      title: "A private course for testing",
      subject: "Physics",
      summary: "A real course stored in the test database.",
      description: "Paid content.",
      image: "/images/physics.jpg",
      price_cents: 5900,
      level: "Beginner",
      instructor: "Gtech Test",
      duration: "1 lesson",
      published: true,
    },
  });
  assert.equal(course.response.status, 201);
  courseId = course.data.id;
  assert.equal(
    one("SELECT price_cents FROM courses WHERE id=?", courseId).price_cents,
    5900,
  );
});
test("uploads require admin, validate signatures, and remain private until authorized", async () => {
  const makeFile = (
    content = "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF",
  ) => {
    const form = new FormData();
    form.append(
      "file",
      new Blob([content], { type: "application/pdf" }),
      "lesson.pdf",
    );
    return form;
  };
  assert.equal(
    (
      await request("/admin/uploads", {
        method: "POST",
        user: "student",
        body: makeFile(),
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await request("/admin/uploads", {
        method: "POST",
        user: "admin",
        body: makeFile("not a PDF"),
      })
    ).response.status,
    400,
  );
  const file = await request("/admin/uploads", {
    method: "POST",
    user: "admin",
    body: makeFile(),
  });
  assert.equal(file.response.status, 201);
  fileId = file.data.id;
  assert.equal(
    (await request(`/files/${fileId}`, { raw: true })).response.status,
    401,
  );
  assert.equal(
    (await request(`/files/${fileId}`, { user: "admin", raw: true })).response
      .status,
    200,
  );
});
test("paid lesson text, documents, and material links cannot bypass enrollment", async () => {
  const lesson = await request(`/admin/courses/${courseId}/lessons`, {
    method: "POST",
    user: "admin",
    body: {
      title: "Protected lesson",
      content: "Secret paid course content.",
      kind: "reading",
      video_url: "",
      video_file_id: null,
      document_file_id: fileId,
      duration: 10,
      position: 0,
      preview: false,
    },
  });
  assert.equal(lesson.response.status, 201);
  lessonId = lesson.data.id;
  const material = await request("/admin/resources", {
    method: "POST",
    user: "admin",
    body: {
      title: "Protected guide",
      description: "Private course companion.",
      subject: "Physics",
      kind: "Study guide",
      content: "Protected guide contents.",
      file_id: fileId,
      course_id: courseId,
      external_url: "https://example.com/private-guide",
      published: true,
    },
  });
  assert.equal(material.response.status, 201);
  materialId = material.data.id;
  const resource = (
    await request(`/resources/${materialId}`, { user: "student" })
  ).data;
  assert.equal(resource.locked, true);
  assert.equal(resource.content, undefined);
  assert.equal(resource.file_id, undefined);
  assert.equal(resource.external_url, undefined);
  assert.equal(
    (await request(`/lessons/${lessonId}`, { user: "student" })).response
      .status,
    403,
  );
  assert.equal(
    (await request(`/files/${fileId}`, { user: "student", raw: true })).response
      .status,
    403,
  );
  assert.equal(
    (
      await request(`/courses/${courseId}/enroll`, {
        method: "POST",
        user: "student",
      })
    ).response.status,
    402,
  );
});
test("checkout uses database price, not client input, and test payments fulfill once", async () => {
  const checkout = await request("/checkout", {
    method: "POST",
    user: "student",
    body: { course_id: courseId, amount_cents: 1, payment_mode: "live" },
  });
  assert.equal(checkout.response.status, 200);
  orderId = checkout.data.order_id;
  const order = (await request(`/orders/${orderId}`, { user: "student" })).data;
  assert.equal(order.amount_cents, 5900);
  assert.equal(order.status, "pending");
  assert.equal(order.payment_mode, "test");
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request(`/orders/${orderId}/development-pay`, {
          method: "POST",
          user: "student",
        })
      ).response.status,
      200,
    );
  assert.equal(
    one(
      "SELECT COUNT(*) AS n FROM enrollments WHERE user_id=? AND course_id=?",
      studentId,
      courseId,
    ).n,
    1,
  );
  assert.equal(
    (await request(`/orders/${orderId}`, { user: "student" })).data.status,
    "test_paid",
  );
  assert.equal(
    (await request("/admin/overview", { user: "admin" })).data.revenue,
    0,
  );
  assert.equal(
    (await request(`/lessons/${lessonId}`, { user: "student" })).data.content,
    "Secret paid course content.",
  );
  assert.match(
    (await request(`/files/${fileId}`, { user: "student", raw: true })).data,
    /%PDF/,
  );
  assert.equal(
    (await request(`/resources/${materialId}`, { user: "student" })).data
      .locked,
    false,
  );
});
test("one learner cannot read or complete another learner order", async () => {
  await request("/auth/register", {
    method: "POST",
    user: "other",
    body: {
      name: "Another Learner",
      email: "other@test.example",
      password: "Other-Secure-Password-123!",
    },
  });
  assert.equal(
    (await request(`/orders/${orderId}`, { user: "other" })).response.status,
    404,
  );
  assert.equal(
    (
      await request(`/orders/${orderId}/development-pay`, {
        method: "POST",
        user: "other",
      })
    ).response.status,
    404,
  );
  assert.equal(
    (await request(`/lessons/${lessonId}`, { user: "other" })).response.status,
    403,
  );
});
test("payment fulfillment validates verified session totals and is idempotent", async () => {
  run(
    "INSERT INTO orders(id,user_id,course_id,course_title,amount_cents,provider,payment_mode,stripe_session_id) VALUES (?,?,?,?,?,'stripe','test','cs_test_verified')",
    "verified-order",
    studentId,
    courseId,
    "Verification test",
    5900,
  );
  const session = {
    id: "cs_test_verified",
    payment_status: "paid",
    metadata: {
      orderId: "verified-order",
      userId: String(studentId),
      courseId: String(courseId),
    },
    amount_total: 1,
    currency: "usd",
    livemode: false,
    payment_intent: "pi_test_verified",
  };
  assert.throws(() => fulfillSession(session), /does not match/);
  assert.equal(
    one("SELECT status FROM orders WHERE id='verified-order'").status,
    "pending",
  );
  session.amount_total = 5900;
  fulfillSession(session);
  fulfillSession(session);
  assert.equal(
    one("SELECT status FROM orders WHERE id='verified-order'").status,
    "test_paid",
  );
  assert.equal(
    (
      await request("/webhooks/stripe", {
        method: "POST",
        body: { type: "checkout.session.completed" },
      })
    ).response.status,
    503,
  );
});
test("cancellation cannot fulfill a development order", async () => {
  const checkout = await request("/checkout", {
    method: "POST",
    user: "other",
    body: { course_id: courseId },
  });
  assert.equal(
    (
      await request(`/orders/${checkout.data.order_id}/cancel`, {
        method: "POST",
        user: "other",
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request(`/orders/${checkout.data.order_id}/development-pay`, {
        method: "POST",
        user: "other",
      })
    ).response.status,
    409,
  );
});
test("referenced media and enrolled courses cannot be deleted accidentally", async () => {
  assert.equal(
    (
      await request(`/admin/uploads/${fileId}`, {
        method: "DELETE",
        user: "admin",
      })
    ).response.status,
    409,
  );
  assert.equal(
    (
      await request(`/admin/courses/${courseId}`, {
        method: "DELETE",
        user: "admin",
      })
    ).response.status,
    409,
  );
});
test("practice authoring is validated and saved to the database", async () => {
  const value = {
    title: "A new test quiz",
    subject: "Mathematics",
    description: "Created by the integration suite.",
    duration: 5,
    published: true,
    questions: [
      {
        prompt: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correct_index: 1,
        explanation: "Two plus two equals four.",
      },
    ],
  };
  const created = await request("/admin/quizzes", {
    method: "POST",
    user: "admin",
    body: value,
  });
  assert.equal(created.response.status, 201);
  assert.equal(
    (await request(`/quizzes/${created.data.id}`)).data.questions.length,
    1,
  );
  value.questions[0].correct_index = 5;
  assert.equal(
    (
      await request("/admin/quizzes", {
        method: "POST",
        user: "admin",
        body: value,
      })
    ).response.status,
    400,
  );
});
test("support messages, settings, and workspace projects persist", async () => {
  const contact = await request("/contact", {
    method: "POST",
    user: "student",
    body: {
      name: "Test Learner",
      email: "learner@test.example",
      subject: "A question",
      message: "How do I keep learning?",
    },
  });
  assert.equal(contact.response.status, 201);
  const messages = (await request("/admin/messages", { user: "admin" })).data;
  assert.equal(messages[0].message, "How do I keep learning?");
  assert.equal(
    (
      await request(`/admin/messages/${messages[0].id}`, {
        method: "PATCH",
        user: "admin",
        body: { status: "resolved" },
      })
    ).response.status,
    200,
  );
  await request("/admin/settings", {
    method: "PUT",
    user: "admin",
    body: {
      site_name: "Gtech Test",
      support_email: "hello@test.example",
      tagline: "Tested and connected.",
    },
  });
  assert.equal((await request("/config")).data.site_name, "Gtech Test");
  const project = await request("/admin/projects", {
    method: "POST",
    user: "admin",
    body: {
      name: "Launch the academy",
      category: "Product development",
      status: "Planning",
      progress: 0,
      dueDate: "2027-01-01",
      budget: 1000,
      description: "Launch preparation.",
      members: [1],
    },
  });
  assert.equal(project.response.status, 200);
  assert.equal(
    (await request("/admin/projects", { user: "admin" })).data[0].name,
    "Launch the academy",
  );
});
test("suspending a learner revokes access without deleting learning records", async () => {
  await request(`/admin/learners/${studentId}`, {
    method: "PATCH",
    user: "admin",
    body: { status: "suspended" },
  });
  assert.equal(
    (await request("/my-learning", { user: "student" })).response.status,
    401,
  );
  assert.equal(
    (await request(`/files/${fileId}`, { user: "student", raw: true })).response
      .status,
    401,
  );
  assert.ok(
    one("SELECT COUNT(*) AS n FROM enrollments WHERE user_id=?", studentId).n >
      0,
  );
  assert.equal(
    (
      await request("/admin/learners/1", {
        method: "PATCH",
        user: "admin",
        body: { status: "suspended" },
      })
    ).response.status,
    403,
  );
});
test("password changes invalidate previous sessions and logout clears the session", async () => {
  const updated = await request("/account/password", {
    method: "POST",
    user: "other",
    body: {
      current_password: "Other-Secure-Password-123!",
      password: "Changed-Password-456!",
    },
  });
  assert.equal(updated.response.status, 200);
  assert.equal(
    (await request("/auth/logout", { method: "POST", user: "other" })).response
      .status,
    200,
  );
  assert.equal(
    (await request("/my-learning", { user: "other" })).response.status,
    401,
  );
});
