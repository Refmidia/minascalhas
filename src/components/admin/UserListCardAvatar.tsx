import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { usuarioThumbLocalUrl, usuarioThumbRemoteUrl } from "@/lib/usuario-thumb";
import { enviarThumbUsuario } from "@/lib/usuarios-client";

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export type UserListCardAvatarHandle = {
  openPicker: () => void;
};

type Props = {
  usuarioId: number;
  nome: string;
  thumb?: string;
  onUpdated: () => void | Promise<void>;
  onError: (message: string) => void;
};

export const UserListCardAvatar = forwardRef<UserListCardAvatarHandle, Props>(function UserListCardAvatar(
  { usuarioId, nome, thumb = "", onUpdated, onError },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(0);

  const local = useMemo(() => usuarioThumbLocalUrl(thumb), [thumb, cacheBust]);
  const remote = useMemo(() => usuarioThumbRemoteUrl(thumb), [thumb, cacheBust]);
  const displayUrl = previewUrl ?? local ?? remote;
  const ini = iniciais(nome);

  useImperativeHandle(ref, () => ({
    openPicker: () => {
      if (!uploading) inputRef.current?.click();
    },
  }));

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File | null) {
    if (!file || uploading) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setUploading(true);
    try {
      await enviarThumbUsuario(usuarioId, file);
      setCacheBust(Date.now());
      await onUpdated();
    } catch (e) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      onError(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="user-list-card__avatar-wrap">
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.gif,.bmp,.avif,.heic,.heif"
        disabled={uploading}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          void handleFile(picked);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className={`user-list-card__avatar-btn${displayUrl ? " has-photo" : ""}${uploading ? " is-uploading" : ""}`}
        style={displayUrl ? { backgroundImage: `url("${displayUrl}")` } : undefined}
        aria-label={displayUrl ? `Alterar foto de ${nome}` : `Adicionar foto de ${nome}`}
        title={displayUrl ? "Alterar foto" : "Adicionar foto"}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {!displayUrl ? (
          <span className="user-list-card__avatar-fallback" aria-hidden="true">
            {ini ? <span>{ini}</span> : <i className="bi bi-person" />}
          </span>
        ) : null}
        <span className="user-list-card__avatar-camera" aria-hidden="true">
          {uploading ? (
            <i className="bi bi-arrow-repeat user-list-card__avatar-spin" />
          ) : (
            <i className="bi bi-camera-fill" />
          )}
        </span>
      </button>
    </div>
  );
});
