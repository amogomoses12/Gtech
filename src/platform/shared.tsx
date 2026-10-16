import {
  ArrowRight,
  BookOpen,
  Clock3,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Course } from "./types";
import { money } from "./types";

export function Loading({
  text = "Getting everything ready...",
}: {
  text?: string;
}) {
  return (
    <div className="content-loading" role="status">
      <LoaderCircle size={25} className="spin" />
      <p>{text}</p>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="content-error" role="alert">
      <h3>Something needs a little attention.</h3>
      <p>{message}</p>
      {retry && (
        <button className="site-button secondary" onClick={retry}>
          Try again <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
export function FormError({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function SubmitButton({
  busy,
  children,
  className = "site-button primary",
}: {
  busy: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" className={className} disabled={busy}>
      {busy ? (
        <>
          <LoaderCircle size={16} className="spin" />
          Please wait...
        </>
      ) : (
        children
      )}
    </button>
  );
}
export function Empty({
  title,
  text,
  to,
  action,
}: {
  title: string;
  text: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="learning-empty">
      <BookOpen size={30} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{text}</p>
      {to && (
        <Link className="site-button primary" to={to}>
          {action || "Explore courses"}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Prose({ content }: { content: string }) {
  return (
    <div className="learning-prose">
      {content
        .split(/\n\n+/)
        .map((block, i) =>
          block.startsWith("## ") ? (
            <h3 key={i}>{block.slice(3)}</h3>
          ) : block.startsWith("# ") ? (
            <h2 key={i}>{block.slice(2)}</h2>
          ) : (
            <p key={i}>{block}</p>
          ),
        )}
    </div>
  );
}
export function CourseTile({ course }: { course: Course }) {
  return (
    <Link to={`/courses/${course.slug}`} className="course-tile">
      <div className="course-tile-image">
        <img src={course.image} alt="" loading="lazy" />
        <span className="course-image-arrow">
          <ArrowRight size={21} />
        </span>
      </div>
      <div className="course-tile-content">
        <div className="course-tile-top">
          <span className={`subject-text ${course.subject.toLowerCase()}`}>
            {course.subject}
          </span>
          <span>{course.level}</span>
        </div>
        <h3>{course.title}</h3>
        <p>{course.summary}</p>
        <div className="course-tile-bottom">
          <span>
            <BookOpen size={13} />
            {course.lesson_count} lessons
            <span className="tiny-divider" />
            <Clock3 size={13} />
            Self-paced
          </span>
          <strong>
            {course.price_cents ? money(course.price_cents) : "Free"}
          </strong>
        </div>
      </div>
    </Link>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "What would you like to learn?",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="learning-search">
      <Search size={19} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  text,
  link,
  linkText,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <div className="public-section-heading">
      <div>
        {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {link && (
        <Link to={link} className="editorial-link">
          {linkText || "Explore more"} <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="learning-page-intro">
      <div className="public-container">
        {eyebrow && (
          <span className="section-eyebrow">
            <Sparkles size={13} />
            {eyebrow}
          </span>
        )}
        <h1>{title}</h1>
        <p>{text}</p>
        {children}
      </div>
    </header>
  );
}
