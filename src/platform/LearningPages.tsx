import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  LockKeyhole,
  Play,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth, useNotice, useResource } from "./context";
import { post } from "./api";
import type { Course, Lesson, Material } from "./types";
import { money, subjects } from "./types";
import {
  CourseTile,
  Empty,
  ErrorState,
  FormError,
  Loading,
  PageIntro,
  Prose,
  SearchInput,
} from "./shared";

export function Catalog() {
  const [params, setParams] = useSearchParams();
  const subject = params.get("subject") || "All subjects";
  const query = params.get("q") || "";
  const price = params.get("price") || "";
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy, { replace: true });
  };
  const { data, loading, error, refresh } = useResource<Course[]>(
    `/courses?${params.toString()}`,
  );
  return (
    <>
      <PageIntro
        eyebrow="THE GTECH LEARNING HUB"
        title="Find your next lightbulb moment."
        text="A new subject. A clearer understanding. A little more confidence."
      />
      <section className="public-section catalog-section">
        <div className="public-container">
          <div className="catalog-tools">
            <SearchInput
              value={query}
              onChange={(value) => update("q", value)}
            />
            <label className="catalog-price">
              Access
              <select
                aria-label="Course price"
                value={price}
                onChange={(event) => update("price", event.target.value)}
              >
                <option value="">All courses</option>
                <option value="free">Free courses</option>
                <option value="paid">Paid courses</option>
              </select>
            </label>
          </div>
          <div
            className="subject-tabs"
            role="tablist"
            aria-label="Course subject"
          >
            {["All subjects", ...subjects].map((item) => (
              <button
                role="tab"
                aria-selected={subject === item}
                key={item}
                className={subject === item ? "selected" : ""}
                onClick={() =>
                  update("subject", item === "All subjects" ? "" : item)
                }
              >
                {item}
              </button>
            ))}
          </div>
          <div className="catalog-result-label">
            <span>{data?.length || 0} courses to spark your curiosity</span>
            <span>Learn at your own pace</span>
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} retry={refresh} />
          ) : data?.length ? (
            <div className="course-grid">
              {data.map((course) => (
                <CourseTile key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Empty
              title="A different search might open a door."
              text="Try another keyword or subject. More learning is on the way."
            />
          )}
          <div className="catalog-bottom-note">
            <BookOpen size={18} />
            <p>
              Looking for something to read? Our study materials are a good
              place to start.
            </p>
            <Link to="/materials">
              Explore materials <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function CoursePage() {
  const { slug } = useParams();
  const { user, config } = useAuth();
  const {
    data: course,
    loading,
    error,
    refresh,
  } = useResource<Course>(`/courses/${slug}?viewer=${user?.id || 0}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState("Overview");
  const navigate = useNavigate();
  const notice = useNotice();
  useEffect(() => {
    setActionError("");
    setTab("Overview");
  }, [slug]);
  if (loading) return <Loading />;
  if (error || !course)
    return (
      <div className="public-container">
        <ErrorState message={error || "Course not found."} retry={refresh} />
      </div>
    );
  const unlocked = course.enrolled || user?.role === "admin";
  const firstLesson = course.lessons?.[0];
  const previewLesson = course.lessons?.find((lesson) => lesson.preview);
  const enroll = async () => {
    if (!user) {
      navigate(
        `/register?next=${encodeURIComponent(`/courses/${course.slug}`)}`,
      );
      return;
    }
    if (unlocked) {
      navigate(firstLesson ? `/lessons/${firstLesson.id}` : "/my-learning");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      if (!course.price_cents) {
        await post(`/courses/${course.id}/enroll`);
        notice("You are enrolled. Let the learning begin.");
        navigate(firstLesson ? `/lessons/${firstLesson.id}` : "/my-learning");
      } else {
        const result = await post<{ url: string }>("/checkout", {
          course_id: course.id,
        });
        if (result.url.startsWith("/")) navigate(result.url);
        else window.location.assign(result.url);
      }
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <section className="course-detail-hero">
        <div className="public-container">
          <Link className="back-link" to="/learn">
            <ArrowLeft size={15} />
            Back to the learning hub
          </Link>
          <div className="course-detail-layout">
            <div>
              <span className="section-eyebrow">
                {course.subject.toUpperCase()} / {course.level.toUpperCase()}
              </span>
              <h1>{course.title}</h1>
              <p>{course.summary}</p>
              <div className="course-detail-meta">
                <span>
                  <BookOpen size={16} />
                  {course.lesson_count} lessons
                </span>
                <span>
                  <Clock3 size={16} />
                  Self-paced
                </span>
                <span>By {course.instructor}</span>
              </div>
            </div>
            <img src={course.image} alt={`${course.subject} course`} />
          </div>
        </div>
      </section>
      <section className="public-section course-detail-body">
        <div className="public-container course-body-grid">
          <div className="course-main">
            <div
              className="subject-tabs"
              role="tablist"
              aria-label="Course details"
            >
              {["Overview", "Lessons", "Materials"].map((item) => (
                <button
                  key={item}
                  className={tab === item ? "selected" : ""}
                  role="tab"
                  aria-selected={tab === item}
                  onClick={() => setTab(item)}
                >
                  {item}
                  {item === "Lessons" && <span>{course.lesson_count}</span>}
                </button>
              ))}
            </div>
            {tab === "Overview" && (
              <>
                <h2>A little about this course.</h2>
                <Prose content={course.description} />
                <div className="course-learning-note">
                  <GraduationCap size={24} />
                  <div>
                    <h3>Learning that fits around your life.</h3>
                    <p>
                      Pick up where you left off. Read a little, practice a
                      little, and make it yours.
                    </p>
                  </div>
                </div>
              </>
            )}
            {tab === "Lessons" && (
              <>
                <h2>Your path, one lesson at a time.</h2>
                <div className="course-lesson-list">
                  {course.lessons?.map((lesson, index) => (
                    <Link
                      to={lesson.locked ? "#" : `/lessons/${lesson.id}`}
                      key={lesson.id}
                      className={lesson.locked ? "is-locked" : ""}
                      onClick={(event) => {
                        if (lesson.locked) {
                          event.preventDefault();
                          notice(
                            "Enroll in this course to unlock all lessons.",
                          );
                        }
                      }}
                    >
                      <span className="lesson-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <strong>{lesson.title}</strong>
                        <span>
                          {lesson.kind === "video"
                            ? "Video lesson"
                            : "Reading lesson"}
                          <i />
                          {lesson.duration} min
                        </span>
                      </div>
                      {lesson.completed ? (
                        <CheckCircle2 size={18} />
                      ) : lesson.locked ? (
                        <LockKeyhole size={16} />
                      ) : lesson.preview && !unlocked ? (
                        <span className="preview-label">
                          Free preview <Play size={11} />
                        </span>
                      ) : (
                        <ChevronRight size={17} />
                      )}
                    </Link>
                  ))}
                </div>
                {!course.lessons?.length && (
                  <Empty
                    title="The next chapter is taking shape."
                    text="Lessons for this course will be added by your instructor."
                  />
                )}
              </>
            )}
            {tab === "Materials" && (
              <>
                <h2>A little extra to learn with.</h2>
                {course.resources?.length ? (
                  <div className="resource-list">
                    {course.resources.map((resource) => (
                      <MaterialRow key={resource.id} material={resource} />
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No additional materials just yet."
                    text="Your lesson readings are included in the Lessons tab. Check back for new downloads."
                  />
                )}
              </>
            )}
          </div>
          <aside className="enrollment-panel">
            <span className="enrollment-eyebrow">YOUR NEXT STEP</span>
            <div className="enrollment-price">
              {unlocked
                ? "You're in."
                : course.price_cents
                  ? money(course.price_cents)
                  : "Free"}
              {!unlocked && (
                <span>
                  {course.price_cents
                    ? "One-time payment. No subscription."
                    : "A good beginning should be open to everyone."}
                </span>
              )}
            </div>
            <ul>
              <li>
                <Check size={16} />
                All {course.lesson_count} course lessons
              </li>
              <li>
                <Check size={16} />
                Learn at your own pace
              </li>
              <li>
                <Check size={16} />
                Progress saved to your account
              </li>
              <li>
                <Check size={16} />
                Included course materials
              </li>
            </ul>
            <FormError message={actionError} />
            <button
              className="site-button primary"
              disabled={busy}
              onClick={() => void enroll()}
            >
              {busy
                ? "Getting things ready..."
                : unlocked
                  ? "Continue learning"
                  : course.price_cents
                    ? "Get this course"
                    : "Start learning for free"}
              <ArrowRight size={16} />
            </button>
            {previewLesson && !unlocked && (
              <Link
                className="course-preview"
                to={`/lessons/${previewLesson.id}`}
              >
                <Play size={13} />
                Preview the first lesson
              </Link>
            )}
            <span className="enrollment-safe">
              <ShieldCheck size={14} />
              {course.price_cents && config?.payment.provider === "development"
                ? "Development checkout. No real charges."
                : course.price_cents
                  ? "Secure checkout. No card details stored."
                  : "No payment details needed."}
            </span>
          </aside>
        </div>
      </section>
    </>
  );
}

function VideoPlayer({ lesson }: { lesson: Lesson }) {
  if (lesson.video_file_id)
    return (
      <video
        className="lesson-video"
        controls
        preload="metadata"
        src={`/api/files/${lesson.video_file_id}`}
        controlsList="nodownload"
      >
        Your browser does not support this video.
      </video>
    );
  const url = lesson.video_url || "";
  const youtube = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  )?.[1];
  const vimeo = url.match(/vimeo\.com\/(\d+)/)?.[1];
  const source = youtube
    ? `https://www.youtube-nocookie.com/embed/${youtube}`
    : vimeo
      ? `https://player.vimeo.com/video/${vimeo}`
      : "";
  return source ? (
    <iframe
      className="lesson-video"
      src={source}
      title={lesson.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  ) : (
    <p className="form-error">
      A video has not been attached to this lesson yet.
    </p>
  );
}

export function LessonPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    data: lesson,
    loading,
    error,
    refresh,
    setData,
  } = useResource<Lesson>(`/lessons/${id}?viewer=${user?.id || 0}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const notice = useNotice();
  useEffect(() => setActionError(""), [id]);
  if (loading) return <Loading text="Opening your next chapter..." />;
  if (error || !lesson)
    return (
      <div className="public-container">
        <ErrorState message={error || "Lesson not found."} retry={refresh} />
        <Link className="site-button secondary" to="/learn">
          Back to learning hub
        </Link>
      </div>
    );
  const index = lesson.lessons?.findIndex((item) => item.id === lesson.id) ?? 0;
  const next = lesson.lessons?.[index + 1];
  const completed =
    lesson.lessons?.filter((item) => item.completed).length || 0;
  return (
    <div className="public-container lesson-layout">
      <aside className="lesson-sidebar">
        <Link to={`/courses/${lesson.course?.slug}`} className="back-link">
          <ArrowLeft size={14} />
          Course overview
        </Link>
        <span className="section-eyebrow">YOUR LEARNING PATH</span>
        <h2>{lesson.course?.title}</h2>
        <div className="lesson-course-progress">
          <span>
            {completed} of {lesson.lessons?.length || 0} lessons complete
          </span>
          <div>
            <i
              style={{
                width: `${(completed / (lesson.lessons?.length || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
        <nav aria-label="Course lessons">
          {lesson.lessons?.map((item, i) => (
            <Link
              key={item.id}
              className={item.id === lesson.id ? "lesson-nav-active" : ""}
              to={
                item.locked
                  ? `/courses/${lesson.course?.slug}`
                  : `/lessons/${item.id}`
              }
            >
              <span>
                {item.completed ? (
                  <Check size={14} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <span>
                {item.title}
                <small>
                  {item.duration} min
                  {item.kind === "video" ? " video" : " read"}
                </small>
              </span>
              {item.locked && <LockKeyhole size={13} />}
            </Link>
          ))}
        </nav>
      </aside>
      <article className="lesson-article">
        <span className="section-eyebrow">
          LESSON {String(index + 1).padStart(2, "0")} /{" "}
          {lesson.kind === "video" ? "WATCH & LEARN" : "READ & DISCOVER"}
        </span>
        <h1>{lesson.title}</h1>
        <div className="lesson-byline">
          <Clock3 size={14} />
          {lesson.duration} min {lesson.kind === "video" ? "video" : "read"}
          <span />
          {lesson.course?.instructor}
        </div>
        {lesson.kind === "video" && <VideoPlayer lesson={lesson} />}
        <Prose content={lesson.content || ""} />
        {lesson.document_file_id && (
          <a
            className="lesson-download"
            href={`/api/files/${lesson.document_file_id}?download=1`}
          >
            <FileText size={23} />
            <span>
              <strong>Your lesson companion</strong>
              <small>Download the attached course material</small>
            </span>
            <Download size={19} />
          </a>
        )}
        <FormError message={actionError} />
        <div className="lesson-completion">
          {lesson.course?.enrolled || user?.role === "admin" ? (
            <>
              <button
                className={`site-button ${lesson.completed ? "secondary" : "primary"}`}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setActionError("");
                  try {
                    await post(`/lessons/${lesson.id}/progress`, {
                      completed: !lesson.completed,
                    });
                    setData({
                      ...lesson,
                      completed: !lesson.completed,
                      lessons: lesson.lessons?.map((item) =>
                        item.id === lesson.id
                          ? { ...item, completed: !lesson.completed }
                          : item,
                      ),
                    });
                    notice(
                      lesson.completed
                        ? "Lesson marked as incomplete."
                        : "A little progress. A little more possibility.",
                    );
                  } catch (err) {
                    setActionError((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {lesson.completed ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <Check size={17} />
                )}
                {busy
                  ? "Saving..."
                  : lesson.completed
                    ? "Lesson completed"
                    : "Mark as complete"}
              </button>
              {next ? (
                <Link
                  to={
                    next.locked
                      ? `/courses/${lesson.course?.slug}`
                      : `/lessons/${next.id}`
                  }
                  className="editorial-link"
                >
                  Next lesson <ArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/my-learning" className="editorial-link">
                  My learning <ArrowRight size={16} />
                </Link>
              )}
            </>
          ) : (
            <div className="preview-enrollment">
              <h3>Enjoying this first chapter?</h3>
              <p>Enroll to unlock the full course and save your progress.</p>
              <Link
                className="site-button primary"
                to={`/courses/${lesson.course?.slug}`}
              >
                Explore the full course <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export function MaterialRow({ material }: { material: Material }) {
  return (
    <Link className="material-row" to={`/materials/${material.id}`}>
      <span className={`material-type-icon ${material.subject.toLowerCase()}`}>
        {material.subject === "Scholarships" ? (
          <GraduationCap size={23} strokeWidth={1.5} />
        ) : (
          <FileText size={23} strokeWidth={1.5} />
        )}
      </span>
      <div>
        <div className="material-row-meta">
          <span>{material.subject}</span>
          <i />
          {material.kind}
          {material.has_file && (
            <>
              <i />
              Download included
            </>
          )}
        </div>
        <h3>{material.title}</h3>
        <p>{material.description}</p>
      </div>
      <span className="material-row-arrow">
        {material.locked ? (
          <LockKeyhole size={18} />
        ) : (
          <ArrowUpRight size={21} />
        )}
      </span>
    </Link>
  );
}

export function MaterialsPage({
  scholarships = false,
}: {
  scholarships?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const { data, loading, error, refresh } = useResource<Material[]>(
    `/resources?subject=${scholarships ? "Scholarships" : subject === "All subjects" ? "" : subject}&q=${encodeURIComponent(query)}`,
  );
  return (
    <>
      <PageIntro
        eyebrow={
          scholarships
            ? "A HEAD START FOR YOUR AMBITIONS"
            : "THE GTECH READING ROOM"
        }
        title={
          scholarships
            ? "Your future has possibilities."
            : "Something worth spending time with."
        }
        text={
          scholarships
            ? "Thoughtful guides to help you research, prepare, and tell your story with confidence."
            : "Study guides, notes, and little tools for your next big understanding."
        }
      />
      <section className="public-section">
        <div className="public-container materials-container">
          <div className="catalog-tools">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={
                scholarships
                  ? "Find a scholarship guide..."
                  : "Find a study material..."
              }
            />
            {!scholarships && (
              <select
                aria-label="Material subject"
                className="public-select"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              >
                {["All subjects", ...subjects].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            )}
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} retry={refresh} />
          ) : data?.length ? (
            <div className="resource-list">
              {data.map((resource) => (
                <MaterialRow key={resource.id} material={resource} />
              ))}
            </div>
          ) : (
            <Empty
              title="Nothing matches just yet."
              text="Try another search to find your next useful read."
            />
          )}
          {scholarships && (
            <div className="scholarship-disclaimer">
              <ShieldCheck size={22} />
              <div>
                <strong>Preparation, not promises.</strong>
                <p>
                  Gtech provides learning and application resources. We do not
                  award scholarships or guarantee placement. Always confirm
                  requirements and deadlines directly with the official
                  provider.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function MaterialPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refresh } = useResource<Material>(
    `/resources/${id}?viewer=${user?.id || 0}`,
  );
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <div className="public-container">
        <ErrorState message={error || "Material not found."} retry={refresh} />
      </div>
    );
  return (
    <div className="public-container reading-page">
      <Link
        className="back-link"
        to={data.subject === "Scholarships" ? "/scholarships" : "/materials"}
      >
        <ArrowLeft size={15} />
        Back to{" "}
        {data.subject === "Scholarships"
          ? "scholarship resources"
          : "study materials"}
      </Link>
      <span className="section-eyebrow">
        {data.subject.toUpperCase()} / {data.kind.toUpperCase()}
      </span>
      <h1>{data.title}</h1>
      <p className="reading-description">{data.description}</p>
      {data.locked ? (
        <div className="locked-material">
          <LockKeyhole size={28} />
          <h2>A little more learning awaits.</h2>
          <p>
            This material is included with {data.course_title}. Enroll in the
            course to read and download it.
          </p>
          <Link
            className="site-button primary"
            to={`/courses/${data.course_slug}`}
          >
            Explore the course <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <>
          <Prose content={data.content || ""} />
          {data.file_id && (
            <div className="resource-download-box">
              <FileText size={30} />
              <div>
                <h3>{data.filename || "Course material"}</h3>
                <p>Open it in your browser or keep a copy for later.</p>
              </div>
              <a
                className="site-button secondary"
                href={`/api/files/${data.file_id}`}
                target="_blank"
                rel="noreferrer"
              >
                Read file <ArrowUpRight size={15} />
              </a>
              <a
                className="site-button primary"
                href={`/api/files/${data.file_id}?download=1`}
              >
                <Download size={16} />
                Download
              </a>
            </div>
          )}
          {data.external_url && (
            <a
              className="editorial-link external-resource"
              href={data.external_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit the official resource <ArrowUpRight size={17} />
            </a>
          )}
        </>
      )}
      <div className="reading-bottom">
        <span>Keep your curiosity going.</span>
        <Link className="editorial-link" to="/practice">
          Try a practice session <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
