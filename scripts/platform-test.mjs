import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// A separate database and upload directory keep browser tests out of your real workspace.
const temporary = await mkdtemp(path.join(tmpdir(), "gtech-browser-"));
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = path.join(temporary, "browser.sqlite");
process.env.UPLOAD_DIR = path.join(temporary, "uploads");
process.env.STRIPE_SECRET_KEY = "";
process.env.STRIPE_WEBHOOK_SECRET = "";
process.env.ENABLE_DEV_CHECKOUT = "true";
const { createApp } = await import("../server/index.mjs");
const { db, run, one } = await import("../server/db.mjs");
const { hashPassword } = await import("../server/security.mjs");
const password = "Browser-Test-Password-192!";
run(
  "INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,'admin')",
  "Alex Morgan",
  "admin@browser.example",
  await hashPassword(password),
);
const server = await new Promise((resolve) => {
  const instance = createApp().listen(0, "127.0.0.1", () => resolve(instance));
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const admin = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
});
const learner = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
});
const errors = [];
for (const page of [admin, learner])
  page.on("pageerror", (error) => errors.push(error.message));
const pass = (message) => console.log(`PASS: ${message}`);
const visit = async (page, route) => {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
};
const closeDialog = async (page) =>
  page.getByRole("button", { name: "Close dialog", exact: true }).click();
await mkdir("test-results", { recursive: true });

