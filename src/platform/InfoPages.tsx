import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { post } from "./api";
import { useAuth } from "./context";
import { FormError, PageIntro, Prose, SubmitButton } from "./shared";

export function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="HELLO. WE'RE GTECH."
        title="Built for the person you're becoming."
        text="We believe a good explanation can open a door. And a little curiosity can change the direction of a life."
      />
      <section className="public-section about-story">
        <div className="public-container">
          <img
            src="/images/learning-hero.jpg"
            alt="People learning and sharing ideas together"
          />
          <div>
            <span className="section-eyebrow">OUR STARTING POINT</span>
            <h2>
              Learning should feel
              <br />
              like a possibility.
              <br />
              <em>Not a barrier.</em>
            </h2>
            <p>
              Gtech brings together clear lessons, thoughtful study materials,
              and practical challenges in one welcoming space. From
              understanding your first algebra equation to preparing your next
              scholarship application, we&apos;re here for the steps in between.
            </p>
            <p>
              We&apos;re building a place where you can ask questions without
              feeling behind. Where you can start small, come back, and keep
              going.
            </p>
            <Link className="editorial-link" to="/learn">
              Find your starting point <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="public-section about-belief">
        <div className="public-container">
          <Sparkles size={28} strokeWidth={1.4} />
          <h2>
            Not just another lesson.
            <br />A little more possibility.
          </h2>
          <p>That&apos;s the idea behind everything we make.</p>
          <Link className="site-button primary" to="/contact">
            Let&apos;s build something good <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}

