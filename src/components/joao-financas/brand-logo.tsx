import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "icon";
  className?: string;
  imageClassName?: string;
  to?: string;
  showTagline?: boolean;
};

export function BrandLogo({
  variant = "full",
  className,
  imageClassName,
  to,
  showTagline = false,
}: BrandLogoProps) {
  const alt = "João Finanças";

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold tracking-tight",
          variant === "icon" ? "size-9 text-sm" : "h-9 px-2.5 text-sm",
          imageClassName,
        )}
        aria-hidden="true"
      >
        JF
      </span>
      {variant === "full" || showTagline ? (
        <div className="leading-tight">
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
