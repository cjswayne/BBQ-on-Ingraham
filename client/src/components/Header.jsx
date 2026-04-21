import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import logo from "../assets/bbqoningraham-logo.png";

const navLinkClassName = ({ isActive }) => {
  return `rounded-full px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-white/20 text-white"
      : "text-white/80 hover:bg-white/10 hover:text-white"
  }`;
};

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((v) => !v);

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-pb-ocean text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link className="flex items-center gap-2" to="/">
          <img
            alt="BBQ On Ingraham"
            className="h-8 w-auto object-contain"
            src={logo}
          />
          <h2 className="text-lg font-semibold tracking-tight">BBQ On Ingraham</h2>
        </Link>

        {/* <button
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          className="rounded-full border border-white/20 px-3 py-2 text-sm md:hidden"
          onClick={toggleMenu}
          type="button"
        >
          Menu
        </button> */}

        <nav className="hidden items-center gap-2 md:flex">
          <NavLink className={navLinkClassName} to="/">
            Home
          </NavLink>
          <NavLink className={navLinkClassName} to="/about">
            About
          </NavLink>
        </nav>
      </div>

      {isMenuOpen ? (
        <nav className="space-y-2 border-t border-white/10 px-4 py-3 md:hidden">
          <NavLink className={navLinkClassName} to="/">
            Home
          </NavLink>
          <NavLink className={navLinkClassName} to="/about">
            About
          </NavLink>
        </nav>
      ) : null}
    </header>
  );
};
