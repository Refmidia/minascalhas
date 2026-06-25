import { useEffect, useMemo, useState } from "react";

import { usuarioThumbLocalUrl, usuarioThumbRemoteUrl } from "@/lib/usuario-thumb";

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

type UserThumbProps = {
  nome: string;
  thumb?: string;
  thumbUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
  listCard?: boolean;
};

export function UserThumb({
  nome,
  thumb = "",
  thumbUrl = null,
  size = "md",
  className = "",
  listCard = false,
}: UserThumbProps) {
  const local = useMemo(
    () => (thumbUrl ? null : usuarioThumbLocalUrl(thumb)),
    [thumb, thumbUrl],
  );
  const remote = useMemo(
    () => (thumbUrl ? null : usuarioThumbRemoteUrl(thumb)),
    [thumb, thumbUrl],
  );
  const [src, setSrc] = useState<string | null>(() => thumbUrl ?? local ?? remote);

  useEffect(() => {
    setSrc(thumbUrl ?? local ?? remote);
  }, [thumbUrl, local, remote]);

  const ini = iniciais(nome);

  if (src) {
    const wrapCls = listCard
      ? `user-list-card__avatar${className ? ` ${className}` : ""}`
      : `user-thumb user-thumb--${size}${className ? ` ${className}` : ""}`;
    const imgCls = listCard ? "user-list-card__avatar-img" : "user-thumb__img";
    return (
      <div className={wrapCls} role="img" aria-label={`Foto de ${nome}`}>
        <img
          src={src}
          alt=""
          className={imgCls}
          onError={() => {
            if (thumbUrl) {
              setSrc(local ?? remote);
              return;
            }
            if (src === local && remote) setSrc(remote);
            else setSrc(null);
          }}
        />
      </div>
    );
  }

  if (listCard) {
    return (
      <div
        className={`user-list-card__avatar user-list-card__avatar--fallback${className ? ` ${className}` : ""}`}
        aria-hidden="true"
      >
        {ini ? <span>{ini}</span> : <i className="bi bi-person" />}
      </div>
    );
  }

  return (
    <div
      className={`user-thumb user-thumb--${size} user-thumb--fallback${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {ini ? <span>{ini}</span> : <i className="bi bi-person-fill" />}
    </div>
  );
}
