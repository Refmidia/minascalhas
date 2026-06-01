const LOGO_PRETO = "/images/logo/logo-preto.png";
const LOGO_BRANCO = "/images/logo/logo-branco.png";

type Props = {
  className?: string;
};

/** Logo do painel: preto no tema claro, branco no tema escuro. */
export function DashBrandLogo({ className = "" }: Props) {
  const extra = className ? ` ${className}` : "";
  return (
    <>
      <img
        src={LOGO_PRETO}
        alt="Alex Calhas"
        className={`dash-sidebar__logo dash-sidebar__logo--light${extra}`}
        width={200}
        height={56}
        decoding="async"
      />
      <img
        src={LOGO_BRANCO}
        alt=""
        aria-hidden="true"
        className={`dash-sidebar__logo dash-sidebar__logo--dark${extra}`}
        width={200}
        height={56}
        decoding="async"
      />
    </>
  );
}
