import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  FileChartColumn,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Target,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { api, patch, post, put, remove, uploadFile } from "./api";
import { useAuth, useNotice, useResource } from "./context";
import type {
  Course,
  Material,
  Message,
  Order,
  Overview,
  Quiz,
  Upload,
  User,
} from "./types";
import { dateLabel, money, subjects } from "./types";
import { Empty, ErrorState, FormError, Loading } from "./shared";
import { Avatar, IconButton, Logo, Modal, SelectField } from "../components/ui";
import {
  CourseEditor,
  DeleteAction,
  LessonManager,
  MaterialEditor,
  QuizEditor,
} from "./AdminEditors";
import { downloadCsv } from "../data";
import type { Member, Project } from "../data";
import { Pagination, ProjectsTable } from "../components/workspace";
import { ProjectForm } from "../components/forms";

const navGroups: {
  label: string;
  items: { slug: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    label: "WORKSPACE",
    items: [
      { slug: "", label: "Overview", icon: LayoutGrid },
      { slug: "courses", label: "Courses", icon: BookOpen },
      { slug: "materials", label: "Materials", icon: FileText },
      { slug: "practice", label: "Practice", icon: Target },
      { slug: "scholarships", label: "Scholarships", icon: GraduationCap },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { slug: "learners", label: "Learners", icon: Users },
      { slug: "orders", label: "Transactions", icon: CreditCard },
      { slug: "uploads", label: "Media library", icon: UploadCloud },
      { slug: "projects", label: "Projects", icon: FolderKanban },
      { slug: "reports", label: "Reports", icon: FileChartColumn },
      { slug: "messages", label: "Support inbox", icon: MessageSquare },
    ],
  },
];

function AdminHeading({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading animate-enter">
      <div>
        <div className="page-title-row">
          <h1>{title}</h1>
        </div>
        <p>{text}</p>
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
function Published({ value }: { value: boolean }) {
  return (
    <span className={`admin-status ${value ? "published" : "draft"}`}>
      <i />
      {value ? "Published" : "Draft"}
    </span>
  );
}
function OrderStatus({ order }: { order: Order }) {
  return (
    <span
      className={`admin-status ${["paid", "test_paid"].includes(order.status) ? "published" : order.status === "pending" ? "pending" : "draft"}`}
    >
      <i />
      {order.status === "test_paid"
        ? "Test paid"
        : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
    </span>
  );
}
function TableSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="table-search">
      <Search size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          <X size={13} />
        </button>
      )}
    </label>
  );
}

