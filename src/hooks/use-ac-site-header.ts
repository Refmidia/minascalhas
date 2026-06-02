import { useEffect } from "react";

/** Menu mobile e scroll do header (comum à home e páginas do site). */
export function useAcSiteHeader() {
  useEffect(() => {
    const navToggle = document.getElementById("ac-nav-toggle");
    const nav = document.getElementById("ac-nav");
    const header = document.getElementById("ac-header");

    const closeNav = () => {
      nav?.classList.remove("is-open");
      navToggle?.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    };

    const onToggle = () => {
      if (!nav || !navToggle) return;
      const open = nav.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    };

    navToggle?.addEventListener("click", onToggle);
    nav?.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    const onScroll = () => {
      header?.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      navToggle?.removeEventListener("click", onToggle);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}
