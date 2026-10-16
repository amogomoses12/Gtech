import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Providers, RequireAuth } from "./platform/context";
import PublicLayout from "./platform/PublicLayout";
import Home from "./platform/Home";
import AuthPage from "./platform/AuthPages";
import {
  Catalog,
  CoursePage,
  LessonPage,
  MaterialPage,
  MaterialsPage,
} from "./platform/LearningPages";
import {
  PracticePage,
  PracticeResult,
  PracticeSession,
} from "./platform/PracticePages";
import { AccountPage, MyLearningPage } from "./platform/AccountPages";
import { CheckoutResult, DevelopmentCheckout } from "./platform/CheckoutPages";
import {
  AboutPage,
  ContactPage,
  LegalPage,
  NotFoundPage,
} from "./platform/InfoPages";
import AdminApp from "./platform/AdminApp";
import "./platform/public.css";
import "./platform/admin.css";

function PageTitles() {
  const { pathname } = useLocation();
  useEffect(() => {
    const names: Record<string, string> = {
      "/": "Learn. Grow. Go further.",
      "/learn": "Learning hub",
      "/materials": "Study materials",
      "/scholarships": "Scholarship resources",
      "/practice": "Practice",
      "/about": "Our story",
      "/contact": "Contact & support",
      "/login": "Welcome back",
      "/register": "Your next chapter",
      "/my-learning": "My learning",
      "/account": "Your account",
      "/admin": "Admin workspace",
    };
    document.title = `${names[pathname] || "Your next chapter"} | Gtech`;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <PageTitles />
        <Routes>
          <Route path="/login" element={<AuthPage key="login" />} />
          <Route
            path="/register"
            element={<AuthPage key="register" register />}
          />
          <Route
            path="/admin/*"
            element={
              <RequireAuth admin>
                <AdminApp />
              </RequireAuth>
            }
          />
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="learn" element={<Catalog />} />
            <Route path="courses/:slug" element={<CoursePage />} />
            <Route path="lessons/:id" element={<LessonPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="materials/:id" element={<MaterialPage />} />
            <Route
              path="scholarships"
              element={<MaterialsPage key="scholarships" scholarships />}
            />
            <Route path="practice" element={<PracticePage />} />
            <Route
              path="practice/results/:id"
              element={
                <RequireAuth>
                  <PracticeResult />
                </RequireAuth>
              }
            />
            <Route
              path="practice/:id"
              element={
                <RequireAuth>
                  <PracticeSession />
                </RequireAuth>
              }
            />
            <Route
              path="my-learning"
              element={
                <RequireAuth>
                  <MyLearningPage />
                </RequireAuth>
              }
            />
            <Route
              path="account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="checkout/development/:id"
              element={
                <RequireAuth>
                  <DevelopmentCheckout />
                </RequireAuth>
              }
            />
            <Route
              path="checkout/success"
              element={
                <RequireAuth>
                  <CheckoutResult />
                </RequireAuth>
              }
            />
            <Route
              path="checkout/cancel"
              element={
                <RequireAuth>
                  <CheckoutResult cancelled />
                </RequireAuth>
              }
            />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="privacy" element={<LegalPage type="privacy" />} />
            <Route path="terms" element={<LegalPage type="terms" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}
