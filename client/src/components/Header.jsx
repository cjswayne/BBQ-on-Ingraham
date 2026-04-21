import { Link, NavLink } from "react-router-dom";

import logo from "../assets/bbqoningraham-logo.png";
import { useAuth } from "../context/AuthContext.jsx";

const navLinkClassName = ({ isActive }) => {
  return `rounded-full px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-white/20 text-white"
      : "text-white/80 hover:bg-white/10 hover:text-white"
  }`;
};

export const Header = ({ isMenuOpen, onMenuToggle, onOpenLogin }) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-pb-ocean text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link className="flex items-center gap-2" to="/">
          <img
            alt="BBQ On Ingraham"
            className="h-8 w-auto object-contain"
            src={logo}
          />
          <span className="text-lg font-semibold tracking-tight">BBQ On Ingraham</span>
        </Link>

        <button
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          className="rounded-full border border-white/20 px-3 py-2 text-sm md:hidden"
          onClick={onMenuToggle}
          type="button"
        >
          Menu
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          <NavLink className={navLinkClassName} to="/">
            Home
          </NavLink>
          <NavLink className={navLinkClassName} to="/about">
            About
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink className={navLinkClassName} to="/admin">
                Admin
              </NavLink>
              <button
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-pb-ocean transition hover:bg-pb-cream"
                onClick={logout}
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="rounded-full bg-pb-coral px-4 py-2 text-sm font-medium text-white transition hover:brightness-105"
              onClick={onOpenLogin}
              type="button"
            >
              Login
            </button>
          )}
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
          {isAuthenticated ? (
            <>
              <NavLink className={navLinkClassName} to="/admin">
                Admin
              </NavLink>
              <button
                className="block w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-pb-ocean"
                onClick={logout}
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="block w-full rounded-full bg-pb-coral px-4 py-2 text-sm font-medium text-white"
              onClick={onOpenLogin}
              type="button"
            >
              Login
            </button>
          )}
        </nav>
      ) : null}
    </header>
  );
};
