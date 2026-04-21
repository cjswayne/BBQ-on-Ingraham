import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Home from "./pages/Home.jsx";

const AboutPage = lazy(() => import("./pages/About.jsx"));
const AdminPage = lazy(() => import("./pages/Admin.jsx"));

const PageFallback = () => {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-6xl items-center justify-center px-4 py-10">
      <p className="text-sm text-pb-driftwood">Loading page...</p>
    </div>
  );
};

// Admin still requires a valid JWT; redirect silently to home if not present
const AdminRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/" />;
  }

  return <AdminPage />;
};

const App = () => {
  return (
    <div className="min-h-screen text-pb-ink">
      <Header />

      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Routes>
      </Suspense>

      {/* <Footer /> */}
    </div>
  );
};

export default App;
