import { useEffect, useRef, useState } from "react";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const rafRef = useRef(null);

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
