import { useEffect, useId, useRef, useState } from "react";

import { usuarioThumbLocalUrl, usuarioThumbRemoteUrl } from "@/lib/usuario-thumb";

type UsuarioAvatarPickerProps = {
  nome: string;
  thumb?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
};

export function UsuarioAvatarPicker({
  nome,
  thumb = "",
  file,
  onFileChange,
}: UsuarioAvatarPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

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

  return (
    <div className="dash-user-modal__avatar-wrap">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="visually-hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
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
        aria-label={hasPhoto ? "Alterar foto do usuário" : "Adicionar foto do usuário"}
        onClick={() => inputRef.current?.click()}
      >
        <span className="dash-user-modal__avatar-fallback" aria-hidden="true">
          <i className="bi bi-person" />
        </span>
        <span className="dash-user-modal__avatar-badge" aria-hidden="true">
          <i className="bi bi-camera-fill" />
        </span>
      </button>
      <p className="dash-user-modal__avatar-hint">
        {nome.trim()
          ? "Clique na foto para enviar uma imagem do seu computador"
          : "Escolha uma foto (opcional)"}
      </p>
    </div>
  );
}
