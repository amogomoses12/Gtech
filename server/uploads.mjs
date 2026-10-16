import multer from "multer";
import { randomUUID } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";
import { all, one, run, activity } from "./db.mjs";
import { hasCourseAccess, HttpError, requireAdmin } from "./security.mjs";

const allowed = {
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploads,
    filename: (_req, file, cb) =>
      cb(
        null,
        `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: config.maxUpload, files: 1, fields: 3, parts: 4 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowed[extension] || allowed[extension] !== file.mimetype)
      return cb(
        new HttpError(400, "Upload a PDF, MP4, WebM, JPG, or PNG file."),
      );
    cb(null, true);
  },
});

async function matchesSignature(file) {
  const handle = await open(file.path, "r");
  const buffer = Buffer.alloc(32);
  try {
    await handle.read(buffer, 0, 32, 0);
  } finally {
    await handle.close();
  }
  if (file.mimetype === "application/pdf")
    return buffer.subarray(0, 5).toString() === "%PDF-";
  if (file.mimetype === "video/mp4")
    return buffer.subarray(4, 8).toString() === "ftyp";
  if (file.mimetype === "video/webm")
    return buffer.subarray(0, 4).toString("hex") === "1a45dfa3";
  if (file.mimetype === "image/jpeg")
    return buffer.subarray(0, 3).toString("hex") === "ffd8ff";
  if (file.mimetype === "image/png")
    return buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  return false;
}

export function validateFile(id, type) {
  if (!id) return;
  const file = one("SELECT * FROM files WHERE id=?", id);
  if (
    !file ||
    (type === "video"
      ? !file.mime.startsWith("video/")
      : file.mime.startsWith("video/"))
  )
    throw new HttpError(
      400,
      `Choose an existing ${type === "video" ? "video" : "document or image"} file.`,
    );
}

export function uploadRoutes(app) {
  app.post(
    "/api/admin/uploads",
    requireAdmin,
    upload.single("file"),
    async (req, res) => {
      if (!req.file) throw new HttpError(400, "Choose a file to upload.");
      try {
        if (!(await matchesSignature(req.file)))
          throw new HttpError(
            400,
            "The file contents do not match its declared type.",
          );
        const id = randomUUID();
        run(
          "INSERT INTO files(id,stored_name,original_name,mime,size,owner_id) VALUES (?,?,?,?,?,?)",
          id,
          req.file.filename,
          path.basename(req.file.originalname).slice(0, 180),
          req.file.mimetype,
          req.file.size,
          req.user.id,
        );
        activity(
          req.user.id,
          "uploaded",
          path.basename(req.file.originalname).slice(0, 180),
        );
        res
          .status(201)
          .json(
            one(
              "SELECT id,original_name,mime,size,created_at FROM files WHERE id=?",
              id,
            ),
          );
      } catch (error) {
        await unlink(req.file.path).catch(() => {});
        throw error;
      }
    },
  );
  app.get("/api/admin/uploads", requireAdmin, (_req, res) =>
    res.json(
      all(
        "SELECT id,original_name,mime,size,created_at FROM files ORDER BY created_at DESC",
      ),
    ),
  );
  app.delete("/api/admin/uploads/:id", requireAdmin, async (req, res) => {
    const file = one("SELECT * FROM files WHERE id=?", req.params.id);
    if (!file) throw new HttpError(404, "File not found.");
    if (
      one(
        "SELECT 1 FROM lessons WHERE video_file_id=? OR document_file_id=?",
        file.id,
        file.id,
      ) ||
      one("SELECT 1 FROM resources WHERE file_id=?", file.id)
    )
      throw new HttpError(
        409,
        "Remove this file from its lesson or material before deleting it.",
      );
    await unlink(path.join(config.uploads, file.stored_name)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    run("DELETE FROM files WHERE id=?", file.id);
    res.json({ success: true });
  });
  app.get("/api/files/:id", (req, res) => {
    const file = one("SELECT * FROM files WHERE id=?", req.params.id);
    if (!file) throw new HttpError(404, "File not found.");
    let accessible = req.user?.role === "admin";
    if (!accessible) {
      const lessons = all(
        "SELECT l.course_id,l.preview,c.published FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.video_file_id=? OR l.document_file_id=?",
        file.id,
        file.id,
      );
      const resources = all(
        "SELECT r.course_id,c.published AS course_published FROM resources r LEFT JOIN courses c ON c.id=r.course_id WHERE r.published=1 AND r.file_id=?",
        file.id,
      );
      accessible =
        lessons.some(
          (lesson) =>
            (lesson.published && lesson.preview) ||
            hasCourseAccess(req.user, lesson.course_id),
        ) ||
        resources.some(
          (resource) =>
            !resource.course_id ||
            hasCourseAccess(req.user, resource.course_id),
        );
    }
    if (!accessible)
      throw new HttpError(
        req.user ? 403 : 401,
        "Enroll in this course to access the file.",
      );
    res.set("Content-Type", file.mime);
    res.set("Cache-Control", "private, no-store");
    res.set(
      "Content-Disposition",
      `${req.query.download === "1" ? "attachment" : "inline"}; filename="${file.original_name.replace(/[^a-zA-Z0-9._ -]/g, "_")}"`,
    );
    res.sendFile(path.join(config.uploads, file.stored_name));
  });
}
