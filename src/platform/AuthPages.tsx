import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/ui";
import { useAuth, useNotice } from "./context";
import { post } from "./api";
import type { User } from "./types";
import { FormError, SubmitButton } from "./shared";

export default function AuthPage({ register = false }: { register?: boolean }) {
  const { user, loading, acceptSession } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const requested = params.get("next");
  const next =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/my-learning";
  if (user && !loading)
    return (
      <Navigate
        to={
          requested ? next : user.role === "admin" ? "/admin" : "/my-learning"
        }
        replace
      />
    );
  return (
    <div className="website auth-page">
      <aside className="auth-story">
        <Link to="/" aria-label="Gtech home">
          <Logo />
        </Link>
        <div className="auth-story-copy">
          <span className="section-eyebrow">YOUR POTENTIAL. YOUR PACE.</span>
          <h2>
            A little curiosity
            <br />
            can change
            <br />
            <em>everything.</em>
          </h2>
          <p>
            A space to ask questions, make progress,
            <br />
            and find out what comes next.
          </p>
        </div>
        <span className="auth-story-footer">
          Gtech. Built for your next chapter.
        </span>
      </aside>
      <main className="auth-main">
        <Link to="/" className="auth-back">
          <ArrowLeft size={15} />
          Back to Gtech
        </Link>
        <div className="auth-form-wrap">
          <span className="section-eyebrow">
            {register
              ? "YOUR NEXT CHAPTER STARTS HERE"
              : "GOOD TO SEE YOU AGAIN"}
          </span>
          <h1>{register ? "Make room for possibility." : "Welcome back."}</h1>
          <p>
            {register
              ? "Create your free account and take the first step."
              : "Your next lightbulb moment is waiting."}
          </p>
          <form
            className="public-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setBusy(true);
              setError("");
              try {
                const session = await post<{ user: User; csrfToken: string }>(
                  register ? "/auth/register" : "/auth/login",
                  {
                    name: form.get("name"),
                    email: form.get("email"),
                    password: form.get("password"),
                  },
                );
                acceptSession(session);
                notice(
                  register
                    ? "Welcome to Gtech. Your next chapter starts here."
                    : `Welcome back, ${session.user.name.split(" ")[0]}.`,
                );
                navigate(
                  requested
                    ? next
                    : session.user.role === "admin"
                      ? "/admin"
                      : "/my-learning",
                  { replace: true },
                );
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoComplete="name"
                  placeholder="What should we call you?"
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                name="email"
                required
                maxLength={200}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <span className="password-input">
                <input
                  type={visible ? "text" : "password"}
                  name="password"
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder={
                    register ? "At least 10 characters" : "Enter your password"
                  }
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {register && (
              <label className="terms-checkbox">
                <input required type="checkbox" />
                <span>
                  I agree to the <Link to="/terms">Terms of use</Link> and{" "}
                  <Link to="/privacy">Privacy policy</Link>.
                </span>
              </label>
            )}
            <FormError message={error} />
            <SubmitButton busy={busy || loading}>
              {register ? "Create my account" : "Sign in"}
              <ArrowRight size={17} />
            </SubmitButton>
          </form>
          <p className="auth-switch">
            {register ? "Already part of Gtech?" : "New around here?"}{" "}
            <Link
              to={`${register ? "/login" : "/register"}${requested ? `?next=${encodeURIComponent(next)}` : ""}`}
            >
              {register ? "Sign in" : "Create a free account"}
            </Link>
          </p>
          <div className="auth-secure">
            <ShieldCheck size={15} />
            <span>Your progress has a safe place to call home.</span>
          </div>
          {!register && (
            <Link className="auth-support" to="/contact">
              Need help signing in? Contact support.
            </Link>
          )}
        </div>
        <span className="auth-copyright">
          &copy; {new Date().getFullYear()} Gtech. Keep growing.
        </span>
      </main>
    </div>
  );
}
