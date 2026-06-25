import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { DashConfirmModal } from "@/components/admin/DashConfirmModal";
import { usuarioTemFoto, usuarioThumbLocalUrl, usuarioThumbRemoteUrl } from "@/lib/usuario-thumb";
import { enviarThumbUsuario, removerThumbUsuario } from "@/lib/usuarios-client";

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
  requestRemove: () => void;
};

type Props = {
  usuarioId: number;
  nome: string;
  thumb?: string;
  thumbUrl?: string | null;
  onUpdated: () => void | Promise<void>;
  onError: (message: string) => void;
};

export const UserListCardAvatar = forwardRef<UserListCardAvatarHandle, Props>(function UserListCardAvatar(
  { usuarioId, nome, thumb = "", thumbUrl = null, onUpdated, onError },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedThumbUrl, setUploadedThumbUrl] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(0);
  const [imgOk, setImgOk] = useState(true);
  const busy = uploading || removing;

  const local = useMemo(
    () => (thumbUrl ? null : usuarioThumbLocalUrl(thumb, cacheBust || undefined)),
    [thumb, thumbUrl, cacheBust],
  );
  const remote = useMemo(() => (thumbUrl ? null : usuarioThumbRemoteUrl(thumb)), [thumb, thumbUrl]);
  const displayUrl = previewUrl ?? thumbUrl ?? uploadedThumbUrl ?? local ?? remote;
  const showPhoto = Boolean(displayUrl) && imgOk;
  const temFotoSalva = usuarioTemFoto(thumb) || Boolean(thumbUrl) || Boolean(uploadedThumbUrl);
  const ini = iniciais(nome);

  useImperativeHandle(ref, () => ({
    openPicker: () => {
      if (!busy) inputRef.current?.click();
    },
    requestRemove: () => {
      if (!busy && temFotoSalva) setConfirmRemove(true);
    },
  }));

  useEffect(() => {
    setImgOk(true);
  }, [displayUrl]);

  useEffect(() => {
    setUploadedThumbUrl(null);
  }, [thumbUrl, thumb]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File | null) {
    if (!file || busy) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setUploading(true);
    try {
      const saved = await enviarThumbUsuario(usuarioId, file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (saved.thumb_url) {
        setUploadedThumbUrl(saved.thumb_url);
      }
      setCacheBust(Date.now());
      setImgOk(true);
      await onUpdated();
    } catch (e) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setImgOk(false);
      onError(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  }

  async function confirmarRemocao() {
    if (busy) return;
    setRemoving(true);
    try {
      await removerThumbUsuario(usuarioId);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setUploadedThumbUrl(null);
      setImgOk(true);
      setConfirmRemove(false);
      await onUpdated();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erro ao remover foto.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div className="user-list-card__avatar-wrap">
        <input
          ref={inputRef}
          type="file"
          className="visually-hidden"
          accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.gif,.bmp,.avif,.heic,.heif"
          disabled={busy}
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            void handleFile(picked);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={`user-list-card__avatar-btn${showPhoto ? " has-photo" : ""}${busy ? " is-uploading" : ""}`}
          aria-label={
            showPhoto ? `Gerenciar foto de ${nome}` : `Adicionar foto de ${nome}`
          }
          title={showPhoto ? "Passe o mouse para trocar ou remover" : "Adicionar foto"}
          disabled={busy}
          onClick={() => {
            if (!showPhoto && !busy) inputRef.current?.click();
          }}
        >
          {showPhoto && displayUrl ? (
            <img
              src={displayUrl}
              alt=""
              className="user-list-card__avatar-img"
              onError={() => setImgOk(false)}
            />
          ) : (
            <span className="user-list-card__avatar-fallback" aria-hidden="true">
              {ini ? <span>{ini}</span> : <i className="bi bi-person" />}
            </span>
          )}

          {showPhoto ? (
            <span className="user-list-card__avatar-overlay" aria-hidden="true">
              <button
                type="button"
                className="user-list-card__avatar-act user-list-card__avatar-act--swap"
                title="Trocar foto"
                aria-label={`Trocar foto de ${nome}`}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!busy) inputRef.current?.click();
                }}
              >
                <i className="bi bi-arrow-repeat" />
              </button>
              <button
                type="button"
                className="user-list-card__avatar-act user-list-card__avatar-act--remove"
                title="Remover foto"
                aria-label={`Remover foto de ${nome}`}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!busy) setConfirmRemove(true);
                }}
              >
                <i className="bi bi-trash3" />
              </button>
            </span>
          ) : null}

          <span className="user-list-card__avatar-camera" aria-hidden="true">
            {uploading ? (
              <i className="bi bi-arrow-repeat user-list-card__avatar-spin" />
            ) : removing ? (
              <i className="bi bi-trash3 user-list-card__avatar-spin" />
            ) : (
              <i className="bi bi-camera-fill" />
            )}
          </span>
        </button>
      </div>

      <DashConfirmModal
        open={confirmRemove}
        loading={removing}
        options={{
          title: "Remover foto de perfil?",
          message: `A foto de ${nome.trim() || "este usuário"} será excluída. Depois você pode enviar outra imagem quando quiser.`,
          confirmText: "Remover foto",
          cancelText: "Manter foto",
          variant: "danger",
          icon: "bi-image",
        }}
        onConfirm={() => void confirmarRemocao()}
        onCancel={() => {
          if (!removing) setConfirmRemove(false);
        }}
      />
    </>
  );
});
