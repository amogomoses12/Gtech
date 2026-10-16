import { z } from "zod";

const text = (max = 200) => z.string().trim().min(1).max(max);
export const subjects = [
  "Mathematics",
  "Physics",
  "Technology",
  "Scholarships",
];
const subject = z.enum(subjects);
const fileId = z.string().uuid().nullable().optional().default(null);
const url = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .max(2000)
      .refine((value) => value.startsWith("https://"), "Use an HTTPS link."),
  ])
  .default("");
export const credentials = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
});
export const registration = credentials.extend({ name: text(80) });
export const courseSchema = z.object({
  title: text(120),
  subject,
  summary: text(300),
  description: z.string().max(20000).default(""),
  image: z.enum([
    "/images/mathematics.jpg",
    "/images/physics.jpg",
    "/images/scholarships.jpg",
    "/images/technology.jpg",
  ]),
  price_cents: z.number().int().min(0).max(10000000),
  level: z.enum(["Beginner", "Intermediate", "Advanced", "All levels"]),
  instructor: text(100),
  duration: text(80),
  published: z.boolean(),
});
export const lessonSchema = z
  .object({
    title: text(160),
    content: z.string().max(60000).default(""),
    kind: z.enum(["reading", "video"]),
    video_url: url.refine(
      (value) =>
        !value ||
        /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[A-Za-z0-9_?=&/-]+$/.test(
          value,
        ),
      "Use a YouTube or Vimeo video link, or upload a video file.",
    ),
    video_file_id: fileId,
    document_file_id: fileId,
    duration: z.number().int().min(1).max(600),
    position: z.number().int().min(0).max(10000),
    preview: z.boolean(),
  })
  .refine(
    (value) => value.kind !== "video" || value.video_file_id || value.video_url,
    "A video lesson needs a video file or video link.",
  );
export const resourceSchema = z
  .object({
    title: text(160),
    description: text(500),
    subject,
    kind: z.enum([
      "Study guide",
      "Worksheet",
      "Scholarship guide",
      "Reading notes",
    ]),
    content: z.string().max(60000).default(""),
    file_id: fileId,
    course_id: z.number().int().positive().nullable().default(null),
    external_url: url,
    published: z.boolean(),
  })
  .refine(
    (value) => value.content.trim() || value.file_id || value.external_url,
    "Add reading content, a file, or an external link.",
  );
export const questionSchema = z
  .object({
    prompt: text(1500),
    options: z.array(text(500)).min(2).max(6),
    correct_index: z.number().int().min(0).max(5),
    explanation: text(3000),
  })
  .refine(
    (value) => value.correct_index < value.options.length,
    "The correct answer must be one of the options.",
  );
export const quizSchema = z.object({
  title: text(160),
  subject,
  description: text(500),
  duration: z.number().int().min(1).max(180),
  published: z.boolean(),
  questions: z.array(questionSchema).min(1).max(50),
});
export const projectSchema = z.object({
  name: text(100),
  category: text(100),
  status: z.enum(["Planning", "In progress", "In review", "Completed"]),
  progress: z.number().int().min(0).max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budget: z.number().min(0).max(100000000),
  description: z.string().max(5000),
  members: z.array(z.number().int().positive()).max(50),
});
export const messageSchema = z.object({
  name: text(80),
  email: z.string().trim().email().max(200),
  subject: text(160),
  message: text(5000),
});
export const siteSettingsSchema = z.object({
  site_name: text(60),
  support_email: z.string().email().max(200),
  tagline: text(200),
});
