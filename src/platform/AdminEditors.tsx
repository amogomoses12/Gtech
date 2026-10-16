import { useState } from "react";
import {
  Check,
  FileUp,
  LoaderCircle,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { api, post, put, remove, uploadFile } from "./api";
import { useAuth, useResource } from "./context";
import type { Course, Lesson, Material, Question, Quiz, Upload } from "./types";
import { subjects } from "./types";
import { FormError } from "./shared";
import { IconButton, Modal } from "../components/ui";

const imageFor = (subject: string) =>
  `/images/${subject === "Mathematics" ? "mathematics" : subject.toLowerCase()}.jpg`;
export function SaveActions({
  busy,
  onClose,
  label = "Save changes",
}: {
  busy: boolean;
  onClose: () => void;
  label?: string;
}) {
  return (
    <div className="form-actions">
      <button
        type="button"
        className="button button-secondary"
        disabled={busy}
        onClick={onClose}
      >
        Cancel
      </button>
      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? (
          <>
            <LoaderCircle size={14} className="spin" />
            Saving...
          </>
        ) : (
          <>
            <Check size={14} />
            {label}
          </>
        )}
      </button>
    </div>
  );
}

export function FilePicker({
  value,
  onChange,
  kind,
  label,
  onBusy,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  kind: "video" | "document";
  label: string;
  onBusy?: (busy: boolean) => void;
}) {
  const { data, refresh } = useResource<Upload[]>("/admin/uploads");
  const { config } = useAuth();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const files =
    data?.filter((file) =>
      kind === "video"
        ? file.mime.startsWith("video/")
        : !file.mime.startsWith("video/"),
    ) || [];
  return (
    <div className="file-picker">
      <label className="field">
        {label}
        <select
          aria-label={label}
          value={value || ""}
          onChange={(event) => onChange(event.target.value || null)}
          disabled={progress !== null}
        >
          <option value="">No file selected</option>
          {files.map((file) => (
            <option key={file.id} value={file.id}>
              {file.original_name}
            </option>
          ))}
        </select>
      </label>
      <label
        className={`file-upload-target ${progress !== null ? "is-uploading" : ""}`}
      >
        <input
          type="file"
          accept={kind === "video" ? ".mp4,.webm" : ".pdf,.png,.jpg,.jpeg"}
          disabled={progress !== null}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const input = event.currentTarget;
            setError("");
            if (file.size > (config?.max_upload_mb || 250) * 1024 * 1024) {
              setError(
                `Choose a file under ${config?.max_upload_mb || 250} MB.`,
              );
              input.value = "";
              return;
            }
            setProgress(0);
            onBusy?.(true);
            try {
              const uploaded = await uploadFile<Upload>(file, setProgress);
              onChange(uploaded.id);
              refresh();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setProgress(null);
              onBusy?.(false);
              input.value = "";
            }
          }}
        />
        <UploadCloud size={21} />
        <span>
          <strong>
            {progress !== null
              ? `Uploading ${progress}%`
              : "Or upload a new file"}
          </strong>
          <small>
            {kind === "video" ? "MP4 or WebM" : "PDF, JPG, or PNG"} · Up to{" "}
            {config?.max_upload_mb || 250} MB
          </small>
        </span>
        {progress !== null && (
          <div className="upload-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </label>
      <FormError message={error} />
    </div>
  );
}

