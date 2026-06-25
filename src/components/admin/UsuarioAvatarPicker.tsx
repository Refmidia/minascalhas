import { useEffect, useId, useRef, useState } from "react";

import { DashConfirmModal } from "@/components/admin/DashConfirmModal";
import { usuarioTemFoto, usuarioThumbLocalUrl, usuarioThumbRemoteUrl } from "@/lib/usuario-thumb";

type UsuarioAvatarPickerProps = {
  nome: string;
  thumb?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemovePhoto?: () => void | Promise<void>;
};

export function UsuarioAvatarPicker({
  nome,
  thumb = "",
  file,
  onFileChange,
  onRemovePhoto,
}: UsuarioAvatarPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displayUrl =
    objectUrl ?? usuarioThumbLocalUrl(thumb) ?? usuarioThumbRemoteUrl(thumb);
  const hasPhoto = Boolean(displayUrl);
  const canRemove = Boolean(onRemovePhoto) && usuarioTemFoto(thumb) && !file;

  async function confirmarRemocao() {
    if (!onRemovePhoto || removing) return;
    setRemoving(true);
    try {
      await onRemovePhoto();
      setConfirmRemove(false);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div className="dash-user-modal__avatar-wrap">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="visually-hidden"
          accept="image/*,.jpg,.jpeg,.jpe,.jfif,.png,.webp,.gif,.bmp,.avif,.heic,.heif"
          disabled={removing}
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            onFileChange(picked);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={`dash-user-modal__avatar${hasPhoto ? " has-photo" : ""}`}
          style={displayUrl ? { backgroundImage: `url("${displayUrl}")` } : undefined}
          aria-label={hasPhoto ? "Gerenciar foto do usuário" : "Adicionar foto do usuário"}
          disabled={removing}
          onClick={() => {
            if (!hasPhoto && !removing) inputRef.current?.click();
          }}
        >
          <span className="dash-user-modal__avatar-fallback" aria-hidden="true">
            <i className="bi bi-person" />
          </span>

          {hasPhoto ? (
            <span className="dash-user-modal__avatar-overlay" aria-hidden="true">
              <button
                type="button"
                className="dash-user-modal__avatar-act dash-user-modal__avatar-act--swap"
                title="Trocar foto"
                aria-label="Trocar foto"
                disabled={removing}
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                <i className="bi bi-arrow-repeat" />
                <span>Trocar</span>
              </button>
              {canRemove ? (
                <button
                  type="button"
                  className="dash-user-modal__avatar-act dash-user-modal__avatar-act--remove"
                  title="Remover foto"
                  aria-label="Remover foto"
                  disabled={removing}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmRemove(true);
                  }}
                >
                  <i className="bi bi-trash3" />
                  <span>Remover</span>
                </button>
              ) : null}
            </span>
          ) : null}

          <span className="dash-user-modal__avatar-badge" aria-hidden="true">
            {removing ? (
              <i className="bi bi-arrow-repeat dash-user-modal__avatar-spin" />
            ) : (
              <i className="bi bi-camera-fill" />
            )}
          </span>
        </button>
        <p className="dash-user-modal__avatar-hint">
          {hasPhoto
            ? "Passe o mouse na foto para trocar ou remover"
            : nome.trim()
              ? "Clique para enviar uma imagem do seu computador"
              : "Escolha uma foto (opcional)"}
        </p>
      </div>

      <DashConfirmModal
        open={confirmRemove}
        loading={removing}
        options={{
          title: "Remover foto de perfil?",
          message: "A foto atual será excluída. Você pode enviar outra imagem depois.",
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
}
