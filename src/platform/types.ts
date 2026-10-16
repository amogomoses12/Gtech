export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "student";
  status: "active" | "suspended";
  created_at: string;
  enrollments?: number;
  attempts?: number;
}
export interface PaymentConfig {
  provider: "stripe" | "development" | "unavailable";
  mode: "test" | "live";
  currency: string;
}
export interface SiteConfig {
  site_name: string;
  tagline: string;
  support_email: string;
  payment: PaymentConfig;
  max_upload_mb: number;
}
export interface Course {
  id: number;
  slug: string;
  title: string;
  subject: string;
  summary: string;
  description: string;
  image: string;
  price_cents: number;
  level: string;
  instructor: string;
  duration: string;
  published: boolean;
  lesson_count: number;
  enrollment_count?: number;
  enrolled?: boolean;
  completed_lessons?: number;
  lessons?: Lesson[];
  resources?: Material[];
  next_lesson_id?: number;
  created_at: string;
  updated_at: string;
}
export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  kind: "reading" | "video";
  duration: number;
  position: number;
  preview: boolean;
  locked?: boolean;
  completed?: boolean;
  content?: string;
  video_url?: string;
  video_file_id?: string | null;
  document_file_id?: string | null;
  course?: Course;
  lessons?: Lesson[];
}
export interface Material {
  id: number;
  title: string;
  description: string;
  subject: string;
  kind: string;
  content?: string;
  file_id?: string | null;
  course_id: number | null;
  external_url?: string;
  published: boolean;
  locked?: boolean;
  has_file?: boolean;
  filename?: string;
  course_title?: string;
  course_slug?: string;
  created_at: string;
}
export interface Question {
  id: number;
  prompt: string;
  options: string[];
  correct_index?: number;
  explanation?: string;
}
export interface Quiz {
  id: number;
  title: string;
  subject: string;
  description: string;
  duration: number;
  published: boolean;
  question_count: number;
  questions?: Question[];
}
export interface Review {
  id: number;
  prompt: string;
  options: string[];
  selected: number;
  correct_index: number;
  correct: boolean;
  explanation: string;
}
export interface Attempt {
  id: number;
  quiz_id: number;
  quiz_title: string;
  score: number;
  total: number;
  review?: Review[];
  created_at: string;
}
export interface Order {
  id: string;
  user_id: number;
  course_id: number;
  course_title: string;
  amount_cents: number;
  currency: string;
  status: string;
  provider: string;
  payment_mode: string;
  created_at: string;
  paid_at: string | null;
  slug: string;
  name?: string;
  email?: string;
}
export interface MyLearning {
  courses: Course[];
  attempts: Attempt[];
  orders: Order[];
}
export interface Upload {
  id: string;
  original_name: string;
  mime: string;
  size: number;
  created_at: string;
}
export interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}
export interface Overview {
  revenue: number;
  learners: number;
  published_courses: number;
  total_courses: number;
  enrollments: number;
  materials: number;
  test_orders: number;
  new_messages: number;
  series: { date: string; revenue: number; enrollments: number }[];
  subjects: { subject: string; count: number }[];
  courses: Course[];
  activity: {
    id: number;
    name: string | null;
    action: string;
    subject: string;
    created_at: string;
  }[];
  payment: PaymentConfig;
}
export const subjects = [
  "Mathematics",
  "Physics",
  "Technology",
  "Scholarships",
];
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
export const dateLabel = (date: string) =>
  new Date(
    date.includes("T") ? date : `${date.replace(" ", "T")}Z`,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
