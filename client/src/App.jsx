import { Suspense, lazy, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Home from "./pages/Home.jsx";
import { LoginModal } from "./components/LoginModal.jsx";

const AboutPage = lazy(() => import("./pages/About.jsx"));
const AdminPage = lazy(() => import("./pages/Admin.jsx"));

const PageFallback = () => {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-6xl items-center justify-center px-4 py-10">
      <p className="text-sm text-pb-driftwood">Loading page...</p>
    </div>
  );
};

const AdminRoute = ({ onOpenLogin }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageFallback />;
  }

  if (!isAuthenticated) {
    onOpenLogin();
    return <Navigate replace to="/" />;
  }

  return <AdminPage />;
};

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const openLoginModal = () => {
    setIsLoginModalOpen(true);
    setIsMenuOpen(false);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen((currentValue) => !currentValue);
  };

  return (
    <div className="min-h-screen bg-pb-sand text-pb-ink">
      <Header
        isMenuOpen={isMenuOpen}
        onMenuToggle={toggleMenu}
        onOpenLogin={openLoginModal}
      />

      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home onOpenLogin={openLoginModal} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/admin"
            element={<AdminRoute onOpenLogin={openLoginModal} />}
          />
        </Routes>
      </Suspense>

      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
      <Footer />
    </div>
  );
};

export default App;
