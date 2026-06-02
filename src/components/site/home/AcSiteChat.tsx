import { useState } from "react";

import { HOME_SITE, waUrl } from "@/data/home-config";

/** Widget de atendimento (estilo PHP `chat-widget.php`). */
export function AcSiteChat() {
  const [open, setOpen] = useState(false);
  const { chat } = HOME_SITE;

  const onWa = () => {
    window.open(waUrl(HOME_SITE.whatsapp, HOME_SITE.whatsappMsg), "_blank", "noopener,noreferrer");
  };

  const onAgendar = () => {
    setOpen(false);
    document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className={`ac-chat${open ? " is-open" : ""}`}
      id="ac-chat"
      data-wa-number={HOME_SITE.whatsapp}
      data-agendar-url="/#contato"
      data-atendente={chat.nome}
    >
      <div
        className="ac-chat__panel"
        id="ac-chat-panel"
        role="dialog"
        aria-labelledby="ac-chat-title"
        aria-hidden={!open}
        hidden={!open}
      >
        <header className="ac-chat__header">
          <div className="ac-chat__agent">
            <span className="ac-chat__avatar ac-chat__avatar--initials" aria-hidden="true">
              {chat.nome.charAt(0)}
            </span>
            <span className="ac-chat__status" aria-hidden="true" />
          </div>
          <div className="ac-chat__header-text">
            <h2 id="ac-chat-title" className="ac-chat__title">
              {chat.nome}
            </h2>
            <p className="ac-chat__subtitle">
              {chat.cargo} · online agora
            </p>
          </div>
          <button type="button" className="ac-chat__close" id="ac-chat-close" aria-label="Fechar chat" onClick={() => setOpen(false)}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        <div className="ac-chat__body">
          <div className="ac-chat__thread">
            <article className="ac-chat__bubble ac-chat__bubble--in">
              <p className="ac-chat__bubble-text">
                Oi! 😊 Sou a <strong>{chat.nome}</strong>, da Alex Calhas. Em que posso te ajudar hoje?
              </p>
              <time className="ac-chat__bubble-time" dateTime={new Date().toISOString()}>
                Agora
              </time>
            </article>
            <p className="ac-chat__hint" id="ac-chat-hint">
              Escolha uma opção abaixo.
            </p>
            <div className="ac-chat__pills" id="ac-chat-pills">
              <button type="button" className="ac-chat__pill" data-flow="whatsapp" onClick={onWa}>
                Falar no WhatsApp
              </button>
              <button type="button" className="ac-chat__pill" data-flow="orcamento" onClick={onAgendar}>
                Agendar visita
              </button>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="ac-chat__toggle"
        id="ac-chat-toggle"
        aria-expanded={open}
        aria-controls="ac-chat-panel"
        aria-label={`Falar com ${chat.nome}`}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-chat-dots-fill ac-chat__icon-open" aria-hidden="true" />
        <i className="bi bi-x-lg ac-chat__icon-close" aria-hidden="true" />
        <span className="ac-chat__toggle-badge" aria-hidden="true" />
      </button>
    </div>
  );
}
