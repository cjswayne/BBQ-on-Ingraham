import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

// Fade out the HTML skeleton now that React has painted the real UI
const skeleton = document.getElementById("hero-skeleton");
if (skeleton) {
  skeleton.style.transition = "opacity 0.3s ease-out";
  skeleton.style.opacity = "0";
  skeleton.addEventListener("transitionend", () => skeleton.remove(), { once: true });
}

// Load non-critical body background after first paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.classList.add("bg-loaded");
  });
});
