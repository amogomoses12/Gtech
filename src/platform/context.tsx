import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, post, setCsrf } from "./api";
import type { SiteConfig, User } from "./types";
import { Toast } from "../components/ui";

interface Session {
  user: User | null;
  csrfToken: string | null;
}
interface AuthValue {
  user: User | null;
  loading: boolean;
  error: string;
  config: SiteConfig | null;
  acceptSession: (session: Session) => void;
  refresh: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
const NoticeContext = createContext<(message: string) => void>(() => {});

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [notice, setNotice] = useState("");
  const close = useCallback(() => setNotice(""), []);
  const acceptSession = useCallback((session: Session) => {
    setUser(session.user);
    setCsrf(session.csrfToken);
  }, []);
  const refreshConfig = useCallback(async () => {
    setConfig(await api<SiteConfig>("/config"));
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [session, site] = await Promise.all([
        api<Session>("/auth/me"),
        api<SiteConfig>("/config"),
      ]);
      acceptSession(session);
      setConfig(site);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [acceptSession]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const logout = async () => {
    await post("/auth/logout");
    acceptSession({ user: null, csrfToken: null });
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        config,
        acceptSession,
        refresh,
        refreshConfig,
        logout,
      }}
    >
      <NoticeContext.Provider value={setNotice}>
        {children}
        {notice && <Toast message={notice} onClose={close} />}
      </NoticeContext.Provider>
    </AuthContext.Provider>
  );
}
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Auth provider missing.");
  return context;
};
export const useNotice = () => useContext(NoticeContext);
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((previous) => previous + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    api<T>(path, { signal: controller.signal })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, version]);
  return { data, loading, error, refresh, setData };
}
export function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="route-loading">
        <span className="loading-spinner" />
        Opening your workspace...
      </div>
    );
  if (error)
    return (
      <div className="route-error">
        <h1>We could not connect.</h1>
        <p>{error}</p>
        <button
          className="button button-primary"
          onClick={() => void refresh()}
        >
          Try again
        </button>
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (admin && user.role !== "admin")
    return <Navigate to="/my-learning" replace />;
  return children;
}
