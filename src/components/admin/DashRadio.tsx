import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "alex_dash_radio_on";
const VOL_KEY = "alex_dash_radio_volume";
const STREAM_URL_KEY = "alex_dash_radio_stream_url";

/** Volume fixo no controle 0–100 (nível 3). */
const RADIO_VOLUME_LEVEL = 3;
const RADIO_VOLUME = RADIO_VOLUME_LEVEL / 100;

const DEFAULT_STREAM = "https://live.hunter.fm/pop2k_normal";

function primaryStream(): string {
  const env = import.meta.env.VITE_RADIO_STREAM?.trim();
  if (env) return env;
  const saved = localStorage.getItem(STREAM_URL_KEY)?.trim();
  if (saved) return saved;
  return DEFAULT_STREAM;
}

function fallbackStream(): string | null {
  const env = import.meta.env.VITE_RADIO_STREAM_FALLBACK?.trim();
  return env || null;
}

function volumeIcon(v: number): string {
  if (v <= 0) return "bi-volume-mute-fill";
  if (v < 0.35) return "bi-volume-off-fill";
  if (v < 0.7) return "bi-volume-down-fill";
  return "bi-volume-up-fill";
}

/** Play/pause na antena; volume só ao clicar no ícone de som (como no Alex). */
export function DashRadio() {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volOpen, setVolOpen] = useState(false);
  const [volume, setVolume] = useState(RADIO_VOLUME);

  const closeVol = useCallback(() => setVolOpen(false), []);

  const applyVolume = useCallback((v: number) => {
    const n = Math.min(1, Math.max(0, v));
    setVolume(n);
    localStorage.setItem(VOL_KEY, String(n));
    if (audioRef.current) audioRef.current.volume = n;
  }, []);

  const tryStream = useCallback(
    async (url: string) => {
      const audio = audioRef.current;
      if (!audio) throw new Error("no audio");
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timeout")), 15_000);
        const ok = () => {
          clearTimeout(timer);
          cleanup();
          resolve();
        };
        const err = () => {
          clearTimeout(timer);
          cleanup();
          reject(new Error("stream"));
        };
        const cleanup = () => {
          audio.removeEventListener("canplay", ok);
          audio.removeEventListener("playing", ok);
          audio.removeEventListener("error", err);
        };
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.src = url;
        audio.volume = volume;
        audio.addEventListener("canplay", ok);
        audio.addEventListener("playing", ok);
        audio.addEventListener("error", err);
        audio.play().catch(err);
      });
    },
    [volume],
  );

  const play = useCallback(async () => {
    applyVolume(RADIO_VOLUME);
    setLoading(true);
    const urls = [primaryStream(), fallbackStream()].filter(
      (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i,
    );

    for (const url of urls) {
      try {
        await tryStream(url);
        localStorage.setItem(STREAM_URL_KEY, url);
        setPlaying(true);
        sessionStorage.setItem(STORAGE_KEY, "1");
        setLoading(false);
        return;
      } catch {
        /* fallback */
      }
    }

    setPlaying(false);
    setLoading(false);
  }, [applyVolume, tryStream]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    closeVol();
    sessionStorage.removeItem(STORAGE_KEY);
  }, [closeVol]);

  useEffect(() => {
    applyVolume(RADIO_VOLUME);
  }, [applyVolume]);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      void play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dash-radio-playing", playing);
    return () => document.body.classList.remove("dash-radio-playing");
  }, [playing]);

  useEffect(() => {
    if (!volOpen) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      closeVol();
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [volOpen, closeVol]);

  async function togglePlay() {
    if (loading) return;
    if (playing) pause();
    else await play();
  }

  const showVolBtn = playing || loading;
  const playTitle = loading ? "Conectando…" : playing ? "Pausar rádio" : "Tocar rádio";

  return (
    <>
      {/* Fora da sidebar: continua tocando quando o menu está minimizado */}
      <audio
        ref={audioRef}
        id="dash-radio-player"
        preload="none"
        playsInline
        className="dash-radio-player-host"
      />
      <div
        ref={rootRef}
        className="dash-topbar__radio-wrap dash-sidebar__radio dash-radio-root"
        id="dash-radio-root"
        data-turbo-permanent
      >
      <button
        type="button"
        className={`dash-topbar__radio-btn${playing ? " is-playing" : ""}${loading ? " is-loading" : ""}`}
        onClick={() => void togglePlay()}
        disabled={loading}
        title={playTitle}
        aria-pressed={playing}
        aria-label={playTitle}
      >
        <i
          className={`bi ${loading ? "bi-arrow-repeat dash-radio-spin" : playing ? "bi-broadcast-pin" : "bi-broadcast"}`}
          aria-hidden="true"
        />
      </button>
      {showVolBtn ? (
        <button
          type="button"
          className={`dash-topbar__radio-btn dash-topbar__radio-vol-btn${volOpen ? " is-open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setVolOpen((o) => !o);
          }}
          title={volOpen ? "Fechar volume" : "Ajustar volume"}
          aria-label="Ajustar volume da rádio"
          aria-expanded={volOpen}
        >
          <i className={`bi ${volumeIcon(volume)}`} aria-hidden="true" />
        </button>
      ) : null}
      {volOpen && showVolBtn ? (
        <div
          className="dash-radio-volume-panel dash-radio-volume-panel--slider-only"
          role="group"
          aria-label="Volume da rádio"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            className="dash-radio-volume-panel__range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => applyVolume(Number(e.target.value) / 100)}
            aria-label="Volume"
          />
        </div>
      ) : null}
      </div>
    </>
  );
}
