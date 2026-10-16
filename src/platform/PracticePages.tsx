import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Lightbulb,
  RotateCcw,
  Target,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useResource } from "./context";
import { post } from "./api";
import type { Attempt, Quiz } from "./types";
import { subjects } from "./types";
import { Empty, ErrorState, FormError, Loading, PageIntro } from "./shared";

export function PracticePage() {
  const [subject, setSubject] = useState("All subjects");
  const { data, loading, error, refresh } = useResource<Quiz[]>(
    `/quizzes?subject=${subject === "All subjects" ? "" : subject}`,
  );
  return (
    <>
      <PageIntro
        eyebrow="A LITTLE PRACTICE GOES A LONG WAY"
        title="Turn 'I think' into 'I know'."
        text="Small challenges. Clear explanations. A little more confidence each time."
      />
      <section className="public-section">
        <div className="public-container">
          <div
            className="subject-tabs"
            role="tablist"
            aria-label="Practice subject"
          >
            {["All subjects", ...subjects].map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={subject === item}
                className={subject === item ? "selected" : ""}
                onClick={() => setSubject(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} retry={refresh} />
          ) : data?.length ? (
            <div className="practice-list">
              {data.map((quiz, i) => (
                <Link
                  className="practice-session"
                  to={`/practice/${quiz.id}`}
                  key={quiz.id}
                >
                  <span className="practice-session-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span className="subject-text">{quiz.subject}</span>
                    <h2>{quiz.title}</h2>
                    <p>{quiz.description}</p>
                    <div className="practice-meta">
                      <span>
                        <Target size={14} />
                        {quiz.question_count} questions
                      </span>
                      <span>
                        <Clock3 size={14} />
                        About {quiz.duration} minutes
                      </span>
                      <span>Self-paced</span>
                    </div>
                  </div>
                  <span className="practice-start">
                    Let&apos;s practice <ArrowUpRight size={18} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="New challenges are on their way."
              text="Explore another subject or check back for fresh practice sessions."
            />
          )}
          <div className="practice-note">
            <Lightbulb size={23} />
            <p>
              No pressure to get it perfect. Every answer comes with an
              explanation, and you can try again whenever you like.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export function PracticeSession() {
  const { id } = useParams();
  const {
    data: quiz,
    loading,
    error,
    refresh,
  } = useResource<Quiz>(`/quizzes/${id}`);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    setAnswers({});
    setIndex(0);
    setSubmitError("");
  }, [id]);
  if (loading) return <Loading />;
  if (error || !quiz)
    return (
      <div className="public-container">
        <ErrorState
          message={error || "Practice session not found."}
          retry={refresh}
        />
      </div>
    );
  const questions = quiz.questions || [];
  const question = questions[index];
  if (!question)
    return (
      <Empty
        title="This session is still being prepared."
        text="Choose another practice session for now."
        to="/practice"
        action="Back to practice"
      />
    );
  const answered = Object.keys(answers).length;
  return (
    <div className="public-container practice-workspace">
      <Link className="back-link" to="/practice">
        <ArrowLeft size={14} />
        Back to practice
      </Link>
      <div className="practice-workspace-heading">
        <div>
          <span className="section-eyebrow">
            {quiz.subject.toUpperCase()} / PRACTICE
          </span>
          <h1>{quiz.title}</h1>
        </div>
        <span className="self-paced-label">
          <Clock3 size={15} />
          Take your time. This is self-paced.
        </span>
      </div>
      <div className="practice-progress">
        <span style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>
      <div className="quiz-layout">
        <aside>
          <h3>Your questions</h3>
          <div className="question-jump">
            {questions.map((item, i) => (
              <button
                key={item.id}
                className={`${index === i ? "current" : ""} ${answers[item.id] !== undefined ? "answered" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Question ${i + 1}`}
                aria-current={index === i ? "step" : undefined}
              >
                {answers[item.id] !== undefined ? <Check size={16} /> : i + 1}
              </button>
            ))}
          </div>
          <span>
            {answered} of {questions.length} answered
          </span>
          <p>You can revisit any answer before submitting.</p>
        </aside>
        <form
          className="quiz-question"
          onSubmit={async (event) => {
            event.preventDefault();
            const missing = questions.findIndex(
              (item) => answers[item.id] === undefined,
            );
            if (missing !== -1) {
              setIndex(missing);
              setSubmitError(
                "Choose an answer for every question before submitting.",
              );
              return;
            }
            setBusy(true);
            setSubmitError("");
            try {
              const attempt = await post<Attempt>(
                `/quizzes/${quiz.id}/attempts`,
                {
                  answers: questions.map((item) => ({
                    question_id: item.id,
                    choice: answers[item.id],
                  })),
                },
              );
              navigate(`/practice/results/${attempt.id}`);
            } catch (err) {
              setSubmitError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="section-eyebrow">
            QUESTION {String(index + 1).padStart(2, "0")} OF{" "}
            {String(questions.length).padStart(2, "0")}
          </span>
          <h2>{question.prompt}</h2>
          <fieldset className="answer-options">
            <legend className="sr-only">Choose your answer</legend>
            {question.options.map((option, i) => (
              <label
                key={`${question.id}-${i}`}
                className={answers[question.id] === i ? "answer-selected" : ""}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={i}
                  checked={answers[question.id] === i}
                  onChange={() => setAnswers({ ...answers, [question.id]: i })}
                />
                <span>{String.fromCharCode(65 + i)}</span>
                <strong>{option}</strong>
                {answers[question.id] === i && <CheckCircle2 size={18} />}
              </label>
            ))}
          </fieldset>
          <FormError message={submitError} />
          <div className="quiz-navigation">
            <button
              type="button"
              className="site-button secondary"
              disabled={!index || busy}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft size={15} />
              Previous
            </button>
            {index < questions.length - 1 ? (
              <button
                type="button"
                className="site-button primary"
                onClick={() => setIndex(index + 1)}
              >
                Next question <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="site-button primary"
                type="submit"
                disabled={busy}
              >
                {busy ? "Checking your answers..." : "See my results"}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function PracticeResult() {
  const { id } = useParams();
  const { data, loading, error, refresh } = useResource<Attempt>(
    `/attempts/${id}`,
  );
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <div className="public-container">
        <ErrorState message={error || "Result not found."} retry={refresh} />
      </div>
    );
  return (
    <div className="public-container practice-result">
      <Link className="back-link" to="/my-learning?tab=practice">
        <ArrowLeft size={15} />
        My practice history
      </Link>
      <div className="practice-result-hero">
        <span className="result-mark">
          <CheckCircle2 size={34} strokeWidth={1.4} />
        </span>
        <span className="section-eyebrow">A LITTLE PROGRESS, WELL EARNED</span>
        <h1>
          {data.score === data.total
            ? "Look at you go."
            : "Every question is a step forward."}
        </h1>
        <p>{data.quiz_title}</p>
        <div className="result-score">
          <strong>
            {data.score}
            <span>/{data.total}</span>
          </strong>
          <p>
            {Math.round((data.score / data.total) * 100)}% correct. Your results
            are saved.
          </p>
        </div>
        <div className="result-actions">
          {data.quiz_id && (
            <Link
              className="site-button secondary"
              to={`/practice/${data.quiz_id}`}
            >
              <RotateCcw size={15} />
              Try again
            </Link>
          )}
          <Link className="site-button primary" to="/practice">
            Find another challenge <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <h2>Let&apos;s make sense of the answers.</h2>
      <div className="review-list">
        {data.review?.map((item, i) => (
          <section
            key={item.id}
            className={`review-item ${item.correct ? "correct" : "incorrect"}`}
          >
            <div className="review-question">
              <span>
                {item.correct ? <Check size={17} /> : <X size={17} />}
              </span>
              <h3>
                {i + 1}. {item.prompt}
              </h3>
            </div>
            <p className="your-answer">
              Your answer: <strong>{item.options[item.selected]}</strong>
            </p>
            {!item.correct && (
              <p className="correct-answer">
                Correct answer:{" "}
                <strong>{item.options[item.correct_index]}</strong>
              </p>
            )}
            <p className="answer-explanation">
              <Lightbulb size={17} />
              {item.explanation}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