export function CourseEditor({
  course,
  onClose,
  onSaved,
}: {
  course?: Course;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(course?.subject || "Mathematics");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={course ? "Edit course" : "A new chapter starts here"}
      subtitle="Create a clear, welcoming home for your lessons."
      onClose={onClose}
      wide
    >
      <form
        className="app-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setBusy(true);
          setError("");
          const value = {
            title: form.get("title"),
            subject,
            summary: form.get("summary"),
            description: form.get("description"),
            image: imageFor(subject),
            price_cents: Math.round(Number(form.get("price")) * 100),
            level: form.get("level"),
            instructor: form.get("instructor"),
            duration: form.get("duration"),
            published: form.get("published") === "on",
          };
          try {
            if (course) await put(`/admin/courses/${course.id}`, value);
            else await post("/admin/courses", value);
            onSaved();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Course title
          <input
            name="title"
            defaultValue={course?.title}
            required
            maxLength={120}
            placeholder="Give your next course a name"
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Subject
            <select
              aria-label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              {subjects.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Level
            <select
              name="level"
              aria-label="Level"
              defaultValue={course?.level || "Beginner"}
            >
              {["Beginner", "Intermediate", "Advanced", "All levels"].map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <label className="field">
          Short description
          <textarea
            name="summary"
            rows={2}
            defaultValue={course?.summary}
            required
            maxLength={300}
            placeholder="What will your learners discover?"
          />
        </label>
        <label className="field">
          Full course description
          <textarea
            name="description"
            rows={5}
            maxLength={20000}
            defaultValue={course?.description}
            placeholder="The goals, who it's for, and what comes next. Use # and ## for headings."
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Price (USD)
            <input
              type="number"
              name="price"
              min="0"
              max="100000"
              step="0.01"
              defaultValue={(course?.price_cents || 0) / 100}
              required
            />
            <small className="field-hint">Set 0 for a free course.</small>
          </label>
          <label className="field">
            Course duration
            <input
              name="duration"
              defaultValue={course?.duration || "Self-paced"}
              maxLength={80}
              required
              placeholder="e.g. 6 lessons"
            />
          </label>
        </div>
        <label className="field">
          Instructor
          <input
            name="instructor"
            defaultValue={course?.instructor || "Gtech Learning Team"}
            maxLength={100}
            required
          />
        </label>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            name="published"
            defaultChecked={course?.published || false}
          />
          <span>
            <strong>Publish this course</strong>
            <small>
              Make it visible in the public learning hub. You can add lessons
              after saving.
            </small>
          </span>
        </label>
        <FormError message={error} />
        <SaveActions
          busy={busy}
          onClose={onClose}
          label={course ? "Save course" : "Create course"}
        />
      </form>
    </Modal>
  );
}

export function LessonManager({
  course,
  onClose,
  onSaved,
}: {
  course: Course;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, loading, error, refresh } = useResource<Lesson[]>(
    `/admin/courses/${course.id}/lessons`,
  );
  const [editing, setEditing] = useState<Lesson | "new" | null>(null);
  const [actionError, setActionError] = useState("");
  const [confirm, setConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  if (editing)
    return (
      <LessonEditor
        course={course}
        lesson={editing === "new" ? undefined : editing}
        position={data?.length || 0}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
          onSaved();
        }}
      />
    );
  return (
    <Modal
      title="Build your learning path"
      subtitle={course.title}
      onClose={onClose}
      wide
    >
      <div className="lesson-manager">
        <div className="lesson-manager-heading">
          <span>{data?.length || 0} lessons</span>
          <button
            className="button button-primary"
            onClick={() => setEditing("new")}
          >
            <Plus size={15} />
            Add lesson
          </button>
        </div>
        {loading ? (
          <p className="field-hint">Loading lessons...</p>
        ) : error ? (
          <FormError message={error} />
        ) : data?.length ? (
          <div className="admin-lesson-list">
            {data.map((lesson, i) => (
              <div key={lesson.id}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <button onClick={() => setEditing(lesson)}>
                  <strong>{lesson.title}</strong>
                  <small>
                    {lesson.kind} · {lesson.duration} min
                    {lesson.preview ? " · Free preview" : ""}
                  </small>
                </button>
                {confirm === lesson.id ? (
                  <button
                    disabled={deleting}
                    className="danger-button"
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await remove(`/admin/lessons/${lesson.id}`);
                        refresh();
                        onSaved();
                        setConfirm(null);
                      } catch (err) {
                        setActionError((err as Error).message);
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    Confirm delete
                  </button>
                ) : (
                  <IconButton
                    label={`Delete ${lesson.title}`}
                    onClick={() => setConfirm(lesson.id)}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FileUp size={27} />
            <h3>Your first lesson is a good place to start.</h3>
            <p>Add reading content, upload a video, or attach a PDF.</p>
          </div>
        )}
        <FormError message={actionError} />
        <p className="form-note">
          Set lesson positions to change their order. Only lessons marked as
          previews are available before enrollment.
        </p>
      </div>
    </Modal>
  );
}

export function LessonEditor({
  course,
  lesson,
  position,
  onClose,
  onSaved,
}: {
  course: Course;
  lesson?: Lesson;
  position: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState(lesson?.kind || "reading");
  const [video, setVideo] = useState<string | null>(
    lesson?.video_file_id || null,
  );
  const [document, setDocument] = useState<string | null>(
    lesson?.document_file_id || null,
  );
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={lesson ? "Edit lesson" : "Create a lesson"}
      subtitle={course.title}
      onClose={onClose}
      wide
    >
      <form
        className="app-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(event.currentTarget);
          const value = {
            title: form.get("title"),
            content: form.get("content"),
            kind,
            video_url:
              kind === "video" ? String(form.get("video_url") || "") : "",
            video_file_id: kind === "video" ? video : null,
            document_file_id: document,
            duration: Number(form.get("duration")),
            position: Number(form.get("position")),
            preview: form.get("preview") === "on",
          };
          try {
            if (lesson) await put(`/admin/lessons/${lesson.id}`, value);
            else await post(`/admin/courses/${course.id}/lessons`, value);
            onSaved();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Lesson title
          <input
            name="title"
            defaultValue={lesson?.title}
            required
            maxLength={160}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Lesson type
            <select
              aria-label="Lesson type"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as "reading" | "video")
              }
            >
              <option value="reading">Reading lesson</option>
              <option value="video">Video tutorial</option>
            </select>
          </label>
          <label className="field">
            Duration (minutes)
            <input
              name="duration"
              type="number"
              min="1"
              max="600"
              required
              defaultValue={lesson?.duration || 10}
            />
          </label>
        </div>
        {kind === "video" && (
          <>
            <FilePicker
              value={video}
              onChange={setVideo}
              kind="video"
              label="Video file"
              onBusy={setUploading}
            />
            <label className="field">
              Or a YouTube / Vimeo link
              <input
                name="video_url"
                type="url"
                defaultValue={lesson?.video_url}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <small className="field-hint">
                An uploaded video takes priority if both are selected.
              </small>
            </label>
          </>
        )}
        <label className="field">
          Lesson content
          <textarea
            name="content"
            rows={9}
            maxLength={60000}
            defaultValue={lesson?.content}
            placeholder={
              "# Start with an idea\n\nWrite your lesson here. Use ## for subheadings and a blank line between paragraphs."
            }
          />
        </label>
        <FilePicker
          value={document}
          onChange={setDocument}
          kind="document"
          label="Lesson handout (optional)"
          onBusy={setUploading}
        />
        <div className="form-grid">
          <label className="field">
            Position
            <input
              name="position"
              type="number"
              min="0"
              max="10000"
              defaultValue={lesson?.position ?? position}
              required
            />
          </label>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              name="preview"
              defaultChecked={lesson?.preview || false}
            />
            <span>
              <strong>Free preview</strong>
              <small>Anyone can read or watch this lesson.</small>
            </span>
          </label>
        </div>
        <FormError message={error} />
        <SaveActions
          busy={busy || uploading}
          onClose={onClose}
          label="Save lesson"
        />
      </form>
    </Modal>
  );
}

export function MaterialEditor({
  material,
  scholarship = false,
  onClose,
  onSaved,
}: {
  material?: Material;
  scholarship?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: courses } = useResource<Course[]>("/admin/courses");
  const [file, setFile] = useState<string | null>(material?.file_id || null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={
        material ? "Edit learning material" : "Something worth learning from"
      }
      subtitle="Publish a reading, worksheet, or scholarship resource."
      onClose={onClose}
      wide
    >
      <form
        className="app-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = {
            title: form.get("title"),
            description: form.get("description"),
            subject: form.get("subject"),
            kind: form.get("kind"),
            content: form.get("content"),
            file_id: file,
            course_id: form.get("course_id")
              ? Number(form.get("course_id"))
              : null,
            external_url: form.get("external_url"),
            published: form.get("published") === "on",
          };
          setBusy(true);
          setError("");
          try {
            if (material) await put(`/admin/resources/${material.id}`, value);
            else await post("/admin/resources", value);
            onSaved();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Material title
          <input
            name="title"
            defaultValue={material?.title}
            required
            maxLength={160}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Subject
            <select
              name="subject"
              aria-label="Subject"
              defaultValue={
                material?.subject ||
                (scholarship ? "Scholarships" : "Mathematics")
              }
            >
              {subjects.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Material type
            <select
              name="kind"
              aria-label="Material type"
              defaultValue={
                material?.kind ||
                (scholarship ? "Scholarship guide" : "Study guide")
              }
            >
              {[
                "Study guide",
                "Worksheet",
                "Scholarship guide",
                "Reading notes",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Description
          <textarea
            name="description"
            defaultValue={material?.description}
            rows={2}
            required
            maxLength={500}
          />
        </label>
        <label className="field">
          Reading content
          <textarea
            name="content"
            defaultValue={material?.content}
            rows={8}
            maxLength={60000}
            placeholder="Use # for a title, ## for headings, and blank lines between paragraphs."
          />
        </label>
        <FilePicker
          value={file}
          onChange={setFile}
          kind="document"
          label="Attached document (optional)"
          onBusy={setUploading}
        />
        <label className="field">
          External resource link (optional)
          <input
            name="external_url"
            type="url"
            defaultValue={material?.external_url}
            placeholder="https://official-provider.org/resource"
          />
        </label>
        <label className="field">
          Access
          <select
            name="course_id"
            aria-label="Material access"
            defaultValue={material?.course_id || ""}
          >
            <option value="">Free for everyone</option>
            {courses?.map((course) => (
              <option key={course.id} value={course.id}>
                Enrolled learners only: {course.title}
              </option>
            ))}
          </select>
          <small className="field-hint">
            Course-linked materials require enrollment, even if the course is
            free.
          </small>
        </label>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            name="published"
            defaultChecked={material?.published || false}
          />
          <span>
            <strong>Publish this material</strong>
            <small>
              Make it available in the reading room or scholarship library.
            </small>
          </span>
        </label>
        <FormError message={error} />
        <SaveActions
          busy={busy || uploading}
          onClose={onClose}
          label="Save material"
        />
      </form>
    </Modal>
  );
}

type EditableQuestion = {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
};
const emptyQuestion = (): EditableQuestion => ({
  prompt: "",
  options: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
});
export function QuizEditor({
  quiz,
  onClose,
  onSaved,
}: {
  quiz?: Quiz;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    quiz?.questions?.map((question: Question) => ({
      ...question,
      correct_index: question.correct_index ?? 0,
      explanation: question.explanation || "",
    })) || [emptyQuestion()],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const edit = (
    index: number,
    key: keyof EditableQuestion,
    value: string | string[] | number,
  ) =>
    setQuestions((previous) =>
      previous.map((question, i) =>
        i === index ? { ...question, [key]: value } : question,
      ),
    );
  return (
    <Modal
      title={
        quiz ? "Edit practice session" : "A little practice, a lot of progress"
      }
      subtitle="Create questions with clear, helpful answer explanations."
      onClose={onClose}
      wide
    >
      <form
        className="app-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const value = {
            title: form.get("title"),
            description: form.get("description"),
            subject: form.get("subject"),
            duration: Number(form.get("duration")),
            published: form.get("published") === "on",
            questions,
          };
          setBusy(true);
          setError("");
          try {
            if (quiz) await put(`/admin/quizzes/${quiz.id}`, value);
            else await post("/admin/quizzes", value);
            onSaved();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Session title
          <input
            name="title"
            defaultValue={quiz?.title}
            required
            maxLength={160}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Subject
            <select
              aria-label="Subject"
              name="subject"
              defaultValue={quiz?.subject || "Mathematics"}
            >
              {subjects.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Suggested duration (minutes)
            <input
              name="duration"
              type="number"
              required
              min="1"
              max="180"
              defaultValue={quiz?.duration || 10}
            />
          </label>
        </div>
        <label className="field">
          Description
          <textarea
            name="description"
            defaultValue={quiz?.description}
            required
            maxLength={500}
            rows={2}
          />
        </label>
        <div className="question-editor-list">
          {questions.map((question, i) => (
            <fieldset key={i} className="question-editor">
              <legend>Question {i + 1}</legend>
              {questions.length > 1 && (
                <IconButton
                  label={`Remove question ${i + 1}`}
                  onClick={() =>
                    setQuestions(questions.filter((_, index) => index !== i))
                  }
                >
                  <X size={15} />
                </IconButton>
              )}
              <label className="field">
                Question
                <input
                  required
                  maxLength={1500}
                  value={question.prompt}
                  onChange={(event) => edit(i, "prompt", event.target.value)}
                />
              </label>
              <div className="question-option-inputs">
                {question.options.map((option, j) => (
                  <label className="field" key={j}>
                    Option {String.fromCharCode(65 + j)}
                    <input
                      value={option}
                      required
                      maxLength={500}
                      onChange={(event) =>
                        edit(
                          i,
                          "options",
                          question.options.map((value, index) =>
                            index === j ? event.target.value : value,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="field">
                Correct answer
                <select
                  aria-label={`Correct answer for question ${i + 1}`}
                  value={question.correct_index}
                  onChange={(event) =>
                    edit(i, "correct_index", Number(event.target.value))
                  }
                >
                  {question.options.map((_, j) => (
                    <option value={j} key={j}>
                      Option {String.fromCharCode(65 + j)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Answer explanation
                <textarea
                  required
                  maxLength={3000}
                  rows={2}
                  value={question.explanation}
                  onChange={(event) =>
                    edit(i, "explanation", event.target.value)
                  }
                />
              </label>
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={questions.length >= 50}
          onClick={() => setQuestions([...questions, emptyQuestion()])}
        >
          <Plus size={15} />
          Add a question
        </button>
        <label className="admin-checkbox">
          <input
            name="published"
            type="checkbox"
            defaultChecked={quiz?.published || false}
          />
          <span>
            <strong>Publish this practice session</strong>
            <small>
              Questions are available publicly; grading and results require
              sign-in.
            </small>
          </span>
        </label>
        <FormError message={error} />
        <SaveActions
          busy={busy}
          onClose={onClose}
          label="Save practice session"
        />
      </form>
    </Modal>
  );
}

export function DeleteAction({
  path,
  label,
  onDeleted,
}: {
  path: string;
  label: string;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      {confirm ? (
        <Modal
          title={`Delete ${label}?`}
          subtitle="This cannot be undone. Enrolled courses must be unpublished instead."
          onClose={() => setConfirm(false)}
        >
          <FormError message={error} />
          <div className="form-actions">
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Keep it
            </button>
            <button
              className="button button-danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await remove(path);
                  onDeleted();
                  setConfirm(false);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </Modal>
      ) : null}
      <IconButton label={`Delete ${label}`} onClick={() => setConfirm(true)}>
        <Trash2 size={15} />
      </IconButton>
    </>
  );
}

export async function getMaterialForEdit(id: number) {
  return api<Material[]>("/admin/resources").then((materials) =>
    materials.find((material) => material.id === id),
  );
}
