import { useEffect, useRef } from "react";

type Props = {
  initial?: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  disabled?: boolean;
};

function ctx2d(c: HTMLCanvasElement) {
  return c.getContext("2d", { willReadFrequently: true });
}

export function PontoAssinaturaPad({ initial, onChange, label, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inkRef = useRef<string | null>(initial ?? null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;

    function tamanhoCss(): { w: number; h: number } {
      const r = wrap!.getBoundingClientRect();
      return { w: Math.max(Math.round(r.width), 1), h: Math.max(Math.round(r.height), 1) };
    }

    function preparar(base: string | null) {
      const c = canvasRef.current;
      if (!c) return;
      const { w, h } = tamanhoCss();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      const ctx = ctx2d(c);
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (!base) return;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
      };
      img.src = base;
    }

    function emitir() {
      const c = canvasRef.current;
      if (!c) return;
      const data = c.toDataURL("image/png");
      inkRef.current = data;
      onChangeRef.current(data);
    }

    function ponto(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function down(e: PointerEvent) {
      if (disabledRef.current) return;
      e.preventDefault();
      drawing.current = true;
      canvas!.setPointerCapture(e.pointerId);
      const ctx = ctx2d(canvas!);
      if (!ctx) return;
      const p = ponto(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function move(e: PointerEvent) {
      if (!drawing.current || disabledRef.current) return;
      e.preventDefault();
      const ctx = ctx2d(canvas!);
      if (!ctx) return;
      const p = ponto(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    function up(e: PointerEvent) {
      if (!drawing.current) return;
      drawing.current = false;
      try {
        canvas!.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      emitir();
    }

    preparar(inkRef.current);
    const ro = new ResizeObserver(() => {
      if (drawing.current) return;
      preparar(inkRef.current);
    });
    ro.observe(wrap);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  function limpar() {
    if (disabled) return;
    inkRef.current = null;
    onChange(null);
    const c = canvasRef.current;
    const wrap = c?.parentElement;
    if (!c || !wrap) return;
    const r = wrap.getBoundingClientRect();
    const w = Math.max(Math.round(r.width), 1);
    const h = Math.max(Math.round(r.height), 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = ctx2d(c);
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  return (
    <div className={`dash-ponto-ass-pad${disabled ? " is-disabled" : ""}`}>
      <div className="dash-ponto-ass-pad__head">
        <span>{label}</span>
        <button type="button" className="dash-ponto-ass-pad__limpar" onClick={limpar} disabled={disabled}>
          Limpar
        </button>
      </div>
      <div className="dash-ponto-ass-pad__canvas-wrap">
        <canvas
          ref={canvasRef}
          className="dash-ponto-ass-pad__canvas"
          aria-label={label}
        />
      </div>
      <p className="dash-ponto-ass-pad__hint">Desenhe com o mouse ou o dedo.</p>
    </div>
  );
}
