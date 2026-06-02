import { useEffect } from "react";

/** Comportamentos de `home-landing.js` (menu, âncoras, hero, carrossel). */
export function useHomeLandingEffects() {
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

    const onAnchor = (e: Event) => {
      const anchor = e.currentTarget as HTMLAnchorElement;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top =
        target.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight + 12 : 80);
      window.scrollTo({ top, behavior: "smooth" });
    };

    const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
    anchors.forEach((a) => a.addEventListener("click", onAnchor));

    return () => {
      navToggle?.removeEventListener("click", onToggle);
      anchors.forEach((a) => a.removeEventListener("click", onAnchor));
    };
  }, []);

  useEffect(() => {
    const heroSlider = document.getElementById("ac-hero-slider");
    if (!heroSlider) return;

    const slides = heroSlider.querySelectorAll<HTMLElement>(".ac-hero-slider__slide");
    let current = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    const total = slides.length;

    const goTo = (index: number) => {
      if (total <= 1 || index === current) return;
      slides[current]?.classList.remove("is-active");
      current = (index + total) % total;
      slides[current]?.classList.add("is-active");
    };

    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);

    const startAuto = () => {
      if (timer) clearInterval(timer);
      if (total > 1) timer = setInterval(next, 3000);
    };

    const stopAuto = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const btnPrev = document.getElementById("ac-hero-prev");
    const btnNext = document.getElementById("ac-hero-next");
    const onPrev = () => {
      prev();
      startAuto();
    };
    const onNext = () => {
      next();
      startAuto();
    };

    btnPrev?.addEventListener("click", onPrev);
    btnNext?.addEventListener("click", onNext);
    heroSlider.addEventListener("mouseenter", stopAuto);
    heroSlider.addEventListener("mouseleave", startAuto);
    heroSlider.addEventListener("focusin", stopAuto);
    heroSlider.addEventListener("focusout", startAuto);
    startAuto();

    return () => {
      stopAuto();
      btnPrev?.removeEventListener("click", onPrev);
      btnNext?.removeEventListener("click", onNext);
    };
  }, []);

  useEffect(() => {
    const portfolioCarousel = document.getElementById("ac-portfolio-carousel");
    if (!portfolioCarousel) return;

    const track = portfolioCarousel.querySelector<HTMLElement>(".ac-portfolio-carousel__track");
    if (!track || track.children.length === 0) return;

    const originals = Array.from(track.children);
    const totalOriginal = originals.length;
    originals.forEach((node) => {
      const clone = node.cloneNode(true);
      (clone as HTMLElement).setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    let index = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const getStep = () => {
      const first = track.children[0] as HTMLElement | undefined;
      if (!first) return 0;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return first.getBoundingClientRect().width + gap;
    };

    const applyTransform = (animate: boolean) => {
      track.style.transition = animate
        ? "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)"
        : "none";
      track.style.transform = `translate3d(-${index * getStep()}px, 0, 0)`;
    };

    const next = () => {
      if (totalOriginal <= 1) return;
      index += 1;
      applyTransform(true);
      if (index >= totalOriginal) {
        const onEnd = (e: TransitionEvent) => {
          if (e.propertyName !== "transform" || e.target !== track) return;
          track.removeEventListener("transitionend", onEnd);
          index = 0;
          applyTransform(false);
        };
        track.addEventListener("transitionend", onEnd);
      }
    };

    const startPortfolioAuto = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 3000);
    };

    const stopPortfolioAuto = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    let resizeT: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => applyTransform(false), 120);
    };

    window.addEventListener("resize", onResize);
    portfolioCarousel.addEventListener("mouseenter", stopPortfolioAuto);
    portfolioCarousel.addEventListener("mouseleave", startPortfolioAuto);
    portfolioCarousel.addEventListener("focusin", stopPortfolioAuto);
    portfolioCarousel.addEventListener("focusout", startPortfolioAuto);
    applyTransform(false);
    startPortfolioAuto();

    return () => {
      stopPortfolioAuto();
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeT);
    };
  }, []);
}