export default function AdminApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, config } = useAuth();
  const notice = useNotice();
  const [open, setOpen] = useState(false);
  const section = location.pathname.split("/")[2] || "";
  const title =
    navGroups
      .flatMap((group) => group.items)
      .find((item) => item.slug === section)?.label ||
    (section === "settings" ? "Settings" : "Overview");
  const navigateOut = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      notice((err as Error).message);
    }
  };
  return (
    <div className="app-shell platform-admin">
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand-row">
          <Link
            to="/admin"
            className="brand-link"
            aria-label="Gtech admin overview"
          >
            <Logo />
          </Link>
          <IconButton
            className="mobile-close"
            label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={19} />
          </IconButton>
        </div>
        <Link className="admin-workspace-switcher" to="/">
          <span className="workspace-symbol">
            <Logo small />
          </span>
          <span>
            <strong>{config?.site_name || "Gtech"} workspace</strong>
            <small>Learning administration</small>
          </span>
          <ArrowUpRight size={15} />
        </Link>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  end
                  to={`/admin${item.slug ? `/${item.slug}` : ""}`}
                  key={item.slug}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "nav-active" : ""}`
                  }
                >
                  <item.icon size={18} strokeWidth={1.7} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-bottom-links">
            <NavLink
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-active" : ""}`
              }
              to="/admin/settings"
              onClick={() => setOpen(false)}
            >
              <Settings2 size={18} />
              <span>Settings</span>
            </NavLink>
            <Link className="nav-item" to="/">
              <ExternalLink size={17} />
              <span>Visit website</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <Link className="sidebar-profile" to="/account">
            <Avatar name={user?.name || "Administrator"} size={36} />
            <span>
              <strong>{user?.name}</strong>
              <small>Workspace admin</small>
            </span>
            <ChevronRight size={15} />
          </Link>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton
              label="Open navigation"
              className="mobile-menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </IconButton>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>{title}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <Link className="admin-website-link" to="/">
              Your public website <ArrowUpRight size={14} />
            </Link>
            <div className="topbar-icons">
              <Link
                className="icon-button"
                to="/admin/messages"
                title="Support inbox"
                aria-label="Support inbox"
              >
                <MessageSquare size={18} />
              </Link>
              <IconButton label="Sign out" onClick={() => void navigateOut()}>
                <LogOut size={18} />
              </IconButton>
            </div>
            <Link
              className="topbar-profile"
              to="/account"
              aria-label="Your account"
            >
              <Avatar name={user?.name || "Admin"} size={33} />
            </Link>
          </div>
        </header>
        <main className="main-content" key={section}>
          {section === "" ? (
            <AdminOverview />
          ) : section === "courses" ? (
            <ManageCourses />
          ) : section === "materials" || section === "scholarships" ? (
            <ManageMaterials scholarships={section === "scholarships"} />
          ) : section === "practice" ? (
            <ManagePractice />
          ) : section === "learners" ? (
            <ManageLearners />
          ) : section === "orders" ? (
            <ManageOrders />
          ) : section === "uploads" ? (
            <ManageUploads />
          ) : section === "projects" ? (
            <ManageProjects />
          ) : section === "reports" ? (
            <AdminReports />
          ) : section === "messages" ? (
            <SupportInbox />
          ) : section === "settings" ? (
            <AdminSettings />
          ) : (
            <Empty
              title="This page isn't in your workspace."
              text="Go back to your overview to get started."
              to="/admin"
              action="Back to overview"
            />
          )}
          <footer className="page-footer">
            <span>
              &copy; {new Date().getFullYear()} Gtech. Built for what&apos;s
              next.
            </span>
            <div>
              <span className="footer-status">
                <span className="live-dot" />
                Your learning platform, connected.
              </span>
              <span className="footer-divider" />
              <Link to="/">View public site</Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function AdminOverview() {
  const { user } = useAuth();
  const [days, setDays] = useState("30");
  const [chart, setChart] = useState("Enrollments");
  const { data, loading, error, refresh } = useResource<Overview>(
    `/admin/overview?days=${days}`,
  );
  const navigate = useNavigate();
  const exportSummary = () => {
    if (data)
      downloadCsv(
        "Gtech-overview",
        ["Metric", "Value", "Period"],
        [
          ["Live revenue (USD)", data.revenue / 100, `Last ${days} days`],
          ["Published courses", data.published_courses, "All time"],
          ["Learners", data.learners, "All time"],
          ["Enrollments", data.enrollments, "All time"],
          ["Test purchases", data.test_orders, "All time"],
        ],
      );
  };
  const colors = ["#3b785a", "#9dba99", "#c7d5b8", "#e7ecde"];
  let start = 0;
  const donut = data?.subjects
    .map((item, index) => {
      const end = start + (item.count / (data.published_courses || 1)) * 100;
      const value = `${colors[index % 4]} ${start}% ${end}%`;
      start = end;
      return value;
    })
    .join(",");
  return (
    <>
      <AdminHeading
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        text="Here's what's happening at Gtech today."
      >
        <Sun size={23} className="welcome-sun" />
        <div className="date-select">
          <CalendarDays size={15} />
          <select
            aria-label="Reporting period"
            value={days}
            onChange={(event) => setDays(event.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <button
          className="button button-primary"
          onClick={exportSummary}
          disabled={!data}
        >
          <Download size={15} />
          Export report
        </button>
      </AdminHeading>
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState
          message={error || "Could not load your dashboard."}
          retry={refresh}
        />
      ) : (
        <>
          <section className="metrics-grid animate-enter delay-1">
            {[
              {
                label: "Total revenue",
                value: money(data.revenue),
                note: "Verified live payments",
                icon: CreditCard,
                to: "orders",
              },
              {
                label: "Published courses",
                value: data.published_courses,
                note: `${data.total_courses} courses in your library`,
                icon: BookOpen,
                to: "courses",
              },
              {
                label: "Total learners",
                value: data.learners,
                note: "Real registered accounts",
                icon: Users,
                to: "learners",
              },
              {
                label: "Course enrollments",
                value: data.enrollments,
                note: "Every new chapter counts",
                icon: GraduationCap,
                to: "learners",
              },
            ].map((item, i) => (
              <button
                key={item.label}
                className={`metric-card ${i === 0 ? "metric-selected" : ""}`}
                onClick={() => navigate(`/admin/${item.to}`)}
              >
                <div className="metric-top">
                  <span>{item.label}</span>
                  <item.icon size={18} strokeWidth={1.6} />
                </div>
                <div className="metric-value">{item.value}</div>
                <div className="metric-bottom">
                  <span className="metric-real-note">
                    <span className="live-dot" />
                    {item.note}
                  </span>
                  <ArrowUpRight size={15} className="muted-icon" />
                </div>
              </button>
            ))}
          </section>
          <div className="dashboard-chart-grid animate-enter delay-2">
            <section className="panel revenue-panel">
              <div className="panel-heading">
                <div>
                  <h2>Learning in motion</h2>
                  <p>Real activity, as it happens.</p>
                </div>
                <SelectField
                  value={chart}
                  onChange={setChart}
                  options={["Enrollments", "Revenue"]}
                  label="Chart metric"
                />
              </div>
              <div className="chart-summary">
                <div className="chart-total">
                  {chart === "Revenue"
                    ? money(data.revenue)
                    : data.series.reduce(
                        (sum, row) => sum + row.enrollments,
                        0,
                      )}
                  <span className="admin-chart-period">
                    {chart === "Revenue" ? "USD" : "enrollments"} in the last{" "}
                    {days} days
                  </span>
                </div>
                <span className="chart-legend">
                  <i className="legend-dot current-dot" />
                  {chart}
                </span>
              </div>
              <div className="revenue-chart">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart
                    data={data.series}
                    margin={{ top: 14, left: -25, right: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="admin-chart-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#3b785a"
                          stopOpacity={0.17}
                        />
                        <stop
                          offset="100%"
                          stopColor="#3b785a"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#e9ede6"
                      strokeDasharray="3 4"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={35}
                      tick={{ fontSize: 9, fill: "#8c9583" }}
                      tickFormatter={(value) =>
                        new Date(`${value}T12:00:00`).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )
                      }
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#8c9583" }}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        border: "1px solid #e2e8dc",
                        borderRadius: 7,
                      }}
                      labelFormatter={(value) => String(value)}
                      formatter={(value) =>
                        chart === "Revenue"
                          ? `$${Number(value).toFixed(2)}`
                          : value
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey={chart === "Revenue" ? "revenue" : "enrollments"}
                      name={chart}
                      stroke="#367452"
                      strokeWidth={2.3}
                      fill="url(#admin-chart-fill)"
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="panel customer-panel">
              <div className="panel-heading">
                <div>
                  <h2>Your learning library</h2>
                  <p>A world of ideas, taking shape.</p>
                </div>
                <IconButton
                  label="Manage learning library"
                  onClick={() => navigate("/admin/courses")}
                >
                  <MoreHorizontal size={19} />
                </IconButton>
              </div>
              <div className="admin-donut-wrap">
                <div
                  className="admin-donut"
                  style={{
                    background: donut ? `conic-gradient(${donut})` : "#e9eee3",
                  }}
                />
                <div className="donut-center">
                  <span>Published courses</span>
                  <strong>{data.published_courses}</strong>
                  <small>{data.materials} study materials</small>
                </div>
              </div>
              <div className="customer-legend">
                {data.subjects.map((item, i) => (
                  <button
                    key={item.subject}
                    onClick={() =>
                      navigate(`/admin/courses?subject=${item.subject}`)
                    }
                  >
                    <span>
                      <i
                        className="legend-dot"
                        style={{ background: colors[i % 4] }}
                      />
                      {item.subject}
                    </span>
                    <strong>{item.count}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="dashboard-bottom-grid animate-enter delay-3">
            <section className="panel recent-projects">
              <div className="panel-heading">
                <div>
                  <h2>Recent courses</h2>
                  <p>A little progress, every day.</p>
                </div>
                <Link to="/admin/courses" className="text-button">
                  Manage courses <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="table-scroll">
                <table className="data-table admin-recent-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Lessons</th>
                      <th>Access</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.courses.map((course) => (
                      <tr key={course.id}>
                        <td>
                          <Link
                            to={`/courses/${course.slug}`}
                            className="admin-course-name"
                          >
                            <img src={course.image} alt="" />
                            <span>
                              <strong>{course.title}</strong>
                              <small>{course.subject}</small>
                            </span>
                          </Link>
                        </td>
                        <td>{course.lesson_count}</td>
                        <td>
                          {course.price_cents
                            ? money(course.price_cents)
                            : "Free"}
                        </td>
                        <td>
                          <Published value={course.published} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="recent-projects-footer">
                <span>
                  <span className="live-dot" />
                  {data.total_courses} courses, ready for what&apos;s next
                </span>
                <Link className="text-button" to="/admin/courses">
                  <Plus size={13} />
                  Create a course
                </Link>
              </div>
            </section>
            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recent activity</h2>
                  <p>The latest around your workspace.</p>
                </div>
                <IconButton label="Refresh activity" onClick={refresh}>
                  <ArrowUpRight size={17} />
                </IconButton>
              </div>
              <div className="admin-activity-list">
                {data.activity.length ? (
                  data.activity.slice(0, 5).map((item) => (
                    <div className="activity-item" key={item.id}>
                      <Avatar name={item.name || "Gtech"} size={30} />
                      <span className="activity-copy">
                        <span>
                          <strong>{item.name || "Gtech"}</strong> {item.action}{" "}
                          <b>{item.subject}</b>
                        </span>
                        <small>{dateLabel(item.created_at)}</small>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="admin-quiet-state">
                    <ChartNoAxesCombined size={27} strokeWidth={1.4} />
                    <h3>Good things start here.</h3>
                    <p>
                      New enrollments, uploads, and course changes will appear
                      as your community grows.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
          {data.payment.provider === "development" && (
            <p className="admin-development-note">
              <ShieldCheck size={14} />
              Development mode is on. {data.test_orders} test purchases are
              excluded from live revenue.{" "}
              <Link to="/admin/settings">
                Payment settings <ArrowRight size={12} />
              </Link>
            </p>
          )}
        </>
      )}
    </>
  );
}

function ManageCourses() {
  const { data, loading, error, refresh } =
    useResource<Course[]>("/admin/courses");
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(
    params.get("subject") || "All subjects",
  );
  const [filter, setFilter] = useState("All courses");
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [lessons, setLessons] = useState<Course | null>(null);
  const [page, setPage] = useState(1);
  const notice = useNotice();
  const filtered =
    data?.filter(
      (course) =>
        (subject === "All subjects" || course.subject === subject) &&
        (filter === "All courses" ||
          course.published === (filter === "Published")) &&
        `${course.title} ${course.subject}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <AdminHeading
        title="Courses"
        text="Big ideas. Clear lessons. Great learning, together."
      >
        <button
          className="button button-primary"
          onClick={() => setEditing("new")}
        >
          <Plus size={16} />
          Create course
        </button>
      </AdminHeading>
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <div className="table-tabs">
            {["All courses", "Published", "Drafts"].map((item) => (
              <button
                key={item}
                className={filter === item ? "tab-active" : ""}
                onClick={() => {
                  setFilter(item);
                  setPage(1);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="table-tools">
            <SelectField
              value={subject}
              onChange={(value) => {
                setSubject(value);
                setPage(1);
              }}
              options={["All subjects", ...subjects]}
              label="Filter course subject"
            />
            <TableSearch
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search courses..."
            />
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course name</th>
                  <th>Lessons</th>
                  <th>Enrolled</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 8, page * 8).map((course) => (
                  <tr key={course.id}>
                    <td>
                      <button
                        className="admin-course-name"
                        onClick={() => setEditing(course)}
                      >
                        <img src={course.image} alt="" />
                        <span>
                          <strong>{course.title}</strong>
                          <small>
                            {course.subject} · {course.level}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>{course.lesson_count}</td>
                    <td>{course.enrollment_count || 0}</td>
                    <td>
                      {course.price_cents ? money(course.price_cents) : "Free"}
                    </td>
                    <td>
                      <Published value={course.published} />
                    </td>
                    <td>
                      <div className="table-action-buttons">
                        <button
                          className="button button-secondary button-small"
                          onClick={() => setLessons(course)}
                        >
                          <BookOpen size={13} />
                          Lessons
                        </button>
                        <IconButton
                          label={`Edit ${course.title}`}
                          onClick={() => setEditing(course)}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        <DeleteAction
                          path={`/admin/courses/${course.id}`}
                          label={course.title}
                          onDeleted={() => {
                            refresh();
                            setPage(1);
                            notice("Course deleted.");
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your next course starts here."
            text="Try a different filter or create a course for your learners."
          />
        )}
        <Pagination
          page={page}
          setPage={setPage}
          total={filtered.length}
          noun="courses"
        />
      </section>
      {editing && (
        <CourseEditor
          course={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            notice("Course saved to your learning library.");
          }}
        />
      )}
      {lessons && (
        <LessonManager
          course={lessons}
          onClose={() => setLessons(null)}
          onSaved={() => {
            refresh();
            notice("Your learning path has been updated.");
          }}
        />
      )}
    </>
  );
}

function ManageMaterials({ scholarships = false }: { scholarships?: boolean }) {
  const { data, loading, error, refresh } =
    useResource<Material[]>("/admin/resources");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All materials");
  const [editing, setEditing] = useState<Material | "new" | null>(null);
  const notice = useNotice();
  const filtered =
    data?.filter(
      (material) =>
        (!scholarships || material.subject === "Scholarships") &&
        (filter === "All materials" ||
          material.published === (filter === "Published")) &&
        `${material.title} ${material.subject}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <AdminHeading
        title={scholarships ? "Scholarship resources" : "Learning materials"}
        text={
          scholarships
            ? "A thoughtful head start for your learners."
            : "Good explanations deserve a place to live."
        }
      >
        <button
          className="button button-primary"
          onClick={() => setEditing("new")}
        >
          <Plus size={16} />
          Add {scholarships ? "resource" : "material"}
        </button>
      </AdminHeading>
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <div className="table-tabs">
            {["All materials", "Published", "Drafts"].map((item) => (
              <button
                key={item}
                className={filter === item ? "tab-active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <TableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search materials..."
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Subject</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((material) => (
                  <tr key={material.id}>
                    <td>
                      <button
                        className="person-cell"
                        onClick={() => setEditing(material)}
                      >
                        <span className="admin-file-icon">
                          <FileText size={19} />
                        </span>
                        <span>
                          <strong>{material.title}</strong>
                          <small>
                            {material.kind}
                            {material.file_id ? " · File attached" : ""}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td className="muted-cell">{material.subject}</td>
                    <td className="muted-cell">
                      {material.course_id ? "Enrolled learners" : "Everyone"}
                    </td>
                    <td>
                      <Published value={material.published} />
                    </td>
                    <td>
                      <div className="table-action-buttons">
                        {material.published && (
                          <Link
                            className="icon-button"
                            aria-label={`Read ${material.title}`}
                            to={`/materials/${material.id}`}
                          >
                            <ExternalLink size={15} />
                          </Link>
                        )}
                        <IconButton
                          label={`Edit ${material.title}`}
                          onClick={() => setEditing(material)}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        <DeleteAction
                          path={`/admin/resources/${material.id}`}
                          label={material.title}
                          onDeleted={() => {
                            refresh();
                            notice("Material deleted.");
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="A new reading belongs here."
            text="Add a guide, publish a worksheet, or upload your course materials."
          />
        )}
      </section>
      {editing && (
        <MaterialEditor
          material={editing === "new" ? undefined : editing}
          scholarship={scholarships}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            notice("Your material has been saved.");
          }}
        />
      )}
    </>
  );
}

function ManagePractice() {
  const { data, loading, error, refresh } =
    useResource<Quiz[]>("/admin/quizzes");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Quiz | "new" | null>(null);
  const notice = useNotice();
  const filtered =
    data?.filter((quiz) =>
      quiz.title.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <AdminHeading
        title="Practice sessions"
        text="Small challenges. Lasting understanding."
      >
        <button
          className="button button-primary"
          onClick={() => setEditing("new")}
        >
          <Plus size={16} />
          Create session
        </button>
      </AdminHeading>
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <span className="admin-list-caption">
            {data?.length || 0} practice sessions
          </span>
          <TableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search sessions..."
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Practice session</th>
                  <th>Subject</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((quiz) => (
                  <tr key={quiz.id}>
                    <td>
                      <button
                        className="person-cell"
                        onClick={() => setEditing(quiz)}
                      >
                        <span className="admin-file-icon">
                          <Target size={20} />
                        </span>
                        <span>
                          <strong>{quiz.title}</strong>
                          <small>Self-paced practice</small>
                        </span>
                      </button>
                    </td>
                    <td className="muted-cell">{quiz.subject}</td>
                    <td>{quiz.questions?.length || 0}</td>
                    <td className="muted-cell">{quiz.duration} min</td>
                    <td>
                      <Published value={quiz.published} />
                    </td>
                    <td>
                      <div className="table-action-buttons">
                        <IconButton
                          label={`Edit ${quiz.title}`}
                          onClick={() => setEditing(quiz)}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        <DeleteAction
                          path={`/admin/quizzes/${quiz.id}`}
                          label={quiz.title}
                          onDeleted={() => {
                            refresh();
                            notice(
                              "Practice session deleted. Saved results are preserved.",
                            );
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Let's make room for a challenge."
            text="Create a practice session with questions, options, and helpful explanations."
          />
        )}
      </section>
      {editing && (
        <QuizEditor
          quiz={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            notice("Practice session saved.");
          }}
        />
      )}
    </>
  );
}

function ManageLearners() {
  const { data, loading, error, refresh } =
    useResource<User[]>("/admin/learners");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All accounts");
  const [selected, setSelected] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const notice = useNotice();
  const filtered =
    data?.filter(
      (user) =>
        (filter === "All accounts" ||
          user.role === (filter === "Learners" ? "student" : "admin")) &&
        `${user.name} ${user.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <AdminHeading
        title="Your learning community"
        text="Meet the people taking their next step with Gtech."
      >
        <button
          className="button button-secondary"
          disabled={!data}
          onClick={() =>
            downloadCsv(
              "Gtech-accounts",
              ["Name", "Email", "Role", "Status", "Enrolled courses", "Joined"],
              filtered.map((user) => [
                user.name,
                user.email,
                user.role,
                user.status,
                user.enrollments || 0,
                user.created_at,
              ]),
            )
          }
        >
          <Download size={15} />
          Export
        </button>
      </AdminHeading>
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <div className="table-tabs">
            {["All accounts", "Learners", "Administrators"].map((item) => (
              <button
                key={item}
                className={filter === item ? "tab-active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <TableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search people..."
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table directory-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Courses</th>
                  <th>Practice attempts</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <button
                        className="person-cell"
                        onClick={() => {
                          setSelected(user);
                          setActionError("");
                        }}
                      >
                        <Avatar name={user.name} size={35} />
                        <span>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className="role-label">{user.role}</span>
                    </td>
                    <td>{user.enrollments || 0}</td>
                    <td>{user.attempts || 0}</td>
                    <td>
                      <span
                        className={`admin-status ${user.status === "active" ? "published" : "draft"}`}
                      >
                        <i />
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <IconButton
                        label={`View ${user.name}`}
                        onClick={() => {
                          setSelected(user);
                          setActionError("");
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your community is just getting started."
            text="New registrations will appear here automatically."
          />
        )}
      </section>
      {selected && (
        <Modal
          title={selected.name}
          subtitle={selected.email}
          onClose={() => setSelected(null)}
        >
          <dl className="detail-list">
            <div>
              <dt>Role</dt>
              <dd>{selected.role}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{dateLabel(selected.created_at)}</dd>
            </div>
            <div>
              <dt>Course enrollments</dt>
              <dd>{selected.enrollments || 0}</dd>
            </div>
            <div>
              <dt>Practice attempts</dt>
              <dd>{selected.attempts || 0}</dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>{selected.status}</dd>
            </div>
          </dl>
          {selected.role === "admin" ? (
            <p className="form-note">
              Administrator accounts are managed through the server's admin
              creation command, not through public registration.
            </p>
          ) : (
            <>
              <p className="form-note">
                Suspending an account revokes its active sessions. Course and
                payment records are preserved. You can reactivate it later.
              </p>
              <FormError message={actionError} />
              <div className="form-actions">
                <button
                  className={`button ${selected.status === "active" ? "button-danger" : "button-primary"}`}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setActionError("");
                    try {
                      await patch(`/admin/learners/${selected.id}`, {
                        status:
                          selected.status === "active" ? "suspended" : "active",
                      });
                      refresh();
                      setSelected(null);
                      notice("Account access updated.");
                    } catch (err) {
                      setActionError((err as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy
                    ? "Updating..."
                    : selected.status === "active"
                      ? "Suspend account"
                      : "Reactivate account"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function ManageOrders() {
  const { data, loading, error, refresh } =
    useResource<Order[]>("/admin/orders");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All orders");
  const [selected, setSelected] = useState<Order | null>(null);
  const filtered =
    data?.filter(
      (order) =>
        (filter === "All orders" ||
          (filter === "Live payments"
            ? order.payment_mode === "live"
            : filter === "Test payments"
              ? order.payment_mode === "test"
              : order.status === "pending")) &&
        `${order.course_title} ${order.name} ${order.email} ${order.id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  const exportOrders = () =>
    downloadCsv(
      "Gtech-transactions",
      [
        "Order",
        "Name",
        "Email",
        "Course",
        "Amount (USD)",
        "Status",
        "Mode",
        "Provider",
        "Created",
      ],
      filtered.map((order) => [
        order.id,
        order.name || "",
        order.email || "",
        order.course_title,
        order.amount_cents / 100,
        order.status,
        order.payment_mode,
        order.provider,
        order.created_at,
      ]),
    );
  return (
    <>
      <AdminHeading
        title="Transactions"
        text="Every payment, properly accounted for."
      >
        <button
          className="button button-secondary"
          onClick={exportOrders}
          disabled={!data}
        >
          <Download size={15} />
          Export transactions
        </button>
      </AdminHeading>
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <div className="table-tabs">
            {["All orders", "Live payments", "Test payments", "Pending"].map(
              (item) => (
                <button
                  key={item}
                  className={filter === item ? "tab-active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <TableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search transactions..."
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Learner</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        className="person-cell"
                        onClick={() => setSelected(order)}
                      >
                        <span className="transaction-icon">
                          <CreditCard size={18} />
                        </span>
                        <span>
                          <strong>{order.course_title}</strong>
                          <small>{order.id.slice(0, 8).toUpperCase()}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      {order.name}
                      <span className="table-secondary-line">
                        {order.email}
                      </span>
                    </td>
                    <td className="amount-cell">{money(order.amount_cents)}</td>
                    <td>
                      <OrderStatus order={order} />
                    </td>
                    <td className="muted-cell">
                      {order.payment_mode} / {order.provider}
                    </td>
                    <td className="muted-cell">
                      {dateLabel(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your next transaction will appear here."
            text="Payments are recorded by the server. Test purchases are always labeled and excluded from live revenue."
          />
        )}
      </section>
      {selected && (
        <Modal
          title="Order details"
          subtitle={selected.id}
          onClose={() => setSelected(null)}
        >
          <div className="invoice-summary">
            <strong>{money(selected.amount_cents)}</strong>
            <OrderStatus order={selected} />
          </div>
          <dl className="detail-list">
            <div>
              <dt>Course</dt>
              <dd>{selected.course_title}</dd>
            </div>
            <div>
              <dt>Learner</dt>
              <dd>{selected.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{selected.email}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{selected.provider}</dd>
            </div>
            <div>
              <dt>Payment mode</dt>
              <dd>{selected.payment_mode}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{dateLabel(selected.created_at)}</dd>
            </div>
          </dl>
          <p className="form-note">
            Payment status cannot be changed manually. Live payments are
            verified with Stripe. Process real refunds in the Stripe dashboard;
            full-refund webhooks revoke access.
          </p>
        </Modal>
      )}
    </>
  );
}

function ManageUploads() {
  const { data, loading, error, refresh } =
    useResource<Upload[]>("/admin/uploads");
  const { config } = useAuth();
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [query, setQuery] = useState("");
  const notice = useNotice();
  const files =
    data?.filter((file) =>
      file.original_name.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <AdminHeading
        title="Media library"
        text="Give your lessons a voice. Give your ideas a home."
      />
      <label className="admin-media-upload">
        <input
          type="file"
          accept=".mp4,.webm,.pdf,.jpg,.jpeg,.png"
          disabled={progress !== null}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const input = event.currentTarget;
            setUploadError("");
            if (file.size > (config?.max_upload_mb || 250) * 1024 * 1024) {
              setUploadError(
                `Upload a file under ${config?.max_upload_mb || 250} MB.`,
              );
              return;
            }
            setProgress(0);
            try {
              await uploadFile<Upload>(file, setProgress);
              refresh();
              notice(
                "File uploaded. Attach it to a lesson or material when you are ready.",
              );
            } catch (err) {
              setUploadError((err as Error).message);
            } finally {
              setProgress(null);
              input.value = "";
            }
          }}
        />
        <UploadCloud size={33} strokeWidth={1.4} />
        <div>
          <h2>
            {progress !== null
              ? `Uploading your file... ${progress}%`
              : "Bring your next lesson to life."}
          </h2>
          <p>
            Choose a video tutorial, PDF, or image to upload. MP4, WebM, PDF,
            JPG, PNG. Up to {config?.max_upload_mb || 250} MB.
          </p>
        </div>
        <span className="button button-primary">
          {progress !== null ? "Uploading..." : "Choose a file"}
          <Plus size={15} />
        </span>
        {progress !== null && (
          <div className="upload-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </label>
      <FormError message={uploadError} />
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <span className="admin-list-caption">
            {data?.length || 0} files in your library
          </span>
          <TableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search media..."
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : files.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <a
                        className="person-cell"
                        href={`/api/files/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="admin-file-icon">
                          <FileText size={20} />
                        </span>
                        <strong>{file.original_name}</strong>
                      </a>
                    </td>
                    <td className="muted-cell">
                      {file.mime.split("/")[1].toUpperCase()}
                    </td>
                    <td className="muted-cell">
                      {file.size >= 1048576
                        ? `${(file.size / 1048576).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(file.size / 1024))} KB`}
                    </td>
                    <td className="muted-cell">{dateLabel(file.created_at)}</td>
                    <td>
                      <div className="table-action-buttons">
                        <a
                          className="icon-button"
                          href={`/api/files/${file.id}?download=1`}
                          aria-label={`Download ${file.original_name}`}
                        >
                          <Download size={15} />
                        </a>
                        <DeleteAction
                          path={`/admin/uploads/${file.id}`}
                          label={file.original_name}
                          onDeleted={() => {
                            refresh();
                            notice("Unused file deleted.");
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="A little room for your ideas."
            text="Upload your first video or course material. Files are private until attached to published content."
          />
        )}
      </section>
    </>
  );
}

function ManageProjects() {
  const { data, loading, error, refresh } =
    useResource<Project[]>("/admin/projects");
  const { data: users } = useResource<User[]>("/admin/learners");
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const notice = useNotice();
  const members: Member[] =
    users
      ?.filter((user) => user.role === "admin")
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: "Admin",
        department: "Management",
        status: "Active",
        avatar: "",
      })) || [];
  const projects =
    data?.filter((project) =>
      project.name.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <AdminHeading
        title="Projects"
        text="The same Gtech workspace. Now connected to your database."
      >
        <button
          className="button button-primary"
          onClick={() => {
            setEditing("new");
            setActionError("");
          }}
        >
          <Plus size={16} />
          New project
        </button>
      </AdminHeading>
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <span className="admin-list-caption">
            {data?.length || 0} workspace projects
          </span>
          <TableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search projects..."
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : (
          <ProjectsTable
            projects={projects}
            members={members}
            onOpen={(project) => {
              setEditing(project);
              setActionError("");
            }}
          />
        )}
      </section>
      {editing && (
        <Modal
          title={editing === "new" ? "Create a project" : "Project details"}
          subtitle="Keep your next milestone in sight."
          onClose={() => {
            if (!saving) setEditing(null);
          }}
          drawer={editing !== "new"}
        >
          <FormError message={actionError} />
          <fieldset className="unframed-fieldset" disabled={saving}>
            <ProjectForm
              project={editing === "new" ? undefined : editing}
              members={members}
              onCancel={() => setEditing(null)}
              onSubmit={async (values) => {
                setSaving(true);
                setActionError("");
                try {
                  if (editing === "new") await post("/admin/projects", values);
                  else await put(`/admin/projects/${editing.id}`, values);
                  refresh();
                  setEditing(null);
                  notice("Project saved to your database.");
                } catch (err) {
                  setActionError((err as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
              onDelete={async () => {
                if (editing === "new") return;
                setSaving(true);
                try {
                  await remove(`/admin/projects/${editing.id}`);
                  setEditing(null);
                  refresh();
                  notice("Project archived.");
                } catch (err) {
                  setActionError((err as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            />
          </fieldset>
        </Modal>
      )}
    </>
  );
}

function AdminReports() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const notice = useNotice();
  const reports = [
    {
      key: "courses",
      title: "Learning library report",
      text: "Published and draft courses, prices, lessons, and enrollments.",
    },
    {
      key: "learners",
      title: "Your learning community",
      text: "Account details, enrollment counts, and practice activity.",
    },
    {
      key: "orders",
      title: "Transaction report",
      text: "All orders, with live and test payments clearly separated.",
    },
    {
      key: "overview",
      title: "Platform performance",
      text: "Daily enrollment activity and verified live revenue for the last 30 days.",
    },
  ];
  const generate = async (key: string, title: string) => {
    setBusy(key);
    setError("");
    try {
      if (key === "courses") {
        const rows = await api<Course[]>("/admin/courses");
        downloadCsv(
          title,
          [
            "Course",
            "Subject",
            "Price (USD)",
            "Published",
            "Lessons",
            "Enrollments",
          ],
          rows.map((row) => [
            row.title,
            row.subject,
            row.price_cents / 100,
            row.published ? "Yes" : "No",
            row.lesson_count,
            row.enrollment_count || 0,
          ]),
        );
      } else if (key === "learners") {
        const rows = await api<User[]>("/admin/learners");
        downloadCsv(
          title,
          [
            "Name",
            "Email",
            "Role",
            "Status",
            "Enrollments",
            "Practice attempts",
          ],
          rows.map((row) => [
            row.name,
            row.email,
            row.role,
            row.status,
            row.enrollments || 0,
            row.attempts || 0,
          ]),
        );
      } else if (key === "orders") {
        const rows = await api<Order[]>("/admin/orders");
        downloadCsv(
          title,
          [
            "Order",
            "Course",
            "Customer",
            "Amount (USD)",
            "Status",
            "Mode",
            "Provider",
            "Date",
          ],
          rows.map((row) => [
            row.id,
            row.course_title,
            row.email || "",
            row.amount_cents / 100,
            row.status,
            row.payment_mode,
            row.provider,
            row.created_at,
          ]),
        );
      } else {
        const result = await api<Overview>("/admin/overview?days=30");
        downloadCsv(
          title,
          ["Date", "Enrollments", "Live revenue (USD)"],
          result.series.map((row) => [row.date, row.enrollments, row.revenue]),
        );
      }
      notice("Your report is ready. CSV downloaded.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <AdminHeading
        title="Reports"
        text="Turn your platform data into your next good decision."
      />
      <section className="panel reports-panel">
        <div className="panel-heading">
          <div>
            <h2>A clearer view of Gtech</h2>
            <p>Generated from your database at the moment you download.</p>
          </div>
          <span className="subtle-count">CSV reports</span>
        </div>
        <div className="report-list">
          {reports.map((report) => (
            <div className="report-row" key={report.key}>
              <span className="report-icon">
                <FileChartColumn size={22} />
              </span>
              <div className="report-description">
                <h3>{report.title}</h3>
                <p>{report.text}</p>
              </div>
              <button
                className="button button-secondary button-small"
                disabled={Boolean(busy)}
                onClick={() => void generate(report.key, report.title)}
              >
                <Download size={15} />
                {busy === report.key ? "Generating..." : "Download"}
              </button>
            </div>
          ))}
        </div>
        <div className="report-note">
          <span>Real data. Ready for your next decision.</span>
          <span>
            No test purchases in live revenue <ShieldCheck size={14} />
          </span>
        </div>
      </section>
      <FormError message={error} />
    </>
  );
}

function SupportInbox() {
  const { data, loading, error, refresh } =
    useResource<Message[]>("/admin/messages");
  const [filter, setFilter] = useState("All messages");
  const [selected, setSelected] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const notice = useNotice();
  const filtered =
    data?.filter(
      (message) =>
        filter === "All messages" || message.status === filter.toLowerCase(),
    ) || [];
  return (
    <>
      <AdminHeading
        title="Support inbox"
        text="A little help can make a big difference."
      />
      <section className="panel full-table-panel">
        <div className="table-toolbar">
          <div className="table-tabs">
            {["All messages", "New", "Read", "Resolved"].map((item) => (
              <button
                key={item}
                className={filter === item ? "tab-active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <span className="admin-list-caption">
            {data?.filter((message) => message.status === "new").length || 0}{" "}
            new messages
          </span>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} retry={refresh} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <button
                        className="person-cell"
                        onClick={() => {
                          setSelected(message);
                          setActionError("");
                        }}
                      >
                        <Avatar name={message.name} size={34} />
                        <span>
                          <strong>{message.name}</strong>
                          <small>{message.email}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <button
                        className="admin-table-link"
                        onClick={() => {
                          setSelected(message);
                          setActionError("");
                        }}
                      >
                        {message.subject}
                      </button>
                    </td>
                    <td>
                      <span
                        className={`admin-status ${message.status === "new" ? "pending" : message.status === "resolved" ? "published" : "draft"}`}
                      >
                        <i />
                        {message.status}
                      </span>
                    </td>
                    <td className="muted-cell">
                      {dateLabel(message.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="All quiet in your inbox."
            text="Messages sent through the website contact form will appear here."
          />
        )}
      </section>
      {selected && (
        <Modal
          title={selected.subject}
          subtitle={`GT-${String(selected.id).padStart(5, "0")} · ${selected.name}`}
          onClose={() => setSelected(null)}
          wide
        >
          <p className="support-message-content">{selected.message}</p>
          <dl className="detail-list">
            <div>
              <dt>Reply to</dt>
              <dd>{selected.email}</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{dateLabel(selected.created_at)}</dd>
            </div>
          </dl>
          <FormError message={actionError} />
          <div className="support-message-actions">
            <a
              className="button button-secondary"
              href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}
            >
              Reply by email <ArrowUpRight size={14} />
            </a>
            <SelectField
              label="Message status"
              value={selected.status}
              onChange={async (status) => {
                setBusy(true);
                setActionError("");
                try {
                  await patch(`/admin/messages/${selected.id}`, { status });
                  setSelected({ ...selected, status });
                  refresh();
                  notice("Message status updated.");
                } catch (err) {
                  setActionError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              options={["new", "read", "resolved"]}
            />
            {busy && <span>Saving...</span>}
          </div>
          <p className="field-hint">
            Reply opens your email app. Gtech stores the message and its status;
            outgoing email is not configured.
          </p>
        </Modal>
      )}
    </>
  );
}

function AdminSettings() {
  const { data, loading, error, refresh } = useResource<{
    site_name: string;
    support_email: string;
    tagline: string;
    payment: { provider: string; mode: string };
  }>("/admin/settings");
  const { refreshConfig } = useAuth();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const notice = useNotice();
  return (
    <>
      <AdminHeading
        title="Workspace settings"
        text="Make your Gtech platform feel like yours."
      />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorState
          message={error || "Settings unavailable."}
          retry={refresh}
        />
      ) : (
        <form
          className="settings-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setActionError("");
            try {
              await put("/admin/settings", {
                site_name: form.get("site_name"),
                support_email: form.get("support_email"),
                tagline: form.get("tagline"),
              });
              await refreshConfig();
              notice("Your website settings have been saved.");
            } catch (err) {
              setActionError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <section className="settings-section">
            <div className="settings-section-description">
              <h2>Your website</h2>
              <p>The details that welcome your learners.</p>
            </div>
            <div className="settings-fields">
              <label className="field">
                Website name
                <input
                  name="site_name"
                  defaultValue={data.site_name}
                  required
                  maxLength={60}
                />
              </label>
              <label className="field">
                Support email
                <input
                  name="support_email"
                  type="email"
                  defaultValue={data.support_email}
                  required
                  maxLength={200}
                />
              </label>
              <label className="field">
                Website tagline
                <input
                  name="tagline"
                  defaultValue={data.tagline}
                  required
                  maxLength={200}
                />
              </label>
            </div>
          </section>
          <section className="settings-section">
            <div className="settings-section-description">
              <h2>Payments</h2>
              <p>Secure checkout, configured on your server.</p>
            </div>
            <div className="settings-fields">
              <div className="payment-setting-status">
                <ShieldCheck size={23} />
                <div>
                  <strong>
                    {data.payment.provider === "stripe"
                      ? "Stripe Checkout"
                      : data.payment.provider === "development"
                        ? "Development checkout"
                        : "Payments not configured"}
                  </strong>
                  <span>
                    {data.payment.mode === "live" ? "Live mode" : "Test mode"} ·
                    USD
                  </span>
                </div>
              </div>
              <p className="field-hint">
                Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your server
                environment. Secrets never belong in browser settings.
                Development purchases are disabled automatically in production.
              </p>
              <p className="field-hint">
                Before launch, configure your HTTPS public URL, verify Stripe
                webhooks, review your legal pages and refund policy, and back up
                your database and uploads.
              </p>
            </div>
          </section>
          <section className="settings-section">
            <div className="settings-section-description">
              <h2>Your account</h2>
              <p>Personal details and password security.</p>
            </div>
            <div className="settings-fields">
              <Link className="button button-secondary" to="/account">
                Manage your profile <ArrowUpRight size={15} />
              </Link>
              <p className="field-hint">
                To create another administrator, run npm run admin:create on the
                server. Public registration can only create learner accounts.
              </p>
            </div>
          </section>
          <FormError message={actionError} />
          <div className="settings-footer">
            <span>
              <ShieldCheck size={16} />
              Changes are stored in your Gtech database.
            </span>
            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
