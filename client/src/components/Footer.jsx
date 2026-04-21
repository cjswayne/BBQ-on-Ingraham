import { Link } from "react-router-dom";

import logo from "../assets/bbqoningraham-logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-black/5 bg-pb-ocean px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <Link className="flex items-center gap-2" to="/">
          <img
            alt="BBQ On Ingraham"
            className="h-7 w-auto object-contain"
            src={logo}
          />
          <span className="text-sm font-semibold">BBQ On Ingraham</span>
        </Link>
        <p className="text-xs text-white/60">
          Your building's Monday cookout — keep it simple.
        </p>
      </div>
    </footer>
  );
};
