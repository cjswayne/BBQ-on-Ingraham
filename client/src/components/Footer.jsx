import { Link } from "react-router-dom";

import logo from "../assets/bbqoningraham-logo.png";

export const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-black/5 bg-pb-ocean px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <Link className="flex items-center gap-2" to="/">
          <img
            alt="BBQ On Ingraham"
            className="h-7 w-auto object-contain"
            loading="lazy"
            src={logo}
          />
          <span className="text-sm font-semibold">BBQ On Ingraham</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            className="text-xs font-medium text-white/60 hover:text-white/90 transition-colors"
            to="/share"
          >
            Share
          </Link>
          <Link
            className="text-xs font-medium text-white/60 hover:text-white/90 transition-colors"
            to="/admin"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};
