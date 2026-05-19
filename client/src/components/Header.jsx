import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import logo from "../assets/bbqoningraham-logo.png";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Builds desktop and mobile navigation link styles.
 * @param {{ isActive: boolean }} options - Active-state metadata from NavLink.
 * @returns {string} Tailwind class list for each navigation link.
 */
const navLinkClassName = ({ isActive }) => {
  return `rounded-full px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-white/20 text-white"
      : "text-white/80 hover:bg-white/10 hover:text-white"
  }`;
};

/**
 * Resolves a safe uppercase initial from a user name value.
 * @param {string} name - User display name.
 * @returns {string} Single uppercase initial for avatar fallback.
 */
const getUserInitial = (name) => {
  return (name?.charAt(0) || "U").toUpperCase();
};

/**
 * Renders the app header with navigation and account avatar.
 * @returns {JSX.Element} Header UI.
 */
export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const rafRef = useRef(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setIsScrolled(window.scrollY > 50);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /**
   * Toggles the mobile menu open and closed.
   * @returns {void}
   */
  const toggleMenu = () => setIsMenuOpen((v) => !v);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b text-white transition-all duration-300 ${
        isScrolled
          ? "border-black/5 bg-pb-ocean shadow-sm"
          : "border-transparent bg-transparent shadow-none"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link className="flex items-center gap-2" to={isAuthenticated && user ? "/profile" : "/"}>
          {isAuthenticated && user ? (
            user.profilePhotoUrl ? (
              <img
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover border-2 border-white/30"
                src={user.profilePhotoUrl}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pb-palm border-2 border-white/30">
                <span className="text-sm font-bold text-white">{getUserInitial(user.name)}</span>
              </div>
            )
          ) : (
            <img
              alt="BBQ On Ingraham"
              className="h-8 w-auto object-contain"
              src={logo}
            />
          )}
          <h1 className="text-lg font-semibold tracking-tight">BBQ On Ingraham</h1>
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

        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-2">
            <NavLink className={navLinkClassName} to="/">
              Home
            </NavLink>
            <NavLink className={navLinkClassName} to="/about">
              About
            </NavLink>
            <NavLink className={navLinkClassName} to="/gallery">
              Gallery
            </NavLink>
            <NavLink className={navLinkClassName} to="/upload">
              Upload
            </NavLink>
          </nav>
          {isAuthenticated && user ? (
            <div className="flex items-center">
              {user.profilePhotoUrl ? (
                <Link to="/profile">
                  <img
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover border-2 border-white/30"
                    src={user.profilePhotoUrl}
                  />
                </Link>
              ) : (
                <Link to="/profile">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pb-palm border-2 border-white/30">
                    <span className="text-sm font-bold text-white">{getUserInitial(user.name)}</span>
                  </div>
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {isMenuOpen ? (
        <nav className="space-y-2 border-t border-white/10 px-4 py-3 md:hidden">
          <NavLink className={navLinkClassName} to="/">
            Home
          </NavLink>
          <NavLink className={navLinkClassName} to="/about">
            About
          </NavLink>
          <NavLink className={navLinkClassName} to="/gallery">
            Gallery
          </NavLink>
          <NavLink className={navLinkClassName} to="/upload">
            Upload
          </NavLink>
        </nav>
      ) : null}
    </header>
  );
};
