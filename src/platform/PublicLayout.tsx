import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Logo, Avatar } from "../components/ui";
import { useAuth, useNotice } from "./context";

export default function PublicLayout() {
  const { user, config, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const notice = useNotice();
  useEffect(() => {
    setMenu(false);
    setAccount(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(".site-account"))
        setAccount(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        setAccount(false);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return (
    <div className="website">
      <a href="#page-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-logo" to="/" aria-label="Gtech home">
            <Logo />
          </Link>
          <nav
            className={`site-nav ${menu ? "is-open" : ""}`}
            aria-label="Website navigation"
          >
            <NavLink to="/learn">Learning hub</NavLink>
            <NavLink to="/practice">Practice</NavLink>
            <NavLink to="/scholarships">Scholarships</NavLink>
            <NavLink to="/about">About Gtech</NavLink>
            <Link
              to={user ? "/my-learning" : "/login"}
              className="mobile-account-link"
            >
              {user ? "My learning" : "Sign in"}
            </Link>
          </nav>
          <div className="site-header-actions">
            {user ? (
              <div className="site-account">
                <button
                  className="site-account-button"
                  aria-label="Your account"
                  aria-expanded={account}
                  onClick={() => setAccount(!account)}
                >
                  <Avatar name={user.name} size={33} />
                  <span>{user.name.split(" ")[0]}</span>
                  <ChevronDown size={14} />
                </button>
                {account && (
                  <div className="site-account-menu">
                    <span>YOUR GTECH SPACE</span>
                    <Link to="/my-learning">
                      <BookOpen size={15} />
                      My learning
                    </Link>
                    <Link to="/account">Account settings</Link>
                    {user.role === "admin" && (
                      <Link to="/admin">
                        Admin dashboard <ArrowUpRight size={14} />
                      </Link>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          await logout();
                          navigate("/");
                          notice("You have been signed out.");
                        } catch (err) {
                          notice((err as Error).message);
                        }
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link className="site-sign-in" to="/login">
                Sign in
              </Link>
            )}
            <Link
              className="site-button primary header-cta"
              to={user ? "/my-learning" : "/register"}
            >
              {user ? "My learning" : "Get started"}
              <ArrowUpRight size={15} />
            </Link>
            <button
              className="site-menu-button"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
            >
              {menu ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>
      <main id="page-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="public-container">
          <div className="footer-main">
            <div className="footer-brand">
              <Link to="/" aria-label="Gtech home">
                <Logo />
              </Link>
              <p>
                {config?.tagline ||
                  "A little curiosity. A world of possibility."}
              </p>
              <Link to="/contact" className="footer-contact">
                Let&apos;s talk <ArrowUpRight size={15} />
              </Link>
            </div>
            <div>
              <h3>Keep learning</h3>
              <Link to="/learn">All courses</Link>
              <Link to="/learn?subject=Mathematics">Mathematics</Link>
              <Link to="/learn?subject=Physics">Physics</Link>
              <Link to="/practice">Practice sessions</Link>
            </div>
            <div>
              <h3>Go a little further</h3>
              <Link to="/scholarships">Scholarship resources</Link>
              <Link to="/materials">Study materials</Link>
              <Link to="/my-learning">My learning</Link>
              <Link to="/learn?price=free">Free courses</Link>
            </div>
            <div>
              <h3>Meet Gtech</h3>
              <Link to="/about">Our story</Link>
              <Link to="/contact">Contact & support</Link>
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms of use</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              &copy; {new Date().getFullYear()} {config?.site_name || "Gtech"}.
              Built for what comes next.
            </span>
            <span>
              Learn something. Change something.
              <ArrowRight size={14} />
            </span>
            <Link to="/admin" className="admin-footer-link">
              Admin <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
