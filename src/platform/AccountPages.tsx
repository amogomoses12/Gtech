import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  LockKeyhole,
  Target,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth, useNotice, useResource } from "./context";
import { patch, post } from "./api";
import type { MyLearning, User } from "./types";
import { dateLabel, money } from "./types";
import {
  Empty,
  ErrorState,
  FormError,
  Loading,
  PageIntro,
  SubmitButton,
} from "./shared";
import { downloadCsv } from "../data";

export function MyLearningPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } =
    useResource<MyLearning>("/my-learning");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "courses";
  return (
    <>
      <PageIntro
        eyebrow="YOUR OWN LITTLE CORNER OF GTECH"
        title={`Keep going, ${user?.name.split(" ")[0]}.`}
        text="A little progress today. A little more possibility tomorrow."
      />
      <section className="public-section my-learning-section">
        <div className="public-container">
          <div className="subject-tabs" role="tablist" aria-label="My learning">
            {[
              ["courses", "My courses", BookOpen],
              ["practice", "Practice history", Target],
              ["orders", "Purchases", LockKeyhole],
            ].map(([key, label, Icon]) => {
              const TabIcon = Icon as typeof BookOpen;
              return (
                <button
                  key={key as string}
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "selected" : ""}
                  onClick={() => setParams({ tab: key as string })}
                >
                  <TabIcon size={16} />
                  {label as string}
                </button>
              );
            })}
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} retry={refresh} />
          ) : (
            data && (
              <>
                {tab === "courses" &&
                  (data.courses.length ? (
                    <div className="enrolled-courses">
                      {data.courses.map((course) => {
                        const progress = Math.round(
                          ((course.completed_lessons || 0) /
                            Math.max(1, course.lesson_count)) *
                            100,
                        );
                        return (
                          <article className="enrolled-course" key={course.id}>
                            <Link to={`/courses/${course.slug}`}>
                              <img src={course.image} alt="" />
                            </Link>
                            <div>
                              <span className="subject-text">
                                {course.subject}
                              </span>
                              <Link to={`/courses/${course.slug}`}>
                                <h2>{course.title}</h2>
                              </Link>
                              <p>
                                {progress === 100
                                  ? "A chapter completed. Be proud of that."
                                  : `${course.completed_lessons || 0} of ${course.lesson_count} lessons complete`}
                              </p>
                              <div className="enrolled-progress">
                                <span style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                            <Link
                              className={`site-button ${progress === 100 ? "secondary" : "primary"}`}
                              to={
                                course.next_lesson_id
                                  ? `/lessons/${course.next_lesson_id}`
                                  : `/courses/${course.slug}`
                              }
                            >
                              {progress === 100 ? (
                                <>
                                  <CheckCircle2 size={15} />
                                  Revisit course
                                </>
                              ) : (
                                <>
                                  Continue learning <ArrowRight size={15} />
                                </>
                              )}
                            </Link>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty
                      title="Your next chapter is waiting."
                      text="Find a course that sparks your curiosity. We'll save your place right here."
                      to="/learn"
                    />
                  ))}
                {tab === "practice" &&
                  (data.attempts.length ? (
                    <div className="practice-history">
                      {data.attempts.map((attempt) => (
                        <Link
                          to={`/practice/results/${attempt.id}`}
                          key={attempt.id}
                        >
                          <span className="history-icon">
                            <Target size={21} />
                          </span>
                          <div>
                            <h3>{attempt.quiz_title}</h3>
                            <p>{dateLabel(attempt.created_at)}</p>
                          </div>
                          <strong>
                            {attempt.score}/{attempt.total}
                            <small>
                              {Math.round(
                                (attempt.score / attempt.total) * 100,
                              )}
                              %
                            </small>
                          </strong>
                          <ArrowRight size={17} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Make a little room for practice."
                      text="Your practice results and answer explanations will be saved here."
                      to="/practice"
                      action="Find a practice session"
                    />
                  ))}
                {tab === "orders" &&
                  (data.orders.length ? (
                    <div className="purchase-list">
                      {data.orders.map((order) => (
                        <article key={order.id}>
                          <div>
                            <span className="purchase-status">
                              {order.status === "test_paid"
                                ? "Test purchase"
                                : order.status.replace("_", " ")}
                              {order.payment_mode === "test" &&
                              order.status !== "test_paid"
                                ? " (test mode)"
                                : ""}
                            </span>
                            <h3>{order.course_title}</h3>
                            <p>
                              {dateLabel(order.created_at)}
                              <span />
                              {order.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                          <strong>{money(order.amount_cents)}</strong>
                          {["paid", "test_paid"].includes(order.status) ? (
                            <button
                              className="site-button secondary"
                              onClick={() =>
                                downloadCsv(
                                  `Gtech-receipt-${order.id.slice(0, 8)}`,
                                  [
                                    "Order",
                                    "Course",
                                    "Amount (USD)",
                                    "Status",
                                    "Payment mode",
                                    "Date",
                                  ],
                                  [
                                    [
                                      order.id,
                                      order.course_title,
                                      order.amount_cents / 100,
                                      order.status,
                                      order.payment_mode,
                                      order.created_at,
                                    ],
                                  ],
                                )
                              }
                            >
                              <Download size={15} />
                              Receipt
                            </button>
                          ) : (
                            <Link
                              className="site-button secondary"
                              to={`/checkout/success?order_id=${order.id}`}
                            >
                              View order <ArrowRight size={14} />
                            </Link>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="No purchases just yet."
                      text="Free courses are in My courses. Your paid course orders will appear here."
                      to="/learn"
                    />
                  ))}
              </>
            )
          )}
        </div>
      </section>
    </>
  );
}

export function AccountPage() {
  const { user, acceptSession } = useAuth();
  const notice = useNotice();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <PageIntro
        eyebrow="YOUR GTECH ACCOUNT"
        title="Make yourself at home."
        text="The details that make your learning space yours."
      />
      <section className="public-section">
        <div className="public-container account-settings">
          <section>
            <div>
              <h2>Your profile</h2>
              <p>A name to put to all that curiosity.</p>
            </div>
            <form
              className="public-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setBusy("profile");
                setError("");
                try {
                  acceptSession(
                    await patch<{ user: User; csrfToken: string }>("/account", {
                      name: form.get("name"),
                    }),
                  );
                  notice("Your profile has been updated.");
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy("");
                }
              }}
            >
              <label>
                Full name
                <input
                  name="name"
                  defaultValue={user?.name}
                  required
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <label>
                Email address
                <input value={user?.email || ""} readOnly />
              </label>
              <p className="field-hint">
                Your email is your account identity. Contact your administrator
                if it needs to change.
              </p>
              <SubmitButton busy={Boolean(busy)}>
                Save profile <ArrowRight size={15} />
              </SubmitButton>
            </form>
          </section>
          <section>
            <div>
              <h2>Keep your account secure</h2>
              <p>A strong password is a good place to start.</p>
            </div>
            <form
              className="public-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const element = event.currentTarget;
                const form = new FormData(element);
                if (form.get("password") !== form.get("confirm")) {
                  setError("Your new passwords do not match.");
                  return;
                }
                setBusy("password");
                setError("");
                try {
                  acceptSession(
                    await post<{ user: User; csrfToken: string }>(
                      "/account/password",
                      {
                        current_password: form.get("current"),
                        password: form.get("password"),
                      },
                    ),
                  );
                  element.reset();
                  notice(
                    "Password updated. Other sessions have been signed out.",
                  );
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy("");
                }
              }}
            >
              <label>
                Current password
                <input
                  type="password"
                  name="current"
                  required
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  name="confirm"
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
              </label>
              <SubmitButton busy={Boolean(busy)}>
                Update password <LockKeyhole size={15} />
              </SubmitButton>
            </form>
          </section>
          <FormError message={error} />
        </div>
      </section>
    </>
  );
}