export function ContactPage() {
  const { user, config } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<number | null>(null);
  return (
    <>
      <PageIntro
        eyebrow="LET'S START A CONVERSATION"
        title="A little help goes a long way."
        text="A question, a suggestion, or a new idea. We'd love to hear it."
      />
      <section className="public-section">
        <div className="public-container contact-layout">
          <div>
            <span className="contact-symbol">
              <MessageCircle size={30} strokeWidth={1.4} />
            </span>
            <h2>
              There&apos;s a person
              <br />
              on the other side.
            </h2>
            <p>
              Send a message about your learning, account, or an idea for Gtech.
              Your message goes straight to our admin inbox.
            </p>
            {config?.support_email &&
              !config.support_email.endsWith(".example") && (
                <a
                  className="contact-email"
                  href={`mailto:${config.support_email}`}
                >
                  <Mail size={17} />
                  {config.support_email}
                  <ArrowUpRight size={15} />
                </a>
              )}
            <div className="contact-help-links">
              <h3>A quick answer might be here.</h3>
              <Link to="/learn">
                Where can I find courses? <ArrowRight size={15} />
              </Link>
              <Link to="/my-learning">
                Where is my learning progress? <ArrowRight size={15} />
              </Link>
              <Link to="/scholarships">
                How can I prepare for scholarships? <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          {reference ? (
            <div className="contact-success">
              <CheckCircle2 size={42} strokeWidth={1.4} />
              <h2>Your message is in good hands.</h2>
              <p>
                Saved to the Gtech support inbox as GT-
                {String(reference).padStart(5, "0")}. An administrator can
                review it in the dashboard.
              </p>
              <button
                className="site-button secondary"
                onClick={() => setReference(null)}
              >
                Send another message <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form
              className="public-form contact-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setBusy(true);
                setError("");
                try {
                  const result = await post<{ id: number }>("/contact", {
                    name: form.get("name"),
                    email: form.get("email"),
                    subject: form.get("subject"),
                    message: form.get("message"),
                  });
                  setReference(result.id);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="public-form-grid">
                <label>
                  Your name
                  <input
                    name="name"
                    required
                    maxLength={80}
                    defaultValue={user?.name}
                    placeholder="What should we call you?"
                    autoComplete="name"
                  />
                </label>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={200}
                    defaultValue={user?.email}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
              </div>
              <label>
                What&apos;s on your mind?
                <input
                  name="subject"
                  required
                  maxLength={160}
                  placeholder="A question about..."
                />
              </label>
              <label>
                Your message
                <textarea
                  name="message"
                  required
                  maxLength={5000}
                  rows={6}
                  placeholder="Tell us a little more. We're listening."
                />
              </label>
              <FormError message={error} />
              <p className="field-hint">
                Please don&apos;t include passwords, card details, or other
                sensitive information.
              </p>
              <SubmitButton busy={busy}>
                Send your message <ArrowUpRight size={16} />
              </SubmitButton>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

const privacy =
  "# Your privacy matters\n\nGtech stores the information needed to run your learning account: your name, email address, securely hashed password, enrollments, lesson progress, practice answers, purchases, and support messages. These records are stored in the website database, not only in your browser.\n\n## Your account and sessions\n\nAn HTTP-only session cookie keeps you signed in for up to seven days. It is used for authentication, not advertising. You can sign out at any time. Changing your password signs out other sessions.\n\n## Course payments\n\nLive payments are processed through Stripe Checkout. Gtech stores order references and payment status, but never stores your card number or security code. Development purchases are clearly identified as tests and do not charge money.\n\n## Video and external resources\n\nUploaded videos are served by Gtech. Lessons may also embed YouTube or Vimeo videos; those providers receive information when you load their players. External websites follow their own privacy policies.\n\n## Your choices\n\nYou can update your name and password in Account settings. Contact the Gtech administrator to request an export, correction, or deletion of your account information. Some transaction records may need to be retained for legal or accounting reasons.\n\n## Before public launch\n\nThe website operator should adapt this policy with their legal business name, location, retention periods, and applicable privacy requirements before accepting real learners or payments.";
const terms =
  "# A good place to learn, together\n\nBy creating a Gtech account, you agree to use the platform respectfully and lawfully. Keep your sign-in details secure and provide accurate account information.\n\n## Learning materials\n\nCourses, readings, videos, and practice sessions are provided for educational use. Your enrollment gives you personal access; it does not transfer copyright or permission to redistribute material. Instructors must hold the rights to anything they upload.\n\n## Paid courses\n\nPrices are shown in US dollars and are one-time course purchases unless explicitly stated otherwise. Access is activated after server-side payment verification. Contact the administrator about purchase issues or refund requests. Any refund policy and statutory cancellation rights applicable to the operator must be published before live payments are enabled.\n\n## Scholarship resources\n\nGtech provides preparation guides, not scholarship awards or guarantees. You are responsible for checking eligibility, deadlines, and application conditions on official provider websites.\n\n## Fair use\n\nDo not share accounts, bypass access restrictions, upload unlawful material, or interfere with the platform. Accounts that breach these terms may be suspended.\n\n## Availability and learning outcomes\n\nLearning outcomes depend on many factors. Materials are not a guarantee of grades, employment, admission, or funding. Report errors or access problems through Contact & support.\n\n## Operator review\n\nThese starter terms must be reviewed and adapted to the operator's jurisdiction, business details, and refund obligations before the public launch.";
export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  return (
    <div className="public-container reading-page legal-page">
      <span className="section-eyebrow">A LITTLE CLARITY</span>
      <h1>{type === "privacy" ? "Privacy policy" : "Terms of use"}</h1>
      <p className="reading-description">
        Clear information about your Gtech learning space.
      </p>
      <Prose content={type === "privacy" ? privacy : terms} />
      <Link className="editorial-link" to="/contact">
        Have a question? Let&apos;s talk <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function NotFoundPage() {
  return (
    <div className="public-container not-found-page">
      <span className="section-eyebrow">A LITTLE DETOUR</span>
      <strong>404</strong>
      <h1>This chapter hasn&apos;t been written.</h1>
      <p>Let&apos;s get you back to something worth exploring.</p>
      <Link className="site-button primary" to="/">
        Back to Gtech <ArrowRight size={16} />
      </Link>
    </div>
  );
}