try {
  await visit(learner, "/");
  assert.match(await learner.locator("h1").innerText(), /Gtech/);
  assert.equal(await learner.locator(".course-tile").count(), 3);
  await learner.getByRole("tab", { name: "Physics", exact: true }).click();
  assert.equal(await learner.locator(".course-tile").count(), 2);
  await learner.screenshot({
    path: "test-results/platform-home.png",
    fullPage: true,
  });
  pass("Public homepage, images, and course discovery");

  await visit(admin, "/login");
  await admin
    .getByLabel("Email address", { exact: true })
    .fill("admin@browser.example");
  await admin.getByLabel("Password", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Sign in", exact: true }).click();
  await admin.waitForURL("**/admin");
  await admin.getByText("Learning in motion", { exact: true }).waitFor();
  await admin.screenshot({
    path: "test-results/platform-admin.png",
    fullPage: true,
  });
  pass("Authenticated Option A admin dashboard loads real data");

  await visit(admin, "/admin/uploads");
  await admin
    .locator(".admin-media-upload input")
    .setInputFiles("scripts/fixtures/lesson-guide.pdf");
  await admin.getByText("lesson-guide.pdf", { exact: true }).first().waitFor();
  await admin
    .locator(".admin-media-upload input")
    .setInputFiles("scripts/fixtures/sample-video.mp4");
  await admin.getByText("sample-video.mp4", { exact: true }).first().waitFor();
  assert.equal(one("SELECT COUNT(*) AS n FROM files").n, 2);
  pass("Real PDF and video uploads reach private persistent storage");

  await visit(admin, "/admin/courses");
  await admin
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await admin
    .getByLabel("Course title", { exact: true })
    .fill("Browser learning course");
  await admin.getByLabel("Subject", { exact: true }).selectOption("Physics");
  await admin
    .getByLabel("Short description", { exact: true })
    .fill("A complete browser-tested learning experience.");
  await admin
    .getByLabel("Full course description", { exact: true })
    .fill("Learn through video, readings, and a downloadable handout.");
  await admin.getByLabel("Price (USD)").fill("12");
  await admin.getByLabel("Publish this course").check();
  await admin
    .getByRole("dialog")
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await admin.getByRole("dialog").waitFor({ state: "hidden" });
  const row = admin
    .locator("tbody tr")
    .filter({ hasText: "Browser learning course" });
  await row.getByRole("button", { name: "Lessons", exact: true }).click();
  await admin.getByRole("button", { name: "Add lesson", exact: true }).click();
  await admin
    .getByLabel("Lesson title", { exact: true })
    .fill("A video that plays");
  await admin.getByLabel("Lesson type", { exact: true }).selectOption("video");
  await admin
    .getByLabel("Video file", { exact: true })
    .selectOption({ label: "sample-video.mp4" });
  await admin
    .getByLabel("Lesson content", { exact: true })
    .fill(
      "# A complete learning experience\n\nYour video and materials are ready.",
    );
  await admin
    .getByLabel("Lesson handout (optional)", { exact: true })
    .selectOption({ label: "lesson-guide.pdf" });
  await admin.getByRole("button", { name: "Save lesson", exact: true }).click();
  await admin.getByText("A video that plays", { exact: true }).waitFor();
  await closeDialog(admin);
  const course = one(
    "SELECT * FROM courses WHERE title='Browser learning course'",
  );
  const lesson = one("SELECT * FROM lessons WHERE course_id=?", course.id);
  assert.equal(lesson.preview, 0);
  pass(
    "Course creation, publishing, video lesson authoring, and handout attachment",
  );

  await visit(admin, "/admin/materials");
  await admin
    .getByRole("button", { name: "Add material", exact: true })
    .click();
  await admin
    .getByLabel("Material title", { exact: true })
    .fill("Browser course companion");
  await admin
    .getByLabel("Description", { exact: true })
    .fill("A protected guide for the course.");
  await admin
    .getByLabel("Reading content", { exact: true })
    .fill("# Private reading\n\nAvailable after enrollment.");
  await admin
    .getByLabel("Material access", { exact: true })
    .selectOption(String(course.id));
  await admin
    .getByLabel("Attached document (optional)", { exact: true })
    .selectOption({ label: "lesson-guide.pdf" });
  await admin.getByLabel("Publish this material").check();
  await admin
    .getByRole("button", { name: "Save material", exact: true })
    .click();
  await admin.getByRole("dialog").waitFor({ state: "hidden" });
  pass("Database-backed material creation with enrolled-only access");

  await visit(learner, `/courses/${course.slug}`);
  assert.equal(
    await learner
      .getByRole("link", { name: "Preview the first lesson" })
      .count(),
    0,
  );
  await learner
    .getByRole("button", { name: "Get this course", exact: true })
    .click();
  await learner.getByLabel("Your name", { exact: true }).fill("Taylor Learner");
  await learner
    .getByLabel("Email address", { exact: true })
    .fill("taylor@browser.example");
  await learner.getByLabel("Password", { exact: true }).fill(password);
  await learner.getByRole("checkbox").check();
  await learner
    .getByRole("button", { name: "Create my account", exact: true })
    .click();
  await learner.waitForURL(`**/courses/${course.slug}`);
  await learner
    .getByRole("button", { name: "Get this course", exact: true })
    .click();
  await learner.waitForURL("**/checkout/development/*");
  await learner
    .getByRole("button", { name: "Complete test purchase", exact: true })
    .click();
  await learner
    .getByRole("heading", { name: "Good things are ahead.", exact: true })
    .waitFor();
  await learner
    .getByRole("link", { name: "Start learning", exact: true })
    .click();
  await learner
    .getByRole("button", { name: "Continue learning", exact: true })
    .click();
  await learner.locator("video").waitFor();
  await learner.locator("video").evaluate(async (video) => {
    await new Promise((resolve, reject) => {
      if (video.readyState >= 1) return resolve();
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener(
        "error",
        () => reject(new Error("Uploaded video did not load.")),
        { once: true },
      );
      setTimeout(() => reject(new Error("Video metadata timeout")), 10000);
    });
  });
  assert.ok(
    await learner.locator("video").evaluate((video) => video.duration > 0),
  );
  await learner.locator("video").evaluate(async (video) => {
    video.muted = true;
    await video.play();
  });
  await learner.waitForFunction(
    () => document.querySelector("video")?.currentTime > 0.15,
  );
  await learner.locator("video").evaluate((video) => video.pause());
  const downloadPromise = learner.waitForEvent("download");
  await learner.getByRole("link", { name: /Your lesson companion/ }).click();
  assert.equal((await downloadPromise).suggestedFilename(), "lesson-guide.pdf");
  await learner
    .getByRole("button", { name: "Mark as complete", exact: true })
    .click();
  await learner
    .getByRole("button", { name: "Lesson completed", exact: true })
    .waitFor();
  await learner.reload({ waitUntil: "networkidle" });
  assert.equal(
    await learner
      .getByRole("button", { name: "Lesson completed", exact: true })
      .count(),
    1,
  );
  pass(
    "Registration, paid enrollment, actual video playback, protected PDF download, and persistent progress",
  );

  await visit(learner, "/courses/algebra-foundations");
  await learner
    .getByRole("button", { name: "Start learning for free", exact: true })
    .click();
  await learner
    .getByRole("heading", { name: "Making sense of algebra", exact: true })
    .waitFor();
  await learner
    .getByRole("button", { name: "Mark as complete", exact: true })
    .click();
  await visit(learner, "/my-learning");
  assert.equal(await learner.locator(".enrolled-course").count(), 2);
  pass("Free enrollment and personalized learning library");

  await visit(learner, "/practice/1");
  const choices = [1, 1, 3, 2, 2];
  for (let index = 0; index < choices.length; index++) {
    await learner.locator(".answer-options label").nth(choices[index]).click();
    if (index < choices.length - 1)
      await learner
        .getByRole("button", { name: "Next question", exact: true })
        .click();
  }
  await learner
    .getByRole("button", { name: "See my results", exact: true })
    .click();
  await learner.waitForURL("**/practice/results/*");
  assert.equal(
    await learner.locator(".result-score strong").innerText(),
    "5/5",
  );
  assert.equal(await learner.locator(".review-item.correct").count(), 5);
  pass("Practice navigation, server scoring, and saved answer explanations");

  await visit(learner, "/contact");
  await learner
    .getByLabel("What's on your mind?", { exact: true })
    .fill("A browser-tested support request");
  await learner
    .getByLabel("Your message", { exact: true })
    .fill("The learning platform works from end to end.");
  await learner
    .getByRole("button", { name: "Send your message", exact: true })
    .click();
  await learner
    .getByRole("heading", {
      name: "Your message is in good hands.",
      exact: true,
    })
    .waitFor();
  await visit(admin, "/admin/messages");
  await admin
    .getByRole("button", {
      name: "A browser-tested support request",
      exact: true,
    })
    .click();
  await admin
    .getByLabel("Message status", { exact: true })
    .selectOption("resolved");
  await admin.waitForTimeout(300);
  await closeDialog(admin);
  assert.equal(
    one("SELECT status FROM messages ORDER BY id DESC LIMIT 1").status,
    "resolved",
  );
  pass("Contact form reaches the admin inbox and message status persists");

  await visit(admin, "/admin/reports");
  const reportPromise = admin.waitForEvent("download");
  await admin
    .locator(".report-row")
    .first()
    .getByRole("button", { name: "Download", exact: true })
    .click();
  assert.match((await reportPromise).suggestedFilename(), /\.csv$/);
  await visit(admin, "/admin/orders");
  assert.match(await admin.locator("tbody").innerText(), /Test paid/i);
  await visit(admin, "/admin");
  assert.equal(await admin.locator(".metric-value").first().innerText(), "$0");
  pass("Admin transactions, exports, and revenue exclude test money");

  const publicRoutes = [
    "/",
    "/learn",
    "/materials",
    "/scholarships",
    "/practice",
    "/about",
    "/contact",
    "/my-learning",
    "/account",
    `/courses/${course.slug}`,
    `/lessons/${lesson.id}`,
  ];
  const adminRoutes = [
    "/admin",
    "/admin/courses",
    "/admin/materials",
    "/admin/practice",
    "/admin/scholarships",
    "/admin/learners",
    "/admin/orders",
    "/admin/uploads",
    "/admin/projects",
    "/admin/reports",
    "/admin/messages",
    "/admin/settings",
  ];
  for (const width of [1440, 768, 390]) {
    for (const [page, routes] of [
      [learner, publicRoutes],
      [admin, adminRoutes],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await visit(page, route);
        const dimensions = await page.evaluate(() => ({
          actual: document.documentElement.scrollWidth,
          expected: innerWidth,
        }));
        assert.ok(
          dimensions.actual <= dimensions.expected + 1,
          `${route} overflows at ${width}: ${dimensions.actual}`,
        );
      }
    }
  }
  await visit(learner, "/");
  await learner.screenshot({
    path: "test-results/platform-mobile.png",
    fullPage: true,
  });
  await learner.getByRole("button", { name: "Open menu", exact: true }).click();
  await learner
    .locator(".site-nav")
    .getByRole("link", { name: "Practice", exact: true })
    .click();
  await learner.locator(".site-nav.is-open").waitFor({ state: "hidden" });
  assert.equal(await learner.locator(".site-nav.is-open").count(), 0);
  await admin
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await admin
    .locator(".sidebar")
    .getByRole("link", { name: "Courses", exact: true })
    .click();
  await admin.locator(".sidebar-open").waitFor({ state: "hidden" });
  assert.equal(await admin.locator(".sidebar-open").count(), 0);
  assert.deepEqual(errors, []);
  pass(
    "All public and admin views fit desktop, tablet, and mobile; navigation works without runtime errors",
  );
  console.log("\nAll Gtech full-stack browser workflows passed.");
} catch (error) {
  await admin.screenshot({
    path: "test-results/admin-failure.png",
    fullPage: true,
  });
  await learner.screenshot({
    path: "test-results/learner-failure.png",
    fullPage: true,
  });
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  db.close();
  await rm(temporary, { recursive: true, force: true });
}
