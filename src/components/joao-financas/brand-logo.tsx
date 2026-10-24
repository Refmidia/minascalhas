import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "icon";
  className?: string;
  imageClassName?: string;
  to?: string;
  showTagline?: boolean;
};

const AVATAR_SRC = "/joao-financas/avatar.png";

export function BrandLogo({
  variant = "full",
  className,
  imageClassName,
  to,
  showTagline = false,
}: BrandLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-primary/90 shadow-[0_0_0_2px_rgba(245,197,24,0.18)]",
          variant === "icon" ? "size-8" : "size-9",
          imageClassName,
        )}
      >
        <img
          src={AVATAR_SRC}
          alt="João Finanças"
          className="size-full object-cover"
          width={36}
          height={36}
          decoding="async"
        />
      </span>
      {variant === "full" || showTagline ? (
        <div className="leading-tight min-w-0">
          <div className="text-sm font-bold tracking-tight text-foreground">João Finanças</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel pessoal</div>
        </div>
      ) : null}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}
