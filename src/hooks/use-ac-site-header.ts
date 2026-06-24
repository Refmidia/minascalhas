import { useEffect } from "react";

/** Menu mobile e scroll do header (comum à home e páginas do site). */
export function useAcSiteHeader() {
  useEffect(() => {
    const navToggle = document.getElementById("ac-nav-toggle");
    const nav = document.getElementById("ac-nav");
    const backdrop = document.getElementById("ac-nav-backdrop");
    const header = document.getElementById("ac-header");

    const closeNav = () => {
      nav?.classList.remove("is-open");
      navToggle?.classList.remove("is-open");
      backdrop?.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
      navToggle?.setAttribute("aria-label", "Abrir menu");
      document.body.classList.remove("mc-nav-open");
    };

    const openNav = () => {
      if (!nav || !navToggle) return;
      nav.classList.add("is-open");
      navToggle.classList.add("is-open");
      backdrop?.classList.add("is-open");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Fechar menu");
      document.body.classList.add("mc-nav-open");
    };

    const onToggle = () => {
      if (!nav) return;
      if (nav.classList.contains("is-open")) closeNav();
      else openNav();
    };

    const onBackdrop = () => closeNav();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNav();
    };

    const anchorLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];
    anchorLinks.forEach((link) => link.addEventListener("click", closeNav));

    navToggle?.addEventListener("click", onToggle);
    backdrop?.addEventListener("click", onBackdrop);
    window.addEventListener("keydown", onKeyDown);

    const onScroll = () => {
      header?.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      navToggle?.removeEventListener("click", onToggle);
      backdrop?.removeEventListener("click", onBackdrop);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      anchorLinks.forEach((link) => link.removeEventListener("click", closeNav));
      document.body.classList.remove("mc-nav-open");
    };
  }, []);
}
