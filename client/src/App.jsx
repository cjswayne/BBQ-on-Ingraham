import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import Home from "./pages/Home.jsx";

const AboutPage = lazy(() => import("./pages/About.jsx"));
const AdminPage = lazy(() => import("./pages/Admin.jsx"));
const CreateAccountPage = lazy(() => import("./pages/CreateAccount.jsx"));
const GalleryPage = lazy(() => import("./pages/Gallery.jsx"));
const ProfilePage = lazy(() => import("./pages/Profile.jsx"));
const SetPasswordPage = lazy(() => import("./pages/SetPassword.jsx"));
const SharePage = lazy(() => import("./pages/Share.jsx"));
const UploadPage = lazy(() => import("./pages/Upload.jsx"));

const PageFallback = () => {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-6xl items-center justify-center px-4 py-10">
      <p className="text-sm text-pb-driftwood">Loading page...</p>
    </div>
  );
};

const App = () => {
  return (
    <div className="min-h-screen pt-16 text-pb-ink">
      <Header />

      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </Suspense>

      <Footer />
    </div>
  );
};

export default App;
