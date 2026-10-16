import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  GraduationCap,
  Play,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useResource } from "./context";
import type { Course } from "./types";
import { CourseTile, ErrorState, Loading, SectionTitle } from "./shared";

export default function Home() {
  const [subject, setSubject] = useState("All subjects");
  const { data, loading, error, refresh } = useResource<Course[]>("/courses");
  const featured =
    data
      ?.filter(
        (course) => subject === "All subjects" || course.subject === subject,
      )
      .slice(0, 3) || [];
  return (
    <>
      <section className="home-hero">
        <img
          className="hero-photograph"
          src="/images/learning-hero.jpg"
          alt="Students sharing ideas and learning together in a bright university library"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="public-container hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span />
              FOR THE CURIOUS. FOR WHAT&apos;S NEXT.
            </span>
            <h1>
              Big possibilities.
              <br />
              Begin with <em>Gtech.</em>
            </h1>
            <p>
              Make sense of the difficult. Build on what you know. Discover
              learning that takes you a little further.
            </p>
            <div className="hero-actions">
              <Link to="/learn" className="site-button lime">
                Find your next course <ArrowUpRight size={18} />
              </Link>
              <Link to="/materials" className="hero-secondary">
                Explore free resources <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="public-section home-courses">
        <div className="public-container">
          <SectionTitle
            eyebrow="A GOOD PLACE TO START"
            title="A little learning. A lot of possibility."
            text="Clear explanations, practical skills, and a path that feels like yours."
            link="/learn"
            linkText="Explore all courses"
          />
          <div
            className="subject-tabs"
            role="tablist"
            aria-label="Featured course subjects"
          >
            {[
              "All subjects",
              "Mathematics",
              "Physics",
              "Technology",
              "Scholarships",
            ].map((item) => (
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
          ) : (
            <div className="course-grid">
              {featured.map((course) => (
                <CourseTile key={course.id} course={course} />
              ))}
            </div>
          )}
          {!loading && !error && !featured.length && (
            <p className="quiet-empty">
              New courses are on their way. Explore another subject for now.
            </p>
          )}
        </div>
      </section>
      <section className="why-section public-section">
        <div className="public-container">
          <SectionTitle
            eyebrow="LEARNING, THE GTECH WAY"
            title="Less overwhelm. More lightbulb moments."
            text="A thoughtful way to learn, whether you're finding your feet or finding your next challenge."
          />
          <div className="learning-principles">
            <div>
              <span className="principle-number">01 /</span>
              <BookOpen size={27} strokeWidth={1.4} />
              <h3>Understand the why.</h3>
              <p>
                Approachable lessons and worked examples that make complex ideas
                feel a little simpler.
              </p>
            </div>
            <div>
              <span className="principle-number">02 /</span>
              <Play size={27} strokeWidth={1.4} />
              <h3>Make it your own.</h3>
              <p>
                Read, watch, pause, and come back. Your progress stays with you,
                at a pace that works for you.
              </p>
            </div>
            <div>
              <span className="principle-number">03 /</span>
              <Sparkles size={27} strokeWidth={1.4} />
              <h3>Put it into practice.</h3>
              <p>
                Try a question, learn from the answer, and turn a little
                understanding into lasting confidence.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="scholarship-feature">
        <div className="scholarship-feature-image">
          <img
            src="/images/scholarships.jpg"
            alt="A library full of books and possibilities"
            loading="lazy"
          />
        </div>
        <div className="scholarship-feature-copy">
          <span className="section-eyebrow">
            <GraduationCap size={15} />A BIGGER PICTURE
          </span>
          <h2>
            Your ambitions deserve
            <br />a head start.
          </h2>
          <p>
            From your first personal statement to your final checklist, find
            thoughtful resources for your scholarship journey.
          </p>
          <ul>
            <li>
              <Check size={16} />
              Application and personal statement guides
            </li>
            <li>
              <Check size={16} />
              Research tools and preparation checklists
            </li>
            <li>
              <Check size={16} />
              Free resources, ready when you are
            </li>
          </ul>
          <Link to="/scholarships" className="site-button primary">
            Explore scholarship resources <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <section className="public-section home-faq">
        <div className="public-container faq-layout">
          <div>
            <span className="section-eyebrow">
              A FEW THINGS YOU MIGHT WONDER
            </span>
            <h2>
              Curiosity looks
              <br />
              good on you.
            </h2>
            <p>
              Have a different question?
              <br />
              <Link to="/contact">
                We&apos;re here to help <ArrowUpRight size={14} />
              </Link>
            </p>
          </div>
          <div className="public-faq-list">
            {[
              [
                "Where should I start?",
                "Start with a subject you are curious about. Our free beginner courses in maths, physics, and technology are designed to give you a clear starting point. You can preview the first lesson before creating an account.",
              ],
              [
                "Can I learn for free?",
                "Yes. You can read free study materials and scholarship guides without an account. Create a free account to enroll in free courses, save lesson progress, and keep your practice results. Paid courses are clearly labeled with their one-time price.",
              ],
              [
                "What happens when I buy a course?",
                "Your course is added to My learning after the payment is verified. You can then access the lessons and attached course materials. Gtech does not store your card details; live card payments use Stripe Checkout.",
              ],
              [
                "Does Gtech offer or guarantee scholarships?",
                "Gtech provides preparation materials, not scholarship awards or guarantees. Always check eligibility, application rules, and deadlines on the official scholarship provider website.",
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span>+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="learning-cta">
        <div className="public-container">
          <div>
            <span className="section-eyebrow">YOUR NEXT CHAPTER</span>
            <h2>It starts with a little curiosity.</h2>
            <p>
              There&apos;s something here for the person you&apos;re becoming.
            </p>
          </div>
          <Link to="/learn" className="site-button lime">
            Let&apos;s find your starting point <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
